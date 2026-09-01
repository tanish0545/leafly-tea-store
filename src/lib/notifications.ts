import { collection, addDoc } from "firebase/firestore";
import { db } from "./firebase";

type OrderDetails = {
  id: string;
  customerName: string;
  email?: string;
  phone?: string;
  total: number;
};

export const NotificationService = {
  /**
   * Sends an order confirmation email via Firebase 'Trigger Email' extension (e.g. using SendGrid).
   */
  async sendOrderConfirmationEmail(order: OrderDetails) {
    if (!order.email) return;
    
    try {
      await addDoc(collection(db, "mail"), {
        to: order.email,
        message: {
          subject: `Thank you for your Leafly order #${order.id}`,
          html: `
            <div style="font-family: sans-serif; color: #333;">
              <h2>Thank you for your order, ${order.customerName}!</h2>
              <p>We've received your order <strong>#${order.id}</strong> and it is now being processed.</p>
              <p><strong>Total:</strong> ₹${order.total}</p>
              <br/>
              <p>Best regards,<br/>The Leafly Team</p>
            </div>
          `,
        }
      });
      console.log(`[EMAIL] Added order confirmation email for ${order.email} to Firestore 'mail' collection.`);
    } catch (error) {
      console.error("Error queueing email in Firestore:", error);
    }
  },

  /**
   * SMS notifications are currently skipped as per user request.
   */
  async sendOrderConfirmationSMS(order: OrderDetails) {
    if (!order.phone) return;
    console.log(`[SMS] Skipped sending SMS to ${order.phone} as per configuration.`);
  }
};
