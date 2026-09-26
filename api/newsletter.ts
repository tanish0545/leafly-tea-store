import type { IncomingMessage, ServerResponse } from "http";
import { sendNewsletterNotification } from "./lib/mailer.js";

// Rate limiting cache (IP / email based simple in-memory)
const recentSubmissions = new Map<string, number>();

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
    interface NewsletterBody {
      email?: string;
      source?: string;
    }

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
      rawBody = raw ? JSON.parse(raw) : {};
    }

    const body = (rawBody || {}) as NewsletterBody;

    const email = (body?.email || "").trim().toLowerCase();
    const source = (body?.source || "Website Footer").trim();

    if (!email) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Email is required." }));
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Please enter a valid email address." }));
      return;
    }

    // Prevent rapid duplicate spam (within 30 seconds)
    const now = Date.now();
    const lastSub = recentSubmissions.get(email);
    if (lastSub && now - lastSub < 30000) {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          success: true,
          delivered: true,
          message: "You are already subscribed to Leafly. Thank you!",
          alreadySubscribed: true,
        })
      );
      return;
    }
    recentSubmissions.set(email, now);

    // Centralized Newsletter Dispatch (Subscriber Welcome + Admin Alert)
    const subResult = await sendNewsletterNotification(email, source);

    if (!subResult.adminResult.delivered && !subResult.customerResult.delivered) {
      const errorMsg =
        subResult.adminResult.error ||
        subResult.customerResult.error ||
        "Email delivery failed. SMTP provider did not accept message.";
      res.statusCode = 502;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          success: false,
          delivered: false,
          error: errorMsg,
          customerDelivered: false,
          adminNotified: false,
        })
      );
      return;
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        success: true,
        delivered: true,
        message: "Thank you for subscribing to the Leafly ritual!",
        customerDelivered: subResult.customerResult.delivered,
        adminNotified: subResult.adminResult.delivered,
        messageId: subResult.customerResult.messageId || subResult.adminResult.messageId,
      })
    );
  } catch (error) {
    console.error("[API Newsletter Error]:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        success: false,
        delivered: false,
        error: "Subscription service encountered an error. Please try again.",
      })
    );
  }
}
