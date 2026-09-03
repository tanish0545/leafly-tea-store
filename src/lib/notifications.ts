import { collection, addDoc } from "firebase/firestore";
import { db } from "./firebase";
import { ApiService } from "./apiClient";
import { getOrderConfirmationCustomerEmail } from "./emailTemplates";

type OrderDetails = {
  id: string;
  customerName: string;
  email?: string;
  phone?: string;
  total: number;
};

export const NotificationService = {
  /**
   * Sends order confirmation email via backend serverless API and queues to Firestore 'mail' collection
   */
  async sendOrderConfirmationEmail(order: OrderDetails) {
    // 1. Dispatch via Serverless API
    try {
      await ApiService.notifyOrderPlaced(order);
    } catch (err) {
      console.warn("[NotificationService] Serverless notification notice:", err);
    }

    // 2. Queue into Firestore 'mail' collection for Firebase Trigger Email extension
    if (order.email) {
      try {
        const { subject, html } = getOrderConfirmationCustomerEmail(order);
        await addDoc(collection(db, "mail"), {
          to: order.email,
          message: {
            subject,
            html,
          },
          createdAt: new Date().toISOString(),
        });
        console.info(`[NotificationService] Added order confirmation email for ${order.email} to Firestore 'mail'.`);
      } catch (error) {
        console.warn("[NotificationService] Firestore mail queue notice:", error);
      }
    }
  },

  /**
   * SMS notifications are currently skipped as per user request.
   */
  async sendOrderConfirmationSMS(order: OrderDetails) {
    if (!order.phone) return;
    console.info(`[SMS] Skipped sending SMS to ${order.phone} as per configuration.`);
  }
};
