import type { IncomingMessage, ServerResponse } from "node:http";
import {
  sendContactInquiry,
  sendGiftInquiry,
  sendNewsletterNotification,
  sendWelcomeNotification,
} from "./_lib/mailer.js";
import { getAdminFirestore } from "./_lib/firebaseAdmin.js";
import type {
  ContactEmailData,
  GiftingEmailData,
} from "../src/lib/emailTemplates.js";

// Rate limiting caches to prevent rapid spam or duplicate network requests
const recentContactSubmissions = new Map<string, number>();
const recentGiftingSubmissions = new Map<string, number>();
const recentNewsletterSubmissions = new Map<string, number>();

interface EmailRequestBody {
  action?: string;
  type?: string;
  referenceId?: string;
  id?: string;
  // Contact & Gifting fields
  name?: string;
  email?: string;
  phone?: string;
  subject?: string;
  message?: string;
  quantity?: string;
  // Newsletter field
  source?: string;
}

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
        // Keep rawBody
      }
    } else if (!rawBody) {
      const buffers: Buffer[] = [];
      for await (const chunk of req) {
        buffers.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
      }
      const raw = Buffer.concat(buffers).toString("utf-8");
      try {
        rawBody = raw ? JSON.parse(raw) : {};
      } catch {
        rawBody = {};
      }
    }

    const body = (typeof rawBody === "object" && rawBody !== null
      ? rawBody
      : {}) as EmailRequestBody;

    // Resolve action from URL query or body
    const urlObj = new URL(req.url || "", "http://localhost");
    const queryAction = urlObj.searchParams.get("action") || urlObj.searchParams.get("type");
    let action = (queryAction || body.action || body.type || "").trim().toLowerCase();

    // Smart auto-detection if action is not explicitly passed
    if (!action) {
      if (body.quantity) {
        action = "gifting";
      } else if (body.subject || (body.message && body.name)) {
        action = "contact";
      } else if (body.source && !body.message) {
        action = "newsletter";
      } else if (body.name && body.email && !body.message) {
        action = "welcome";
      }
    }

    // =========================================================================
    // 1. NEWSLETTER / SUBSCRIBE
    // =========================================================================
    if (action === "newsletter" || action === "subscribe") {
      const email = (body.email || "").trim().toLowerCase();
      const source = (body.source || "Website Footer").trim();

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
      const lastSub = recentNewsletterSubmissions.get(email);
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
      recentNewsletterSubmissions.set(email, now);

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
      return;
    }

    // =========================================================================
    // 2. CONTACT US FORM
    // =========================================================================
    if (action === "contact") {
      const name = (body.name || "").trim();
      const email = (body.email || "").trim().toLowerCase();
      const phone = (body.phone || "").trim();
      const subject = (body.subject || "General Inquiry").trim();
      const message = (body.message || "").trim();

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

      // Rate limiting: avoid accidental double-clicks within 15 seconds
      const dedupKey = `${email}-${subject}`;
      const now = Date.now();
      const lastSub = recentContactSubmissions.get(dedupKey);
      if (lastSub && now - lastSub < 15000) {
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            success: true,
            delivered: true,
            message: "We have already received your message. Thank you!",
            alreadyReceived: true,
          })
        );
        return;
      }
      recentContactSubmissions.set(dedupKey, now);

      const referenceId = (body.referenceId || body.id || `CT-${Date.now().toString(36).toUpperCase()}`).trim();

      // Safely ensure request is synced to Firestore 'requests' collection on server if Admin SDK is configured
      try {
        const adminDb = getAdminFirestore();
        if (adminDb) {
          await adminDb.collection("requests").doc(referenceId).set(
            {
              id: referenceId,
              type: "Contact",
              customerName: name,
              customerEmail: email,
              ...(phone ? { customerPhone: phone } : {}),
              subject,
              message,
              status: "NEW",
              createdAt: new Date().toISOString(),
            },
            { merge: true }
          );
        }
      } catch (dbErr) {
        console.warn("[API Email] Server Firestore contact sync notice:", dbErr);
      }

      const contactData: ContactEmailData = {
        name,
        email,
        phone: phone || undefined,
        subject,
        message,
        referenceId,
      };

      const inquiryResult = await sendContactInquiry(contactData);

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
          message: "Your message has been received. Check your email for confirmation.",
          adminAccepted: inquiryResult.adminResult.delivered,
          customerAccepted: inquiryResult.customerResult.delivered,
          messageId: inquiryResult.adminResult.messageId || inquiryResult.customerResult.messageId,
        })
      );
      return;
    }

    // =========================================================================
    // 3. BESPOKE GIFTING INQUIRY
    // =========================================================================
    if (action === "gifting") {
      const name = (body.name || "").trim();
      const email = (body.email || "").trim().toLowerCase();
      const phone = (body.phone || "").trim();
      const quantity = (body.quantity || "25-50").trim();
      const message = (body.message || "").trim();

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

      const referenceId = (body.referenceId || body.id || `GF-${Date.now().toString(36).toUpperCase()}`).trim();

      // Safely ensure request is synced to Firestore 'requests' collection on server if Admin SDK is configured
      try {
        const adminDb = getAdminFirestore();
        if (adminDb) {
          await adminDb.collection("requests").doc(referenceId).set(
            {
              id: referenceId,
              type: "Gifting",
              customerName: name,
              customerEmail: email,
              ...(phone ? { customerPhone: phone } : {}),
              quantity,
              ...(message ? { message } : {}),
              status: "NEW",
              createdAt: new Date().toISOString(),
            },
            { merge: true }
          );
        }
      } catch (dbErr) {
        console.warn("[API Email] Server Firestore gifting sync notice:", dbErr);
      }

      const giftingData: GiftingEmailData = {
        name,
        email,
        phone: phone || undefined,
        quantity,
        message,
        referenceId,
      };

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
      return;
    }

    // =========================================================================
    // 4. WELCOME EMAIL
    // =========================================================================
    if (action === "welcome") {
      const email = String(body.email || "").trim().toLowerCase();
      const name = String(body.name || "Valued Patron").trim();

      if (!email) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Email is required." }));
        return;
      }

      const result = await sendWelcomeNotification(name, email);

      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(result));
      return;
    }

    // Unknown action
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        error: `Invalid or missing action: "${action}". Supported actions: newsletter, contact, gifting, welcome.`,
      })
    );
  } catch (error) {
    console.error("[API Email Handler Error]:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        success: false,
        delivered: false,
        error: "Internal server error while processing email request.",
      })
    );
  }
}
