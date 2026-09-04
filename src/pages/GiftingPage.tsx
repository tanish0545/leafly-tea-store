import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import Footer from "../components/Footer";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import PhoneInput from "../components/PhoneInput";
import SEO from "../components/SEO";
import { generateBreadcrumbSchema } from "../lib/seoData";
import { ApiService } from "../lib/apiClient";
import { getProductSlug } from "../data/products";
import "./GiftingPage.css";

import { useGifting } from "../context/GiftingContext";
import type { GiftHamper } from "../data/gifting";

export default function GiftingPage() {
  const navigate = useNavigate();
  const { hampers } = useGifting();
  const { addToCart, items, increaseQuantity, decreaseQuantity } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();

  const [loading, setLoading] = useState(true);
  const [loaderFadeOut, setLoaderFadeOut] = useState(false);
  const [addedHamperId, setAddedHamperId] = useState<number | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setLoading(false);
      return;
    }

    // Prevent background scrolling while intro is playing
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // 1.55s reveal + 500ms smooth fade = ~2.05s total
    const timer = setTimeout(() => {
      setLoaderFadeOut(true);
      document.body.style.overflow = prevOverflow;
    }, 1550);

    const endTimer = setTimeout(() => {
      setLoading(false);
    }, 2050);

    return () => {
      clearTimeout(timer);
      clearTimeout(endTimer);
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const [enquirySent, setEnquirySent] = useState(false);
  const [referenceId, setReferenceId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    quantity: "25-50",
    message: "",
  });

  const toggleWishlist = (hamper: GiftHamper) => {
    if (isInWishlist(hamper.id)) {
      removeFromWishlist(hamper.id);
    } else {
      addToWishlist({
        id: hamper.id,
        name: hamper.name,
        category: "Gifting",
        origin: "Curated Estate Blend",
        caffeine: "Varied",
        weight: "Gift Box",
        price: Number(hamper.price) || 0,
        oldPrice: hamper.oldPrice ? Number(hamper.oldPrice) : undefined,
        badge: hamper.badge || "GIFT",
        image: hamper.image,
        inStock: hamper.inStock !== false && (typeof hamper.stock !== "number" || hamper.stock > 0),
        stock: typeof hamper.stock === "number" ? hamper.stock : 10,
      });
    }
  };

  const handleAddHamper = (hamper: GiftHamper) => {
    const stock = typeof hamper.stock === "number" ? hamper.stock : 10;
    const inStock = hamper.inStock !== false && stock > 0;
    if (!inStock) return;

    addToCart(
      {
        id: hamper.id,
        name: hamper.name,
        price: Number(hamper.price) || 0,
        oldPrice: hamper.oldPrice ? Number(hamper.oldPrice) : undefined,
        image: hamper.image,
        category: "Luxury Gift Sets",
        origin: "Curated Estate Blend",
        caffeine: "Varied",
        weight: "Gift Box",
        badge: hamper.badge || "GIFT",
        stock,
        inStock: true,
      },
      1,
      "100g",
      Number(hamper.price) || 0,
      hamper.oldPrice ? Number(hamper.oldPrice) : undefined
    );
    setAddedHamperId(Number(hamper.id));
    window.setTimeout(() => setAddedHamperId(null), 1500);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = formData.name.trim();
    const cleanEmail = formData.email.trim().toLowerCase();

    if (!cleanName) {
      setFormError("Please enter your name.");
      return;
    }

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setFormError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await ApiService.submitGiftingInquiry({
        name: cleanName,
        email: cleanEmail,
        phone: formData.phone,
        quantity: formData.quantity,
        message: formData.message,
      });

      if (res.success) {
        setReferenceId(res.referenceId || null);
        setEnquirySent(true);
        setFormData({ name: "", email: "", phone: "", quantity: "25-50", message: "" });
      } else {
        setFormError(res.error || "We couldn't submit your inquiry right now. Please try again.");
      }
    } catch (err: unknown) {
      console.error("Error submitting gifting inquiry:", err);
      setFormError("We couldn't send your inquiry right now. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="leafly-app gifting-page-container">
      <SEO
        title="Luxury Tea Gifts & Curated Gift Sets | Corporate & Bespoke Hampers | Leafly"
        description="Curated luxury tea gifts, personalized hampers, and keepsake gift boxes featuring single-origin Indian teas and artisan teaware. Custom corporate branding and nationwide dispatch."
        canonicalPath="/gifting"
        schema={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Gifting", url: "/gifting" },
        ])}
      />

      {/* 1. LUXURY GIFTING LOADING INTRO (PORTALED TO BODY) */}
      {loading &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className={`gifting-luxury-loader ${loaderFadeOut ? "fade-out" : ""}`}
            aria-live="polite"
            role="status"
          >
            <div className="gifting-loader-ambient-glow" />
            <div className="gifting-loader-content">
              {/* Botanical Gold Gift Box Motif */}
              <div className="gifting-loader-box-icon" aria-hidden="true">
                <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="gifting-box-svg">
                  <path d="M12 28H68V38H12V28Z" stroke="#DFC07B" strokeWidth="2" strokeLinejoin="round" fill="rgba(223, 192, 123, 0.08)" />
                  <path d="M16 38H64V68C64 69.1 63.1 70 62 70H18C16.9 70 16 69.1 16 68V38Z" stroke="#DFC07B" strokeWidth="2" strokeLinejoin="round" fill="rgba(223, 192, 123, 0.04)" />
                  <line x1="40" y1="28" x2="40" y2="70" stroke="#DFC07B" strokeWidth="2" strokeDasharray="3 2" />
                  {/* Luxury Ribbon Bow Knot */}
                  <path d="M40 28 C34 18, 20 16, 24 24 C28 32, 38 28, 40 28 Z" stroke="#C9A24B" strokeWidth="2" fill="rgba(201, 162, 75, 0.25)" />
                  <path d="M40 28 C46 18, 60 16, 56 24 C52 32, 42 28, 40 28 Z" stroke="#C9A24B" strokeWidth="2" fill="rgba(201, 162, 75, 0.25)" />
                  <circle cx="40" cy="28" r="3.5" fill="#DFC07B" />
                </svg>
              </div>

              <span className="gifting-loader-eyebrow">BESPOKE CURATIONS · LEAFLY</span>
              <h1 className="gifting-loader-heading">LEAFLY GIFTING</h1>
              <p className="gifting-loader-subtext">GIFT SOMETHING MEANINGFUL</p>

              <div className="gifting-loader-accent">
                <span className="gifting-loader-line" />
                <span className="gifting-loader-spark">✦</span>
                <span className="gifting-loader-line" />
              </div>
            </div>
          </div>,
          document.body
        )}

      <main className="gifting-main">
        <section className="gifting-hero-section">
          <div className="gifting-hero-inner">
            <p className="gifting-hero-eyebrow">
              <span className="gifting-hero-icon">♧</span> BESPOKE TEA GIFTING
            </p>
            <h1 className="gifting-hero-title">
              Thoughtful tea, <br />
              <em>beautifully</em> shared.
            </h1>
            <p className="gifting-hero-desc">
              From intimate expressions of gratitude to bespoke corporate celebrations,
              discover our handcrafted collection of single-origin Indian tea hampers, artisan teaware,
              and customizable botanical packaging.
            </p>
            <div className="gifting-hero-pills">
              <span>✓ Single-Origin Leaves</span>
              <span>✓ Hand-Tied Ribbon Packaging</span>
              <span>✓ Handwritten Notes Included</span>
              <span>✓ Nationwide Dispatch</span>
            </div>
          </div>
        </section>

        <section className="gifting-hampers-section">
          <div className="gifting-section-header">
            <p className="gifting-card-kicker">CURATED COLLECTIONS</p>
            <h2 className="gifting-section-title">Signature Gift Boxes</h2>
            <p className="gifting-section-subtitle">
              Ready-to-deliver celebration boxes packaged in gold foil debossed keepsake chests.
            </p>
          </div>

          <div className="gifting-hampers-grid">
            {hampers.map((hamper, index) => {
              const isWishlisted = isInWishlist(hamper.id);
              const isAvailable = hamper.inStock !== false && (typeof hamper.stock !== "number" || hamper.stock > 0);

              const cartItem = items.find(
                (cItem) =>
                  cItem.id === `gh-${hamper.id}-100g` ||
                  cItem.id === `${hamper.id}-100g` ||
                  String(cItem.product.id) === String(hamper.id)
              );
              const currentQty = cartItem?.quantity || 0;

              return (
                <article key={hamper.id} className="gifting-hamper-card">
                  <div
                    className="gifting-hamper-image-wrap"
                    onClick={() => navigate(`/gifting/${getProductSlug(hamper)}`)}
                    style={{ cursor: "pointer" }}
                  >
                    <img
                      src={hamper.image}
                      alt={hamper.name}
                      loading={index < 3 ? "eager" : "lazy"}
                      decoding="async"
                      {...(index === 0 ? { fetchPriority: "high" as const } : {})}
                    />
                    {hamper.badge && (
                      <span className="gifting-hamper-badge">{hamper.badge}</span>
                    )}

                    <button
                      type="button"
                      className={isWishlisted ? "gifting-wishlist-btn active" : "gifting-wishlist-btn"}
                      aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                      aria-pressed={isWishlisted}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWishlist(hamper);
                      }}
                    >
                      {isWishlisted ? "♥" : "♡"}
                    </button>
                  </div>

                  <div className="gifting-hamper-content">
                    <h3
                      className="gifting-hamper-title"
                      onClick={() => navigate(`/gifting/${getProductSlug(hamper)}`)}
                      style={{ cursor: "pointer" }}
                    >
                      {hamper.name}
                    </h3>
                    <p className="gifting-hamper-subtitle">{hamper.subtitle}</p>

                    <div className="gifting-hamper-includes">
                      <span className="gifting-includes-label">WHAT&apos;S INSIDE:</span>
                      <ul>
                        {hamper.includes.map((item, idx) => (
                          <li key={idx}>◈ {item}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="gifting-hamper-footer">
                      <div className="gifting-hamper-price">
                        <span>PRICE</span>
                        <strong>₹{Number(hamper.price).toLocaleString("en-IN")}</strong>
                        {hamper.oldPrice && hamper.oldPrice > hamper.price && (
                          <del style={{ fontSize: "0.85rem", color: "rgba(11,43,30,0.45)", marginLeft: "6px" }}>
                            ₹{Number(hamper.oldPrice).toLocaleString("en-IN")}
                          </del>
                        )}
                      </div>

                      <div className="gifting-hamper-actions">
                        <button
                          type="button"
                          className="gifting-details-button"
                          onClick={() => navigate(`/gifting/${getProductSlug(hamper)}`)}
                        >
                          DETAILS +
                        </button>

                        {!isAvailable ? (
                          <button
                            type="button"
                            className="gifting-add-button disabled out-of-stock"
                            disabled
                            aria-label={`${hamper.name} is currently out of stock`}
                          >
                            OUT OF STOCK
                          </button>
                        ) : currentQty > 0 ? (
                          <div className="gifting-qty-stepper" aria-label={`Quantity in cart: ${currentQty}`}>
                            <button
                              type="button"
                              className="gifting-qty-btn gifting-qty-dec"
                              aria-label="Decrease quantity"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (cartItem) decreaseQuantity(cartItem.id);
                              }}
                            >
                              −
                            </button>
                            <span className="gifting-qty-value">{currentQty}</span>
                            <button
                              type="button"
                              className="gifting-qty-btn gifting-qty-inc"
                              aria-label="Increase quantity"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (cartItem) increaseQuantity(cartItem.id);
                              }}
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className={`gifting-add-button ${addedHamperId === hamper.id ? "added" : ""}`}
                            onClick={() => handleAddHamper(hamper)}
                          >
                            {addedHamperId === hamper.id ? "ADDED TO CART ✓" : "ADD TO CART"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="gifting-corporate-section">
          <div className="gifting-corporate-grid">
            <div className="gifting-corporate-info">
              <p className="gifting-card-kicker">FOR TEAMS &amp; CELEBRATIONS</p>
              <h2>Corporate &amp; Wedding Inquiries</h2>
              <p className="gifting-corporate-desc">
                Elevate your corporate gifting, client milestones, executive retreats, and wedding favours.
                We collaborate with you to create custom-blended teas, co-branded packaging, custom tasting notes,
                and direct-to-door multi-address delivery across India and abroad.
              </p>

              <div className="gifting-corporate-perks">
                <div className="gifting-perk">
                  <span className="gifting-perk-icon">✦</span>
                  <div>
                    <h4>Custom Sleeve &amp; Logo Imprinting</h4>
                    <p>Add your company emblem, custom event crest, or personalized messages.</p>
                  </div>
                </div>
                <div className="gifting-perk">
                  <span className="gifting-perk-icon">✦</span>
                  <div>
                    <h4>Volume Tier Pricing</h4>
                    <p>Special discounted rates available for orders of 25 units or more.</p>
                  </div>
                </div>
                <div className="gifting-perk">
                  <span className="gifting-perk-icon">✦</span>
                  <div>
                    <h4>Multi-Address Logistics</h4>
                    <p>Provide a single spreadsheet and we handle individual doorstep tracking.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="gifting-corporate-form-card">
              <h3>Request Gifting Catalog</h3>
              <p>Fill out the details below and our concierge will reach out within 4 hours.</p>

              {enquirySent ? (
                <div className="gifting-form-success">
                  <h4>Thank you! 🌿</h4>
                  <p>Your gifting inquiry has been received. A confirmation email has been dispatched to your inbox.</p>
                  {referenceId && (
                    <p style={{ marginTop: "8px", fontSize: "14px", color: "#c9a24b", fontWeight: 600 }}>
                      Reference ID: #{referenceId}
                    </p>
                  )}
                </div>
              ) : (
                <form onSubmit={handleFormSubmit} className="gifting-form">
                  {formError && (
                    <div style={{ padding: "10px", background: "#fee2e2", color: "#991b1b", borderRadius: "4px", fontSize: "13px", marginBottom: "12px" }}>
                      {formError}
                    </div>
                  )}
                  <label className="gifting-field">
                    <span>Full Name *</span>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Priya Sharma"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </label>

                  <div className="gifting-form-row">
                    <label className="gifting-field">
                      <span>Email Address *</span>
                      <input
                        type="email"
                        required
                        placeholder="priya@company.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </label>
                    <PhoneInput
                      id="gifting-phone"
                      label="Phone Number"
                      required
                      placeholder="Enter phone number"
                      value={formData.phone}
                      onChange={(val) => setFormData({ ...formData, phone: val })}
                    />
                  </div>

                  <label className="gifting-field">
                    <span>Estimated Quantity</span>
                    <select
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    >
                      <option value="10-25">10 – 25 Gift Boxes</option>
                      <option value="25-50">25 – 50 Gift Boxes</option>
                      <option value="50-100">50 – 100 Gift Boxes</option>
                      <option value="100+">100+ Gift Boxes (Custom Blends)</option>
                    </select>
                  </label>

                  <label className="gifting-field">
                    <span>Event or Occasion Details</span>
                    <textarea
                      rows={3}
                      placeholder="Tell us about the date, custom branding requirements, or budget..."
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    />
                  </label>

                  <button type="submit" className="gifting-submit-btn" disabled={isSubmitting}>
                    {isSubmitting ? "SENDING INQUIRY..." : "SUBMIT INQUIRY →"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
