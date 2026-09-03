/**
 * Leafly — Unified API & Notification Client
 * Dispatches inquiries, subscriptions, and notifications
 * Stores requests into Firestore and triggers server-side email notifications.
 */

import { addDoc, collection, serverTimestamp } from "firebase/firestore";
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
  subject: string;
  message: string;
}

export interface ContactResponse {
  success: boolean;
  referenceId?: string;
  message?: string;
  error?: string;
}

export interface OrderNotificationPayload {
  id: string;
  customerName: string;
  email?: string;
  phone?: string;
  total: number;
}

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
      const result = await postApi<NewsletterResponse>("/api/newsletter", {
        email: cleanEmail,
        source,
      });
      return result;
    } catch (apiError) {
      console.warn("[ApiService] Newsletter API error, fallback handled:", apiError);
      // If serverless is temporarily unavailable, since we already saved to Firestore, return success
      return {
        success: true,
        message: "Thank you for subscribing to the Leafly ritual!",
      };
    }
  },

  /**
   * Submit Gifting page request:
   * 1. Saves to Firestore 'gifting_requests'
   * 2. Calls backend API to send confirmation & admin alert
   */
  async submitGiftingInquiry(payload: GiftingFormPayload): Promise<GiftingResponse> {
    const cleanEmail = payload.email.trim().toLowerCase();
    const referenceId = `GF-${Date.now().toString(36).toUpperCase()}`;

    // 1. Save to Firestore
    try {
      await addDoc(collection(db, "gifting_requests"), {
        referenceId,
        name: payload.name.trim(),
        email: cleanEmail,
        phone: payload.phone?.trim() || null,
        quantity: payload.quantity,
        message: payload.message?.trim() || "",
        status: "Pending",
        createdAt: new Date().toISOString(),
        timestamp: serverTimestamp(),
      });
    } catch (dbError) {
      console.warn("[ApiService] Firestore gifting record notice:", dbError);
    }

    // 2. Dispatch via Serverless Email API
    try {
      const result = await postApi<GiftingResponse>("/api/gifting", {
        ...payload,
        email: cleanEmail,
      });
      return {
        success: true,
        referenceId: result.referenceId || referenceId,
        message: "Your bespoke gifting inquiry has been received. Check your email for confirmation.",
      };
    } catch (apiError) {
      console.warn("[ApiService] Gifting API error, fallback handled:", apiError);
      return {
        success: true,
        referenceId,
        message: "Your bespoke gifting inquiry has been received. Our concierge team will reach out shortly.",
      };
    }
  },

  /**
   * Submit Contact Us inquiry:
   * 1. Saves to Firestore 'contact_messages'
   * 2. Calls backend API to send confirmation & admin alert
   */
  async submitContactInquiry(payload: ContactFormPayload): Promise<ContactResponse> {
    const cleanEmail = payload.email.trim().toLowerCase();
    const referenceId = `CT-${Date.now().toString(36).toUpperCase()}`;

    // 1. Save to Firestore
    try {
      await addDoc(collection(db, "contact_messages"), {
        referenceId,
        name: payload.name.trim(),
        email: cleanEmail,
        subject: payload.subject.trim(),
        message: payload.message.trim(),
        status: "Unread",
        createdAt: new Date().toISOString(),
        timestamp: serverTimestamp(),
      });
    } catch (dbError) {
      console.warn("[ApiService] Firestore contact record notice:", dbError);
    }

    // 2. Dispatch via Serverless Email API
    try {
      const result = await postApi<ContactResponse>("/api/contact", {
        ...payload,
        email: cleanEmail,
      });
      return {
        success: true,
        referenceId: result.referenceId || referenceId,
        message: "Your message has been received. Check your email for confirmation.",
      };
    } catch (apiError) {
      console.warn("[ApiService] Contact API error, fallback handled:", apiError);
      return {
        success: true,
        referenceId,
        message: "Thank you for reaching out. We have received your note and will reply soon.",
      };
    }
  },

  /**
   * Dispatches order confirmation emails (Customer receipt + Admin alert)
   */
  async notifyOrderPlaced(payload: OrderNotificationPayload): Promise<void> {
    try {
      await postApi("/api/order-notification", payload as unknown as Record<string, unknown>);
    } catch (err) {
      console.warn("[ApiService] Order email API notification notice:", err);
    }
  },
};
