import type { IncomingMessage, ServerResponse } from "http";
import { getCashfreeBaseUrl, getCashfreeHeaders } from "./lib/cashfree";
import { updateServerOrder, getServerOrder } from "./lib/firebaseAdmin";
import { sendMail, getAdminEmail } from "./lib/mailer";
import {
  getOrderConfirmationCustomerEmail,
  getOrderAdminNotificationEmail,
  type OrderEmailData,
} from "../src/lib/emailTemplates";

interface CashfreePaymentItem {
  cf_payment_id?: string | number;
  payment_status?: string;
  payment_amount?: number;
  payment_currency?: string;
  payment_method?: Record<string, unknown>;
  payment_group?: string;
  payment_time?: string;
  payment_message?: string;
}

interface VerifyRequestBody {
  orderId?: string;
  customerEmail?: string;
  customerName?: string;
}

// In-memory set to deduplicate email dispatch across rapid verify calls and webhooks
const dispatchedEmailOrders = new Set<string>();

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

    const body: VerifyRequestBody =
      typeof rawBody === "object" && rawBody !== null
        ? (rawBody as VerifyRequestBody)
        : {};

    const orderId = String(body.orderId || "").trim();

    if (!orderId) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Order ID is required for verification." }));
      return;
    }

    const baseUrl = getCashfreeBaseUrl();
    const headers = getCashfreeHeaders();

    console.info(`[Cashfree Verify] Verifying status for order #${orderId}...`);

    // 1. Fetch Order Status from Cashfree
    const orderResp = await fetch(`${baseUrl}/orders/${encodeURIComponent(orderId)}`, {
      method: "GET",
      headers,
    });

    const orderData = await orderResp.json().catch(() => ({}));

    if (!orderResp.ok) {
      const verifyErrMsg = typeof orderData?.message === "string"
        ? orderData.message
        : orderData?.message
          ? JSON.stringify(orderData.message)
          : orderResp.status === 404
            ? "Order not found on Cashfree. Please check your order history."
            : "Unable to verify payment status. Please check your order history or contact support.";
      console.error(
        `[Cashfree Verify Error] Order #${orderId} lookup failed:`,
        verifyErrMsg
      );
      res.statusCode = orderResp.status === 404 ? 404 : 502;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          error: verifyErrMsg,
          verified: false,
        })
      );
      return;
    }

    // 2. Fetch Payment Attempts from Cashfree
    let paymentId = "";
    let paymentMethod = "Cashfree Online Payment";
    let paymentStatus = "Pending";

    try {
      const paymentsResp = await fetch(
        `${baseUrl}/orders/${encodeURIComponent(orderId)}/payments`,
        {
          method: "GET",
          headers,
        }
      );
      if (paymentsResp.ok) {
        const paymentsData = (await paymentsResp.json()) as CashfreePaymentItem[];
        if (Array.isArray(paymentsData) && paymentsData.length > 0) {
          const successfulPayment = paymentsData.find(
            (p) => (p.payment_status || "").toUpperCase() === "SUCCESS"
          );
          if (successfulPayment) {
            paymentId = String(successfulPayment.cf_payment_id || "");
            paymentStatus = "Paid";
            if (successfulPayment.payment_group) {
              paymentMethod = `Cashfree Online (${successfulPayment.payment_group.toUpperCase()})`;
            }
          }
        }
      }
    } catch (paymentFetchError) {
      console.warn(
        `[Cashfree Verify Notice] Could not fetch payments list for #${orderId}:`,
        paymentFetchError
      );
    }

    const isOrderPaid = (orderData.order_status || "").toUpperCase() === "PAID";
    const isVerifiedPaid = isOrderPaid || paymentStatus === "Paid";

    if (isVerifiedPaid) {
      paymentStatus = "Paid";
      if (!paymentId && orderData.cf_order_id) {
        paymentId = String(orderData.cf_order_id);
      }

      console.info(`[Cashfree Verify] Order #${orderId} VERIFIED AS PAID. Checking idempotency & updating Firestore...`);

      // Idempotency: Check if already confirmed & paid
      const existingOrder = await getServerOrder(orderId);
      const isAlreadyConfirmed =
        (existingOrder?.paymentStatus || "").toString().toLowerCase() === "paid" &&
        (existingOrder?.orderStatus || existingOrder?.status || "").toString().toLowerCase() === "confirmed";

      if (isAlreadyConfirmed) {
        console.info(`[Cashfree Verify] Order #${orderId} was already marked as Paid/Confirmed. Returning success idempotently.`);
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            success: true,
            verified: true,
            orderStatus: "Confirmed",
            paymentStatus: "Paid",
            paymentId: String(existingOrder?.paymentId || existingOrder?.cfPaymentId || paymentId),
            paymentMethod: String(existingOrder?.paymentMethod || paymentMethod),
            orderAmount: orderData.order_amount,
            orderCurrency: orderData.order_currency,
          })
        );
        return;
      }

      // 3. Trusted Server-Side Firestore Update
      const updateResult = await updateServerOrder(orderId, {
        status: "Confirmed",
        orderStatus: "Confirmed",
        paymentStatus: "Paid",
        paymentId: paymentId || undefined,
        cfPaymentId: paymentId || undefined,
        paymentMethod: paymentMethod || "Cashfree Online Payment",
      });

      if (!updateResult.success) {
        console.error(
          `[Cashfree Verify Notice] Order #${orderId} payment is verified by Cashfree, but Firestore update failed: ${updateResult.error}`
        );
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            success: false,
            verified: true,
            error: "Payment was successfully verified on Cashfree, but updating the order in Firestore failed. Please verify server Firebase Admin credentials.",
            details: updateResult.error,
          })
        );
        return;
      }

      // 4. Idempotent Order Notification Emails
      if (!dispatchedEmailOrders.has(orderId)) {
        dispatchedEmailOrders.add(orderId);

        const customerEmail =
          String(existingOrder?.customerEmail || body.customerEmail || orderData.customer_details?.customer_email || "").trim().toLowerCase();
        const customerName =
          String(existingOrder?.customerName || body.customerName || orderData.customer_details?.customer_name || "Valued Patron").trim();
        const customerPhone =
          String(existingOrder?.customerPhone || orderData.customer_details?.customer_phone || "").trim();
        const total = Number(existingOrder?.total || orderData.order_amount || 0);

        const emailPayload: OrderEmailData = {
          id: orderId,
          customerName,
          email: customerEmail || undefined,
          phone: customerPhone || undefined,
          total,
          subtotal: typeof existingOrder?.subtotal === "number" ? existingOrder.subtotal : undefined,
          deliveryFee: typeof existingOrder?.deliveryFee === "number" ? existingOrder.deliveryFee : undefined,
          discount: typeof existingOrder?.discount === "number" ? existingOrder.discount : undefined,
          couponCode: existingOrder?.couponCode ? String(existingOrder.couponCode) : undefined,
          paymentMethod,
          paymentStatus: "Paid",
          shippingAddress: existingOrder?.shippingAddress as OrderEmailData["shippingAddress"],
          items: existingOrder?.items as OrderEmailData["items"],
          createdAt: String(existingOrder?.createdAt || new Date().toISOString()),
        };

        const adminMail = getOrderAdminNotificationEmail(emailPayload);
        const emailPromises: Promise<unknown>[] = [
          sendMail({
            to: getAdminEmail(),
            subject: adminMail.subject,
            html: adminMail.html,
          }),
        ];

        if (customerEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
          const customerMail = getOrderConfirmationCustomerEmail(emailPayload);
          emailPromises.push(
            sendMail({
              to: customerEmail,
              subject: customerMail.subject,
              html: customerMail.html,
            })
          );
        }

        Promise.allSettled(emailPromises).catch((err) => {
          console.warn("[Cashfree Verify Notice] Email dispatch notice:", err);
        });
      }

      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          success: true,
          verified: true,
          orderStatus: "Confirmed",
          paymentStatus: "Paid",
          paymentId,
          paymentMethod,
          orderAmount: orderData.order_amount,
          orderCurrency: orderData.order_currency,
        })
      );
      return;
    }

    // Payment is still pending or failed
    const rawStatus = (orderData.order_status || "").toUpperCase();
    const isCancelled = rawStatus === "EXPIRED" || rawStatus === "TERMINATED";
    const resolvedOrderStatus = isCancelled ? "Cancelled" : "Processing";
    const resolvedPaymentStatus = isCancelled ? "Failed" : "Pending";

    console.info(`[Cashfree Verify] Order #${orderId} status: ${rawStatus}`);

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        success: true,
        verified: false,
        orderStatus: resolvedOrderStatus,
        paymentStatus: resolvedPaymentStatus,
        rawStatus,
        message:
          rawStatus === "ACTIVE"
            ? "Payment session is active but payment is not yet completed."
            : `Order status is ${rawStatus}.`,
      })
    );
  } catch (error) {
    console.error("[API Cashfree Verify Error]:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        error: "Internal server error while verifying payment. Please try again.",
        verified: false,
      })
    );
  }
}
