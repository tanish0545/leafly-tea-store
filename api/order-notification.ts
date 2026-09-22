import type { IncomingMessage, ServerResponse } from "http";
import { sendMail, getAdminEmail } from "./lib/mailer";
import type { Order } from "../src/types/contracts";
import {
  getOrderConfirmationCustomerEmail,
  getOrderAdminNotificationEmail,
  type OrderEmailData,
  type OrderEmailItem,
} from "../src/lib/emailTemplates";

export type OrderNotificationRequest = Partial<Order> & Partial<OrderEmailData>;

export default async function handler(req: IncomingMessage & { body?: unknown }, res: ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

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

    const adminEmail = getAdminEmail();
    const adminMail = getOrderAdminNotificationEmail(orderData);

    const promises: Promise<unknown>[] = [
      sendMail({
        to: adminEmail,
        subject: adminMail.subject,
        html: adminMail.html,
      }),
    ];

    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      const customerMail = getOrderConfirmationCustomerEmail(orderData);
      promises.push(
        sendMail({
          to: email,
          subject: customerMail.subject,
          html: customerMail.html,
        })
      );
    }

    await Promise.allSettled(promises);

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ success: true, message: "Order notification emails processed." }));
  } catch (error) {
    console.error("[API Order Notification Error]:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Failed to dispatch order notification." }));
  }
}
