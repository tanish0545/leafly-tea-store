import type { IncomingMessage, ServerResponse } from "http";
import { sendMail, getAdminEmail } from "./lib/mailer";
import {
  getGiftingConfirmationEmail,
  getGiftingAdminNotification,
  type GiftingEmailData,
} from "../src/lib/emailTemplates";

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

    // 1. Customer Confirmation Email
    const customerMail = getGiftingConfirmationEmail(giftingData);

    // 2. Company Admin Notification Email
    const adminEmail = getAdminEmail();
    const adminMail = getGiftingAdminNotification(giftingData);

    await Promise.allSettled([
      sendMail({
        to: email,
        subject: customerMail.subject,
        html: customerMail.html,
      }),
      sendMail({
        to: adminEmail,
        subject: adminMail.subject,
        html: adminMail.html,
        replyTo: email,
      }),
    ]);

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        success: true,
        referenceId,
        message: "Your bespoke gifting inquiry has been received. Check your email for confirmation.",
      })
    );
  } catch (error) {
    console.error("[API Gifting Error]:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        error: "We couldn't submit your gifting request right now. Please try again in a moment.",
      })
    );
  }
}
