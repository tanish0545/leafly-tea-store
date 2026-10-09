import type { IncomingMessage, ServerResponse } from "node:http";
import {
  sendAdminOrderNotification,
  sendOrderConfirmation,
  sendOrderStatusUpdate,
  type MailResult,
} from "./_lib/mailer.js";
import { updateServerOrder, getServerOrder, getAdminFirestore, provisionCustomerAccount, saveServerOrder } from "./_lib/firebaseAdmin.js";
import type { Order } from "../src/types/contracts.js";
import type {
  OrderEmailData,
  OrderEmailItem,
  OrderStatusEmailData,
} from "../src/lib/emailTemplates.js";

// In-memory sets to prevent duplicate sends from rapid duplicate network requests
const dispatchedConfirmationOrders = new Set<string>();
const dispatchedStatusEvents = new Set<string>();

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

      const provisionResult = await provisionCustomerAccount(
        email,
        customerName,
        orderId || undefined
      );

      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(provisionResult));
      return;
    }

    // =========================================================================
    // 0. ORDER CREATION / PERSISTENCE (Server-Side Fallback)
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

      const clientToken =
        (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")
          ? req.headers.authorization.slice(7).trim()
          : undefined) ||
        ((body as any).idToken ? String((body as any).idToken).trim() : undefined);

      const orderPayload = {
        ...body,
        id,
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

      if (id && customerName && !dispatchedConfirmationOrders.has(id)) {
        dispatchedConfirmationOrders.add(id);
        const orderData: OrderEmailData = {
          id,
          customerName,
          email: email || undefined,
          phone: body.phone || body.customerPhone || undefined,
          total: Number(body.total) || 0,
          subtotal: typeof body.subtotal === "number" ? body.subtotal : undefined,
          deliveryFee: typeof body.deliveryFee === "number" ? body.deliveryFee : undefined,
          discount: typeof body.discount === "number" ? body.discount : undefined,
          couponCode: body.couponCode ? String(body.couponCode) : undefined,
          paymentMethod: body.paymentMethod ? String(body.paymentMethod) : undefined,
          paymentStatus: body.paymentStatus ? String(body.paymentStatus) : undefined,
          shippingAddress: body.shippingAddress,
          items: body.items,
          createdAt: body.createdAt || new Date().toISOString(),
        };
        sendAdminOrderNotification(orderData).catch((e) => console.warn("[Orders API] Admin alert notice:", e));
        if (email) {
          sendOrderConfirmation(orderData).then((r) => {
            if (r.delivered || r.success) {
              updateServerOrder(id, { confirmationEmailSentAt: new Date().toISOString() }).catch(() => {});
            }
          }).catch((e) => console.warn("[Orders API] Customer receipt notice:", e));
        }
      }

      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ success: true, orderId: id }));
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
