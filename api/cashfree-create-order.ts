import type { IncomingMessage, ServerResponse } from "http";
import {
  getCashfreeBaseUrl,
  getCashfreeHeaders,
  sanitizePhoneForCashfree,
  sanitizeCustomerId,
} from "./lib/cashfree";

interface CreateOrderRequestBody {
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
  origin?: string;
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
        // keep
      }
    } else if (!rawBody) {
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

    const body: CreateOrderRequestBody =
      typeof rawBody === "object" && rawBody !== null
        ? (rawBody as CreateOrderRequestBody)
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
    // AMOUNT SECURITY: Server-side validation
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

    // If client supplied a total, verify that it matches our server calculation
    if (typeof body.total === "number" && Math.abs(body.total - computedTotal) > 1) {
      console.warn(
        `[Cashfree Order Notice] Amount mismatch for order #${orderId}. Client: ₹${body.total}, Server: ₹${computedTotal}. Using server computed amount.`
      );
    }

    const finalAmount = Math.round(computedTotal * 100) / 100;

    if (finalAmount <= 0) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Order total must be greater than zero." }));
      return;
    }

    // Determine return URL origin
    const hostHeader = (req.headers["x-forwarded-host"] || req.headers.host || "") as string;
    const protoHeader = (req.headers["x-forwarded-proto"] || "https") as string;
    const defaultOrigin = hostHeader ? `${protoHeader}://${hostHeader}` : "https://leaflytea.in";
    const origin = body.origin || defaultOrigin;

    // Resolve payment methods and UPI app priority from environment or official supported defaults
    const paymentMethods =
      process.env.CASHFREE_PAYMENT_METHODS || "upi,cc,dc,nb,app";

    // Officially supported Cashfree upi_app_priority values:
    // gpay, phonepe, paytm, amazon, bhim, credpay, navi, mobikwik, airtel
    const upiAppPriority = process.env.CASHFREE_UPI_APP_PRIORITY
      ? process.env.CASHFREE_UPI_APP_PRIORITY.split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)
      : [
          "gpay",
          "phonepe",
          "paytm",
          "amazon",
          "bhim",
          "credpay",
          "navi",
          "mobikwik",
          "airtel",
        ];

    // Build Cashfree request payload
    const cashfreePayload = {
      order_id: orderId,
      order_amount: finalAmount,
      order_currency: "INR",
      customer_details: {
        customer_id: sanitizeCustomerId(body.customerId || customerEmail),
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: sanitizePhoneForCashfree(customerPhone),
      },
      order_meta: {
        return_url: `${origin}/order-success?order_id={order_id}`,
        notify_url: `${origin}/api/cashfree-webhook`,
        payment_methods: paymentMethods,
        upi_app_priority: upiAppPriority,
      },
      order_note: `Leafly Order ${orderId}`,
    };

    const baseUrl = getCashfreeBaseUrl();
    const headers = getCashfreeHeaders();

    console.info(`[Cashfree] Creating order #${orderId} with amount ₹${finalAmount}...`);

    const cfResponse = await fetch(`${baseUrl}/orders`, {
      method: "POST",
      headers,
      body: JSON.stringify(cashfreePayload),
    });

    const cfData = await cfResponse.json().catch(() => ({}));

    if (!cfResponse.ok) {
      console.error(
        `[Cashfree Error] Failed to create order #${orderId}:`,
        cfData?.message || cfResponse.statusText
      );
      res.statusCode = cfResponse.status >= 400 && cfResponse.status < 500 ? 400 : 502;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          error:
            cfData?.message ||
            "Unable to initialize secure payment session. Please try again or choose Pay on Delivery.",
        })
      );
      return;
    }

    if (!cfData.payment_session_id) {
      console.error("[Cashfree Error] Missing payment_session_id in Cashfree response:", cfData);
      res.statusCode = 502;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          error: "Payment gateway did not return a valid session. Please try again.",
        })
      );
      return;
    }

    console.info(`[Cashfree] Successfully created session for order #${orderId}.`);

    // Return ONLY necessary client fields — NEVER secret keys
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        success: true,
        orderId: cfData.order_id,
        paymentSessionId: cfData.payment_session_id,
        orderAmount: cfData.order_amount,
        orderCurrency: cfData.order_currency,
      })
    );
  } catch (error) {
    console.error("[API Cashfree Create Order Error]:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        error: "Internal server error while initializing payment. Please try again.",
      })
    );
  }
}
