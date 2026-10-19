import type { IncomingMessage, ServerResponse } from "node:http";
import {
  getRazorpayAuthHeaders,
  getRazorpayKeyId,
  getSafeRazorpayDiagnostics,
  validateRazorpayConfig,
  sanitizePhoneForRazorpay,
  RAZORPAY_API_BASE_URL,
} from "./_lib/razorpay.js";

interface CreateRazorpayOrderRequestBody {
  orderId?: string;
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  items?: Array<{
    productId?: string | number;
    name?: string;
    price?: number;
    quantity?: number;
  }>;
  subtotal?: number;
  deliveryFee?: number;
  discount?: number;
  couponCode?: string;
  total?: number;
}

export default async function handler(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse
) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");

  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    res.end();
    return;
  }

  // Safe diagnostics endpoint: allows verifying deployed configuration via GET without secrets
  if (req.method === "GET") {
    const diag = getSafeRazorpayDiagnostics();
    const config = validateRazorpayConfig();
    res.statusCode = config.valid ? 200 : 503;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        status: config.valid ? "ready" : "unconfigured",
        mode: diag.mode,
        liveEnforced: diag.liveEnforced,
        keyIdPresent: diag.keyIdPresent,
        keyIdSource: diag.keyIdSource,
        keyIdPrefix: diag.keyIdPrefix,
        keyIdLength: diag.keyIdLength,
        keySecretPresent: diag.keySecretPresent,
        keySecretSource: diag.keySecretSource,
        keySecretLength: diag.keySecretLength,
        keySecretMissing: diag.keySecretMissing,
        isPlaceholderSecret: diag.isPlaceholderSecret,
        hasWhitespaceIssue: diag.hasWhitespaceIssue,
        hasWrappingQuotesIssue: diag.hasWrappingQuotesIssue,
        conflictingModesDetected: diag.conflictingModesDetected,
        duplicateKeySourcesFound: diag.duplicateKeySourcesFound,
        duplicateSecretSourcesFound: diag.duplicateSecretSourcesFound,
        valid: config.valid,
        error: config.error || null,
      })
    );
    return;
  }

  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Method not allowed. Use POST or GET." }));
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

    const body: CreateRazorpayOrderRequestBody =
      typeof rawBody === "object" && rawBody !== null
        ? (rawBody as CreateRazorpayOrderRequestBody)
        : {};

    const orderId = String(body.orderId || "").trim();
    const customerName = String(body.customerName || "").trim();
    const customerEmail = String(body.customerEmail || "").trim().toLowerCase();
    const customerPhone = String(body.customerPhone || "").trim();
    const items = Array.isArray(body.items) ? body.items : [];

    if (!orderId) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Order ID is required." }));
      return;
    }

    if (!customerName) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Customer name is required." }));
      return;
    }

    if (!customerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "A valid email address is required." }));
      return;
    }

    if (items.length === 0) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Order must contain at least one item." }));
      return;
    }

    // ==========================================
    // AMOUNT SECURITY: Authoritative Server-side validation
    // ==========================================
    let computedSubtotal = 0;
    for (const item of items) {
      const price = Number(item.price);
      const qty = Number(item.quantity);
      if (isNaN(price) || price < 0 || isNaN(qty) || qty <= 0) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Invalid item pricing or quantity." }));
        return;
      }
      computedSubtotal += price * qty;
    }

    // Leafly delivery rule: subtotal >= 500 => FREE (0), else ₹50
    const computedDeliveryFee = computedSubtotal >= 500 ? 0 : 50;
    const discount = Math.max(0, Number(body.discount) || 0);

    const computedTotal = Math.max(0, computedSubtotal - discount + computedDeliveryFee);

    // Verify against client total
    if (typeof body.total === "number" && Math.abs(body.total - computedTotal) > 1) {
      console.warn(
        `[Razorpay Order Notice] Amount mismatch for order #${orderId}. Client: ₹${body.total}, Server: ₹${computedTotal}. Using server computed amount.`
      );
    }

    const finalAmount = Math.round(computedTotal * 100) / 100;

    if (finalAmount <= 0) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Order total must be greater than zero." }));
      return;
    }

    // Razorpay requires amounts in paise (1 INR = 100 paise) as an integer
    const amountInPaise = Math.round(finalAmount * 100);

    const config = validateRazorpayConfig();
    const diag = getSafeRazorpayDiagnostics();

    if (!config.valid) {
      console.error("[Razorpay Config Error]:", {
        error: config.error,
        mode: diag.mode,
        keyIdPresent: diag.keyIdPresent,
        keyIdSource: diag.keyIdSource,
        keyIdPrefix: diag.keyIdPrefix,
        keySecretPresent: diag.keySecretPresent,
        keySecretSource: diag.keySecretSource,
        isPlaceholderSecret: diag.isPlaceholderSecret,
        hasWhitespaceIssue: diag.hasWhitespaceIssue,
      });

      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          error: diag.isPlaceholderSecret
            ? "Payment gateway configuration requires a valid Razorpay Key Secret. Please choose Pay on Delivery (Cash / UPI)."
            : "Payment gateway is currently not configured on server. Please select Pay on Delivery (Cash / UPI).",
          code: "CONFIG_ERROR",
          mode: diag.mode,
        })
      );
      return;
    }

    // Build Razorpay Orders API payload
    // Note: receipt max length is 40 characters
    const razorpayPayload = {
      amount: amountInPaise,
      currency: "INR",
      receipt: orderId.slice(0, 40),
      notes: {
        orderId,
        customerName: customerName.slice(0, 100),
        customerEmail: customerEmail.slice(0, 100),
        customerPhone: sanitizePhoneForRazorpay(customerPhone),
      },
    };

    const headers = getRazorpayAuthHeaders();

    console.info(
      `[Razorpay] Creating order #${orderId} with amount ₹${finalAmount} (${amountInPaise} paise) [Mode: ${diag.mode.toUpperCase()}, KeySource: ${diag.keyIdSource}, SecretSource: ${diag.keySecretSource}]...`
    );

    const rzpResponse = await fetch(`${RAZORPAY_API_BASE_URL}/orders`, {
      method: "POST",
      headers,
      body: JSON.stringify(razorpayPayload),
    });

    const rzpData = (await rzpResponse.json().catch(() => ({}))) as Record<string, any>;

    if (!rzpResponse.ok) {
      const rzpErrCode = rzpData?.error?.code || "GATEWAY_ERROR";
      const rzpErrDesc =
        rzpData?.error?.description ||
        rzpData?.error?.message ||
        rzpData?.message ||
        "Unknown error";

      // Safe diagnostic logging: reports mode, key presence/source, and sanitized error code/desc.
      // NEVER logs secret or authorization header!
      console.error(`[Razorpay Error] Failed to create order #${orderId}:`, {
        status: rzpResponse.status,
        statusText: rzpResponse.statusText,
        errorCode: rzpErrCode,
        errorDescription: rzpErrDesc,
        errorSource: rzpData?.error?.source || "NA",
        errorStep: rzpData?.error?.step || "NA",
        errorReason: rzpData?.error?.reason || "NA",
        mode: diag.mode,
        keyIdPresent: diag.keyIdPresent,
        keyIdSource: diag.keyIdSource,
        keyIdPrefix: diag.keyIdPrefix,
        keySecretPresent: diag.keySecretPresent,
        keySecretSource: diag.keySecretSource,
        keySecretLength: diag.keySecretLength,
        isPlaceholderSecret: diag.isPlaceholderSecret,
      });

      let clientMsg = "Unable to initialize secure payment session. Please try again or choose Pay on Delivery (Cash / UPI).";
      if (rzpErrCode === "BAD_REQUEST_ERROR" && rzpErrDesc.toLowerCase().includes("auth")) {
        clientMsg = "Payment gateway authentication failed on server. Please verify Razorpay server credentials or choose Pay on Delivery.";
      }

      res.statusCode = rzpResponse.status >= 400 && rzpResponse.status < 500 ? 400 : 502;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          error: clientMsg,
          code: rzpErrCode,
          gatewayDescription: rzpErrDesc,
          mode: diag.mode,
        })
      );
      return;
    }

    if (!rzpData.id) {
      console.error("[Razorpay Error] Missing order ID in Razorpay response:", rzpData);
      res.statusCode = 502;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          error: "Payment gateway did not return a valid order ID. Please try again.",
        })
      );
      return;
    }

    console.info(`[Razorpay] Successfully created Razorpay order ${rzpData.id} for Leafly #${orderId}.`);

    // Return ONLY necessary client fields — NEVER secret keys
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        success: true,
        orderId,
        razorpayOrderId: rzpData.id,
        amount: rzpData.amount,
        currency: rzpData.currency,
        keyId: getRazorpayKeyId(),
      })
    );
  } catch (error) {
    console.error("[API Razorpay Create Order Error]:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        error: "Internal server error while initializing payment. Please try again.",
      })
    );
  }
}
