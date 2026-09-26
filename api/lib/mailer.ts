/// <reference types="node" />
/**
 * Leafly — Centralized Production Email Service
 * 
 * Reusable, unified SMTP mailer used by all non-password-reset email flows:
 * - Customer Order Confirmations
 * - Admin Order Notifications
 * - Order Status Updates
 * - Contact Us Form Inquiries
 * - Bespoke Gifting Form Inquiries
 * - Newsletter / Subscription Alerts
 * - New Account Welcome Emails
 * 
 * Securely uses Gmail SMTP over TLS (smtp.gmail.com:465)
 * Reads credentials strictly from server environment variables (GMAIL_USER, GMAIL_APP_PASSWORD)
 * Never exposes credentials to client-side code.
 */

import nodemailer from "nodemailer";
import {
  getOrderConfirmationCustomerEmail,
  getOrderAdminNotificationEmail,
  getContactConfirmationEmail,
  getContactAdminNotification,
  getGiftingConfirmationEmail,
  getGiftingAdminNotification,
  getNewsletterWelcomeEmail,
  getNewsletterAdminNotification,
  getOrderStatusCustomerEmail,
  getAccountWelcomeEmail,
  type OrderEmailData,
  type ContactEmailData,
  type GiftingEmailData,
  type OrderStatusEmailData,
} from "../../src/lib/emailTemplates";

export type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  orderId?: string;
  emailType?: string;
};

export type MailResult = {
  success: boolean;
  delivered: boolean;
  messageId?: string;
  simulated?: boolean;
  error?: string;
};

export type VerifySmtpResult = {
  configured: boolean;
  connected: boolean;
  authenticated: boolean;
  error?: string;
};

export const DEFAULT_CUSTOMER_SUPPORT_EMAIL = "myleaflytea@gmail.com";
export const LEAFLY_HEADQUARTERS_ADDRESS = "Leafly near Balaji Symphony, Panvel, Maharashtra - 410206";

/**
 * Returns the verified recipient for internal company & admin notifications.
 * Strictly defaults to myleaflytea@gmail.com.
 * leaflydatabase@gmail.com is an internal auth identity and is never used as contact or notification destination.
 */
export function getAdminEmail(): string {
  if (process.env.ADMIN_NOTIFICATION_EMAIL) {
    return process.env.ADMIN_NOTIFICATION_EMAIL.trim();
  }
  const configuredAdmin = process.env.ADMIN_EMAIL || process.env.VITE_ADMIN_EMAIL;
  if (configuredAdmin && configuredAdmin.trim().toLowerCase() !== "leaflydatabase@gmail.com") {
    return configuredAdmin.trim();
  }
  return DEFAULT_CUSTOMER_SUPPORT_EMAIL;
}

/**
 * Resolves the verified From header identity.
 * Always presents consistent, professional Leafly branding.
 */
export function getFromEmail(): string {
  const rawUser = process.env.GMAIL_USER || process.env.EMAIL_USER || process.env.SMTP_USER;
  const user = rawUser?.trim();
  if (process.env.EMAIL_FROM) {
    return process.env.EMAIL_FROM;
  }
  if (user) {
    return `Leafly <${user}>`;
  }
  return `Leafly <${DEFAULT_CUSTOMER_SUPPORT_EMAIL}>`;
}

let cachedTransporterKey: string | null = null;
let cachedTransporter: nodemailer.Transporter | null = null;

/**
 * Instantiates or retrieves the cached Nodemailer Transporter.
 * Automatically validates credentials and strips spaces from 16-digit Google App Passwords.
 */
export function getTransporter(): nodemailer.Transporter | null {
  const rawUser = process.env.GMAIL_USER || process.env.EMAIL_USER || process.env.SMTP_USER;
  const rawPass =
    process.env.GMAIL_APP_PASSWORD ||
    process.env.EMAIL_PASSWORD ||
    process.env.SMTP_PASS ||
    process.env.SMTP_PASSWORD;
  const user = rawUser?.trim();
  // Strip spaces in case 16-digit Google App Password was copied with spaces (e.g. "abcd efgh ijkl mnop")
  const pass = rawPass?.replace(/\s+/g, "").trim();

  if (!user || !pass) {
    cachedTransporter = null;
    cachedTransporterKey = null;
    return null;
  }

  const currentKey = `${user}:${pass}`;
  if (cachedTransporter && cachedTransporterKey === currentKey) {
    return cachedTransporter;
  }

  const isExplicitHost = process.env.SMTP_HOST && process.env.SMTP_HOST !== "smtp.gmail.com";
  if (!isExplicitHost) {
    cachedTransporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true, // Secure TLS over port 465
      auth: {
        user,
        pass,
      },
    });
  } else {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || "465", 10);
    const secure = port === 465;
    cachedTransporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });
  }

  cachedTransporterKey = currentKey;
  return cachedTransporter;
}

/**
 * Strips HTML formatting to create a clean, accessible plain-text alternative.
 * Essential for Gmail deliverability and anti-spam scoring.
 */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*[\/]?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/gi, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/₹/g, "₹ ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Diagnostic method to verify SMTP connectivity and authentication without sending email
 */
export async function verifySmtp(): Promise<VerifySmtpResult> {
  const transporter = getTransporter();
  if (!transporter) {
    return {
      configured: false,
      connected: false,
      authenticated: false,
      error: "GMAIL_USER and GMAIL_APP_PASSWORD are not configured in environment variables.",
    };
  }

  try {
    await transporter.verify();
    return {
      configured: true,
      connected: true,
      authenticated: true,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      configured: true,
      connected: false,
      authenticated: false,
      error: errorMsg,
    };
  }
}

/**
 * Core centralized email delivery function.
 * Handles TLS connection, logging, MIME generation, and structured provider status reporting.
 */
export async function sendEmail(payload: EmailPayload): Promise<MailResult> {
  const transporter = getTransporter();
  const configured = Boolean(transporter);

  console.info(`[Leafly Mailer] SMTP credentials configured: ${configured ? "yes" : "no"}`);
  if (payload.emailType) {
    console.info(`[Leafly Mailer] Sending ${payload.emailType}`);
  } else {
    console.info(`[Leafly Mailer] Sending email...`);
  }
  if (payload.orderId) {
    console.info(`[Leafly Mailer] Order: ${payload.orderId}`);
  }
  console.info(`[Leafly Mailer] Recipient: ${payload.to}`);

  if (!transporter) {
    console.warn(
      `[Leafly Mailer] WARNING: No SMTP credentials found. Email NOT sent to <${payload.to}>. Please set GMAIL_USER and GMAIL_APP_PASSWORD in server environment variables.`
    );
    console.info(`[Leafly Mailer] Provider accepted message: false`);
    return {
      success: false,
      delivered: false,
      simulated: false,
      error: "GMAIL_USER and GMAIL_APP_PASSWORD are required in environment variables for email delivery.",
    };
  }

  try {
    const plainText = payload.text || htmlToPlainText(payload.html);
    const info = await transporter.sendMail({
      from: getFromEmail(),
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: plainText,
      replyTo: payload.replyTo || DEFAULT_CUSTOMER_SUPPORT_EMAIL,
    });

    console.info(`[Leafly Mailer] Provider accepted message: true`);
    console.info(`[Leafly Mailer] Successfully sent email to <${payload.to}> (ID: ${info.messageId})`);
    return {
      success: true,
      delivered: true,
      messageId: info.messageId,
      simulated: false,
    };
  } catch (error) {
    console.error(`[Leafly Mailer] Provider accepted message: false`);
    console.error(`[Leafly Mailer Error] Failed to send email to <${payload.to}>:`, error);
    return {
      success: false,
      delivered: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Backward and forward compatibility alias for sendEmail
 */
export const sendMail = sendEmail;

// ============================================================================
// CENTRALIZED TRANSACTIONAL EMAIL HELPERS
// Used consistently by all endpoints, webhooks, and forms
// ============================================================================

/**
 * Dispatches customer order confirmation email with full dynamic items breakdown.
 */
export async function sendOrderConfirmation(orderData: OrderEmailData): Promise<MailResult> {
  const email = (orderData.email || "").trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.warn(`[Leafly Mailer] Skipping customer order confirmation: invalid or missing recipient email "${email}".`);
    return {
      success: false,
      delivered: false,
      error: `Invalid or missing recipient email: "${email}"`,
    };
  }

  const customerMail = getOrderConfirmationCustomerEmail(orderData);
  return sendEmail({
    to: email,
    subject: customerMail.subject,
    html: customerMail.html,
    orderId: orderData.id,
    emailType: "order confirmation",
    replyTo: DEFAULT_CUSTOMER_SUPPORT_EMAIL,
  });
}

/**
 * Dispatches admin order alert to myleaflytea@gmail.com with customer & item details.
 */
export async function sendAdminOrderNotification(orderData: OrderEmailData): Promise<MailResult> {
  const adminEmail = getAdminEmail();
  const adminMail = getOrderAdminNotificationEmail(orderData);
  return sendEmail({
    to: adminEmail,
    subject: adminMail.subject,
    html: adminMail.html,
    orderId: orderData.id,
    emailType: "admin order notification",
    replyTo: orderData.email || DEFAULT_CUSTOMER_SUPPORT_EMAIL,
  });
}

/**
 * Dispatches Contact Us inquiry: customer receipt + admin notification with customer reply-to.
 */
export async function sendContactInquiry(contactData: ContactEmailData): Promise<{
  success: boolean;
  customerResult: MailResult;
  adminResult: MailResult;
}> {
  const customerMail = getContactConfirmationEmail(contactData);
  const adminMail = getContactAdminNotification(contactData);
  const adminEmail = getAdminEmail();

  // Send admin notification with customer's email as replyTo
  const adminResult = await sendEmail({
    to: adminEmail,
    subject: adminMail.subject,
    html: adminMail.html,
    replyTo: contactData.email,
    emailType: "admin contact inquiry notification",
  });

  // Send customer confirmation
  const customerResult = await sendEmail({
    to: contactData.email,
    subject: customerMail.subject,
    html: customerMail.html,
    replyTo: DEFAULT_CUSTOMER_SUPPORT_EMAIL,
    emailType: "customer contact confirmation",
  });

  return {
    success: adminResult.delivered || customerResult.delivered,
    adminResult,
    customerResult,
  };
}

/**
 * Dispatches Gifting inquiry: customer receipt + concierge notification with customer reply-to.
 */
export async function sendGiftInquiry(giftingData: GiftingEmailData): Promise<{
  success: boolean;
  customerResult: MailResult;
  adminResult: MailResult;
}> {
  const customerMail = getGiftingConfirmationEmail(giftingData);
  const adminMail = getGiftingAdminNotification(giftingData);
  const adminEmail = getAdminEmail();

  const adminResult = await sendEmail({
    to: adminEmail,
    subject: adminMail.subject,
    html: adminMail.html,
    replyTo: giftingData.email,
    emailType: "admin gifting inquiry notification",
  });

  const customerResult = await sendEmail({
    to: giftingData.email,
    subject: customerMail.subject,
    html: customerMail.html,
    replyTo: DEFAULT_CUSTOMER_SUPPORT_EMAIL,
    emailType: "customer gifting confirmation",
  });

  return {
    success: adminResult.delivered || customerResult.delivered,
    adminResult,
    customerResult,
  };
}

/**
 * Dispatches Newsletter notification: subscriber welcome + company subscriber alert.
 */
export async function sendNewsletterNotification(
  subscriberEmail: string,
  source = "Website Footer"
): Promise<{
  success: boolean;
  customerResult: MailResult;
  adminResult: MailResult;
}> {
  const customerMail = getNewsletterWelcomeEmail(subscriberEmail);
  const adminMail = getNewsletterAdminNotification(subscriberEmail, source);
  const adminEmail = getAdminEmail();

  const adminResult = await sendEmail({
    to: adminEmail,
    subject: adminMail.subject,
    html: adminMail.html,
    replyTo: subscriberEmail,
    emailType: "admin newsletter notification",
  });

  const customerResult = await sendEmail({
    to: subscriberEmail,
    subject: customerMail.subject,
    html: customerMail.html,
    replyTo: DEFAULT_CUSTOMER_SUPPORT_EMAIL,
    emailType: "customer newsletter welcome",
  });

  return {
    success: adminResult.delivered || customerResult.delivered,
    adminResult,
    customerResult,
  };
}

/**
 * Dispatches customer transactional status update email when admin updates order status.
 */
export async function sendOrderStatusUpdate(orderStatusData: OrderStatusEmailData): Promise<MailResult> {
  const email = (orderStatusData.customerEmail || "").trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.warn(
      `[Leafly Mailer] Skipping order status update: invalid or missing customer email "${email}".`
    );
    return {
      success: false,
      delivered: false,
      error: `Invalid or missing recipient email: "${email}"`,
    };
  }

  const mail = getOrderStatusCustomerEmail(orderStatusData);
  return sendEmail({
    to: email,
    subject: mail.subject,
    html: mail.html,
    orderId: orderStatusData.orderId,
    emailType: `order status update (${orderStatusData.status})`,
    replyTo: DEFAULT_CUSTOMER_SUPPORT_EMAIL,
  });
}

/**
 * Dispatches new user welcome email for registered / Google-authenticated patrons.
 */
export async function sendWelcomeNotification(name: string, email: string): Promise<MailResult> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return {
      success: false,
      delivered: false,
      error: `Invalid or missing email: "${cleanEmail}"`,
    };
  }

  const mail = getAccountWelcomeEmail(name, cleanEmail);
  return sendEmail({
    to: cleanEmail,
    subject: mail.subject,
    html: mail.html,
    emailType: "account welcome",
    replyTo: DEFAULT_CUSTOMER_SUPPORT_EMAIL,
  });
}
