import type { IncomingMessage, ServerResponse } from "node:http";
import {
  verifyRazorpayPaymentSignature,
  fetchRazorpayPayment,
  getSafeRazorpayDiagnostics,
} from "./_lib/razorpay.js";
import { updateServerOrder, getServerOrder } from "./_lib/firebaseAdmin.js";
import { sendAdminOrderNotification, sendOrderConfirmation } from "./_lib/mailer.js";
import type { OrderEmailData } from "./_lib/emailTemplates.js";

interface RazorpayVerifyRequestBody {
  orderId?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  customerEmail?: string;
  customerName?: string;
}

// In-memory set to deduplicate email dispatch across rapid verify calls and webhooks
const dispatchedEmailOrders = new Set<string>();

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

    const body: RazorpayVerifyRequestBody =
      typeof rawBody === "object" && rawBody !== null
        ? (rawBody as RazorpayVerifyRequestBody)
        : {};

    const orderId = String(body.orderId || "").trim();
    const razorpayOrderId = String(body.razorpayOrderId || "").trim();
    const razorpayPaymentId = String(body.razorpayPaymentId || "").trim();
    const razorpaySignature = String(body.razorpaySignature || "").trim();

    if (!orderId) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Order ID is required for verification." }));
      return;
    }

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          error: "Missing Razorpay payment verification parameters.",
          verified: false,
        })
      );
      return;
    }

    console.info(`[Razorpay Verify] Verifying signature for Leafly #${orderId} (Rzp Order: ${razorpayOrderId}, Payment: ${razorpayPaymentId})...`);

    // 1. Cryptographic HMAC-SHA256 signature verification
    const isSignatureValid = verifyRazorpayPaymentSignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    if (!isSignatureValid) {
      const diag = getSafeRazorpayDiagnostics();
      console.warn(
        `[Razorpay Verify Warning] Invalid payment signature for order #${orderId}. Payment rejected.`,
        {
          mode: diag.mode,
          keySecretPresent: diag.keySecretPresent,
          keySecretSource: diag.keySecretSource,
          keySecretLength: diag.keySecretLength,
          isPlaceholderSecret: diag.isPlaceholderSecret,
        }
      );
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          success: false,
          verified: false,
          error: "Payment verification failed: invalid signature. Please contact support if money was debited.",
        })
      );
      return;
    }

    // 2. Fetch authoritative payment status and method from Razorpay API
    let paymentMethod = "Razorpay Online Payment";
    let paymentStatus = "Paid";
    let captured = false;

    const paymentDetails = await fetchRazorpayPayment(razorpayPaymentId);
    if (paymentDetails) {
      const status = String(paymentDetails.status || "").toLowerCase();
      captured = status === "captured";

      // If authorized but not yet auto-captured, still valid payment in progress
      if (status === "captured" || status === "authorized") {
        paymentStatus = "Paid";
      } else if (status === "failed") {
        paymentStatus = "Failed";
      }

      if (paymentDetails.method) {
        const methodStr = String(paymentDetails.method).toUpperCase();
        paymentMethod = `Razorpay Online (${methodStr})`;
      }
    }

    if (paymentStatus !== "Paid") {
      console.warn(`[Razorpay Verify] Payment status from gateway is ${paymentStatus} for #${orderId}`);
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          success: false,
          verified: false,
          paymentStatus,
          error: "Payment was not captured by the payment gateway.",
        })
      );
      return;
    }

    console.info(`[Razorpay Verify] Order #${orderId} SIGNATURE VERIFIED AS PAID. Checking idempotency & updating Firestore...`);

    // 3. Idempotency Check: Verify if already marked as Paid/Confirmed
    const existingOrder = await getServerOrder(orderId);
    const isAlreadyConfirmed =
      (existingOrder?.paymentStatus || "").toString().toLowerCase() === "paid" &&
      (existingOrder?.orderStatus || existingOrder?.status || "").toString().toLowerCase() === "confirmed";

    if (isAlreadyConfirmed) {
      console.info(`[Razorpay Verify] Order #${orderId} was already marked as Paid/Confirmed. Returning success idempotently.`);
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          success: true,
          verified: true,
          orderStatus: "Confirmed",
          paymentStatus: "Paid",
          paymentId: razorpayPaymentId,
          paymentMethod: String(existingOrder?.paymentMethod || paymentMethod),
          alreadyProcessed: true,
        })
      );
      return;
    }

    // 4. Trusted Server-Side Firestore Update
    const updateResult = await updateServerOrder(orderId, {
      status: "Confirmed",
      orderStatus: "Confirmed",
      paymentStatus: "Paid",
      paymentId: razorpayPaymentId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      paymentMethod,
    });

    if (!updateResult.success) {
      console.error(
        `[Razorpay Verify Notice] Order #${orderId} payment is verified by Razorpay, but Firestore update failed: ${updateResult.error}`
      );
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          success: false,
          verified: true,
          error: "Payment was successfully verified on Razorpay, but updating the order in Firestore failed. Please verify server Firebase Admin credentials.",
          details: updateResult.error,
        })
      );
      return;
    }

    // 5. Idempotent Order Notification Emails
    if (!dispatchedEmailOrders.has(orderId) && !existingOrder?.confirmationEmailSentAt) {
      dispatchedEmailOrders.add(orderId);

      const customerEmail =
        String(existingOrder?.customerEmail || body.customerEmail || "").trim().toLowerCase();
      const customerName =
        String(existingOrder?.customerName || body.customerName || "Valued Patron").trim();
      const customerPhone =
        String(existingOrder?.customerPhone || "").trim();
      const total = Number(existingOrder?.total || 0);

      const emailPayload: OrderEmailData = {
        id: orderId,
        customerName,
        email: customerEmail || undefined,
        phone: customerPhone || undefined,
        total,
        subtotal: typeof existingOrder?.subtotal === "number" ? existingOrder.subtotal : undefined,
        deliveryFee: typeof existingOrder?.deliveryFee === "number" ? existingOrder.deliveryFee : undefined,
        discount: typeof existingOrder?.discount === "number" ? existingOrder.discount : undefined,
        couponCode: existingOrder?.couponCode ? String(existingOrder.couponCode) : undefined,
        paymentMethod,
        paymentStatus: "Paid",
        shippingAddress: existingOrder?.shippingAddress as OrderEmailData["shippingAddress"],
        items: existingOrder?.items as OrderEmailData["items"],
        createdAt: String(existingOrder?.createdAt || new Date().toISOString()),
      };

      const emailPromises: Promise<unknown>[] = [
        sendAdminOrderNotification(emailPayload).catch((e) =>
          console.warn("[Razorpay Verify Notice] Admin alert notice:", e)
        ),
      ];

      if (customerEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
        emailPromises.push(
          sendOrderConfirmation(emailPayload)
            .then(async (result) => {
              if (result.delivered || result.success) {
                const now = new Date().toISOString();
                await updateServerOrder(orderId, {
                  confirmationEmailSentAt: now,
                  paymentEmailSentAt: now,
                }).catch(() => {});
              }
            })
            .catch((e) =>
              console.warn("[Razorpay Verify Notice] Customer confirmation notice:", e)
            )
        );
      }

      await Promise.allSettled(emailPromises);
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        success: true,
        verified: true,
        orderStatus: "Confirmed",
        paymentStatus: "Paid",
        paymentId: razorpayPaymentId,
        paymentMethod,
      })
    );
  } catch (error) {
    console.error("[API Razorpay Verify Error]:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        error: "Internal server error while verifying payment. Please try again.",
        verified: false,
      })
    );
  }
}
