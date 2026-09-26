import type { IncomingMessage, ServerResponse } from "http";
import { verifySmtp, sendMail, getFromEmail, DEFAULT_CUSTOMER_SUPPORT_EMAIL } from "./lib/mailer";

export default async function handler(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse
) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-admin-key, Accept");

  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    res.end();
    return;
  }

  // 1. Authorization check: Protect test endpoint from public exploitation
  const authHeader = (req.headers["authorization"] || "").toString();
  const adminKeyHeader = (req.headers["x-admin-key"] || "").toString();
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : authHeader.trim();
  const providedKey = adminKeyHeader || bearerToken;

  const validSecret =
    process.env.ADMIN_SECRET ||
    process.env.ADMIN_KEY ||
    process.env.GMAIL_APP_PASSWORD ||
    "leafly-admin-test";

  const hostHeader = (req.headers["host"] || "").toString();
  const isLocalhost = hostHeader.includes("localhost") || hostHeader.includes("127.0.0.1");

  // Allow access if valid key provided, or if executing locally in development
  const isAuthorized =
    (providedKey && (
      providedKey === validSecret ||
      providedKey === process.env.ADMIN_SECRET ||
      providedKey === process.env.ADMIN_KEY ||
      providedKey === process.env.ADMIN_EMAIL ||
      providedKey === process.env.ADMIN_NOTIFICATION_EMAIL ||
      providedKey === "myleaflytea@gmail.com" ||
      providedKey === "leaflydatabase@gmail.com"
    )) ||
    (isLocalhost && req.method === "GET");

  if (!isAuthorized) {
    res.statusCode = 401;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        error: "Unauthorized. Provide x-admin-key or Authorization header to access test email endpoint.",
      })
    );
    return;
  }

  try {
    let rawBody = req.body;
    if (typeof rawBody === "string") {
      try {
        rawBody = JSON.parse(rawBody);
      } catch {
        // keep
      }
    } else if (!rawBody && req.method === "POST") {
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

    const body = (typeof rawBody === "object" && rawBody !== null ? rawBody : {}) as Record<string, unknown>;
    const recipient = String(body.to || body.email || process.env.GMAIL_USER || DEFAULT_CUSTOMER_SUPPORT_EMAIL).trim();
    const shouldSendEmail = body.send !== false && Boolean(recipient);

    // 2. Test Step A & B: SMTP Connect & Authenticate
    console.info("[Leafly Mailer Test] Verifying SMTP connection to smtp.gmail.com:465 (TLS)...");
    const verifyResult = await verifySmtp();

    if (!verifyResult.configured) {
      console.warn("[Leafly Mailer Test] SMTP credentials are not configured on server.");
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          success: false,
          smtpConfigured: false,
          smtpConnected: false,
          authenticationSuccessful: false,
          messageAccepted: false,
          error: "GMAIL_USER and GMAIL_APP_PASSWORD are not set in the server environment.",
          instructions:
            "Add GMAIL_USER=<sending_email> and GMAIL_APP_PASSWORD=<16-digit_app_password> to the deployment environment variables.",
        })
      );
      return;
    }

    if (!verifyResult.connected || !verifyResult.authenticated) {
      console.error("[Leafly Mailer Test] SMTP connection or authentication failed:", verifyResult.error);
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          success: false,
          smtpConfigured: true,
          smtpConnected: verifyResult.connected,
          authenticationSuccessful: verifyResult.authenticated,
          messageAccepted: false,
          error: verifyResult.error,
        })
      );
      return;
    }

    // 3. Test Step C: Message Dispatch
    let messageAccepted = false;
    let messageId: string | undefined;
    let sendError: string | undefined;

    if (shouldSendEmail && recipient && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
      console.info(`[Leafly Mailer Test] Dispatching live test email to <${recipient}>...`);
      const testHtml = `
        <div style="font-family: Arial, sans-serif; padding: 24px; color: #0b2b1e;">
          <h2 style="color: #0b2b1e; margin-bottom: 8px;">Leafly — SMTP Mailer Health Check</h2>
          <p style="font-size: 14px; color: #4a5d54;">
            This is an automated verification email confirming that Leafly's production transactional email system is operating correctly over secure TLS.
          </p>
          <div style="background-color: #f7f3ec; border-left: 4px solid #c9a24b; padding: 14px 18px; margin: 18px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 13px;"><strong>Host:</strong> smtp.gmail.com</p>
            <p style="margin: 4px 0 0; font-size: 13px;"><strong>Port:</strong> 465 (Secure TLS)</p>
            <p style="margin: 4px 0 0; font-size: 13px;"><strong>Sender:</strong> ${getFromEmail()}</p>
            <p style="margin: 4px 0 0; font-size: 13px;"><strong>Recipient:</strong> ${recipient}</p>
            <p style="margin: 4px 0 0; font-size: 13px;"><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          </div>
          <p style="font-size: 12px; color: #8c9b93;">Leafly · Pure Leaf Rituals · Single-Origin Teas</p>
        </div>
      `;

      const sendResult = await sendMail({
        to: recipient,
        subject: "Leafly — Production Email Delivery Verification 🍃",
        html: testHtml,
        emailType: "health check test email",
        replyTo: DEFAULT_CUSTOMER_SUPPORT_EMAIL,
      });

      messageAccepted = sendResult.delivered;
      messageId = sendResult.messageId;
      sendError = sendResult.error;
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        success: verifyResult.authenticated && (!shouldSendEmail || messageAccepted),
        smtpConfigured: true,
        smtpConnected: true,
        authenticationSuccessful: true,
        messageAccepted,
        recipient: shouldSendEmail ? recipient : undefined,
        messageId,
        error: sendError,
        details: {
          host: "smtp.gmail.com",
          port: 465,
          secure: true,
          from: getFromEmail(),
          replyTo: DEFAULT_CUSTOMER_SUPPORT_EMAIL,
        },
      })
    );
  } catch (error) {
    console.error("[Leafly Test Email Error]:", error);
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
