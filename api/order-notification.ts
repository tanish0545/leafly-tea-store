import type { IncomingMessage, ServerResponse } from "http";
import {
  sendAdminOrderNotification,
  sendOrderConfirmation,
  DEFAULT_CUSTOMER_SUPPORT_EMAIL,
  type MailResult,
} from "./lib/mailer.js";
import { updateServerOrder, getServerOrder } from "./lib/firebaseAdmin.js";
import type { Order } from "../src/types/contracts.js";
import type { OrderEmailData, OrderEmailItem } from "../src/lib/emailTemplates.js";

export type OrderNotificationRequest = Partial<Order> & Partial<OrderEmailData>;

// In-memory idempotency set to prevent duplicate sends from rapid duplicate network requests
const dispatchedConfirmationOrders = new Set<string>();

export default async function handler(req: IncomingMessage & { body?: unknown }, res: ServerResponse) {
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
        // keep
      }
    } else if (!rawBody) {
      const buffers = [];
      for await (const chunk of req) {
        buffers.push(chunk);
      }
      const raw = Buffer.concat(buffers).toString();
      try {
        rawBody = raw ? JSON.parse(raw) : {};
      } catch {
        rawBody = {};
      }
    }

    const body: OrderNotificationRequest =
      typeof rawBody === "object" && rawBody !== null
        ? (rawBody as OrderNotificationRequest)
        : {};

    const id = String(body.id || "").trim();
    const customerName = String(body.customerName || body.shippingAddress?.fullName || "").trim();
    // Prioritize verified customer email from user record/auth
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

    // Idempotency: Check if confirmation email was already dispatched for this order
    if (dispatchedConfirmationOrders.has(id)) {
      console.info(`[Leafly Mailer] Order #${id} confirmation email was already dispatched in this session. Skipping duplicate.`);
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ success: true, message: "Order confirmation email already processed.", duplicate: true }));
      return;
    }

    const existingOrder = await getServerOrder(id);
    if (existingOrder && existingOrder.confirmationEmailSentAt) {
      console.info(`[Leafly Mailer] Order #${id} already has confirmationEmailSentAt recorded in Firestore (${existingOrder.confirmationEmailSentAt}). Skipping duplicate.`);
      dispatchedConfirmationOrders.add(id);
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ success: true, message: "Order confirmation email already sent.", duplicate: true }));
      return;
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
    };

    // 1. Dispatch Admin Order Alert (to myleaflytea@gmail.com)
    const adminResult = await sendAdminOrderNotification(orderData);

    // 2. Dispatch Customer Order Confirmation
    let customerResult: MailResult = { success: false, delivered: false };
    const isValidEmail = Boolean(email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));

    if (isValidEmail) {
      customerResult = await sendOrderConfirmation(orderData);

      if (customerResult.delivered || customerResult.success) {
        dispatchedConfirmationOrders.add(id);
        // Track confirmation sent timestamp in Firestore
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
  } catch (error) {
    console.error("[API Order Notification Error]:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Failed to dispatch order notification." }));
  }
}
