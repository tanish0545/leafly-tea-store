import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOrderContext } from "../context/OrderContext";
import { db } from "../lib/firebase";
import { collection, addDoc } from "firebase/firestore";
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
  const { latestOrder } = useOrderContext();

  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const order = latestOrder;

  const handleSubmitRating = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (order) {
      try {
        const customerName = order.shippingAddress?.fullName || order.customerName || "Verified Patron";
        const customerEmail = order.customerEmail || "";
        const productName = (order.items || []).map((i) => i.name).join(", ") || "Leafly Botanical Harvest";
        await addDoc(collection(db, "reviews"), {
          orderId: order.id,
          customerName,
          customerEmail,
          productName,
          rating,
          feedback: feedback.trim() || "Exquisite tea craftsmanship.",
          status: "Approved",
          createdAt: new Date().toISOString(),
        });
      } catch (err) {
        console.warn("Could not save review to Firestore:", err);
      }
    }

    setIsSubmitting(false);
    setIsSubmitted(true);
  };

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
