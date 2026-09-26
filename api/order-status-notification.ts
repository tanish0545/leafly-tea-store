import type { IncomingMessage, ServerResponse } from "http";
import { sendOrderStatusUpdate } from "./lib/mailer.js";
import { getServerOrder, updateServerOrder } from "./lib/firebaseAdmin.js";
import type {
  OrderStatusEmailData,
  OrderEmailItem,
  OrderEmailData,
} from "../src/lib/emailTemplates.js";

export interface OrderStatusNotificationRequest {
  orderId: string;
  newStatus: string;
  previousStatus?: string;
  customerEmail?: string;
  customerName?: string;
  total?: number;
  items?: OrderEmailItem[];
  shippingAddress?: OrderEmailData["shippingAddress"];
}

// In-memory set to prevent duplicate status email sends during rapid UI clicks or re-renders
const dispatchedStatusEvents = new Set<string>();

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
        // keep as is
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

    const body: OrderStatusNotificationRequest =
      typeof rawBody === "object" && rawBody !== null
        ? (rawBody as OrderStatusNotificationRequest)
        : ({} as OrderStatusNotificationRequest);

    const orderId = String(body.orderId || "").trim();
    const newStatus = String(body.newStatus || "").trim();

    if (!orderId || !newStatus) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "orderId and newStatus are required." }));
      return;
    }

    // 1. Idempotency Check in memory
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

    // 2. Fetch authoritative order data from Firestore if available
    const existingOrder = await getServerOrder(orderId);

    // 3. Database Idempotency Check
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

    // 4. Resolve verified customer email and order details
    const customerEmail = String(
      body.customerEmail || existingOrder?.customerEmail || ""
    ).trim().toLowerCase();
    const customerName = String(
      body.customerName ||
        existingOrder?.customerName ||
        (existingOrder?.shippingAddress as any)?.fullName ||
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

    // 6. Centralized Customer Status Dispatch
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
      // Track status email in Firestore
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
  } catch (error) {
    console.error("[API Order Status Notification Error]:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      })
    );
  }
}
