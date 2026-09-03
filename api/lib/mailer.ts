/**
 * Leafly — Serverless Production Mailer
 * Automatically resolves SMTP / Gmail App Password credentials
 * Never exposes credentials to the frontend client.
 */

import nodemailer from "nodemailer";

export type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
};

export type MailResult = {
  success: boolean;
  messageId?: string;
  simulated?: boolean;
  error?: string;
};

const DEFAULT_ADMIN_EMAIL = "leaflydatabase@gmail.com";
const DEFAULT_FROM = '"Leafly Tea Co." <leaflydatabase@gmail.com>';

export function getAdminEmail(): string {
  return process.env.ADMIN_EMAIL || process.env.VITE_ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL;
}

export function getFromEmail(): string {
  return process.env.EMAIL_FROM || DEFAULT_FROM;
}

let cachedTransporter: nodemailer.Transporter | null = null;

export function getTransporter(): nodemailer.Transporter | null {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  // Check for Gmail App Password or generic SMTP
  const user = process.env.GMAIL_USER || process.env.EMAIL_USER || process.env.SMTP_USER || process.env.VITE_ADMIN_EMAIL;
  const pass = process.env.GMAIL_APP_PASSWORD || process.env.EMAIL_PASSWORD || process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "465", 10);
  const secure = port === 465;

  if (user && pass) {
    cachedTransporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });
    return cachedTransporter;
  }

  return null;
}

export async function sendMail(payload: EmailPayload): Promise<MailResult> {
  const transporter = getTransporter();

  if (!transporter) {
    // In local development or before SMTP credentials are added to Vercel/environment:
    console.info(
      `[Leafly Mailer Dev Mode] No SMTP credentials configured. Simulated email to: <${payload.to}> | Subject: "${payload.subject}"`
    );
    return {
      success: true,
      simulated: true,
      messageId: `simulated-${Date.now()}`,
    };
  }

  try {
    const info = await transporter.sendMail({
      from: getFromEmail(),
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      replyTo: payload.replyTo || getAdminEmail(),
    });

    console.info(`[Leafly Mailer] Successfully sent email to <${payload.to}> (ID: ${info.messageId})`);
    return {
      success: true,
      messageId: info.messageId,
      simulated: false,
    };
  } catch (error) {
    console.error(`[Leafly Mailer Error] Failed to send email to <${payload.to}>:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
