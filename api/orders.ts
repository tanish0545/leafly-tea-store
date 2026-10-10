import type { IncomingMessage, ServerResponse } from "node:http";
import {
  sendAdminOrderNotification,
  sendOrderConfirmation,
  sendOrderStatusUpdate,
  sendPasswordSetupEmail,
  sendOrderLookupVerificationCode,
  type MailResult,
} from "./_lib/mailer.js";
import {
  updateServerOrder,
  getServerOrder,
  getAdminFirestore,
  getAdminAuth,
  provisionCustomerAccount,
  saveServerOrder,
  buildBrandedResetLink,
  fromFirestoreRestFields,
  getAdminConfigStatus,
  getFirebaseProjectId,
  getFirestoreDatabaseId,
} from "./_lib/firebaseAdmin.js";
import type { Order } from "../src/types/contracts.js";
import type {
  OrderEmailData,
  OrderEmailItem,
  OrderStatusEmailData,
} from "./_lib/emailTemplates.js";

// In-memory sets to prevent duplicate sends from rapid duplicate network requests
const dispatchedConfirmationOrders = new Set<string>();
const dispatchedStatusEvents = new Set<string>();

// Rate-limiting and OTP caches for password setup and guest order lookup
const resendRateLimitMap = new Map<string, number>();
const otpRateLimitMap = new Map<string, number>();
const memoryOtpStore = new Map<string, { code: string; expiresAt: number; attempts: number }>();

interface OrderActionRequestBody {
  action?: string;
  type?: string;
  id?: string;
  orderId?: string;
  customerName?: string;
  customerEmail?: string;
  email?: string;
  customerPhone?: string;
  phone?: string;
  total?: number;
  subtotal?: number;
  deliveryFee?: number;
  discount?: number;
  couponCode?: string | null;
  paymentMethod?: string;
  paymentStatus?: string;
  newStatus?: string;
  previousStatus?: string;
  shippingAddress?: OrderEmailData["shippingAddress"];
  items?: OrderEmailItem[];
  createdAt?: string;
  accountCreated?: boolean;
  passwordSetupLink?: string;
  code?: string;
  actionCode?: string;
  orders?: { id: string; email: string }[];
}

export default async function handler(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse
) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");

  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Method not allowed. Use POST." }));
    return;
  }

  try {
    let rawBody = req.body;
    if (typeof rawBody === "string") {
      try {
        rawBody = JSON.parse(rawBody);
      } catch {
        // Keep rawBody
      }
    } else if (!rawBody) {
      const buffers: Buffer[] = [];
      for await (const chunk of req) {
        buffers.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
      }
      const raw = Buffer.concat(buffers).toString("utf-8");
      try {
        rawBody = raw ? JSON.parse(raw) : {};
      } catch {
        rawBody = {};
      }
    }

    const body = (typeof rawBody === "object" && rawBody !== null
      ? rawBody
      : {}) as OrderActionRequestBody;

    // Resolve action from URL query or body
    const urlObj = new URL(req.url || "", "http://localhost");
    const queryAction = urlObj.searchParams.get("action") || urlObj.searchParams.get("type");
    let action = (queryAction || body.action || body.type || "").trim().toLowerCase();

    // Auto-detect action if not specified
    if (!action) {
      if (body.newStatus) {
        action = "status";
      } else {
        action = "notification";
      }
    }

    // Normalize action alias
    if (action === "order-notification" || action === "placed") {
      action = "notification";
    } else if (action === "order-status-notification" || action === "update") {
      action = "status";
    } else if (action === "create" || action === "create-order" || action === "place-order") {
      action = "create";
    } else if (action === "provision" || action === "provision-account" || action === "create-account") {
      action = "provision";
    } else if (action === "resend-setup" || action === "resend-password-setup" || action === "resend_setup") {
      action = "resend-setup";
    } else if (action === "lookup-send-code" || action === "send-code" || action === "lookup_send_code") {
      action = "lookup-send-code";
    } else if (action === "lookup-verify-code" || action === "verify-code" || action === "lookup_verify_code") {
      action = "lookup-verify-code";
    } else if (action === "sync-status" || action === "sync-guest-orders" || action === "sync_status") {
      action = "sync-status";
    } else if (action === "get-invoice" || action === "invoice" || action === "tax-invoice") {
      action = "get-invoice";
    } else if (action === "config-status" || action === "status-check" || action === "health") {
      action = "config-status";
    }

    // =========================================================================
    // 00. SECURE SERVER FIREBASE & SMTP CONFIGURATION DIAGNOSTICS
    // =========================================================================
    if (action === "config-status") {
      const status = getAdminConfigStatus();
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(status));
      return;
    }

    // =========================================================================
    // 0a. AUTOMATIC CUSTOMER ACCOUNT PROVISIONING
    // =========================================================================
    if (action === "provision") {
      const email = String(body.email || body.customerEmail || "").trim().toLowerCase();
      const customerName = String(
        body.customerName || body.shippingAddress?.fullName || ""
      ).trim();
      const orderId = String(body.orderId || body.id || "").trim();

      if (!email) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Email is required for account provisioning." }));
        return;
      }

      try {
        const provisionResult = await provisionCustomerAccount(
          email,
          customerName,
          orderId || undefined
        );

        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(provisionResult));
      } catch (provErr) {
        console.warn("[Orders API] Provisioning notice:", provErr);
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: true, uid: null, isNewAccount: false }));
      }
      return;
    }

    // =========================================================================
    // 0b. RESEND VERIFIED PASSWORD SETUP EMAIL
    // =========================================================================
    if (action === "resend-setup") {
      const email = String(body.email || body.customerEmail || "").trim().toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Please enter a valid email address." }));
        return;
      }

      const lastSent = resendRateLimitMap.get(email) || 0;
      const now = Date.now();
      if (now - lastSent < 60000) {
        const remainingSec = Math.ceil((60000 - (now - lastSent)) / 1000);
        res.statusCode = 429;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            error: `Please wait ${remainingSec} seconds before requesting another setup link.`,
          })
        );
        return;
      }

      const adminAuth = getAdminAuth();
      if (!adminAuth) {
        res.statusCode = 503;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            error: "Password setup service is currently unavailable. Please try again shortly or contact support.",
          })
        );
        return;
      }

      try {
        const host = process.env.PUBLIC_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || "https://leaflytea.in";
        const baseUrl = (host.startsWith("http") ? host : `https://${host}`).replace(/\/+$/, "");

        let customerName = "Valued Patron";
        let rawLink: string | null = null;

        try {
          const userRecord = await adminAuth.getUserByEmail(email);
          customerName = userRecord.displayName || customerName;
          try {
            rawLink = await adminAuth.generatePasswordResetLink(email, {
              url: `${baseUrl}/reset-password`,
              handleCodeInApp: true,
            });
          } catch {
            rawLink = await adminAuth.generatePasswordResetLink(email);
          }
        } catch (lookupErr: any) {
          if (lookupErr?.code === "auth/user-not-found" || lookupErr?.message?.includes("user-not-found")) {
            // Check if an order was placed with this email and auto-provision the customer account
            const adminDb = getAdminFirestore();
            if (adminDb) {
              try {
                const snap = await adminDb.collection("orders").where("customerEmail", "==", email).limit(1).get();
                if (!snap.empty) {
                  customerName = String(snap.docs[0].data().customerName || snap.docs[0].data().shippingAddress?.fullName || customerName);
                }
              } catch {}
            }
            const provRes = await provisionCustomerAccount(email, customerName);
            if (provRes.passwordSetupLink) {
              resendRateLimitMap.set(email, now);
              res.statusCode = 200;
              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({
                  success: true,
                  message: `A verified password setup link has been dispatched to ${email}.`,
                })
              );
              return;
            }
            res.statusCode = 404;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                error: "No account exists for this email address. Please place an order or sign up first.",
              })
            );
            return;
          }
          throw lookupErr;
        }

        if (!rawLink) {
          throw new Error("Unable to generate verified password setup link.");
        }

        const setupLink = buildBrandedResetLink(rawLink, baseUrl);
        const mailRes = await sendPasswordSetupEmail({ email, customerName, setupLink });
        resendRateLimitMap.set(email, now);

        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            success: mailRes.delivered || mailRes.success,
            message: `A verified password setup link has been dispatched to ${email}.`,
          })
        );
        return;
      } catch (err: any) {
        console.error("[Orders API] Error in resend-setup:", err);
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Failed to generate password setup link." }));
        return;
      }
    }

    // =========================================================================
    // 0c. DISPATCH GUEST ORDER LOOKUP 6-DIGIT VERIFICATION CODE (OTP)
    // =========================================================================
    if (action === "lookup-send-code") {
      const email = String(body.email || body.customerEmail || "").trim().toLowerCase();
      const orderId = String(body.orderId || body.id || "").trim();

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Please enter a valid email address." }));
        return;
      }

      const lastSent = otpRateLimitMap.get(email) || 0;
      const now = Date.now();
      if (now - lastSent < 60000) {
        const remainingSec = Math.ceil((60000 - (now - lastSent)) / 1000);
        res.statusCode = 429;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            error: `Please wait ${remainingSec} seconds before requesting a new verification code.`,
          })
        );
        return;
      }

      // Generate 6-digit OTP
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = now + 10 * 60 * 1000; // 10 minutes

      memoryOtpStore.set(email, { code, expiresAt, attempts: 0 });

      const adminDb = getAdminFirestore();
      if (adminDb) {
        try {
          await adminDb.collection("verification_codes").doc(email).set({
            code,
            expiresAt,
            attempts: 0,
            createdAt: new Date().toISOString(),
          });
        } catch (dbErr) {
          console.warn("[Orders API] Could not write verification code to Firestore:", dbErr);
        }
      }

      const mailRes = await sendOrderLookupVerificationCode({
        email,
        code,
        orderId: orderId || undefined,
      });

      otpRateLimitMap.set(email, now);

      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          success: mailRes.delivered || mailRes.success,
          message: "A 6-digit verification code has been dispatched to your email address.",
          delivered: mailRes.delivered,
        })
      );
      return;
    }

    // =========================================================================
    // 0d. VERIFY OTP AND RETRIEVE GUEST ORDERS
    // =========================================================================
    if (action === "lookup-verify-code") {
      const email = String(body.email || body.customerEmail || "").trim().toLowerCase();
      const code = String(body.code || body.actionCode || "").trim();

      if (!email || !code || code.length !== 6) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Email and 6-digit verification code are required." }));
        return;
      }

      const now = Date.now();
      let storedOtp = memoryOtpStore.get(email);

      const adminDb = getAdminFirestore();
      if (!storedOtp && adminDb) {
        try {
          const docSnap = await adminDb.collection("verification_codes").doc(email).get();
          if (docSnap.exists) {
            const data = docSnap.data();
            if (data) {
              storedOtp = {
                code: String(data.code || ""),
                expiresAt: Number(data.expiresAt) || 0,
                attempts: Number(data.attempts) || 0,
              };
            }
          }
        } catch (dbErr) {
          console.warn("[Orders API] Could not read verification code from Firestore:", dbErr);
        }
      }

      if (!storedOtp || storedOtp.expiresAt < now) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            error: "Verification code has expired or is invalid. Please request a new code.",
          })
        );
        return;
      }

      if (storedOtp.attempts >= 5) {
        memoryOtpStore.delete(email);
        if (adminDb) {
          adminDb.collection("verification_codes").doc(email).delete().catch(() => {});
        }
        res.statusCode = 429;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            error: "Too many failed attempts. Please request a new verification code.",
          })
        );
        return;
      }

      if (storedOtp.code !== code) {
        storedOtp.attempts += 1;
        memoryOtpStore.set(email, storedOtp);
        if (adminDb) {
          adminDb.collection("verification_codes").doc(email).update({ attempts: storedOtp.attempts }).catch(() => {});
        }
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            error: "Incorrect verification code. Please check your email and try again.",
          })
        );
        return;
      }

      // Code is valid! Consume it.
      memoryOtpStore.delete(email);
      if (adminDb) {
        adminDb.collection("verification_codes").doc(email).delete().catch(() => {});
      }

      // Retrieve orders for this email
      const matchedOrders: any[] = [];
      if (adminDb) {
        try {
          const q1 = await adminDb.collection("orders").where("customerEmail", "==", email).get();
          q1.forEach((doc) => matchedOrders.push({ id: doc.id, ...doc.data() }));

          const q2 = await adminDb.collection("orders").where("email", "==", email).get();
          q2.forEach((doc) => {
            if (!matchedOrders.some((o) => o.id === doc.id)) {
              matchedOrders.push({ id: doc.id, ...doc.data() });
            }
          });
        } catch (fetchErr) {
          console.error("[Orders API] Error retrieving orders via Admin SDK:", fetchErr);
        }
      }

      // Sort newest first
      matchedOrders.sort((a, b) => {
        const tA = new Date(a.createdAt || 0).getTime();
        const tB = new Date(b.createdAt || 0).getTime();
        return tB - tA;
      });

      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          success: true,
          verified: true,
          email,
          orders: matchedOrders,
        })
      );
      return;
    }

    // =========================================================================
    // 0e. SYNCHRONIZE & REVALIDATE GUEST ORDER STATUSES
    // =========================================================================
    if (action === "sync-status") {
      let ordersToCheck: { id: string; email: string }[] = [];
      if (Array.isArray(body.orders)) {
        ordersToCheck = body.orders;
      } else if (body.id || body.orderId) {
        const singleId = String(body.id || body.orderId || "").trim();
        const singleEmail = String(body.email || body.customerEmail || "").trim().toLowerCase();
        if (singleId && singleEmail) {
          ordersToCheck.push({ id: singleId, email: singleEmail });
        }
      }

      if (ordersToCheck.length === 0) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "No orders provided for synchronization." }));
        return;
      }

      // Limit to 15 items per batch to prevent serverless execution abuse
      const trimmedList = ordersToCheck.slice(0, 15);
      const updatedStatuses: Array<{
        id: string;
        status: string;
        orderStatus: string;
        updatedAt?: string;
        paymentStatus?: string;
        trackingNumber?: string | null;
        carrier?: string | null;
        deliveryMethod?: string;
        deliveryDate?: string | null;
        estimatedDelivery?: string | null;
        inventoryRestored?: boolean;
      }> = [];

      for (const item of trimmedList) {
        const orderId = String(item.id || "").trim();
        const reqEmail = String(item.email || "").trim().toLowerCase();
        if (!orderId || !reqEmail) continue;

        try {
          const existingOrder = await getServerOrder(orderId);
          if (!existingOrder) continue;

          const orderEmail = String(
            existingOrder.customerEmail || existingOrder.email || ""
          ).trim().toLowerCase();

          // Authoritative security check: Order must belong to the matching customer email
          if (orderEmail !== reqEmail) continue;

          const freshStatus = String(
            existingOrder.orderStatus || existingOrder.status || "Processing"
          );

          updatedStatuses.push({
            id: orderId,
            status: freshStatus,
            orderStatus: freshStatus,
            updatedAt: existingOrder.updatedAt ? String(existingOrder.updatedAt) : undefined,
            paymentStatus: existingOrder.paymentStatus ? String(existingOrder.paymentStatus) : undefined,
            trackingNumber: existingOrder.trackingNumber ? String(existingOrder.trackingNumber) : null,
            carrier: existingOrder.carrier ? String(existingOrder.carrier) : null,
            deliveryMethod: existingOrder.deliveryMethod ? String(existingOrder.deliveryMethod) : undefined,
            deliveryDate: existingOrder.deliveryDate ? String(existingOrder.deliveryDate) : null,
            estimatedDelivery: existingOrder.estimatedDelivery ? String(existingOrder.estimatedDelivery) : null,
            inventoryRestored: Boolean(existingOrder.inventoryRestored),
          });
        } catch (fetchErr) {
          console.warn(`[Orders API] Status sync notice for #${orderId}:`, fetchErr);
        }
      }

      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          success: true,
          syncedCount: updatedStatuses.length,
          updatedStatuses,
        })
      );
      return;
    }

    // =========================================================================
    // 0f. AUTHORITATIVE & SECURE TAX INVOICE RETRIEVAL
    // Enforces customer email ownership verification to prevent unauthorized access
    // =========================================================================
    if (action === "get-invoice") {
      const orderId = String(body.orderId || body.id || "").trim();
      const reqEmail = String(body.email || body.customerEmail || "").trim().toLowerCase();

      if (!orderId || !reqEmail) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            error: "Order ID and verified customer email are required to retrieve invoice.",
          })
        );
        return;
      }

      try {
        const existingOrder = await getServerOrder(orderId);
        if (!existingOrder) {
          res.statusCode = 404;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: `Order #${orderId} was not found.` }));
          return;
        }

        const orderEmail = String(
          existingOrder.customerEmail || existingOrder.email || ""
        ).trim().toLowerCase();

        // Authoritative security check: Order must belong to the matching customer email
        if (orderEmail !== reqEmail) {
          res.statusCode = 403;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              error: "Access denied. Order does not match the provided customer email.",
            })
          );
          return;
        }

        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            success: true,
            order: existingOrder,
          })
        );
        return;
      } catch (err: unknown) {
        console.error(`[Orders API] Error fetching invoice for #${orderId}:`, err);
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Failed to retrieve invoice. Please try again." }));
        return;
      }
    }

    // =========================================================================
    // 0. ORDER CREATION / PERSISTENCE (Server-Side Authoritative Fallback)
    // =========================================================================
    if (action === "create") {
      const id = String(body.id || body.orderId || "").trim();
      const customerName = String(
        body.customerName || body.shippingAddress?.fullName || ""
      ).trim();
      const email = String(body.email || body.customerEmail || "").trim().toLowerCase();

      if (!id) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Order ID is required." }));
        return;
      }

      if (!customerName) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Customer name is required." }));
        return;
      }

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "A valid customer email is required." }));
        return;
      }

      const items = Array.isArray(body.items) ? body.items : [];
      if (items.length === 0) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Order must contain at least one item." }));
        return;
      }

      // Idempotency check: check if order is already saved in Firestore
      try {
        const existingOrder = await getServerOrder(id);
        if (existingOrder) {
          console.info(`[Orders API] Order #${id} already exists in Firestore. Returning idempotent success.`);
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ success: true, orderId: id, duplicate: true, total: existingOrder.total }));
          return;
        }
      } catch (checkErr) {
        console.warn(`[Orders API] Idempotency lookup notice for #${id}:`, checkErr);
      }

      // Authoritative pricing and total calculation
      let computedSubtotal = 0;
      for (const item of items) {
        const price = Number(item.price);
        const qty = Number(item.quantity);
        if (isNaN(price) || price < 0 || isNaN(qty) || qty <= 0) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Invalid item pricing or quantity in order items." }));
          return;
        }
        computedSubtotal += price * qty;
      }

      // Leafly delivery policy: Free delivery for subtotal >= ₹500, else ₹50
      const computedDeliveryFee = computedSubtotal >= 500 ? 0 : 50;
      const discount = Math.max(0, Number(body.discount) || 0);
      const computedTotal = Math.max(0, computedSubtotal - discount + computedDeliveryFee);

      // Decoupled account provisioning for guest orders
      let isNewAccountCreated = Boolean(body.accountCreated);
      let setupLink = body.passwordSetupLink;
      if (email && (body.accountCreated || (body as any).isGuest !== false)) {
        try {
          const provRes = await provisionCustomerAccount(email, customerName, id);
          if (provRes && provRes.isNewAccount) {
            isNewAccountCreated = true;
            setupLink = provRes.passwordSetupLink || setupLink;
          }
        } catch (provErr) {
          console.warn("[Orders API] Guest provisioning notice (non-blocking):", provErr);
        }
      }

      const authHeader = req.headers?.authorization || (req.headers as any)?.Authorization;
      const clientToken =
        (typeof authHeader === "string" && authHeader.startsWith("Bearer ")
          ? authHeader.slice(7).trim()
          : undefined) ||
        ((body as any).idToken ? String((body as any).idToken).trim() : undefined);

      const orderPayload: Record<string, unknown> = {
        ...body,
        id,
        orderId: id,
        customerName,
        customerEmail: email,
        email,
        subtotal: computedSubtotal,
        deliveryFee: computedDeliveryFee,
        discount,
        total: computedTotal,
        items,
        accountCreated: isNewAccountCreated,
        accountSetupPending: isNewAccountCreated,
        updatedAt: new Date().toISOString(),
      };
      delete (orderPayload as any).action;
      delete (orderPayload as any).type;
      delete (orderPayload as any).idToken;

      const saveResult = await saveServerOrder(orderPayload, clientToken);
      if (!saveResult.success) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: saveResult.error || "Failed to persist order to database." }));
        return;
      }

      console.info(`[Leafly Orders API] Order #${id} successfully stored in Firestore via server.`);

      // Asynchronous / Non-blocking email dispatch
      if (id && customerName && !dispatchedConfirmationOrders.has(id)) {
        dispatchedConfirmationOrders.add(id);
        const orderData: OrderEmailData = {
          id,
          customerName,
          email: email || undefined,
          phone: body.phone || body.customerPhone || undefined,
          total: computedTotal,
          subtotal: computedSubtotal,
          deliveryFee: computedDeliveryFee,
          discount,
          couponCode: body.couponCode ? String(body.couponCode) : undefined,
          paymentMethod: body.paymentMethod ? String(body.paymentMethod) : undefined,
          paymentStatus: body.paymentStatus ? String(body.paymentStatus) : undefined,
          shippingAddress: body.shippingAddress,
          items: items.map((it: any) => ({
            name: String(it.name || "Item"),
            variant: it.variant ? String(it.variant) : undefined,
            weight: it.weight ? String(it.weight) : undefined,
            quantity: Number(it.quantity) || 1,
            price: Number(it.price) || 0,
          })),
          createdAt: body.createdAt || new Date().toISOString(),
          accountCreated: isNewAccountCreated,
          passwordSetupLink: setupLink,
        };

        let customerEmailDelivered = false;
        let adminEmailDelivered = false;

        const emailTasks: Promise<any>[] = [
          sendAdminOrderNotification(orderData)
            .then((r) => {
              adminEmailDelivered = Boolean(r?.delivered || r?.success);
              console.info(`[Orders API] Admin order alert delivery result for #${id}: ${adminEmailDelivered ? "delivered" : "pending"}`);
            })
            .catch((e) => console.warn("[Orders API] Admin alert notice:", e)),
        ];

        if (email) {
          emailTasks.push(
            sendOrderConfirmation(orderData)
              .then(async (r) => {
                customerEmailDelivered = Boolean(r?.delivered || r?.success);
                console.info(`[Orders API] Customer receipt delivery result for #${id} to <${email}>: ${customerEmailDelivered ? "delivered" : "failed"}`);
                if (customerEmailDelivered) {
                  await updateServerOrder(id, {
                    confirmationEmailSentAt: new Date().toISOString(),
                    confirmationEmailDelivered: true,
                  }).catch(() => {});
                }
              })
              .catch((e) => console.warn("[Orders API] Customer receipt notice:", e))
          );
        }

        // Await all email tasks before ending serverless response to prevent Vercel execution freezing
        await Promise.allSettled(emailTasks);
      }

      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({
        success: true,
        orderId: id,
        total: computedTotal,
        accountCreated: isNewAccountCreated,
        method: saveResult.method,
      }));
      return;
    }


    // =========================================================================
    // 1. ORDER PLACEMENT NOTIFICATION (Customer Confirmation + Admin Alert)
    // =========================================================================
    if (action === "notification") {
      const id = String(body.id || body.orderId || "").trim();
      const customerName = String(
        body.customerName || body.shippingAddress?.fullName || ""
      ).trim();
      const email = String(body.email || body.customerEmail || "").trim().toLowerCase();
      const phone = String(body.phone || body.customerPhone || "").trim();
      const total = Number(body.total) || 0;
      const subtotal = typeof body.subtotal === "number" ? body.subtotal : undefined;
      const deliveryFee = typeof body.deliveryFee === "number" ? body.deliveryFee : undefined;
      const discount = typeof body.discount === "number" ? body.discount : undefined;
      const couponCode = body.couponCode ? String(body.couponCode) : undefined;
      const paymentMethod = body.paymentMethod ? String(body.paymentMethod) : undefined;
      const paymentStatus = body.paymentStatus ? String(body.paymentStatus) : undefined;
      const shippingAddress =
        body.shippingAddress && typeof body.shippingAddress === "object"
          ? {
              fullName: body.shippingAddress.fullName ? String(body.shippingAddress.fullName) : undefined,
              addressLine1: body.shippingAddress.addressLine1 ? String(body.shippingAddress.addressLine1) : undefined,
              addressLine2: body.shippingAddress.addressLine2 ? String(body.shippingAddress.addressLine2) : undefined,
              city: body.shippingAddress.city ? String(body.shippingAddress.city) : undefined,
              state: body.shippingAddress.state ? String(body.shippingAddress.state) : undefined,
              postalCode: body.shippingAddress.postalCode ? String(body.shippingAddress.postalCode) : undefined,
              country: body.shippingAddress.country ? String(body.shippingAddress.country) : undefined,
            }
          : undefined;
      const items: OrderEmailItem[] | undefined = Array.isArray(body.items)
        ? body.items.map((item) => ({
            name: String(item.name || "Item"),
            variant: item.variant ? String(item.variant) : undefined,
            weight: item.weight ? String(item.weight) : undefined,
            quantity: Number(item.quantity) || 1,
            price: Number(item.price) || 0,
          }))
        : undefined;
      const createdAt = body.createdAt ? String(body.createdAt) : undefined;

      if (!id || !customerName) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Order ID and customer name are required." }));
        return;
      }

      // Idempotency: in-memory check
      if (dispatchedConfirmationOrders.has(id)) {
        console.info(`[Leafly Mailer] Order #${id} confirmation email was already dispatched in this session. Skipping duplicate.`);
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: true, message: "Order confirmation email already processed.", duplicate: true }));
        return;
      }

      // Idempotency: database check
      const existingOrder = await getServerOrder(id);
      if (existingOrder && existingOrder.confirmationEmailSentAt) {
        console.info(`[Leafly Mailer] Order #${id} already has confirmationEmailSentAt recorded in Firestore (${existingOrder.confirmationEmailSentAt}). Skipping duplicate.`);
        dispatchedConfirmationOrders.add(id);
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: true, message: "Order confirmation email already sent.", duplicate: true }));
        return;
      }

      // Auto-provision or associate customer account
      let isNewAccountCreated = Boolean(body.accountCreated);
      let setupLink: string | undefined = body.passwordSetupLink || undefined;

      if (email) {
        try {
          const provResult = await provisionCustomerAccount(email, customerName, id);
          if (provResult.isNewAccount) {
            isNewAccountCreated = true;
          }
          if (provResult.passwordSetupLink) {
            setupLink = provResult.passwordSetupLink;
          }
        } catch (provErr) {
          console.warn("[Orders API] Auto-provisioning notice:", provErr);
        }
      }

      const orderData: OrderEmailData = {
        id,
        customerName,
        email: email || undefined,
        phone: phone || undefined,
        total,
        subtotal,
        deliveryFee,
        discount,
        couponCode,
        paymentMethod,
        paymentStatus,
        shippingAddress,
        items,
        createdAt,
        accountCreated: isNewAccountCreated,
        passwordSetupLink: setupLink,
      };

      // 1. Dispatch Admin Order Alert
      const adminResult = await sendAdminOrderNotification(orderData);

      // 2. Dispatch Customer Order Confirmation
      let customerResult: MailResult = { success: false, delivered: false };
      const isValidEmail = Boolean(email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));

      if (isValidEmail) {
        customerResult = await sendOrderConfirmation(orderData);

        if (customerResult.delivered || customerResult.success) {
          dispatchedConfirmationOrders.add(id);
          const sentAt = new Date().toISOString();
          await updateServerOrder(id, {
            confirmationEmailSentAt: sentAt,
            customerEmail: email,
          });
        }
      } else {
        console.warn(`[Leafly Mailer] Skipping customer confirmation email: recipient email "${email}" is invalid or missing.`);
        customerResult.error = `Invalid or missing customer email: "${email}"`;
      }

      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          success: customerResult.delivered || adminResult.delivered,
          message: "Order notification emails processed.",
          customerEmailSent: customerResult.delivered,
          adminAlertSent: adminResult.delivered,
          customerError: customerResult.error,
          adminError: adminResult.error,
          recipient: email || null,
        })
      );
      return;
    }

    // =========================================================================
    // 2. ORDER STATUS UPDATE NOTIFICATION
    // =========================================================================
    if (action === "status") {
      const orderId = String(body.orderId || body.id || "").trim();
      const newStatus = String(body.newStatus || "").trim();

      if (!orderId || !newStatus) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "orderId and newStatus are required." }));
        return;
      }

      // 1. In-memory idempotency check
      const eventKey = `${orderId}_${newStatus.toLowerCase()}`;
      if (dispatchedStatusEvents.has(eventKey)) {
        console.info(
          `[Leafly Mailer] Status update email for #${orderId} (${newStatus}) already sent in this session. Skipping duplicate.`
        );
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            success: true,
            duplicate: true,
            message: `Status email for ${newStatus} was already sent.`,
          })
        );
        return;
      }

      // 2. Fetch authoritative order data from Firestore
      const existingOrder = await getServerOrder(orderId);

      // 3. Database idempotency check
      if (
        existingOrder &&
        String(existingOrder.lastStatusEmailSentFor || "").toLowerCase().trim() ===
          newStatus.toLowerCase().trim()
      ) {
        console.info(
          `[Leafly Mailer] Order #${orderId} already has lastStatusEmailSentFor === "${newStatus}" in Firestore. Skipping duplicate.`
        );
        dispatchedStatusEvents.add(eventKey);
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            success: true,
            duplicate: true,
            message: `Status email for ${newStatus} was already recorded.`,
          })
        );
        return;
      }

      // 4. Resolve customer email and details
      const customerEmail = String(
        body.customerEmail || body.email || existingOrder?.customerEmail || ""
      ).trim().toLowerCase();
      const customerName = String(
        body.customerName ||
          existingOrder?.customerName ||
          (existingOrder?.shippingAddress as { fullName?: string } | undefined)?.fullName ||
          "Valued Patron"
      ).trim();

      const total =
        typeof body.total === "number"
          ? body.total
          : typeof existingOrder?.total === "number"
          ? existingOrder.total
          : undefined;

      const items =
        body.items ||
        (Array.isArray(existingOrder?.items)
          ? (existingOrder.items as OrderEmailItem[])
          : undefined);

      const shippingAddress =
        body.shippingAddress ||
        (existingOrder?.shippingAddress as OrderEmailData["shippingAddress"]);

      // 5. Validate customer email
      if (!customerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
        console.warn(
          `[Leafly Mailer] Cannot send status email for order #${orderId}: customer email "${customerEmail}" is missing or invalid.`
        );
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            success: false,
            error: "No valid customer email associated with this order.",
            orderId,
          })
        );
        return;
      }

      // 6. Dispatch Customer Status Update Email
      const emailData: OrderStatusEmailData = {
        orderId,
        customerName,
        email: customerEmail,
        customerEmail,
        status: newStatus,
        previousStatus: body.previousStatus,
        total,
        items,
        shippingAddress,
      };

      const result = await sendOrderStatusUpdate(emailData);

      if (result.delivered || result.success) {
        dispatchedStatusEvents.add(eventKey);
        const now = new Date().toISOString();
        await updateServerOrder(orderId, {
          lastStatusEmailSentFor: newStatus,
          lastStatusEmailSentAt: now,
        });
      }

      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          success: result.success,
          delivered: result.delivered,
          recipient: customerEmail,
          orderId,
          status: newStatus,
          messageId: result.messageId,
          error: result.error,
        })
      );
      return;
    }

    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        error: `Invalid or missing action: "${action}". Supported actions: notification, status.`,
      })
    );
  } catch (error) {
    console.error("[API Orders Handler Error]:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        success: false,
        error: "Internal server error while processing order action.",
      })
    );
  }
}
