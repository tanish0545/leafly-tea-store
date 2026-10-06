/**
 * Leafly — Unified API & Notification Client
 * Dispatches inquiries, subscriptions, and notifications
 * Stores requests into Firestore and triggers server-side email notifications.
 */

import { doc, setDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export interface NewsletterResponse {
  success: boolean;
  message?: string;
  error?: string;
  alreadySubscribed?: boolean;
}

export interface GiftingFormPayload {
  name: string;
  email: string;
  phone?: string;
  quantity: string;
  message?: string;
}

export interface GiftingResponse {
  success: boolean;
  referenceId?: string;
  message?: string;
  error?: string;
}

export interface ContactFormPayload {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

export interface ContactResponse {
  success: boolean;
  referenceId?: string;
  message?: string;
  error?: string;
}

import type { OrderEmailData } from "./emailTemplates";

export type OrderNotificationPayload = OrderEmailData;

/**
 * Helper to execute backend serverless API call with a fallback
 */
async function postApi<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Server responded with status ${response.status}`);
  }
  return data as T;
}

export const ApiService = {
  /**
   * Submit newsletter email subscription:
   * 1. Saves to Firestore 'subscribers' collection
   * 2. Calls backend API to send welcome email & admin alert
   */
  async subscribeNewsletter(email: string, source = "Website Footer"): Promise<NewsletterResponse> {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Record in Firestore
    try {
      await addDoc(collection(db, "subscribers"), {
        email: cleanEmail,
        source,
        createdAt: new Date().toISOString(),
        timestamp: serverTimestamp(),
      });
    } catch (dbError) {
      console.warn("[ApiService] Firestore subscription record notice:", dbError);
    }

    // 2. Dispatch via Serverless Email API
    try {
      const result = await postApi<NewsletterResponse>("/api/email?action=newsletter", {
        action: "newsletter",
        email: cleanEmail,
        source,
      });
      return result;
    } catch (apiError) {
      console.warn("[ApiService] Newsletter API error:", apiError);
      return {
        success: false,
        error: apiError instanceof Error ? apiError.message : "Unable to process subscription right now.",
      };
    }
  },

  /**
   * Submit Gifting page request:
   * 1. Saves to Firestore 'requests' collection (Request ID as doc key)
   * 2. Calls backend API to send confirmation & admin alert
   */
  async submitGiftingInquiry(payload: GiftingFormPayload): Promise<GiftingResponse> {
    const cleanEmail = payload.email.trim().toLowerCase();
    const cleanPhone = payload.phone?.trim() || "";
    const referenceId = `GF-${Date.now().toString(36).toUpperCase()}`;

    console.log("[Requests] Creating request...", referenceId);

    const requestData = {
      id: referenceId,
      requestId: referenceId,
      type: "Gifting",
      customerName: payload.name.trim(),
      name: payload.name.trim(),
      customerEmail: cleanEmail,
      email: cleanEmail,
      ...(cleanPhone ? { customerPhone: cleanPhone, phone: cleanPhone } : {}),
      quantity: payload.quantity,
      ...(payload.message?.trim() ? { message: payload.message.trim() } : {}),
      status: "NEW",
      source: "Website Bespoke Gifting Form",
      createdAt: new Date().toISOString(),
      timestamp: serverTimestamp(),
    };

    // 1. Save to Firestore 'requests' collection
    try {
      await setDoc(doc(db, "requests", referenceId), requestData);
      console.log(`[Requests] Firestore write successful: ${referenceId}`);
    } catch (dbError) {
      console.error("[Requests] Firestore write error:", dbError);
    }

    // 2. Dispatch via Serverless Email API
    try {
      const result = await postApi<GiftingResponse>("/api/email?action=gifting", {
        action: "gifting",
        referenceId,
        requestId: referenceId,
        source: "Website Bespoke Gifting Form",
        ...payload,
        email: cleanEmail,
        phone: cleanPhone || undefined,
      });
      return {
        success: result.success,
        referenceId: result.referenceId || referenceId,
        message: result.message || "Your bespoke gifting inquiry has been received. Check your email for confirmation.",
        error: result.error,
      };
    } catch (apiError) {
      console.error("[ApiService] Gifting API error:", apiError);
      return {
        success: false,
        referenceId,
        error: apiError instanceof Error ? apiError.message : "We couldn't submit your gifting request right now. Please try again in a moment.",
      };
    }
  },

  /**
   * Submit Contact Us inquiry:
   * 1. Saves to Firestore 'requests' collection (Request ID as doc key)
   * 2. Calls backend API to send confirmation & admin alert
   */
  async submitContactInquiry(payload: ContactFormPayload): Promise<ContactResponse> {
    const cleanEmail = payload.email.trim().toLowerCase();
    const cleanPhone = payload.phone?.trim() || "";
    const referenceId = `CT-${Date.now().toString(36).toUpperCase()}`;

    console.log("[Requests] Creating request...", referenceId);

    const requestData = {
      id: referenceId,
      requestId: referenceId,
      type: "Contact",
      customerName: payload.name.trim(),
      name: payload.name.trim(),
      customerEmail: cleanEmail,
      email: cleanEmail,
      ...(cleanPhone ? { customerPhone: cleanPhone, phone: cleanPhone } : {}),
      subject: payload.subject.trim(),
      message: payload.message.trim(),
      status: "NEW",
      source: "Website Contact Form",
      createdAt: new Date().toISOString(),
      timestamp: serverTimestamp(),
    };

    // 1. Save to Firestore 'requests' collection
    try {
      await setDoc(doc(db, "requests", referenceId), requestData);
      console.log(`[Requests] Firestore write successful: ${referenceId}`);
    } catch (dbError) {
      console.error("[Requests] Firestore write error:", dbError);
    }

    // 2. Dispatch via Serverless Email API
    try {
      const result = await postApi<ContactResponse>("/api/email?action=contact", {
        action: "contact",
        referenceId,
        requestId: referenceId,
        source: "Website Contact Form",
        ...payload,
        email: cleanEmail,
        phone: cleanPhone || undefined,
      });

      if (result && result.success) {
        return {
          success: true,
          referenceId: result.referenceId || referenceId,
          message: result.message || "Your message has been received. Check your email for confirmation.",
        };
      }

      return {
        success: false,
        referenceId,
        error: result?.error || "We couldn't submit your message right now. Please try again.",
      };
    } catch (apiError) {
      console.error("[ApiService] Contact API error:", apiError);
      return {
        success: false,
        referenceId,
        error: apiError instanceof Error ? apiError.message : "Unable to submit inquiry. Please check your internet connection or email us directly at myleaflytea@gmail.com.",
      };
    }
  },

  /**
   * Dispatches order confirmation emails (Customer receipt + Admin alert)
   */
  async notifyOrderPlaced(payload: OrderNotificationPayload): Promise<void> {
    try {
      await postApi("/api/orders?action=notification", {
        action: "notification",
        ...(payload as unknown as Record<string, unknown>),
      });
    } catch (err) {
      console.warn("[ApiService] Order email API notification notice:", err);
    }
  },

  /**
   * Dispatches customer transactional order status update email when admin updates status
   */
  async notifyOrderStatusUpdate(payload: {
    orderId: string;
    newStatus: string;
    previousStatus?: string;
    customerEmail?: string;
    customerName?: string;
    total?: number;
    items?: Array<{ name: string; variant?: string; weight?: string; quantity: number; price: number }>;
    shippingAddress?: {
      fullName?: string;
      addressLine1?: string;
      addressLine2?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
    };
  }): Promise<{ success: boolean; delivered?: boolean; duplicate?: boolean; error?: string }> {
    try {
      return await postApi<{ success: boolean; delivered?: boolean; duplicate?: boolean; error?: string }>(
        "/api/orders?action=status",
        {
          action: "status",
          ...(payload as unknown as Record<string, unknown>),
        }
      );
    } catch (err) {
      console.warn("[ApiService] Order status update notification notice:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to notify status update",
      };
    }
  },

  /**
   * Dispatches new user welcome email (for both Email/Password and Google sign-up)
   */
  async sendWelcomeEmail(payload: { name: string; email: string }): Promise<{ success: boolean; error?: string }> {
    try {
      const cleanEmail = payload.email.trim().toLowerCase();
      if (!cleanEmail) return { success: false, error: "Email is required" };
      const res = await postApi<{ success: boolean; error?: string }>("/api/email?action=welcome", {
        action: "welcome",
        name: payload.name.trim() || "Valued Patron",
        email: cleanEmail,
      });
      return res;
    } catch (err) {
      console.warn("[ApiService] Welcome email API notice:", err);
      return { success: false, error: err instanceof Error ? err.message : "Failed to send welcome email" };
    }
  },

  /**
   * Initializes Cashfree Order session via serverless API
   */
  async createCashfreeOrder(payload: {
    orderId: string;
    customerId?: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    items: Array<{ productId?: string | number; name?: string; price: number; quantity: number }>;
    subtotal: number;
    deliveryFee: number;
    discount?: number;
    couponCode?: string;
    total: number;
    origin?: string;
  }): Promise<{
    success: boolean;
    orderId: string;
    paymentSessionId: string;
    orderAmount: number;
    orderCurrency: string;
    error?: string;
  }> {
    return postApi("/api/cashfree-create-order", payload as unknown as Record<string, unknown>);
  },

  /**
   * Authoritatively verifies payment status with Cashfree via serverless API
   */
  async verifyCashfreePayment(orderId: string, customerData?: { email?: string; name?: string }): Promise<{
    success: boolean;
    verified: boolean;
    orderStatus: string;
    paymentStatus: string;
    paymentId?: string;
    paymentMethod?: string;
    orderAmount?: number;
    orderCurrency?: string;
    rawStatus?: string;
    message?: string;
    error?: string;
  }> {
    return postApi("/api/cashfree-verify", {
      orderId,
      customerEmail: customerData?.email,
      customerName: customerData?.name,
    });
  },
};


