import { useState } from "react";
import Footer from "../components/Footer";
import { useCart } from "../context/CartContext";
import PhoneInput from "../components/PhoneInput";
import SEO from "../components/SEO";
import { generateBreadcrumbSchema } from "../lib/seoData";
import { ApiService } from "../lib/apiClient";
import "./GiftingPage.css";

import { useGifting } from "../context/GiftingContext";
import type { GiftHamper } from "../data/gifting";

export default function GiftingPage() {
  const { hampers } = useGifting();
  const { addToCart } = useCart();
  const [addedHamperId, setAddedHamperId] = useState<number | null>(null);
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
    window.setTimeout(() => setAddedHamperId(null), 2000);
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
            {hampers.map((hamper) => (
              <article key={hamper.id} className="gifting-hamper-card">
                <div className="gifting-hamper-image-wrap">
                  <img src={hamper.image} alt={hamper.name} loading="lazy" />
                  {hamper.badge && (
                    <span className="gifting-hamper-badge">{hamper.badge}</span>
                  )}
                </div>

                <div className="gifting-hamper-content">
                  <h3 className="gifting-hamper-title">{hamper.name}</h3>
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

                    {hamper.inStock === false || (typeof hamper.stock === "number" && hamper.stock <= 0) ? (
                      <button
                        type="button"
                        className="gifting-add-button disabled"
                        disabled
                        style={{ opacity: 0.5, cursor: "not-allowed", background: "#333", color: "#aaa" }}
                      >
                        OUT OF STOCK
                      </button>
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
              </article>
            ))}
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
