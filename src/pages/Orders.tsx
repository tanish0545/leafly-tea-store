import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useOrderContext, type Order } from "../context/OrderContext";
import { useAuth } from "../context/AuthContext";
import { ApiService } from "../lib/apiClient";
import Footer from "../components/Footer";
import SEO from "../components/SEO";
import TaxInvoiceModal from "../components/TaxInvoiceModal";
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
  const { orders, cancelOrder, latestOrder } = useOrderContext();

  const [sessionOrder, setSessionOrder] = useState<Order | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem("leafly_last_order");
        if (stored) return JSON.parse(stored) as Order;
      } catch {
        // ignore
      }
    }
    return null;
  });

  const [localGuestOrders, setLocalGuestOrders] = useState<Order[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("leafly_recent_guest_orders");
        if (stored) {
          const parsed = JSON.parse(stored);
          return Array.isArray(parsed) ? (parsed as Order[]) : [];
        }
      } catch {
        // ignore
      }
    }
    return [];
  });

  const recentGuestOrder = latestOrder || sessionOrder;

  const guestOrdersToDisplay = [
    ...(recentGuestOrder ? [recentGuestOrder] : []),
    ...localGuestOrders.filter((o) => !recentGuestOrder || o.id !== recentGuestOrder.id),
  ];

  const [verifiedGuestOrders, setVerifiedGuestOrders] = useState<Order[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<Date | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  // Secure email OTP verification state for historical guest orders
  const [lookupEmail, setLookupEmail] = useState(() => {
    if (guestOrdersToDisplay.length > 0) {
      return guestOrdersToDisplay[0].customerEmail || guestOrdersToDisplay[0].email || "";
    }
    return "";
  });
  const [lookupCode, setLookupCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupNotice, setLookupNotice] = useState<string | null>(null);

  /**
   * Authoritative Guest Order Status Synchronization & Revalidation
   * Fetches latest persisted status, timestamps, and tracking metadata from the database
   */
  const syncGuestOrders = useCallback(async (showNotice = false) => {
    const allGuestOrders = [
      ...(sessionOrder ? [sessionOrder] : []),
      ...localGuestOrders,
      ...verifiedGuestOrders,
    ];

    const uniqueMap = new Map<string, Order>();
    for (const o of allGuestOrders) {
      if (o && o.id) {
        uniqueMap.set(o.id, o);
      }
    }

    const uniqueOrders = Array.from(uniqueMap.values());
    const payload = uniqueOrders
      .map((o) => ({
        id: o.id,
        email: (o.customerEmail || o.email || "").toLowerCase().trim(),
      }))
      .filter((item) => item.id && item.email);

    if (payload.length === 0) return;

    setIsSyncing(true);
    try {
      const res = await ApiService.syncGuestOrders(payload);
      if (res && res.success && Array.isArray(res.updatedStatuses)) {
        const statusMap = new Map<string, any>();
        for (const st of res.updatedStatuses) {
          statusMap.set(st.id, st);
        }

        // 1. Update sessionOrder
        if (sessionOrder && statusMap.has(sessionOrder.id)) {
          const fresh = statusMap.get(sessionOrder.id);
          const merged = { ...sessionOrder, ...fresh };
          setSessionOrder(merged);
          try {
            sessionStorage.setItem("leafly_last_order", JSON.stringify(merged));
          } catch {}
        }

        // 2. Update localGuestOrders
        if (localGuestOrders.length > 0) {
          const updatedLocal = localGuestOrders.map((ord) => {
            if (statusMap.has(ord.id)) {
              return { ...ord, ...statusMap.get(ord.id) };
            }
            return ord;
          });
          setLocalGuestOrders(updatedLocal);
          try {
            localStorage.setItem("leafly_recent_guest_orders", JSON.stringify(updatedLocal));
          } catch {}
        }

        // 3. Update verifiedGuestOrders
        if (verifiedGuestOrders.length > 0) {
          const updatedVerified = verifiedGuestOrders.map((ord) => {
            if (statusMap.has(ord.id)) {
              return { ...ord, ...statusMap.get(ord.id) };
            }
            return ord;
          });
          setVerifiedGuestOrders(updatedVerified);
        }

        setLastSyncedTime(new Date());
        if (showNotice) {
          setSyncNotice("Order status updated from server.");
          setTimeout(() => setSyncNotice(null), 3000);
        }
      }
    } catch (syncErr) {
      console.warn("[Orders] Guest order status sync notice:", syncErr);
    } finally {
      setIsSyncing(false);
    }
  }, [sessionOrder, localGuestOrders, verifiedGuestOrders]);

  // Initial auto-sync on mount
  useEffect(() => {
    if (!isAuthenticated && !authLoading && (guestOrdersToDisplay.length > 0 || verifiedGuestOrders.length > 0)) {
      syncGuestOrders();
    }
  }, [isAuthenticated, authLoading]);

  const isInvoiceModalOpenRef = useRef(false);

  // Revalidate whenever window refocuses or tab becomes visible again
  useEffect(() => {
    const handleRevalidate = () => {
      // Do not interrupt user if invoice modal or print sheet is active
      if (!document.hidden && !isAuthenticated && !isInvoiceModalOpenRef.current) {
        syncGuestOrders();
      }
    };
    window.addEventListener("focus", handleRevalidate);
    document.addEventListener("visibilitychange", handleRevalidate);
    return () => {
      window.removeEventListener("focus", handleRevalidate);
      document.removeEventListener("visibilitychange", handleRevalidate);
    };
  }, [syncGuestOrders, isAuthenticated]);

  // URL query parameter auto-fill (e.g. from tracking emails: /orders?email=...&orderId=...)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlEmail = params.get("email");
      if (urlEmail && !lookupEmail) {
        setLookupEmail(urlEmail.trim().toLowerCase());
      }
    }
  }, []);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = lookupEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setLookupError("Please enter a valid email address.");
      return;
    }
    setLookupLoading(true);
    setLookupError(null);
    setLookupNotice(null);
    try {
      const res = await ApiService.sendOrderLookupCode(cleanEmail);
      if (res && res.success) {
        setCodeSent(true);
        setLookupNotice(res.message || `A 6-digit verification code has been dispatched to ${cleanEmail}.`);
      } else {
        setLookupError(res?.error || "Unable to send verification code. Please check your email.");
      }
    } catch (err: any) {
      setLookupError(err?.message || "Failed to dispatch verification code. Please try again.");
    } finally {
      setLookupLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = lookupEmail.trim().toLowerCase();
    const cleanCode = lookupCode.trim();
    if (!cleanCode || cleanCode.length < 6) {
      setLookupError("Please enter the 6-digit verification code sent to your email.");
      return;
    }
    setLookupLoading(true);
    setLookupError(null);
    try {
      const res = await ApiService.verifyOrderLookupCode(cleanEmail, cleanCode);
      if (res && res.success && Array.isArray(res.orders)) {
        setVerifiedGuestOrders(res.orders);
        setLookupNotice(`Successfully verified! Found ${res.orders.length} order(s) for ${cleanEmail}.`);
      } else {
        setLookupError(res?.error || "Invalid or expired verification code.");
      }
    } catch (err: any) {
      setLookupError(err?.message || "Verification failed. Please try again.");
    } finally {
      setLookupLoading(false);
    }
  };

  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<Order | null>(null);
  const [openingInvoiceId, setOpeningInvoiceId] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [cancelFeedback, setCancelFeedback] = useState<string | null>(null);

  isInvoiceModalOpenRef.current = Boolean(selectedInvoiceOrder);

  const handleOpenInvoice = (order: Order) => {
    setOpeningInvoiceId(order.id);
    setSelectedInvoiceOrder(order);
    setTimeout(() => setOpeningInvoiceId(null), 300);
  };

  // Clean non-blocking modal handling is delegated to TaxInvoiceModal

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

  const renderOrderCard = (order: Order, isGuestView = false) => {
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
          <span>💳 Payment: <strong>{order.paymentMethod ? (order.paymentMethod === "cod" ? "PAY ON DELIVERY" : order.paymentMethod.toUpperCase()) : "PAY ON DELIVERY"}</strong></span>
          <span>💰 Total: <strong>{currencyFormatter.format(order.total)}</strong></span>
          {order.trackingNumber && (
            <span>📍 Tracking: <strong>{order.carrier ? `${order.carrier} · ` : ""}{order.trackingNumber}</strong></span>
          )}
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
            onClick={() => handleOpenInvoice(order)}
            disabled={openingInvoiceId === order.id}
          >
            {openingInvoiceId === order.id ? "Opening..." : "📄 View / Print Tax Invoice"}
          </button>

          {!isCancelledOrDelivered && !isGuestView && (
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

      {!isAuthenticated && !authLoading ? (
        <div className="orders-guest-container" style={{ maxWidth: "1000px", margin: "0 auto", padding: "0 1rem" }}>
          {/* 1. RECENT GUEST ORDERS PLACED ON THIS DEVICE */}
          {guestOrdersToDisplay.length > 0 && (
            <div style={{ marginBottom: "2.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "1.2px", color: "#8c6823", textTransform: "uppercase" }}>
                    ✦ YOUR RECENT GUEST ORDERS ({guestOrdersToDisplay.length})
                  </span>
                  <h2 style={{ fontSize: "22px", fontFamily: "Georgia, serif", color: "#0b2b1e", margin: "4px 0 0 0" }}>
                    Orders Placed On This Device
                  </h2>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  {lastSyncedTime && (
                    <span style={{ fontSize: "12px", color: "#6a7b72" }}>
                      Synced at {lastSyncedTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => syncGuestOrders(true)}
                    disabled={isSyncing}
                    title="Revalidate and fetch latest status from database"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      background: isSyncing ? "rgba(11, 43, 30, 0.05)" : "#ffffff",
                      border: "1px solid rgba(11, 43, 30, 0.2)",
                      borderRadius: "6px",
                      padding: "6px 14px",
                      fontSize: "12.5px",
                      fontWeight: 600,
                      color: "#0b2b1e",
                      cursor: isSyncing ? "wait" : "pointer",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                      transition: "all 0.2s ease"
                    }}
                  >
                    <span
                      style={{
                        display: "inline-block",
                        animation: isSyncing ? "spin 1s linear infinite" : "none",
                        fontSize: "14px"
                      }}
                    >
                      ↻
                    </span>
                    {isSyncing ? "Syncing..." : "Refresh Status"}
                  </button>
                </div>
              </div>

              {syncNotice && (
                <div style={{ marginBottom: "12px", padding: "8px 12px", background: "rgba(22, 101, 52, 0.08)", color: "#166534", borderRadius: "6px", fontSize: "12px", fontWeight: 600 }}>
                  ✓ {syncNotice}
                </div>
              )}

              <div className="orders-list">
                {guestOrdersToDisplay.map((ord) => renderOrderCard(ord, true))}
              </div>
            </div>
          )}

          {/* 2. VERIFIED ORDERS (IF OTP VERIFIED) */}
          {verifiedGuestOrders.length > 0 && (
            <div style={{ marginBottom: "2.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "1.2px", color: "#166534", textTransform: "uppercase" }}>
                    ✓ VERIFIED GUEST ORDER HISTORY
                  </span>
                  <h2 style={{ fontSize: "22px", fontFamily: "Georgia, serif", color: "#0b2b1e", margin: "4px 0 0 0" }}>
                    Orders associated with {lookupEmail} ({verifiedGuestOrders.length})
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => syncGuestOrders(true)}
                  disabled={isSyncing}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "#ffffff",
                    border: "1px solid rgba(11, 43, 30, 0.2)",
                    borderRadius: "6px",
                    padding: "6px 12px",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#0b2b1e",
                    cursor: isSyncing ? "wait" : "pointer"
                  }}
                >
                  ↻ Refresh
                </button>
              </div>
              <div className="orders-list">
                {verifiedGuestOrders.map((ord) => renderOrderCard(ord, true))}
              </div>
            </div>
          )}

          {/* 3. SECURE GUEST ORDER RETRIEVAL SECTION */}
          <div style={{
            background: "#ffffff",
            border: "1px solid rgba(11, 43, 30, 0.12)",
            borderRadius: "14px",
            padding: "2rem",
            marginBottom: "2rem",
            boxShadow: "0 4px 20px rgba(0,0,0,0.04)"
          }}>
            <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "1.5px", color: "#8c6823", textTransform: "uppercase" }}>
              🔒 SECURE ORDER RETRIEVAL
            </span>
            <h2 style={{ fontSize: "20px", fontFamily: "Georgia, serif", color: "#0b2b1e", margin: "6px 0 8px 0" }}>
              Track Past Guest Orders
            </h2>
            <p style={{ fontSize: "13.5px", color: "#5d6d64", margin: "0 0 1.25rem 0", lineHeight: 1.6, maxWidth: "700px" }}>
              To protect customer confidentiality, order history is accessible only via verified email ownership. Enter the email address you used during checkout to receive an instant 6-digit verification code.
            </p>

            {!codeSent ? (
              <form onSubmit={handleSendOtp} style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                <input
                  type="email"
                  placeholder="Enter checkout email (e.g. name@example.com)"
                  value={lookupEmail}
                  onChange={(e) => {
                    setLookupEmail(e.target.value);
                    setLookupError(null);
                  }}
                  style={{
                    flex: "1 1 280px",
                    padding: "11px 14px",
                    border: "1px solid #dcd3c4",
                    borderRadius: "6px",
                    fontSize: "13.5px",
                    outline: "none"
                  }}
                  required
                />
                <button
                  type="submit"
                  disabled={lookupLoading}
                  style={{
                    background: "#0b2b1e",
                    color: "#ffffff",
                    padding: "11px 22px",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: 700,
                    letterSpacing: "0.5px",
                    cursor: lookupLoading ? "wait" : "pointer",
                    border: "none",
                    whiteSpace: "nowrap"
                  }}
                >
                  {lookupLoading ? "SENDING CODE..." : "SEND VERIFICATION CODE →"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Enter 6-digit code"
                  value={lookupCode}
                  onChange={(e) => {
                    setLookupCode(e.target.value);
                    setLookupError(null);
                  }}
                  style={{
                    flex: "1 1 200px",
                    padding: "11px 14px",
                    border: "1px solid #0b2b1e",
                    borderRadius: "6px",
                    fontSize: "15px",
                    fontWeight: 700,
                    letterSpacing: "4px",
                    outline: "none"
                  }}
                  required
                />
                <button
                  type="submit"
                  disabled={lookupLoading}
                  style={{
                    background: "#0b2b1e",
                    color: "#ffffff",
                    padding: "11px 22px",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: lookupLoading ? "wait" : "pointer",
                    border: "none"
                  }}
                >
                  {lookupLoading ? "VERIFYING..." : "VERIFY & VIEW ORDERS"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCodeSent(false);
                    setLookupCode("");
                    setLookupError(null);
                  }}
                  style={{
                    background: "transparent",
                    color: "#6a7b72",
                    border: "none",
                    fontSize: "12.5px",
                    cursor: "pointer",
                    textDecoration: "underline"
                  }}
                >
                  Resend or change email
                </button>
              </form>
            )}

            {lookupError && (
              <div style={{ marginTop: "12px", padding: "10px 14px", background: "rgba(220, 38, 38, 0.08)", color: "#b91c1c", borderRadius: "6px", fontSize: "12.5px" }}>
                ⚠️ {lookupError}
              </div>
            )}
            {lookupNotice && (
              <div style={{ marginTop: "12px", padding: "10px 14px", background: "rgba(22, 101, 52, 0.08)", color: "#166534", borderRadius: "6px", fontSize: "12.5px" }}>
                ✓ {lookupNotice}
              </div>
            )}
          </div>

          {/* 4. PERMANENT SANCTUARY INVITATION */}
          <div style={{
            background: "linear-gradient(135deg, rgba(201, 162, 75, 0.12) 0%, rgba(201, 162, 75, 0.04) 100%)",
            border: "1px solid rgba(201, 162, 75, 0.35)",
            borderRadius: "14px",
            padding: "1.75rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1.25rem",
            marginBottom: "2rem"
          }}>
            <div>
              <h3 style={{ fontFamily: "Georgia, serif", fontSize: "18px", color: "#0b2b1e", margin: "0 0 4px 0" }}>
                Want lifetime access to your orders anytime?
              </h3>
              <p style={{ fontSize: "13px", color: "#6a7b72", margin: 0, maxWidth: "560px" }}>
                Sign in or set your account password on your profile using your checkout email to see all past and future orders without needing email verification.
              </p>
            </div>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => navigate("/login")}
                style={{
                  background: "#0b2b1e",
                  color: "#ffffff",
                  padding: "10px 20px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                  border: "none"
                }}
              >
                SIGN IN →
              </button>
              <button
                type="button"
                onClick={() => navigate("/profile")}
                style={{
                  background: "rgba(201, 162, 75, 0.15)",
                  color: "#855a12",
                  border: "1px solid rgba(201, 162, 75, 0.4)",
                  padding: "10px 18px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                ACCOUNT SANCTUARY
              </button>
            </div>
          </div>
        </div>
      ) : sortedOrders.length === 0 ? (
        <div className="orders-empty">
          <h2>No orders yet</h2>
          <p>Your tea sanctuary is waiting. Explore single-estate leaves crafted with care.</p>
          <button type="button" className="orders-primary-button" onClick={() => navigate("/shop")}>
            EXPLORE TEAS
          </button>
        </div>
      ) : (
        <div className="orders-list">
          {sortedOrders.map((order) => renderOrderCard(order, false))}
        </div>
      )}

      {/* AUTHORITATIVE INVOICE MODAL */}
      <TaxInvoiceModal
        order={selectedInvoiceOrder}
        isOpen={Boolean(selectedInvoiceOrder)}
        onClose={() => setSelectedInvoiceOrder(null)}
      />

      <Footer />
    </main>
  );
}

