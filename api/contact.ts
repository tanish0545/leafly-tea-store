import type { IncomingMessage, ServerResponse } from "http";
import { sendMail, getAdminEmail } from "./lib/mailer";
import {
  getContactConfirmationEmail,
  getContactAdminNotification,
  type ContactEmailData,
} from "../src/lib/emailTemplates";

const recentContactSubmissions = new Map<string, number>();

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
    interface ContactBody {
      name?: string;
      email?: string;
      phone?: string;
      subject?: string;
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

    const body = rawBody as ContactBody;

    const name = (body?.name || "").trim();
    const email = (body?.email || "").trim().toLowerCase();
    const phone = (body?.phone || "").trim();
    const subject = (body?.subject || "General Inquiry").trim();
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

    if (!message) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Please enter your message." }));
      return;
    }

    // Rate limiting
    const dedupKey = `${email}-${subject}`;
    const now = Date.now();
    const lastSub = recentContactSubmissions.get(dedupKey);
    if (lastSub && now - lastSub < 15000) {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          success: true,
          message: "We have already received your message. Thank you!",
          alreadyReceived: true,
        })
      );
      return;
    }
    recentContactSubmissions.set(dedupKey, now);

    const referenceId = `CT-${Date.now().toString(36).toUpperCase()}`;

    const contactData: ContactEmailData = {
      name,
      email,
      phone: phone || undefined,
      subject,
      message,
      referenceId,
    };

    // 1. Customer Confirmation Email
    const customerMail = getContactConfirmationEmail(contactData);

    // 2. Company Admin Notification Email
    const adminEmail = getAdminEmail();
    const adminMail = getContactAdminNotification(contactData);

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
        message: "Your message has been received. Check your email for confirmation.",
      })
    );
  } catch (error) {
    console.error("[API Contact Error]:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        error: "We couldn't submit your message right now. Please try again in a moment.",
      })
    );
  }
}
