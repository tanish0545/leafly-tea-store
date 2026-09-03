import type { IncomingMessage, ServerResponse } from "http";
import { sendMail, getAdminEmail } from "./lib/mailer";
import {
  getOrderConfirmationCustomerEmail,
  getOrderAdminNotificationEmail,
  type OrderEmailData,
} from "../src/lib/emailTemplates";

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
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        // keep
      }
    } else if (!body) {
      const buffers = [];
      for await (const chunk of req) {
        buffers.push(chunk);
      }
      const raw = Buffer.concat(buffers).toString();
      body = raw ? JSON.parse(raw) : {};
    }

    const id = String(body?.id || "").trim();
    const customerName = String(body?.customerName || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const phone = String(body?.phone || "").trim();
    const total = Number(body?.total) || 0;

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
