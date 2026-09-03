/**
 * Leafly — Luxury HTML Email Templates
 * Mobile-responsive, high-converting, brand-consistent templates
 */

const LEAFLY_GREEN = "#0b2b1e";
const LEAFLY_GOLD = "#c9a24b";
const LEAFLY_CREAM = "#fbf9f5";
const LEAFLY_BORDER = "#e7e1d5";
const LEAFLY_TEXT = "#2c3e35";
const LEAFLY_MUTED = "#6a7b72";

function baseEmailWrapper(title: string, contentHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f4f1ea;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: ${LEAFLY_TEXT};
      -webkit-font-smoothing: antialiased;
    }
    table {
      border-collapse: collapse;
    }
    a {
      color: ${LEAFLY_GOLD};
      text-decoration: none;
    }
    @media only screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
        border-radius: 0 !important;
      }
      .content-cell {
        padding: 24px 20px !important;
      }
      .header-cell {
        padding: 28px 20px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 24px 0; background-color: #f4f1ea;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table role="presentation" class="email-container" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width: 560px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(11, 43, 30, 0.08); border: 1px solid ${LEAFLY_BORDER};">
          
          <!-- Header Banner -->
          <tr>
            <td class="header-cell" align="center" style="background-color: ${LEAFLY_GREEN}; padding: 36px 28px; text-align: center; border-bottom: 2px solid ${LEAFLY_GOLD};">
              <span style="font-size: 24px; color: ${LEAFLY_GOLD}; display: block; margin-bottom: 6px;">🍃</span>
              <h1 style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 26px; font-weight: normal; letter-spacing: 4px; color: #f7f3ec; text-transform: uppercase;">
                LEAFLY
              </h1>
              <p style="margin: 4px 0 0; font-size: 10px; font-weight: 600; letter-spacing: 2px; color: ${LEAFLY_GOLD}; text-transform: uppercase;">
                Pure Leaf Rituals · Single-Origin Teas
              </p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td class="content-cell" style="padding: 36px 32px; background-color: #ffffff;">
              ${contentHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="background-color: ${LEAFLY_CREAM}; padding: 24px 28px; text-align: center; border-top: 1px solid ${LEAFLY_BORDER}; font-size: 12px; color: ${LEAFLY_MUTED}; line-height: 1.6;">
              <p style="margin: 0 0 8px; font-family: Georgia, serif; font-style: italic; color: ${LEAFLY_GREEN};">
                “Crafted with care, poured with intention.”
              </p>
              <p style="margin: 0 0 6px;">
                © ${new Date().getFullYear()} Leafly Tea Co. All rights reserved.
              </p>
              <p style="margin: 0; font-size: 11px; color: #8c9b93;">
                Curating India's finest single-estate teas directly from conscious tea gardens.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// =========================================================================
// 1. NEWSLETTER TEMPLATES
// =========================================================================

export function getNewsletterWelcomeEmail(subscriberEmail: string): { subject: string; html: string } {
  const subject = "Welcome to Leafly — Your Tea Journey Begins 🍃";
  const content = `
    <h2 style="margin: 0 0 16px; font-family: Georgia, serif; font-size: 22px; color: ${LEAFLY_GREEN}; font-weight: normal; line-height: 1.3;">
      Welcome to the Leafly Ritual
    </h2>
    <p style="font-size: 15px; line-height: 1.6; color: ${LEAFLY_TEXT}; margin: 0 0 16px;">
      Hello and welcome,
    </p>
    <p style="font-size: 15px; line-height: 1.6; color: ${LEAFLY_TEXT}; margin: 0 0 16px;">
      Thank you for subscribing to the Leafly journal. We're delighted to welcome you to our community of mindful tea drinkers.
    </p>
    <p style="font-size: 15px; line-height: 1.6; color: ${LEAFLY_TEXT}; margin: 0 0 20px;">
      As part of our inner circle, you will receive seasonal harvest previews, brewing guides from tea masters, origin stories directly from estates in Assam, Darjeeling, and the Nilgiris, and exclusive early releases.
    </p>

    <!-- Highlight Box -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${LEAFLY_CREAM}; border-left: 3px solid ${LEAFLY_GOLD}; border-radius: 4px; margin: 24px 0;">
      <tr>
        <td style="padding: 16px 20px;">
          <strong style="color: ${LEAFLY_GREEN}; font-size: 14px; display: block; margin-bottom: 4px;">Subscribed Email</strong>
          <span style="font-size: 14px; color: ${LEAFLY_TEXT};">${subscriberEmail}</span>
        </td>
      </tr>
    </table>

    <p style="font-size: 15px; line-height: 1.6; color: ${LEAFLY_TEXT}; margin: 24px 0 28px;">
      Until our next brew, take a slow moment for yourself today.
    </p>

    <div align="center" style="margin: 32px 0 16px;">
      <a href="https://leafly.vercel.app/shop" style="display: inline-block; background-color: ${LEAFLY_GREEN}; color: #f7f3ec; font-size: 13px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; padding: 14px 30px; border-radius: 4px; text-decoration: none; border: 1px solid ${LEAFLY_GOLD};">
        Explore Tea Collections
      </a>
    </div>
  `;

  return {
    subject,
    html: baseEmailWrapper("Welcome to Leafly", content),
  };
}

export function getNewsletterAdminNotification(subscriberEmail: string, source = "Website Footer"): { subject: string; html: string } {
  const subject = "New Leafly Newsletter Subscription";
  const content = `
    <h2 style="margin: 0 0 16px; font-family: Georgia, serif; font-size: 20px; color: ${LEAFLY_GREEN}; font-weight: normal;">
      New Newsletter Subscriber
    </h2>
    <p style="font-size: 14px; line-height: 1.6; color: ${LEAFLY_TEXT}; margin: 0 0 20px;">
      A new reader has subscribed to the Leafly newsletter:
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${LEAFLY_CREAM}; border: 1px solid ${LEAFLY_BORDER}; border-radius: 6px; margin: 16px 0;">
      <tr>
        <td style="padding: 12px 18px; border-bottom: 1px solid ${LEAFLY_BORDER}; font-size: 13px; color: ${LEAFLY_MUTED}; width: 130px;">
          Subscriber Email:
        </td>
        <td style="padding: 12px 18px; border-bottom: 1px solid ${LEAFLY_BORDER}; font-size: 14px; font-weight: 600; color: ${LEAFLY_GREEN};">
          ${subscriberEmail}
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 18px; border-bottom: 1px solid ${LEAFLY_BORDER}; font-size: 13px; color: ${LEAFLY_MUTED};">
          Date & Time:
        </td>
        <td style="padding: 12px 18px; border-bottom: 1px solid ${LEAFLY_BORDER}; font-size: 13px; color: ${LEAFLY_TEXT};">
          ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 18px; font-size: 13px; color: ${LEAFLY_MUTED};">
          Subscription Source:
        </td>
        <td style="padding: 12px 18px; font-size: 13px; color: ${LEAFLY_TEXT};">
          ${source}
        </td>
      </tr>
    </table>
  `;

  return {
    subject,
    html: baseEmailWrapper("New Subscriber", content),
  };
}

// =========================================================================
// 2. GIFTING INQUIRY TEMPLATES
// =========================================================================

export interface GiftingEmailData {
  name: string;
  email: string;
  phone?: string;
  quantity: string;
  message?: string;
  referenceId: string;
}

export function getGiftingConfirmationEmail(data: GiftingEmailData): { subject: string; html: string } {
  const subject = "We've received your Leafly gifting request 🍃";
  const content = `
    <h2 style="margin: 0 0 16px; font-family: Georgia, serif; font-size: 22px; color: ${LEAFLY_GREEN}; font-weight: normal; line-height: 1.3;">
      Thank You, ${data.name}
    </h2>
    <p style="font-size: 15px; line-height: 1.6; color: ${LEAFLY_TEXT}; margin: 0 0 16px;">
      We have received your corporate & bespoke tea gifting inquiry. A member of our concierge gifting team is already reviewing your requirements.
    </p>

    <!-- Reference Box -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${LEAFLY_CREAM}; border-left: 3px solid ${LEAFLY_GOLD}; border-radius: 4px; margin: 20px 0;">
      <tr>
        <td style="padding: 16px 20px;">
          <strong style="color: ${LEAFLY_GREEN}; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 4px;">Request Reference</strong>
          <span style="font-size: 16px; font-weight: 600; color: ${LEAFLY_GOLD}; font-family: monospace;">#${data.referenceId}</span>
        </td>
      </tr>
    </table>

    <h3 style="font-family: Georgia, serif; font-size: 16px; color: ${LEAFLY_GREEN}; margin: 24px 0 12px;">
      What Happens Next:
    </h3>
    <ul style="font-size: 14px; line-height: 1.8; color: ${LEAFLY_TEXT}; padding-left: 20px; margin: 0 0 24px;">
      <li>Our tea concierge will review your quantity preference (<strong>${data.quantity} units</strong>) and custom packaging needs.</li>
      <li>Within <strong>1 business day</strong>, we will send you a tailored catalogue with curated estate tea pairings and bulk corporate pricing.</li>
      <li>Custom company branding, custom ribbon selections, and handwritten bespoke notes can be coordinated directly with your gifting specialist.</li>
    </ul>

    <p style="font-size: 14px; line-height: 1.6; color: ${LEAFLY_MUTED}; margin: 20px 0 0; border-top: 1px solid ${LEAFLY_BORDER}; padding-top: 16px;">
      If you need immediate assistance or wish to add further specifications, feel free to reply to this email or reach out to us at <a href="mailto:leaflydatabase@gmail.com">leaflydatabase@gmail.com</a>.
    </p>
  `;

  return {
    subject,
    html: baseEmailWrapper("Gifting Request Received", content),
  };
}

export function getGiftingAdminNotification(data: GiftingEmailData): { subject: string; html: string } {
  const subject = `New Gifting Request — Leafly [Ref: #${data.referenceId}]`;
  const content = `
    <h2 style="margin: 0 0 16px; font-family: Georgia, serif; font-size: 20px; color: ${LEAFLY_GREEN}; font-weight: normal;">
      New Corporate / Bespoke Gifting Request
    </h2>
    <p style="font-size: 14px; line-height: 1.6; color: ${LEAFLY_TEXT}; margin: 0 0 20px;">
      A customer has submitted a bespoke gifting inquiry via the Gifting page:
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${LEAFLY_CREAM}; border: 1px solid ${LEAFLY_BORDER}; border-radius: 6px; margin: 16px 0;">
      <tr>
        <td style="padding: 10px 16px; border-bottom: 1px solid ${LEAFLY_BORDER}; font-size: 13px; color: ${LEAFLY_MUTED}; width: 130px;">Reference:</td>
        <td style="padding: 10px 16px; border-bottom: 1px solid ${LEAFLY_BORDER}; font-size: 13px; font-weight: 600; color: ${LEAFLY_GOLD}; font-family: monospace;">#${data.referenceId}</td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; border-bottom: 1px solid ${LEAFLY_BORDER}; font-size: 13px; color: ${LEAFLY_MUTED};">Client Name:</td>
        <td style="padding: 10px 16px; border-bottom: 1px solid ${LEAFLY_BORDER}; font-size: 13px; font-weight: 600; color: ${LEAFLY_GREEN};">${data.name}</td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; border-bottom: 1px solid ${LEAFLY_BORDER}; font-size: 13px; color: ${LEAFLY_MUTED};">Client Email:</td>
        <td style="padding: 10px 16px; border-bottom: 1px solid ${LEAFLY_BORDER}; font-size: 13px; color: ${LEAFLY_TEXT};"><a href="mailto:${data.email}">${data.email}</a></td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; border-bottom: 1px solid ${LEAFLY_BORDER}; font-size: 13px; color: ${LEAFLY_MUTED};">Phone Number:</td>
        <td style="padding: 10px 16px; border-bottom: 1px solid ${LEAFLY_BORDER}; font-size: 13px; color: ${LEAFLY_TEXT};">${data.phone || "Not provided"}</td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; border-bottom: 1px solid ${LEAFLY_BORDER}; font-size: 13px; color: ${LEAFLY_MUTED};">Quantity:</td>
        <td style="padding: 10px 16px; border-bottom: 1px solid ${LEAFLY_BORDER}; font-size: 13px; color: ${LEAFLY_TEXT};">${data.quantity} units</td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; border-bottom: 1px solid ${LEAFLY_BORDER}; font-size: 13px; color: ${LEAFLY_MUTED};">Message/Notes:</td>
        <td style="padding: 10px 16px; border-bottom: 1px solid ${LEAFLY_BORDER}; font-size: 13px; color: ${LEAFLY_TEXT}; white-space: pre-wrap;">${data.message || "No additional message."}</td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; font-size: 13px; color: ${LEAFLY_MUTED};">Submitted At:</td>
        <td style="padding: 10px 16px; font-size: 13px; color: ${LEAFLY_TEXT};">${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</td>
      </tr>
    </table>
  `;

  return {
    subject,
    html: baseEmailWrapper("Gifting Inquiry", content),
  };
}

// =========================================================================
// 3. CONTACT FORM TEMPLATES
// =========================================================================

export interface ContactEmailData {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  referenceId: string;
}

export function getContactConfirmationEmail(data: ContactEmailData): { subject: string; html: string } {
  const subject = "We've received your message — Leafly 🍃";
  const content = `
    <h2 style="margin: 0 0 16px; font-family: Georgia, serif; font-size: 22px; color: ${LEAFLY_GREEN}; font-weight: normal; line-height: 1.3;">
      Thank You for Reaching Out, ${data.name}
    </h2>
    <p style="font-size: 15px; line-height: 1.6; color: ${LEAFLY_TEXT}; margin: 0 0 16px;">
      We've received your inquiry regarding <strong>"${data.subject}"</strong>.
    </p>
    <p style="font-size: 15px; line-height: 1.6; color: ${LEAFLY_TEXT}; margin: 0 0 20px;">
      Our customer care team reviews every note personally. We aim to respond within <strong>24 to 48 business hours</strong>.
    </p>

    <!-- Reference Box -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${LEAFLY_CREAM}; border-left: 3px solid ${LEAFLY_GOLD}; border-radius: 4px; margin: 20px 0;">
      <tr>
        <td style="padding: 16px 20px;">
          <strong style="color: ${LEAFLY_GREEN}; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 4px;">Inquiry Reference ID</strong>
          <span style="font-size: 15px; font-weight: 600; color: ${LEAFLY_GOLD}; font-family: monospace;">#${data.referenceId}</span>
        </td>
      </tr>
    </table>

    <p style="font-size: 14px; line-height: 1.6; color: ${LEAFLY_MUTED}; margin: 24px 0 0; border-top: 1px solid ${LEAFLY_BORDER}; padding-top: 16px;">
      Warmly,<br/>
      The Leafly Customer Care Team
    </p>
  `;

  return {
    subject,
    html: baseEmailWrapper("Message Received", content),
  };
}

export function getContactAdminNotification(data: ContactEmailData): { subject: string; html: string } {
  const subject = `New Contact Inquiry — Leafly [${data.subject}]`;
  const content = `
    <h2 style="margin: 0 0 16px; font-family: Georgia, serif; font-size: 20px; color: ${LEAFLY_GREEN}; font-weight: normal;">
      New Customer Inquiry Received
    </h2>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${LEAFLY_CREAM}; border: 1px solid ${LEAFLY_BORDER}; border-radius: 6px; margin: 16px 0;">
      <tr>
        <td style="padding: 10px 16px; border-bottom: 1px solid ${LEAFLY_BORDER}; font-size: 13px; color: ${LEAFLY_MUTED}; width: 120px;">Reference:</td>
        <td style="padding: 10px 16px; border-bottom: 1px solid ${LEAFLY_BORDER}; font-size: 13px; font-weight: 600; color: ${LEAFLY_GOLD}; font-family: monospace;">#${data.referenceId}</td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; border-bottom: 1px solid ${LEAFLY_BORDER}; font-size: 13px; color: ${LEAFLY_MUTED};">Customer Name:</td>
        <td style="padding: 10px 16px; border-bottom: 1px solid ${LEAFLY_BORDER}; font-size: 13px; font-weight: 600; color: ${LEAFLY_GREEN};">${data.name}</td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; border-bottom: 1px solid ${LEAFLY_BORDER}; font-size: 13px; color: ${LEAFLY_MUTED};">Customer Email:</td>
        <td style="padding: 10px 16px; border-bottom: 1px solid ${LEAFLY_BORDER}; font-size: 13px; color: ${LEAFLY_TEXT};"><a href="mailto:${data.email}">${data.email}</a></td>
      </tr>
      ${data.phone ? `
      <tr>
        <td style="padding: 10px 16px; border-bottom: 1px solid ${LEAFLY_BORDER}; font-size: 13px; color: ${LEAFLY_MUTED};">Phone:</td>
        <td style="padding: 10px 16px; border-bottom: 1px solid ${LEAFLY_BORDER}; font-size: 13px; color: ${LEAFLY_TEXT};"><a href="tel:${data.phone}">${data.phone}</a></td>
      </tr>` : ""}
      <tr>
        <td style="padding: 10px 16px; border-bottom: 1px solid ${LEAFLY_BORDER}; font-size: 13px; color: ${LEAFLY_MUTED};">Subject:</td>
        <td style="padding: 10px 16px; border-bottom: 1px solid ${LEAFLY_BORDER}; font-size: 13px; font-weight: 600; color: ${LEAFLY_TEXT};">${data.subject}</td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; border-bottom: 1px solid ${LEAFLY_BORDER}; font-size: 13px; color: ${LEAFLY_MUTED};">Message:</td>
        <td style="padding: 10px 16px; border-bottom: 1px solid ${LEAFLY_BORDER}; font-size: 13px; color: ${LEAFLY_TEXT}; white-space: pre-wrap;">${data.message}</td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; font-size: 13px; color: ${LEAFLY_MUTED};">Received At:</td>
        <td style="padding: 10px 16px; font-size: 13px; color: ${LEAFLY_TEXT};">${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</td>
      </tr>
    </table>
  `;

  return {
    subject,
    html: baseEmailWrapper("Customer Inquiry", content),
  };
}

// =========================================================================
// 4. ORDER NOTIFICATION TEMPLATES
// =========================================================================

export interface OrderEmailData {
  id: string;
  customerName: string;
  email?: string;
  phone?: string;
  total: number;
}

export function getOrderConfirmationCustomerEmail(data: OrderEmailData): { subject: string; html: string } {
  const subject = `Your Leafly Order #${data.id} is Confirmed 🍃`;
  const content = `
    <h2 style="margin: 0 0 16px; font-family: Georgia, serif; font-size: 22px; color: ${LEAFLY_GREEN}; font-weight: normal; line-height: 1.3;">
      Thank You for Your Order, ${data.customerName}!
    </h2>
    <p style="font-size: 15px; line-height: 1.6; color: ${LEAFLY_TEXT}; margin: 0 0 16px;">
      Your fresh harvest tea order <strong>#${data.id}</strong> has been received and is being carefully packed with intention.
    </p>

    <!-- Order Summary Box -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${LEAFLY_CREAM}; border: 1px solid ${LEAFLY_BORDER}; border-radius: 6px; margin: 20px 0;">
      <tr>
        <td style="padding: 12px 18px; border-bottom: 1px solid ${LEAFLY_BORDER}; font-size: 13px; color: ${LEAFLY_MUTED};">Order Number:</td>
        <td style="padding: 12px 18px; border-bottom: 1px solid ${LEAFLY_BORDER}; font-size: 14px; font-weight: 600; color: ${LEAFLY_GREEN}; font-family: monospace;">#${data.id}</td>
      </tr>
      <tr>
        <td style="padding: 12px 18px; border-bottom: 1px solid ${LEAFLY_BORDER}; font-size: 13px; color: ${LEAFLY_MUTED};">Order Total:</td>
        <td style="padding: 12px 18px; border-bottom: 1px solid ${LEAFLY_BORDER}; font-size: 16px; font-weight: 700; color: ${LEAFLY_GOLD};">₹${data.total}</td>
      </tr>
      <tr>
        <td style="padding: 12px 18px; font-size: 13px; color: ${LEAFLY_MUTED};">Status:</td>
        <td style="padding: 12px 18px; font-size: 13px; font-weight: 600; color: #2e7d32;">Confirmed · Dispatch In Progress</td>
      </tr>
    </table>

    <p style="font-size: 14px; line-height: 1.6; color: ${LEAFLY_TEXT}; margin: 20px 0 28px;">
      You can track your order status anytime from your <a href="https://leafly.vercel.app/orders">Leafly Orders Page</a>.
    </p>

    <div align="center" style="margin: 28px 0 12px;">
      <a href="https://leafly.vercel.app/orders" style="display: inline-block; background-color: ${LEAFLY_GREEN}; color: #f7f3ec; font-size: 13px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; padding: 12px 28px; border-radius: 4px; text-decoration: none; border: 1px solid ${LEAFLY_GOLD};">
        View Order Status
      </a>
    </div>
  `;

  return {
    subject,
    html: baseEmailWrapper("Order Confirmed", content),
  };
}

export function getOrderAdminNotificationEmail(data: OrderEmailData): { subject: string; html: string } {
  const subject = `New Order Placed #${data.id} (₹${data.total}) — Leafly`;
  const content = `
    <h2 style="margin: 0 0 16px; font-family: Georgia, serif; font-size: 20px; color: ${LEAFLY_GREEN}; font-weight: normal;">
      New Customer Order Received
    </h2>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${LEAFLY_CREAM}; border: 1px solid ${LEAFLY_BORDER}; border-radius: 6px; margin: 16px 0;">
      <tr>
        <td style="padding: 10px 16px; border-bottom: 1px solid ${LEAFLY_BORDER}; font-size: 13px; color: ${LEAFLY_MUTED}; width: 120px;">Order ID:</td>
        <td style="padding: 10px 16px; border-bottom: 1px solid ${LEAFLY_BORDER}; font-size: 14px; font-weight: 600; color: ${LEAFLY_GREEN}; font-family: monospace;">#${data.id}</td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; border-bottom: 1px solid ${LEAFLY_BORDER}; font-size: 13px; color: ${LEAFLY_MUTED};">Customer:</td>
        <td style="padding: 10px 16px; border-bottom: 1px solid ${LEAFLY_BORDER}; font-size: 13px; font-weight: 600; color: ${LEAFLY_TEXT};">${data.customerName}</td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; border-bottom: 1px solid ${LEAFLY_BORDER}; font-size: 13px; color: ${LEAFLY_MUTED};">Email:</td>
        <td style="padding: 10px 16px; border-bottom: 1px solid ${LEAFLY_BORDER}; font-size: 13px; color: ${LEAFLY_TEXT};"><a href="mailto:${data.email}">${data.email || "—"}</a></td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; border-bottom: 1px solid ${LEAFLY_BORDER}; font-size: 13px; color: ${LEAFLY_MUTED};">Phone:</td>
        <td style="padding: 10px 16px; border-bottom: 1px solid ${LEAFLY_BORDER}; font-size: 13px; color: ${LEAFLY_TEXT};">${data.phone || "—"}</td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; border-bottom: 1px solid ${LEAFLY_BORDER}; font-size: 13px; color: ${LEAFLY_MUTED};">Total Amount:</td>
        <td style="padding: 10px 16px; border-bottom: 1px solid ${LEAFLY_BORDER}; font-size: 14px; font-weight: 700; color: ${LEAFLY_GOLD};">₹${data.total}</td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; font-size: 13px; color: ${LEAFLY_MUTED};">Time:</td>
        <td style="padding: 10px 16px; font-size: 13px; color: ${LEAFLY_TEXT};">${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</td>
      </tr>
    </table>
  `;

  return {
    subject,
    html: baseEmailWrapper("New Order", content),
  };
}

export function getAccountWelcomeEmail(userName: string, userEmail: string): { subject: string; html: string } {
  const subject = "Welcome to Leafly — Your Account is Ready 🍃";
  const content = `
    <h2 style="margin: 0 0 16px; font-family: Georgia, serif; font-size: 22px; color: ${LEAFLY_GREEN}; font-weight: normal; line-height: 1.3;">
      Welcome to the Leafly Family, ${userName || "Valued Patron"}!
    </h2>
    <p style="font-size: 15px; line-height: 1.6; color: ${LEAFLY_TEXT}; margin: 0 0 16px;">
      Your account with Leafly has been created successfully. We're excited to have you embark on this sensory exploration of India's finest single-origin harvest teas and handcrafted teaware.
    </p>

    <!-- Account Details Box -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${LEAFLY_CREAM}; border: 1px solid ${LEAFLY_BORDER}; border-radius: 6px; margin: 20px 0;">
      <tr>
        <td style="padding: 12px 18px; border-bottom: 1px solid ${LEAFLY_BORDER}; font-size: 13px; color: ${LEAFLY_MUTED}; width: 130px;">Account Email:</td>
        <td style="padding: 12px 18px; border-bottom: 1px solid ${LEAFLY_BORDER}; font-size: 14px; font-weight: 600; color: ${LEAFLY_GREEN};">${userEmail}</td>
      </tr>
      <tr>
        <td style="padding: 12px 18px; font-size: 13px; color: ${LEAFLY_MUTED};">Member Status:</td>
        <td style="padding: 12px 18px; font-size: 13px; font-weight: 600; color: ${LEAFLY_GOLD};">Active Patron · Pure Leaf Access</td>
      </tr>
    </table>

    <p style="font-size: 14px; line-height: 1.6; color: ${LEAFLY_TEXT}; margin: 20px 0 28px;">
      From your account, you can curate your ritual wishlist, track real-time dispatches, and access bespoke seasonal reserve teas before general release.
    </p>

    <div align="center" style="margin: 28px 0 12px;">
      <a href="https://leafly.vercel.app/shop" style="display: inline-block; background-color: ${LEAFLY_GREEN}; color: #f7f3ec; font-size: 13px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; padding: 14px 30px; border-radius: 4px; text-decoration: none; border: 1px solid ${LEAFLY_GOLD};">
        Explore Teas &amp; Teaware
      </a>
    </div>
  `;

  return {
    subject,
    html: baseEmailWrapper("Welcome to Leafly", content),
  };
}
