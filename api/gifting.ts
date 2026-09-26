import type { IncomingMessage, ServerResponse } from "http";
import { sendGiftInquiry } from "./lib/mailer.js";
import type { GiftingEmailData } from "../src/lib/emailTemplates.js";

const recentGiftingSubmissions = new Map<string, number>();

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
    interface GiftingBody {
      name?: string;
      email?: string;
      phone?: string;
      quantity?: string;
      message?: string;
    }

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
      rawBody = raw ? JSON.parse(raw) : {};
    }

    const body = (rawBody || {}) as GiftingBody;

    const name = (body?.name || "").trim();
    const email = (body?.email || "").trim().toLowerCase();
    const phone = (body?.phone || "").trim();
    const quantity = (body?.quantity || "25-50").trim();
    const message = (body?.message || "").trim();

    if (!name) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Please enter your full name." }));
      return;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Please enter a valid email address." }));
      return;
    }

    // Rate limiting: avoid accidental double-clicks within 15 seconds
    const dedupKey = `${email}-${quantity}`;
    const now = Date.now();
    const lastSub = recentGiftingSubmissions.get(dedupKey);
    if (lastSub && now - lastSub < 15000) {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          success: true,
          delivered: true,
          message: "We have already received your gifting request. Thank you!",
          alreadyReceived: true,
        })
      );
      return;
    }
    recentGiftingSubmissions.set(dedupKey, now);

    const referenceId = `GF-${Date.now().toString(36).toUpperCase()}`;

    const giftingData: GiftingEmailData = {
      name,
      email,
      phone,
      quantity,
      message,
      referenceId,
    };

    // Centralized Gifting Dispatch (Customer Confirmation + Concierge Alert)
    const inquiryResult = await sendGiftInquiry(giftingData);

    if (!inquiryResult.adminResult.delivered && !inquiryResult.customerResult.delivered) {
      const errorMsg =
        inquiryResult.adminResult.error ||
        inquiryResult.customerResult.error ||
        "Email delivery failed. SMTP provider did not accept message.";
      res.statusCode = 502;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          success: false,
          delivered: false,
          referenceId,
          error: errorMsg,
          adminAccepted: false,
          customerAccepted: false,
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
        referenceId,
        message: "Your bespoke gifting inquiry has been received. Check your email for confirmation.",
        adminAccepted: inquiryResult.adminResult.delivered,
        customerAccepted: inquiryResult.customerResult.delivered,
        messageId: inquiryResult.adminResult.messageId || inquiryResult.customerResult.messageId,
      })
    );
  } catch (error) {
    console.error("[API Gifting Error]:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        success: false,
        delivered: false,
        error: "We couldn't submit your gifting request right now. Please try again in a moment.",
      })
    );
  }
}
