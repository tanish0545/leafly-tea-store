import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useOrderContext } from "../context/OrderContext";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { db } from "../lib/firebase";
import { collection, addDoc, setDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import type { Order } from "../types/contracts";
import { ApiService } from "../lib/apiClient";
import DeliveryAnimation from "../components/DeliveryAnimation";
import Footer from "../components/Footer";
import SEO from "../components/SEO";
import logo from "../assets/leafly-logo.png";
import "./OrderSuccess.css";
import "./Orders.css";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export default function OrderSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlOrderId = searchParams.get("order_id");

  const { latestOrder } = useOrderContext();
  const { clearCart } = useCart();
  const { currentUser, firebaseUser, isAuthenticated } = useAuth();
  const [showInvoice, setShowInvoice] = useState(false);

  // 1. Resolve order: priority to context latestOrder, fallback to sessionStorage
  const [persistedOrder, setPersistedOrder] = useState<Order | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem("leafly_last_order");
        if (stored) {
          const parsed = JSON.parse(stored) as Order;
          // If URL order ID matches stored order, use it immediately
          if (!urlOrderId || parsed.id === urlOrderId) {
            return parsed;
          }
        }
      } catch {
        // ignore storage errors
      }
    }
    return null;
  });

  const [isVerifying, setIsVerifying] = useState<boolean>(() => {
    return Boolean(
      urlOrderId &&
        (!persistedOrder ||
          persistedOrder.id !== urlOrderId ||
          persistedOrder.paymentStatus !== "Paid")
    );
  });
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const order = latestOrder || persistedOrder;

  useEffect(() => {
    if (showInvoice) {
      document.body.classList.add("invoice-open");
      const prevBodyOverflow = document.body.style.overflow;
      const prevHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      return () => {
        document.body.classList.remove("invoice-open");
        document.body.style.overflow = prevBodyOverflow;
        document.documentElement.style.overflow = prevHtmlOverflow;
      };
    }
  }, [showInvoice]);

  // One-shot cart clear for COD orders.
  // Uses a ref flag so this fires EXACTLY ONCE on mount, regardless of clearCart identity.
  const cartClearedRef = useRef(false);
  useEffect(() => {
    if (!urlOrderId && !cartClearedRef.current) {
      cartClearedRef.current = true;
      clearCart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally empty — run once on mount only

  // Synchronize latestOrder into sessionStorage
  useEffect(() => {
    if (latestOrder) {
      setPersistedOrder(latestOrder);
      try {
        sessionStorage.setItem("leafly_last_order", JSON.stringify(latestOrder));
      } catch {
        // ignore
      }
    }
  }, [latestOrder]);

  // Handle return from Cashfree redirect URL (when order_id query param is present)
  useEffect(() => {
    if (!urlOrderId) return;

    let isMounted = true;

    async function verifyAndLoadOrder() {
      try {
        setIsVerifying(true);
        setVerificationError(null);

        // 1. Verify with backend serverless API
        const verifyRes = await ApiService.verifyCashfreePayment(urlOrderId!);

        if (!isMounted) return;

        if (verifyRes.verified) {
          // 2. Fetch updated order record from Firestore
          const snap = await getDoc(doc(db, "orders", urlOrderId!));
          if (snap.exists() && isMounted) {
            const fetched = { id: snap.id, ...snap.data() } as Order;
            setPersistedOrder(fetched);
            sessionStorage.setItem("leafly_last_order", JSON.stringify(fetched));
          } else if (isMounted) {
            // Fallback order from sessionStorage or state
            setPersistedOrder((prev) =>
              prev ? { ...prev, status: "Confirmed", orderStatus: "Confirmed", paymentStatus: "Paid" } : null
            );
          }
          clearCart();
        } else {
          // If payment was not verified or cancelled
          setVerificationError(
            verifyRes.message ||
              "Your payment could not be verified by Cashfree. If money was debited from your account, it will be refunded by your bank within 3-5 business days."
          );
        }
      } catch (err) {
        console.warn("[OrderSuccess] Payment verification notice:", err);
        if (isMounted) {
          setVerificationError(
            "An error occurred while confirming your payment with Cashfree. Please check your order history."
          );
        }
      } finally {
        if (isMounted) {
          setIsVerifying(false);
        }
      }
    }

    verifyAndLoadOrder();

    return () => {
      isMounted = false;
    };
  }, [urlOrderId, clearCart]);

  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem("leafly_last_order");
        const activeOrderId = latestOrder?.id || (stored ? JSON.parse(stored)?.id : null);
        if (activeOrderId && sessionStorage.getItem(`leafly_review_${activeOrderId}`) === "true") {
          return true;
        }
      } catch {
        // ignore
      }
    }
    return false;
  });

  const handleSubmitRating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isSubmitted) return;
    setIsSubmitting(true);
    setReviewError(null);

    const activeOrder = order;
    const currentUid = firebaseUser?.uid || currentUser?.uid || activeOrder?.userId || null;
    const customerName =
      activeOrder?.shippingAddress?.fullName ||
      activeOrder?.customerName ||
      currentUser?.name ||
      currentUser?.displayName ||
      "Verified Patron";
    const productName =
      (activeOrder?.items || []).map((i) => i.name).filter(Boolean).join(", ") ||
      "Leafly Botanical Harvest";
    const productId = activeOrder?.items?.[0]?.productId || "tea-harvest";
    const orderId = activeOrder?.id || `ORD-${Date.now().toString(36).toUpperCase()}`;

    const reviewPayload = {
      id: `order-rev-${Date.now()}`,
      orderId,
      userId: currentUid,
      customerName,
      productName,
      productId: String(productId),
      rating: Number(rating) || 5,
      feedback: feedback.trim() || "Exquisite tea craftsmanship.",
      status: "Approved" as const,
      createdAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, "reviews", reviewPayload.id), {
        ...reviewPayload,
        timestamp: serverTimestamp(),
      });
      sessionStorage.setItem(`leafly_review_${orderId}`, "true");
      setIsSubmitted(true);
    } catch (err) {
      try {
        await addDoc(collection(db, "reviews"), {
          ...reviewPayload,
          timestamp: serverTimestamp(),
        });
        sessionStorage.setItem(`leafly_review_${orderId}`, "true");
        setIsSubmitted(true);
      } catch (innerErr) {
        console.error("Failed to save review to Firestore:", innerErr);
        setReviewError("Failed to submit review. Please check your connection and try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state while verifying payment with Cashfree
  if (isVerifying) {
    return (
      <main className="order-success-page order-success-verifying">
        <SEO
          title="Verifying Payment | Leafly"
          description="Verifying your payment with Cashfree."
          noindex={true}
        />
        <div className="order-success-ambient-glow" aria-hidden="true" />
        <div className="order-success-card" style={{ textAlign: "center", padding: "48px 24px" }}>
          <div style={{ fontSize: "40px", marginBottom: "16px", animation: "spin 2s linear infinite" }}>🫖</div>
          <p className="order-success-eyebrow">CASHFREE VERIFICATION</p>
          <h1 style={{ fontSize: "24px", marginBottom: "8px" }}>CONFIRMING YOUR PAYMENT...</h1>
          <p style={{ color: "#6a7b72" }}>Please wait while we authoritatively verify your payment with Cashfree.</p>
        </div>
        <Footer />
      </main>
    );
  }

  // Error state if payment verification failed
  if (verificationError) {
    return (
      <main className="order-success-page order-success-empty">
        <SEO
          title="Payment Unconfirmed | Leafly"
          description="Your payment could not be confirmed."
          noindex={true}
        />
        <div className="order-success-ambient-glow" aria-hidden="true" />
        <div className="order-success-card">
          <p className="order-success-eyebrow">PAYMENT NOTICE</p>
          <h1 style={{ color: "#c53030" }}>PAYMENT UNCONFIRMED</h1>
          <p>{verificationError}</p>
          <div className="order-success-actions" style={{ marginTop: "24px" }}>
            <button type="button" className="order-success-primary" onClick={() => navigate("/checkout")}>
              RETURN TO CHECKOUT
            </button>
            <button type="button" className="order-success-secondary" onClick={() => navigate("/orders")}>
              VIEW MY ORDERS
            </button>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  if (!order) {
    return (
      <main className="order-success-page order-success-empty">
        <div className="order-success-ambient-glow" aria-hidden="true" />
        <div className="order-success-card">
          <p className="order-success-eyebrow">ORDER STATUS</p>
          <h1>ORDER CONFIRMED</h1>
          <p>No recent order was found.</p>
          <button type="button" className="order-success-primary" onClick={() => navigate("/shop")}>
            CONTINUE SHOPPING
          </button>
        </div>
        <Footer />
      </main>
    );
  }


  return (
    <main className="order-success-page">
      <SEO
        title="Order Confirmed | Leafly"
        description="Your Leafly tea order has been placed successfully."
        noindex={true}
      />
      <div className="order-success-ambient-glow" aria-hidden="true" />
      <div className="order-success-card">
        <div className="order-success-header-wrap">
          <div className="order-success-badge" aria-hidden="true">✓</div>
          <p className="order-success-eyebrow">ORDER STATUS · RITUAL CONFIRMED</p>
          <h1>ORDER PLACED SUCCESSFULLY</h1>
          <p className="order-success-tagline">Thank you for your order. Your fresh harvest tea is on its journey.</p>
        </div>

        {/* 1. COMPACT IN-CARD DELIVERY JOURNEY ANIMATION */}
        <div className="order-success-delivery-wrap">
          <DeliveryAnimation compact={true} />
        </div>

        {/* 2. ORDER DETAILS GRID */}
        <div className="order-success-grid">
          <div className="order-success-block">
            <span>Order ID</span>
            <strong style={{ color: "#b98428" }}>{order.id}</strong>
          </div>
          <div className="order-success-block">
            <span>Order Status</span>
            <strong style={{ color: "#166534" }}>{order.orderStatus || order.status || "Confirmed"}</strong>
          </div>
          <div className="order-success-block">
            <span>Total Amount</span>
            <strong>{currencyFormatter.format(order.total)}</strong>
          </div>
          <div className="order-success-block">
            <span>Payment Method</span>
            <strong>{order.paymentMethod === "cod" ? "Pay on Delivery" : order.paymentMethod}</strong>
          </div>
          <div className="order-success-block">
            <span>Delivery Method</span>
            <strong>{order.deliveryMethod}</strong>
          </div>
          <div className="order-success-block">
            <span>Order Date</span>
            <strong>{new Date(order.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</strong>
          </div>
        </div>

        <div className="order-success-details">
          <div>
            <span>Items</span>
            <ul>
              {order.items.map((item) => (
                <li key={item.id}>
                  {item.name} {item.variant ? `(${item.variant})` : ""} × {item.quantity}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <span>Shipping Address</span>
            <p>
              {order.shippingAddress.fullName}
              <br />
              {order.shippingAddress.addressLine1}
              {order.shippingAddress.addressLine2 ? `, ${order.shippingAddress.addressLine2}` : ""}
              <br />
              {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
              <br />
              {order.shippingAddress.country}
            </p>
          </div>
        </div>

        {order.customerEmail ? (
          <div style={{
            margin: "0 0 24px 0",
            padding: "16px 20px",
            background: "rgba(22, 101, 52, 0.06)",
            border: "1px solid rgba(22, 101, 52, 0.2)",
            borderRadius: "10px",
            textAlign: "left"
          }}>
            <span style={{ fontSize: "11px", letterSpacing: "1.2px", textTransform: "uppercase", color: "#166534", fontWeight: 700, display: "block", marginBottom: "4px" }}>
              ✓ Order Confirmation &amp; Tax Invoice Dispatched
            </span>
            <p style={{ margin: 0, fontSize: "14px", color: "#1c2b22", lineHeight: 1.5 }}>
              Your order confirmation receipt and tax invoice details have been dispatched to <strong>{order.customerEmail}</strong>.
            </p>
          </div>
        ) : null}

        {!isAuthenticated && order.customerEmail ? (
          <div
            style={{
              margin: "0 0 24px 0",
              padding: "20px 24px",
              background: "#f7f9f6",
              border: "1px solid #c2d6cb",
              borderLeft: "4px solid #166534",
              borderRadius: "10px",
              textAlign: "left",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                letterSpacing: "1.2px",
                textTransform: "uppercase",
                color: "#166534",
                fontWeight: 700,
                display: "block",
                marginBottom: "6px",
              }}
            >
              ✦ CUSTOMER ACCOUNT ESTABLISHED
            </span>
            <h3
              style={{
                margin: "0 0 8px 0",
                fontSize: "17px",
                color: "#166534",
                fontFamily: "Georgia, serif",
              }}
            >
              Your Leafly Account Has Been Created
            </h3>
            <p style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#2d3748", lineHeight: 1.6 }}>
              We have automatically established your personal customer account with your email{" "}
              <strong>{order.customerEmail}</strong>. A password setup link has been dispatched to your inbox so you can set your password and access your tea sanctuary anytime.
            </p>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "14px" }}>
              <button
                type="button"
                className="order-success-primary"
                style={{ fontSize: "12px", padding: "10px 20px", width: "auto" }}
                onClick={() => navigate("/login", { state: { email: order.customerEmail } })}
              >
                SIGN IN / SET PASSWORD →
              </button>
              <button
                type="button"
                className="order-success-secondary"
                style={{ fontSize: "12px", padding: "10px 20px", width: "auto" }}
                onClick={() => navigate("/profile")}
              >
                VIEW ACCOUNT STATUS →
              </button>
            </div>
          </div>
        ) : null}

        <div className="order-success-actions">
          <button type="button" className="order-success-primary" onClick={() => setShowInvoice(true)}>
            📄 VIEW / PRINT INVOICE
          </button>
          <button type="button" className="order-success-secondary" onClick={() => navigate("/orders")}>
            VIEW MY ORDERS
          </button>
          <button type="button" className="order-success-secondary" onClick={() => navigate("/shop")}>
            CONTINUE SHOPPING
          </button>
        </div>

        {/* =====================================================
            3. IN-FLOW FEEDBACK & REVIEW SECTION
            (Naturally integrated into the document flow)
            ===================================================== */}
        <section className="order-feedback-section" aria-labelledby="order-feedback-heading">
          {isSubmitted ? (
            <div className="order-feedback-success">
              <div className="order-feedback-success-icon" aria-hidden="true">✓</div>
              <h3 className="order-feedback-success-title">Thank You For Your Review!</h3>
              <p className="order-feedback-success-desc">
                Your thoughts help us continuously perfect the Leafly tea ritual.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmitRating} className="order-feedback-form">
              <div className="order-feedback-header">
                <span className="order-feedback-kicker">✦ EXPERIENCE FEEDBACK</span>
                <h3 id="order-feedback-heading" className="order-feedback-title">Rate Your Experience</h3>
                <p className="order-feedback-subtitle">
                  How was your checkout and tea ordering experience today?
                </p>
              </div>

              <div className="order-feedback-stars" role="radiogroup" aria-label="Rating from 1 to 5 stars">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={`order-star-btn ${(hoverRating ?? rating) >= star ? "active" : ""}`}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(null)}
                    aria-label={`${star} star${star > 1 ? "s" : ""}`}
                  >
                    ★
                  </button>
                ))}
              </div>

              <div className="order-feedback-textarea-wrap">
                <textarea
                  className="order-feedback-textarea"
                  placeholder="Optional: Tell us what you loved or how we can elevate your experience..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="order-feedback-actions">
                <button
                  type="submit"
                  className="order-feedback-submit-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : "Submit Experience Review"}
                </button>
                {reviewError && (
                  <p style={{ color: "#c53030", fontSize: "12px", marginTop: "8px" }}>
                    {reviewError}
                  </p>
                )}
              </div>
            </form>
          )}
        </section>
      </div>

      {/* AUTHORITATIVE INVOICE MODAL FOR GUESTS & LOGGED-IN CUSTOMERS */}
      {showInvoice && order && (
        <div 
          className="invoice-modal-overlay" 
          onClick={() => setShowInvoice(false)}
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
                onClick={() => setShowInvoice(false)}
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
                      <p className="invoice-brand-sub">TEA SANCTUARY & BOTANICALS</p>
                    </div>
                  </div>
                </div>
                <div className="invoice-meta-top">
                  <h3>TAX INVOICE / RECEIPT</h3>
                  <p><strong>Invoice #:</strong> INV-{order.id}</p>
                  <p><strong>Order Date:</strong> {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                  <p>
                    <strong>Order Status:</strong>{" "}
                    <span className="invoice-status-pill">
                      {order.orderStatus || order.status || "Confirmed"}
                    </span>
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
                  <strong>{order.shippingAddress?.fullName || order.customerName || "Valued Customer"}</strong>
                  {order.shippingAddress?.addressLine1 && (
                    <p>
                      {order.shippingAddress.addressLine1}
                      {order.shippingAddress.addressLine2 ? `, ${order.shippingAddress.addressLine2}` : ""}
                    </p>
                  )}
                  {order.shippingAddress?.city && (
                    <p>
                      {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
                    </p>
                  )}
                  {order.customerEmail && <p>{order.customerEmail}</p>}
                  {order.customerPhone && <p>{order.customerPhone}</p>}
                </div>
              </div>

              {order.deliveryInstructions ? (
                <div className="invoice-instructions-callout">
                  <strong>Delivery Instructions:</strong> {order.deliveryInstructions}
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
                  {order.items.map((item, idx) => (
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
                  <p><strong>Payment Method:</strong> {order.paymentMethod ? (order.paymentMethod === "cod" ? "PAY ON DELIVERY" : order.paymentMethod.toUpperCase()) : "PAY ON DELIVERY"}</p>
                  <p><strong>Payment Status:</strong> {order.paymentStatus || "Confirmed"}</p>
                  <p><strong>Delivery Method:</strong> {order.deliveryMethod || "Standard Delivery"}</p>
                </div>

                <div className="invoice-totals-box">
                  <div className="invoice-totals-row">
                    <span>Subtotal:</span>
                    <span>{currencyFormatter.format(order.subtotal || order.total)}</span>
                  </div>
                  {order.discount ? (
                    <div className="invoice-totals-row invoice-discount-row">
                      <span>Discount {order.couponCode ? `(${order.couponCode})` : ""}:</span>
                      <span>- {currencyFormatter.format(order.discount)}</span>
                    </div>
                  ) : null}
                  <div className="invoice-totals-row">
                    <span>Delivery Fee:</span>
                    <span>{order.deliveryFee ? currencyFormatter.format(order.deliveryFee) : "FREE"}</span>
                  </div>
                  <div className="invoice-totals-row invoice-grand-total">
                    <span>Final Amount:</span>
                    <span>{currencyFormatter.format(order.total)}</span>
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
