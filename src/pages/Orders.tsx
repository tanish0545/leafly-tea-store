import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useOrderContext, type Order } from "../context/OrderContext";
import { useAuth } from "../context/AuthContext";
import Footer from "../components/Footer";
import SEO from "../components/SEO";
import "./Orders.css";

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

function formatOrderDate(dateInput: unknown): string {
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

function getStatusBadgeStyle(status?: string): { background: string; color: string; border: string } {
  const norm = (status || "Processing").toLowerCase();
  if (norm.includes("deliv")) {
    return { background: "rgba(16, 185, 129, 0.12)", color: "#065f46", border: "1px solid rgba(16, 185, 129, 0.3)" };
  }
  if (norm.includes("cancel")) {
    return { background: "rgba(239, 68, 68, 0.12)", color: "#991b1b", border: "1px solid rgba(239, 68, 68, 0.3)" };
  }
  if (norm.includes("ship") || norm.includes("out")) {
    return { background: "rgba(59, 130, 246, 0.12)", color: "#1e40af", border: "1px solid rgba(59, 130, 246, 0.3)" };
  }
  return { background: "rgba(201, 162, 75, 0.15)", color: "#855a12", border: "1px solid rgba(201, 162, 75, 0.4)" };
}

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

function getOrderCancellationState(order: Order): {
  isCancelledOrDelivered: boolean;
  isWithin2Hours: boolean;
} {
  const currentStatus = (order.orderStatus || order.status || "").toLowerCase().trim();
  const isCancelledOrDelivered =
    currentStatus === "cancelled" ||
    currentStatus === "delivered" ||
    currentStatus.includes("cancel") ||
    currentStatus.includes("deliv");

  const parsedDate = parseOrderDate(order.createdAt);
  const createdTime = parsedDate ? parsedDate.getTime() : NaN;
  const diff = Date.now() - createdTime;
  const isWithin2Hours = !isNaN(createdTime) && diff <= TWO_HOURS_MS;

  return { isCancelledOrDelivered, isWithin2Hours };
}

export default function Orders() {
  const navigate = useNavigate();
  const { loading: authLoading, isAuthenticated } = useAuth();
  const { orders, cancelOrder } = useOrderContext();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login", { replace: true, state: { from: { pathname: "/orders" } } });
    }
  }, [authLoading, isAuthenticated, navigate]);

  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<Order | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [cancelFeedback, setCancelFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (selectedInvoiceOrder) {
      const prevBodyOverflow = document.body.style.overflow;
      const prevHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevBodyOverflow;
        document.documentElement.style.overflow = prevHtmlOverflow;
      };
    }
  }, [selectedInvoiceOrder]);

  const sortedOrders = [...orders].sort((a, b) => {
    const timeA = parseOrderDate(a.createdAt)?.getTime() || 0;
    const timeB = parseOrderDate(b.createdAt)?.getTime() || 0;
    return timeB - timeA;
  });


  const handleCancel = async (order: Order) => {
    const { isWithin2Hours } = getOrderCancellationState(order);
    if (!isWithin2Hours) {
      setCancelFeedback(
        "Your tea is being packed now, so you can no longer cancel this order. The cancellation window was 2 hours."
      );
      setTimeout(() => setCancelFeedback(null), 5000);
      return;
    }

    const confirmCancel = window.confirm(
      `Are you sure you want to cancel Order #${order.id}?`
    );
    if (!confirmCancel) return;

    try {
      setCancellingOrderId(order.id);
      await cancelOrder(order.id, order.couponCode);
      setCancelFeedback(`Order #${order.id} has been cancelled successfully.`);
      setTimeout(() => setCancelFeedback(null), 5000);
    } catch (err: unknown) {
      console.error("Cancel order error:", err);
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to cancel order. Please check your connection or contact support.";
      setCancelFeedback(msg);
      setTimeout(() => setCancelFeedback(null), 6000);
    } finally {
      setCancellingOrderId(null);
    }
  };

  return (
    <main className="orders-page">
      <SEO
        title="Your Orders | Leafly"
        description="View and track your Leafly orders."
        noindex={true}
      />
      <div className="orders-header">
        <div>
          <p className="orders-eyebrow">MY ORDERS</p>
          <h1>Order History</h1>
          <p className="orders-tagline">Track, review, or print invoices for every tea ritual you&apos;ve ordered.</p>
        </div>
      </div>

      {cancelFeedback && (
        <div className="orders-feedback-banner" role="status">
          <span>✓</span> {cancelFeedback}
        </div>
      )}

      {sortedOrders.length === 0 ? (
        <div className="orders-empty">
          <h2>No orders yet</h2>
          <p>Your tea sanctuary is waiting. Explore single-estate leaves crafted with care.</p>
          <button type="button" className="orders-primary-button" onClick={() => navigate("/shop")}>
            EXPLORE TEAS
          </button>
        </div>
      ) : (
        <div className="orders-list">
          {sortedOrders.map((order) => {
            const currentStatus = order.orderStatus || order.status || "Processing";
            const { isCancelledOrDelivered, isWithin2Hours } = getOrderCancellationState(order);
            const statusStyle = getStatusBadgeStyle(currentStatus);

            return (
              <article key={order.id} className="orders-card">
                {/* TOP HEADER */}
                <div className="orders-card-top">
                  <div>
                    <p className="orders-card-label">ORDER ID</p>
                    <strong className="orders-card-id">{order.id}</strong>
                    <span className="orders-card-date">Placed on {formatOrderDate(order.createdAt)}</span>
                  </div>
                  <div className="orders-badge-group">
                    <span className="orders-status-badge" style={statusStyle}>
                      {currentStatus}
                    </span>
                    {order.paymentStatus && (
                      <span
                        className="orders-status-badge"
                        style={{
                          background:
                            order.paymentStatus === "Paid"
                              ? "rgba(16, 185, 129, 0.12)"
                              : "rgba(201, 162, 75, 0.12)",
                          color: order.paymentStatus === "Paid" ? "#065f46" : "#855a12",
                          border: "1px solid rgba(11, 43, 30, 0.1)",
                        }}
                      >
                        Payment: {order.paymentStatus}
                      </span>
                    )}
                  </div>
                </div>

                {/* META INFO */}
                <div className="orders-card-meta">
                  <span>🚚 Method: <strong>{order.deliveryMethod || "Standard Delivery"}</strong></span>
                  <span>💳 Payment: <strong>{order.paymentMethod ? order.paymentMethod.toUpperCase() : "PAY ON DELIVERY"}</strong></span>
                  <span>💰 Total: <strong>{currencyFormatter.format(order.total)}</strong></span>
                </div>

                {/* ITEMS LIST */}
                <div className="orders-items">
                  {order.items.map((item, idx) => (
                    <div key={`${order.id}-${item.id || item.productId || idx}`} className="orders-item-row">
                      <div className="orders-item-left">
                        {item.image && (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="orders-item-img"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = "none";
                            }}
                          />
                        )}
                        <div className="orders-item-copy">
                          <strong>{item.name}</strong>
                          <small>{item.category || "Tea Selection"} · Variant: {item.variant || item.weight || "100g"}</small>
                        </div>
                      </div>
                      <div className="orders-item-price-col">
                        <span>
                          {item.quantity} × {currencyFormatter.format(item.price)}
                        </span>
                        <strong className="orders-item-line-total">
                          {currencyFormatter.format(item.price * item.quantity)}
                        </strong>
                      </div>
                    </div>
                  ))}
                </div>

                {/* SUMMARY & FINANCIAL BREAKDOWN */}
                <div className="orders-breakdown-box">
                  <div className="orders-breakdown-row">
                    <span>Subtotal</span>
                    <span>{currencyFormatter.format(order.subtotal || order.total)}</span>
                  </div>
                  {order.discount ? (
                    <div className="orders-breakdown-row orders-discount-row">
                      <span>Discount {order.couponCode ? `(Coupon: ${order.couponCode})` : ""}</span>
                      <span>- {currencyFormatter.format(order.discount)}</span>
                    </div>
                  ) : null}
                  <div className="orders-breakdown-row">
                    <span>Delivery Fee</span>
                    <span>{order.deliveryFee ? currencyFormatter.format(order.deliveryFee) : "FREE"}</span>
                  </div>
                  <div className="orders-breakdown-row orders-total-row">
                    <span>Grand Total</span>
                    <span>{currencyFormatter.format(order.total)}</span>
                  </div>
                </div>

                {/* SHIPPING & DELIVERY INSTRUCTIONS */}
                <div className="orders-destination-box">
                  <div>
                    <strong className="orders-destination-title">
                      📍 Delivering to: {order.customerName || order.shippingAddress?.fullName || "Valued Customer"}
                    </strong>
                    <p className="orders-destination-address">
                      {order.shippingAddress?.addressLine1}
                      {order.shippingAddress?.addressLine2 ? `, ${order.shippingAddress.addressLine2}` : ""},{" "}
                      {order.shippingAddress?.city}, {order.shippingAddress?.state} - {order.shippingAddress?.postalCode}
                    </p>
                    {order.customerPhone ? (
                      <p className="orders-destination-contact">📞 Phone: {order.customerPhone}</p>
                    ) : null}
                  </div>

                  {order.deliveryInstructions ? (
                    <div className="orders-instructions-badge">
                      <strong>📝 Delivery Instructions:</strong>
                      <p>{order.deliveryInstructions}</p>
                    </div>
                  ) : null}
                </div>

                {/* ORDER ACTIONS: INVOICE & CANCEL */}
                <div className="orders-actions-bar">
                  <button
                    type="button"
                    className="orders-action-btn orders-invoice-btn"
                    onClick={() => setSelectedInvoiceOrder(order)}
                  >
                    📄 View / Download Invoice
                  </button>

                  {!isCancelledOrDelivered && (
                    isWithin2Hours ? (
                      <button
                        type="button"
                        disabled={cancellingOrderId === order.id}
                        className="orders-action-btn orders-cancel-btn"
                        onClick={() => handleCancel(order)}
                      >
                        {cancellingOrderId === order.id ? "Cancelling..." : "✖ Cancel Order"}
                      </button>
                    ) : (
                      <span className="orders-action-btn orders-cancel-btn-disabled" style={{ border: "none", background: "none", color: "rgba(11, 43, 30, 0.5)", cursor: "default" }}>
                        Cancellation window expired
                      </span>
                    )
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* AUTHORITATIVE INVOICE MODAL */}
      {selectedInvoiceOrder && (
        <div 
          className="invoice-modal-overlay" 
          onClick={() => setSelectedInvoiceOrder(null)}
          ref={(el) => {
            if (el) el.scrollTop = 0;
          }}
        >
          <div className="invoice-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="invoice-modal-actions no-print">
              <button
                type="button"
                className="invoice-print-btn"
                onClick={() => window.print()}
              >
                🖨️ Print / Save as PDF
              </button>
              <button
                type="button"
                className="invoice-close-btn"
                onClick={() => setSelectedInvoiceOrder(null)}
              >
                ✕ Close
              </button>
            </div>

            {/* PRINTABLE INVOICE SHEET */}
            <div className="invoice-sheet" id="printable-invoice">
              <header className="invoice-header">
                <div className="invoice-brand-col">
                  <h2 className="invoice-brand-name">LEAFLY</h2>
                  <p className="invoice-brand-sub">TEA SANCTUARY & BOTANICALS</p>
                </div>
                <div className="invoice-meta-top">
                  <h3>TAX INVOICE / RECEIPT</h3>
                  <p><strong>Invoice #:</strong> INV-{selectedInvoiceOrder.id}</p>
                  <p><strong>Order Date:</strong> {formatOrderDate(selectedInvoiceOrder.createdAt)}</p>
                  <p>
                    <strong>Order Status:</strong>{" "}
                    <span className="invoice-status-pill">
                      {selectedInvoiceOrder.orderStatus || selectedInvoiceOrder.status || "Confirmed"}
                    </span>
                  </p>
                </div>
              </header>

              <div className="invoice-parties-grid">
                <div className="invoice-party-col">
                  <h4>SOLD BY:</h4>
                  <strong>Leafly Sanctuary Private Limited</strong>
                  <p>Heritage Tea Estate, High Range Sanctuary</p>
                  <p>Assam / Darjeeling / Nilgiri Estates, India</p>
                  <p>GSTIN: 29AAACL1234F1Z5</p>
                  <p>support@leafly.in · www.leafly.in</p>
                </div>

                <div className="invoice-party-col">
                  <h4>BILLED & SHIPPED TO:</h4>
                  <strong>
                    {selectedInvoiceOrder.customerName ||
                      selectedInvoiceOrder.shippingAddress?.fullName ||
                      "Valued Customer"}
                  </strong>
                  <p>{selectedInvoiceOrder.shippingAddress?.addressLine1}</p>
                  {selectedInvoiceOrder.shippingAddress?.addressLine2 && (
                    <p>{selectedInvoiceOrder.shippingAddress.addressLine2}</p>
                  )}
                  <p>
                    {selectedInvoiceOrder.shippingAddress?.city ? `${selectedInvoiceOrder.shippingAddress.city}, ` : ""}
                    {selectedInvoiceOrder.shippingAddress?.state ? `${selectedInvoiceOrder.shippingAddress.state} - ` : ""}
                    {selectedInvoiceOrder.shippingAddress?.postalCode || ""}
                  </p>
                  <p>{selectedInvoiceOrder.shippingAddress?.country || "India"}</p>
                  {selectedInvoiceOrder.customerPhone && (
                    <p>Phone: {selectedInvoiceOrder.customerPhone}</p>
                  )}
                  {selectedInvoiceOrder.customerEmail && (
                    <p>Email: {selectedInvoiceOrder.customerEmail}</p>
                  )}
                </div>
              </div>

              {selectedInvoiceOrder.deliveryInstructions ? (
                <div className="invoice-instructions-callout">
                  <strong>Delivery Instructions:</strong> {selectedInvoiceOrder.deliveryInstructions}
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
                  {selectedInvoiceOrder.items.map((item, idx) => (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td>
                        <strong className="invoice-item-name">{item.name}</strong>
                        {item.category && <small className="invoice-item-cat">{item.category} Selection</small>}
                      </td>
                      <td>{item.variant || item.weight || "100g"}</td>
                      <td style={{ textAlign: "center" }}>{item.quantity}</td>
                      <td style={{ textAlign: "right" }}>{currencyFormatter.format(item.price)}</td>
                      <td style={{ textAlign: "right" }}>{currencyFormatter.format(item.price * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* FINANCIAL SUMMARY TABLE */}
              <div className="invoice-totals-section">
                <div className="invoice-payment-info">
                  <h4>PAYMENT & DISPATCH SUMMARY</h4>
                  <p><strong>Payment Method:</strong> {selectedInvoiceOrder.paymentMethod ? selectedInvoiceOrder.paymentMethod.toUpperCase() : "PAY ON DELIVERY"}</p>
                  <p><strong>Payment Status:</strong> {selectedInvoiceOrder.paymentStatus || "Confirmed"}</p>
                  <p><strong>Delivery Method:</strong> {selectedInvoiceOrder.deliveryMethod || "Standard Delivery"}</p>
                </div>

                <div className="invoice-totals-box">
                  <div className="invoice-totals-row">
                    <span>Subtotal:</span>
                    <span>{currencyFormatter.format(selectedInvoiceOrder.subtotal || selectedInvoiceOrder.total)}</span>
                  </div>
                  {selectedInvoiceOrder.discount ? (
                    <div className="invoice-totals-row invoice-discount-row">
                      <span>Discount {selectedInvoiceOrder.couponCode ? `(${selectedInvoiceOrder.couponCode})` : ""}:</span>
                      <span>- {currencyFormatter.format(selectedInvoiceOrder.discount)}</span>
                    </div>
                  ) : null}
                  <div className="invoice-totals-row">
                    <span>Delivery Fee:</span>
                    <span>{selectedInvoiceOrder.deliveryFee ? currencyFormatter.format(selectedInvoiceOrder.deliveryFee) : "FREE"}</span>
                  </div>
                  <div className="invoice-totals-row invoice-grand-total">
                    <span>Final Amount:</span>
                    <span>{currencyFormatter.format(selectedInvoiceOrder.total)}</span>
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
      )}

      <Footer />
    </main>
  );
}

