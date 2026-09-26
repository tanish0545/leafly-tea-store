import type { IncomingMessage, ServerResponse } from "http";
import crypto from "crypto";
import { updateServerOrder, getServerOrder } from "./lib/firebaseAdmin.js";
import { sendAdminOrderNotification, sendOrderConfirmation, DEFAULT_CUSTOMER_SUPPORT_EMAIL } from "./lib/mailer.js";
import {
  getOrderConfirmationCustomerEmail,
  getOrderAdminNotificationEmail,
  type OrderEmailData,
} from "../src/lib/emailTemplates.js";

// Idempotency cache to prevent duplicate processing of the same webhook event
const processedWebhookEvents = new Set<string>();

export default async function handler(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse
) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-webhook-signature, x-webhook-timestamp");

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

    const signatureHeader = req.headers["x-webhook-signature"] as string | undefined;
    const timestampHeader = req.headers["x-webhook-timestamp"] as string | undefined;

    const clientSecret = process.env.CASHFREE_CLIENT_SECRET?.trim();

    if (!clientSecret) {
      console.error("[Cashfree Webhook Error] CASHFREE_CLIENT_SECRET not configured on server.");
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Webhook configuration error." }));
      return;
    }

    if (!signatureHeader || !timestampHeader) {
      console.warn("[Cashfree Webhook Warning] Missing webhook signature or timestamp headers.");
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Missing signature or timestamp headers." }));
      return;
    }

    // 2. Verify Cashfree Webhook Signature (HMAC-SHA256)
    const signaturePayload = timestampHeader + rawBody;
    const computedSignature = crypto
      .createHmac("sha256", clientSecret)
      .update(signaturePayload)
      .digest("base64");

    const signatureBuffer = Buffer.from(signatureHeader, "utf-8");
    const computedBuffer = Buffer.from(computedSignature, "utf-8");

    const isValidSignature =
      signatureBuffer.length === computedBuffer.length &&
      crypto.timingSafeEqual(signatureBuffer, computedBuffer);

    if (!isValidSignature) {
      console.warn("[Cashfree Webhook Warning] Invalid webhook signature detected. Request rejected.");
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Invalid webhook signature." }));
      return;
    }

    // 3. Parse Verified Event Body
    let eventData: Record<string, unknown> = {};
    try {
      eventData = JSON.parse(rawBody);
    } catch {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Malformed JSON payload." }));
      return;
    }

    const eventType = String(eventData.type || eventData.event || "").toUpperCase();
    const dataObj = (eventData.data || eventData) as Record<string, unknown>;
    const orderObj = (dataObj.order || {}) as Record<string, unknown>;
    const paymentObj = (dataObj.payment || {}) as Record<string, unknown>;

    const orderId = String(orderObj.order_id || dataObj.order_id || "");
    const paymentStatus = String(
      paymentObj.payment_status || dataObj.payment_status || ""
    ).toUpperCase();
    const paymentId = String(
      paymentObj.cf_payment_id || dataObj.cf_payment_id || ""
    );

    if (!orderId) {
      console.warn("[Cashfree Webhook Warning] Webhook event does not contain a valid order_id.");
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ success: true, message: "Ignored event without order ID." }));
      return;
    }

    // 4. Idempotency Check: Avoid processing the exact event twice
    const eventKey = `${orderId}_${paymentId}_${eventType}_${paymentStatus}`;
    if (processedWebhookEvents.has(eventKey)) {
      console.info(`[Cashfree Webhook] Event ${eventKey} already processed. Acknowledging.`);
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ success: true, message: "Event already processed." }));
      return;
    }
    processedWebhookEvents.add(eventKey);

    console.info(
      `[Cashfree Webhook] Verified event ${eventType} for order #${orderId}, payment status: ${paymentStatus}`
    );

    // 5. Handle Payment Success
    const isSuccess =
      paymentStatus === "SUCCESS" ||
      eventType === "PAYMENT_SUCCESS_WEBHOOK" ||
      eventType === "ORDER_PAID_SUCCESS";

    if (isSuccess) {
      // Idempotency: check if already paid/confirmed
      const existingOrder = await getServerOrder(orderId);
      const isAlreadyConfirmed =
        (existingOrder?.paymentStatus || "").toString().toLowerCase() === "paid" &&
        (existingOrder?.orderStatus || existingOrder?.status || "").toString().toLowerCase() === "confirmed";

      if (isAlreadyConfirmed) {
        console.info(`[Cashfree Webhook] Order #${orderId} is already marked as Paid/Confirmed. Acknowledging idempotently.`);
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: true, message: "Order already confirmed and paid." }));
        return;
      }

      // Update Firestore order to Paid/Confirmed
      const updateResult = await updateServerOrder(orderId, {
        status: "Confirmed",
        orderStatus: "Confirmed",
        paymentStatus: "Paid",
        paymentId: paymentId || undefined,
        cfPaymentId: paymentId || undefined,
        paymentMethod: "Cashfree Online Payment",
      });

      if (!updateResult.success) {
        console.error(`[Cashfree Webhook Error] Firestore update failed for order #${orderId}: ${updateResult.error}`);
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Failed to update Firestore order status.", details: updateResult.error }));
        return;
      }

      // Dispatch Notifications Idempotently
      const customerEmail = String(
        existingOrder?.customerEmail || (dataObj.customer_details as Record<string, unknown>)?.customer_email || ""
      ).trim().toLowerCase();
      const customerName = String(
        existingOrder?.customerName || (dataObj.customer_details as Record<string, unknown>)?.customer_name || "Valued Patron"
      ).trim();
      const customerPhone = String(
        existingOrder?.customerPhone || (dataObj.customer_details as Record<string, unknown>)?.customer_phone || ""
      ).trim();
      const total = Number(existingOrder?.total || orderObj.order_amount || 0);

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
        paymentMethod: "Cashfree Online Payment",
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
          sendOrderConfirmation(emailPayload).then(async (res) => {
            if (res.delivered || res.success) {
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
        console.warn("[Cashfree Webhook Notice] Email dispatch notice:", err);
      });
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ success: true, message: "Webhook successfully processed." }));
  } catch (error) {
    console.error("[API Cashfree Webhook Error]:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Internal webhook processing error." }));
  }
}
