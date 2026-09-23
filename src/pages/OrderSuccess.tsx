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
import "./OrderSuccess.css";

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
  const { currentUser, firebaseUser } = useAuth();

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

  // One-shot cart clear for COD orders.
  // Uses a ref flag so this fires EXACTLY ONCE on mount, regardless of clearCart identity.
  // Do NOT put clearCart in the dependency array — that was the root cause of the
  // infinite re-render loop that made navigation buttons appear frozen.
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
    setIsSubmitting(true);

    const activeOrder = order;
    const currentUid = firebaseUser?.uid || currentUser?.uid || activeOrder?.userId || null;
    const currentEmail = activeOrder?.customerEmail || firebaseUser?.email || currentUser?.email || "";
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
      customerEmail: currentEmail,
      productName,
      productId: String(productId),
      rating: Number(rating) || 5,
      feedback: feedback.trim() || "Exquisite tea craftsmanship.",
      status: "Approved" as const,
      createdAt: new Date().toISOString(),
    };

    try {
      const stored = JSON.parse(localStorage.getItem("leafly_saved_reviews") || "[]");
      stored.unshift(reviewPayload);
      localStorage.setItem("leafly_saved_reviews", JSON.stringify(stored.slice(0, 100)));
      sessionStorage.setItem(`leafly_review_${orderId}`, "true");
    } catch {
      // ignore
    }

    try {
      await setDoc(doc(db, "reviews", reviewPayload.id), {
        ...reviewPayload,
        timestamp: serverTimestamp(),
      });
    } catch (err) {
      try {
        await addDoc(collection(db, "reviews"), {
          ...reviewPayload,
          timestamp: serverTimestamp(),
        });
      } catch (innerErr) {
        console.warn("Could not save review to Firestore; persisted locally:", innerErr);
      }
    } finally {
      // Broadcast new review to other active tabs (Admin Dashboard, etc.)
      try {
        if (typeof BroadcastChannel !== "undefined") {
          const channel = new BroadcastChannel("leafly_reviews_sync");
          channel.postMessage({ type: "NEW_REVIEW", review: reviewPayload });
          channel.close();
        }
      } catch {
        // ignore
      }

      setIsSubmitting(false);
      setIsSubmitted(true);
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

        <div className="order-success-actions">
          <button type="button" className="order-success-secondary" onClick={() => navigate("/orders")}>
            VIEW MY ORDERS
          </button>
          <button type="button" className="order-success-primary" onClick={() => navigate("/shop")}>
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
              </div>
            </form>
          )}
        </section>
      </div>

      <Footer />
    </main>
  );
}
