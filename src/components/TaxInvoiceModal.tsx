import { useEffect, useCallback, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import type { Order } from "../types/contracts";
import logo from "../assets/leafly-logo.webp";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function parseOrderDate(createdAt: unknown): Date | null {
  if (!createdAt) return null;

  if (createdAt instanceof Date) {
    return isNaN(createdAt.getTime()) ? null : createdAt;
  }

  if (
    typeof createdAt === "object" &&
    createdAt !== null &&
    "toDate" in createdAt &&
    typeof (createdAt as { toDate: () => unknown }).toDate === "function"
  ) {
    try {
      const d = (createdAt as { toDate: () => Date }).toDate();
      if (d instanceof Date && !isNaN(d.getTime())) return d;
    } catch {
      // Fallback
    }
  }

  if (
    typeof createdAt === "object" &&
    createdAt !== null &&
    ("seconds" in createdAt || "_seconds" in createdAt)
  ) {
    const secs = Number(
      (createdAt as { seconds?: number; _seconds?: number }).seconds ??
      (createdAt as { _seconds?: number })._seconds
    );
    if (!isNaN(secs) && secs > 0) {
      const d = new Date(secs * 1000);
      if (!isNaN(d.getTime())) return d;
    }
  }

  if (typeof createdAt === "number") {
    const ts = createdAt < 100000000000 ? createdAt * 1000 : createdAt;
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d;
  }

  if (typeof createdAt === "string") {
    const trimmed = createdAt.trim();
    if (!trimmed) return null;

    if (/^\d+$/.test(trimmed)) {
      const num = parseInt(trimmed, 10);
      const ts = num < 100000000000 ? num * 1000 : num;
      const d = new Date(ts);
      if (!isNaN(d.getTime())) return d;
    }

    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d;
  }

  return null;
}

function formatInvoiceDate(dateInput: unknown): string {
  try {
    const d = parseOrderDate(dateInput);
    if (!d) return "Date unavailable";

    const day = d.getDate().toString().padStart(2, "0");
    const month = MONTH_NAMES[d.getMonth()];
    const year = d.getFullYear();

    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const formattedHours = hours.toString().padStart(2, "0");

    return `${day} ${month} ${year}, ${formattedHours}:${minutes} ${ampm}`;
  } catch {
    return "Date unavailable";
  }
}

interface TaxInvoiceModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function TaxInvoiceModal({ order, isOpen, onClose }: TaxInvoiceModalProps) {
  // Lock body scroll while modal is visible
  useEffect(() => {
    if (!isOpen || !order) return;

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.body.classList.add("invoice-open");
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.classList.remove("invoice-open");
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, order, onClose]);

  const handlePrint = useCallback(() => {
    // Non-blocking print invocation
    requestAnimationFrame(() => {
      window.print();
    });
  }, []);

  const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen || !order) return null;

  const rawInvoiceId = String(order.id || "").trim();
  const invoiceNumber = rawInvoiceId.startsWith("INV-") ? rawInvoiceId : `INV-${rawInvoiceId}`;
  const orderDateFormatted = formatInvoiceDate(order.createdAt);
  const orderStatusText = String(order.orderStatus || order.status || "Confirmed");
  const recipientName =
    order.shippingAddress?.fullName || order.customerName || "Valued Customer";
  const addressLine1 = order.shippingAddress?.addressLine1 || "";
  const addressLine2 = order.shippingAddress?.addressLine2 || "";
  const city = order.shippingAddress?.city || "";
  const state = order.shippingAddress?.state || "";
  const postalCode = order.shippingAddress?.postalCode || "";
  const country = order.shippingAddress?.country || "India";
  const customerEmail = order.customerEmail || order.email || "";
  const customerPhone = order.customerPhone || "";
  const deliveryInstructions = order.deliveryInstructions || "";

  const items = Array.isArray(order.items) ? order.items : [];
  const rawSubtotal = Number(order.subtotal);
  const rawTotal = Number(order.total);
  const subtotal = !isNaN(rawSubtotal) && rawSubtotal > 0 ? rawSubtotal : (!isNaN(rawTotal) ? rawTotal : 0);
  const discount = Math.max(0, Number(order.discount) || 0);
  const deliveryFee = Math.max(0, Number(order.deliveryFee) || 0);
  const total = !isNaN(rawTotal) && rawTotal >= 0 ? rawTotal : Math.max(0, subtotal - discount + deliveryFee);

  const paymentMethodRaw = String(order.paymentMethod || "cod").toLowerCase();
  const paymentMethodText =
    paymentMethodRaw === "cod" ? "PAY ON DELIVERY (COD)" : paymentMethodRaw.toUpperCase();
  const paymentStatusText = String(order.paymentStatus || (paymentMethodRaw === "cod" ? "Pending (Cash/UPI on Delivery)" : "Confirmed"));
  const deliveryMethodText = String(order.deliveryMethod || "Standard Delivery");

  const modalContent = (
    <div
      className="invoice-modal-overlay invoice-modal-backdrop"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={`Official Tax Invoice for Order ${invoiceNumber}`}
    >
      <div
        className="invoice-modal-card invoice-modal-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="invoice-modal-actions invoice-action-bar no-print">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              className="invoice-print-btn"
              onClick={handlePrint}
              title="Print or save as authentic PDF"
            >
              🖨️ Print / Save as PDF
            </button>
          </div>
          <button
            type="button"
            className="invoice-close-btn"
            onClick={onClose}
            aria-label="Close invoice preview"
          >
            ✕ Close
          </button>
        </div>

        {/* PRINTABLE INVOICE SHEET */}
        <div className="invoice-sheet" id="printable-invoice">
          <header className="invoice-header">
            <div className="invoice-brand-col">
              <div className="invoice-logo-row">
                <img src={logo} alt="Leafly" className="invoice-logo-img" />
                <div>
                  <h2 className="invoice-brand-name">LEAFLY</h2>
                  <p className="invoice-brand-sub">TEA SANCTUARY &amp; BOTANICALS</p>
                </div>
              </div>
            </div>
            <div className="invoice-meta-top">
              <h3>TAX INVOICE / RECEIPT</h3>
              <p><strong>Invoice #:</strong> {invoiceNumber}</p>
              <p><strong>Order Date:</strong> {orderDateFormatted}</p>
              <p>
                <strong>Order Status:</strong>{" "}
                <span className="invoice-status-pill">{orderStatusText}</span>
              </p>
            </div>
          </header>

          <div className="invoice-parties-grid">
            <div className="invoice-party-col">
              <h4>SOLD BY:</h4>
              <strong>Leafly</strong>
              <p>Near Balaji Symphony,</p>
              <p>Panvel - 410206,</p>
              <p>Maharashtra, India</p>
              <p>myleaflytea@gmail.com</p>
            </div>
            <div className="invoice-party-col">
              <h4>BILLED TO / DELIVERED TO:</h4>
              <strong>{recipientName}</strong>
              {addressLine1 ? <p>{addressLine1}</p> : null}
              {addressLine2 ? <p>{addressLine2}</p> : null}
              {(city || state || postalCode) ? (
                <p>
                  {city ? `${city}` : ""}
                  {state ? (city ? `, ${state}` : state) : ""}
                  {postalCode ? ` - ${postalCode}` : ""}
                </p>
              ) : null}
              <p>{country}</p>
              {customerEmail ? (
                <p style={{ marginTop: "4px" }}>
                  <strong>Email:</strong> {customerEmail}
                </p>
              ) : null}
              {customerPhone ? (
                <p>
                  <strong>Phone:</strong> {customerPhone}
                </p>
              ) : null}
            </div>
          </div>

          {deliveryInstructions ? (
            <div className="invoice-instructions-callout">
              <strong>Delivery Instructions:</strong> {deliveryInstructions}
            </div>
          ) : null}

          {/* ITEMS TABLE */}
          <table className="invoice-table">
            <thead>
              <tr>
                <th style={{ width: "32px" }}>#</th>
                <th>Item Description</th>
                <th>Weight / Variant</th>
                <th style={{ textAlign: "center", width: "45px" }}>Qty</th>
                <th style={{ textAlign: "right", width: "90px" }}>Unit Price</th>
                <th style={{ textAlign: "right", width: "95px" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? (
                items.map((item, idx) => {
                  const itemPrice = Math.max(0, Number(item.price) || 0);
                  const itemQty = Math.max(1, Number(item.quantity) || 1);
                  const lineTotal = itemPrice * itemQty;
                  return (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td>
                        <strong className="invoice-item-name">{item.name || "Leafly Tea Selection"}</strong>
                        {item.category ? (
                          <small className="invoice-item-cat">{item.category} Selection</small>
                        ) : null}
                      </td>
                      <td>{item.variant || item.weight || "100g"}</td>
                      <td style={{ textAlign: "center" }}>{itemQty}</td>
                      <td style={{ textAlign: "right" }}>{currencyFormatter.format(itemPrice)}</td>
                      <td style={{ textAlign: "right" }}>{currencyFormatter.format(lineTotal)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "12px", color: "#6b7280" }}>
                    No individual line items listed. Total order value: {currencyFormatter.format(total)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* FINANCIAL SUMMARY TABLE */}
          <div className="invoice-totals-section">
            <div className="invoice-payment-info">
              <h4>PAYMENT &amp; DISPATCH SUMMARY</h4>
              <p><strong>Payment Method:</strong> {paymentMethodText}</p>
              <p><strong>Payment Status:</strong> {paymentStatusText}</p>
              <p><strong>Delivery Method:</strong> {deliveryMethodText}</p>
            </div>

            <div className="invoice-totals-box">
              <div className="invoice-totals-row">
                <span>Subtotal:</span>
                <span>{currencyFormatter.format(subtotal)}</span>
              </div>
              {discount > 0 ? (
                <div className="invoice-totals-row invoice-discount-row">
                  <span>Discount {order.couponCode ? `(${order.couponCode})` : ""}:</span>
                  <span>- {currencyFormatter.format(discount)}</span>
                </div>
              ) : null}
              <div className="invoice-totals-row">
                <span>Delivery Fee:</span>
                <span>{deliveryFee > 0 ? currencyFormatter.format(deliveryFee) : "FREE"}</span>
              </div>
              <div className="invoice-totals-row invoice-grand-total">
                <span>Final Amount:</span>
                <span>{currencyFormatter.format(total)}</span>
              </div>
            </div>
          </div>

          <footer className="invoice-footer">
            <p>Thank you for steepening your ritual with Leafly. Steep pure, savor quietness.</p>
            <small>This is an authentic computer-generated tax invoice and requires no physical signature.</small>
          </footer>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") {
    return modalContent;
  }

  return createPortal(modalContent, document.body);
}
