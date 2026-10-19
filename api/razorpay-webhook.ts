import type { IncomingMessage, ServerResponse } from "node:http";
import {
  verifyRazorpayWebhookSignature,
  getRazorpayWebhookSecret,
} from "./_lib/razorpay.js";
import { updateServerOrder, getServerOrder } from "./_lib/firebaseAdmin.js";
import { sendAdminOrderNotification, sendOrderConfirmation } from "./_lib/mailer.js";
import type { OrderEmailData } from "./_lib/emailTemplates.js";

// Idempotency cache to prevent duplicate processing of the same webhook event
const processedWebhookEvents = new Set<string>();

export default async function handler(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse
) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-razorpay-signature");

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
    // 1. Read Raw Body Buffer for Signature Verification
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    }
    const rawBodyBuffer = Buffer.concat(chunks);
    const rawBody = rawBodyBuffer.toString("utf-8");

    const signatureHeader = req.headers["x-razorpay-signature"] as string | undefined;

    const webhookSecret = getRazorpayWebhookSecret();
    if (!webhookSecret) {
      console.error("[Razorpay Webhook Error] Razorpay webhook secret not configured on server.");
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Webhook configuration error." }));
      return;
    }

    if (!signatureHeader) {
      console.warn("[Razorpay Webhook Warning] Missing x-razorpay-signature header.");
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Missing signature header." }));
      return;
    }

    // 2. Verify Razorpay Webhook Signature (HMAC-SHA256)
    const isValidSignature = verifyRazorpayWebhookSignature(rawBody, signatureHeader);

    if (!isValidSignature) {
      console.warn("[Razorpay Webhook Warning] Invalid webhook signature detected. Request rejected.");
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Invalid webhook signature." }));
      return;
    }

    // 3. Parse Verified Event Body
    let eventData: Record<string, any> = {};
    try {
      eventData = JSON.parse(rawBody);
    } catch {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Malformed JSON payload." }));
      return;
    }

    const eventType = String(eventData.event || "").toLowerCase();
    const payload = eventData.payload || {};
    const paymentEntity = payload.payment?.entity || {};
    const orderEntity = payload.order?.entity || {};

    // Resolve Leafly order ID from receipt or notes
    const orderId = String(
      orderEntity.receipt ||
      orderEntity.notes?.orderId ||
      paymentEntity.notes?.orderId ||
      ""
    ).trim();

    const paymentId = String(paymentEntity.id || "");
    const razorpayOrderId = String(orderEntity.id || paymentEntity.order_id || "");
    const paymentStatus = String(paymentEntity.status || "").toLowerCase();

    if (!orderId) {
      console.info(`[Razorpay Webhook] Webhook event ${eventType} has no recognized Leafly orderId. Acknowledging.`);
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ success: true, message: "Acknowledged non-order event." }));
      return;
    }

    // 4. Idempotency Check: Avoid duplicate event processing
    const eventKey = `${orderId}_${paymentId}_${eventType}_${paymentStatus}`;
    if (processedWebhookEvents.has(eventKey)) {
      console.info(`[Razorpay Webhook] Event ${eventKey} already processed. Acknowledging.`);
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ success: true, message: "Event already processed." }));
      return;
    }
    processedWebhookEvents.add(eventKey);

    console.info(
      `[Razorpay Webhook] Verified event "${eventType}" for order #${orderId}, payment status: ${paymentStatus}`
    );

    // 5. Handle Payment Success (payment.captured, order.paid)
    const isSuccess =
      eventType === "payment.captured" ||
      eventType === "order.paid" ||
      paymentStatus === "captured";

    if (isSuccess) {
      const existingOrder = await getServerOrder(orderId);
      const isAlreadyConfirmed =
        (existingOrder?.paymentStatus || "").toString().toLowerCase() === "paid" &&
        (existingOrder?.orderStatus || existingOrder?.status || "").toString().toLowerCase() === "confirmed";

      if (isAlreadyConfirmed) {
        console.info(`[Razorpay Webhook] Order #${orderId} is already marked as Paid/Confirmed. Acknowledging idempotently.`);
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: true, message: "Order was already confirmed." }));
        return;
      }

      let paymentMethod = "Razorpay Online Payment";
      if (paymentEntity.method) {
        paymentMethod = `Razorpay Online (${String(paymentEntity.method).toUpperCase()})`;
      }

      // Authoritative Firestore Update
      const updateResult = await updateServerOrder(orderId, {
        status: "Confirmed",
        orderStatus: "Confirmed",
        paymentStatus: "Paid",
        paymentId: paymentId || undefined,
        razorpayPaymentId: paymentId || undefined,
        razorpayOrderId: razorpayOrderId || undefined,
        paymentMethod,
      });

      if (!updateResult.success) {
        console.error(
          `[Razorpay Webhook Notice] Order #${orderId} verified by Razorpay webhook, but Firestore update failed: ${updateResult.error}`
        );
      }

      // Send confirmation emails if not sent yet
      const customerEmail =
        String(existingOrder?.customerEmail || paymentEntity.email || "").trim().toLowerCase();
      const customerName =
        String(existingOrder?.customerName || paymentEntity.notes?.customerName || "Valued Patron").trim();
      const customerPhone =
        String(existingOrder?.customerPhone || paymentEntity.contact || "").trim();
      const total = Number(existingOrder?.total || (paymentEntity.amount ? paymentEntity.amount / 100 : 0));

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
        sendAdminOrderNotification(emailPayload),
      ];

      if (customerEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
        emailPromises.push(
          sendOrderConfirmation(emailPayload).then(async (result) => {
            if (result.delivered || result.success) {
              const now = new Date().toISOString();
              await updateServerOrder(orderId, {
                confirmationEmailSentAt: now,
                paymentEmailSentAt: now,
              });
            }
          })
        );
      }

      Promise.allSettled(emailPromises).catch((err) => {
        console.warn("[Razorpay Webhook Notice] Email dispatch notice:", err);
      });

      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ success: true, message: "Order confirmed via webhook." }));
      return;
    }

    // 6. Handle Payment Failure (payment.failed)
    if (eventType === "payment.failed") {
      console.warn(`[Razorpay Webhook] Payment failed for order #${orderId}:`, paymentEntity.error_description || "Unknown error");
      // Update order payment status if not already paid
      const existingOrder = await getServerOrder(orderId);
      const isAlreadyPaid = (existingOrder?.paymentStatus || "").toString().toLowerCase() === "paid";
      if (!isAlreadyPaid) {
        await updateServerOrder(orderId, {
          paymentStatus: "Failed",
          lastPaymentError: paymentEntity.error_description || "Payment attempt failed",
        });
      }
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ success: true, message: "Failure recorded." }));
      return;
    }

    // Default acknowledgement for other events
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ success: true, message: `Event ${eventType} acknowledged.` }));
  } catch (error) {
    console.error("[API Razorpay Webhook Error]:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        error: "Internal server error processing webhook.",
      })
    );
  }
}
