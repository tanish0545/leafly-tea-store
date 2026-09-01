import { useState } from "react";
import Footer from "../components/Footer";
import { useCart } from "../context/CartContext";
import PhoneInput from "../components/PhoneInput";
import { Helmet } from "react-helmet-async";
import "./GiftingPage.css";

import { useGifting } from "../context/GiftingContext";
import type { GiftHamper } from "../data/gifting";

export default function GiftingPage() {
  const { hampers } = useGifting();
  const { addToCart } = useCart();
  const [addedHamperId, setAddedHamperId] = useState<number | null>(null);
  const [enquirySent, setEnquirySent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    quantity: "25-50",
    message: "",
  });

  const handleAddHamper = (hamper: GiftHamper) => {
    addToCart({
      id: hamper.id,
      name: hamper.name,
      price: hamper.price,
      image: hamper.image,
      category: "Gift Hamper",
      origin: "Curated Estate Blend",
      caffeine: "Varied",
      weight: "Gift Box",
      badge: hamper.badge || "GIFT",
    });
    setAddedHamperId(hamper.id);
    window.setTimeout(() => setAddedHamperId(null), 2000);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const endpoint = import.meta.env.VITE_FORMSPREE_ENDPOINT || "https://formspree.io/f/leaflydatabase@gmail.com";
      await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          quantity: formData.quantity,
          message: formData.message,
          recipient: "leaflydatabase@gmail.com",
          formSource: "Leafly Corporate & Bespoke Gifting Page",
          timestamp: new Date().toISOString(),
        }),
      });
      setEnquirySent(true);
      setFormData({ name: "", email: "", phone: "", quantity: "25-50", message: "" });
    } catch (err) {
      console.error("Error submitting gifting inquiry:", err);
      setEnquirySent(true);
      setFormData({ name: "", email: "", phone: "", quantity: "25-50", message: "" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="leafly-app gifting-page-container">
      <Helmet>
        <title>Bespoke Corporate Tea Gifting | Leafly</title>
        <meta name="description" content="Discover our handcrafted collection of single-origin Indian tea hampers, artisan teaware, and customizable botanical packaging for corporate and bespoke gifting." />
      </Helmet>

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
                      <strong>₹{hamper.price}</strong>
                    </div>

                    <button
                      type="button"
                      className={`gifting-add-button ${addedHamperId === hamper.id ? "added" : ""}`}
                      onClick={() => handleAddHamper(hamper)}
                    >
                      {addedHamperId === hamper.id ? "ADDED TO CART ✓" : "ADD TO CART"}
                    </button>
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
                  <p>Your gifting inquiry has been received. Our concierge will email you the custom lookbook shortly.</p>
                </div>
              ) : (
                <form onSubmit={handleFormSubmit} className="gifting-form">
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
