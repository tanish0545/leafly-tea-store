import type { IncomingMessage, ServerResponse } from "http";
import { sendMail, getAdminEmail } from "./lib/mailer";
import {
  getNewsletterWelcomeEmail,
  getNewsletterAdminNotification,
} from "../src/lib/emailTemplates";

// Rate limiting cache (IP / email based simple in-memory)
const recentSubmissions = new Map<string, number>();

export default async function handler(req: IncomingMessage & { body?: unknown }, res: ServerResponse) {
  // Enable CORS
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
        // keep as is
      }
    } else if (!body) {
      // Parse chunks if body is stream
      const buffers = [];
      for await (const chunk of req) {
        buffers.push(chunk);
      }
      const raw = Buffer.concat(buffers).toString();
      body = raw ? JSON.parse(raw) : {};
    }

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
          message: "You are already subscribed to Leafly. Thank you!",
          alreadySubscribed: true,
        })
      );
      return;
    }
    recentSubmissions.set(email, now);

    // 1. Prepare Customer Confirmation Email
    const customerMail = getNewsletterWelcomeEmail(email);

    // 2. Prepare Company Notification Email
    const adminEmail = getAdminEmail();
    const adminMail = getNewsletterAdminNotification(email, source);

    // Dispatch both emails in parallel
    const [customerRes, adminRes] = await Promise.allSettled([
      sendMail({
        to: email,
        subject: customerMail.subject,
        html: customerMail.html,
      }),
      sendMail({
        to: adminEmail,
        subject: adminMail.subject,
        html: adminMail.html,
      }),
    ]);

    const isCustomerSent = customerRes.status === "fulfilled" && customerRes.value.success;
    const isAdminSent = adminRes.status === "fulfilled" && adminRes.value.success;

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        success: true,
        message: "Thank you for subscribing to the Leafly ritual!",
        customerDelivered: isCustomerSent,
        adminNotified: isAdminSent,
      })
    );
  } catch (error) {
    console.error("[API Newsletter Error]:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        error: "We couldn't process your subscription right now. Please try again in a moment.",
      })
    );
  }
}
