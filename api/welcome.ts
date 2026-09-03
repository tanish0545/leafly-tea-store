import type { IncomingMessage, ServerResponse } from "http";
import { sendMail } from "./lib/mailer";
import { getAccountWelcomeEmail } from "../src/lib/emailTemplates";

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
    let body = req.body as Record<string, unknown> | string | undefined;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        // keep as is
      }
    } else if (!body) {
      const buffers = [];
      for await (const chunk of req) {
        buffers.push(chunk);
      }
      const raw = Buffer.concat(buffers).toString();
      body = raw ? JSON.parse(raw) : {};
    }

    const parsedBody = (body || {}) as Record<string, unknown>;
    const email = String(parsedBody.email || "").trim().toLowerCase();
    const name = String(parsedBody.name || "Valued Patron").trim();

    if (!email) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Email is required." }));
      return;
    }

    const { subject, html } = getAccountWelcomeEmail(name, email);
    const result = await sendMail({
      to: email,
      subject,
      html,
    });

    res.statusCode = result.success ? 200 : 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(result));
  } catch (err) {
    console.error("[api/welcome] Internal error:", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({
      success: false,
      delivered: false,
      error: err instanceof Error ? err.message : "Internal server error",
    }));
  }
}
