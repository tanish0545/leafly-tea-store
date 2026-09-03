import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/leafly-logo.webp";
import { ApiService } from "../lib/apiClient";
import "./Footer.css";

const shopLinks = [
  { label: "All Teas", href: "/shop" },
  { label: "Teaware Gear", href: "/teaware" },
  { label: "Green Tea", href: "/tea-collections" },
  { label: "White Tea", href: "/tea-collections" },
  { label: "Black Tea", href: "/tea-collections" },
  { label: "Oolong Tea", href: "/tea-collections" },
];

const exploreLinks = [
  { label: "Tea Collections", href: "/tea-collections" },
  { label: "Tea Maker", href: "/tea-maker" },
  { label: "Gifting", href: "/gifting" },
  { label: "Why Leafly", href: "/why-leafly" },
  { label: "Journal", href: "/journal" },
  { label: "About", href: "/about" },
];

const careLinks = [
  { label: "My Account", href: "/profile" },
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms & Conditions", href: "/terms-and-conditions" },
  { label: "FAQs", href: "/faqs" },
  { label: "Contact Us", href: "/contact" },
];

export default function Footer() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await ApiService.subscribeNewsletter(cleanEmail, "Website Footer");
      if (res.success) {
        setIsSubmitted(true);
        setEmail("");
      } else {
        setError(res.error || "We couldn't process your subscription right now. Please try again.");
      }
    } catch (err: unknown) {
      console.error("Subscription error:", err);
      setError("We couldn't process your subscription right now. Please try again in a moment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <footer className="leafly-footer">
      <div className="leafly-footer-inner">
        {/* =====================================================
            TOP FOOTER
            ===================================================== */}
        <div className="leafly-footer-top">
          {/* BRAND */}
          <div className="leafly-footer-brand">
            <img
              src={logo}
              alt="Leafly"
              className="leafly-footer-logo"
              loading="lazy"
            />

            <p className="leafly-footer-brand-text">
              Curating India&apos;s finest teas with care,
              intention and respect for every leaf.
              Pure, small-batch and crafted for
              better moments.
            </p>

            <div className="leafly-footer-ornament">
              <span />
              <b>✦</b>
              <span />
            </div>
          </div>

          {/* NEWSLETTER */}
          <div className="leafly-footer-newsletter">
            <p className="leafly-footer-eyebrow">
              <span>✦</span>
              JOIN THE RITUAL
            </p>

            <h2>
              First Flushes &
              <br />
              Mountain Stories
            </h2>

            <p className="leafly-footer-newsletter-text">
              Subscribe to receive tea stories,
              new collections and thoughtful
              moments from Leafly.
            </p>

            {isSubmitted ? (
              <div className="leafly-footer-success" role="status" aria-live="polite">
                <span className="leafly-footer-success-check">✓</span>
                <p>
                  Thank you for joining the Leafly ritual. You&apos;ll be the first to hear about new teas, collections, and stories.
                </p>
              </div>
            ) : (
              <form
                className="leafly-footer-form"
                onSubmit={handleSubscribe}
              >
                <div className="leafly-footer-input-wrap">
                  <input
                    type="email"
                    placeholder="Enter your email address"
                    aria-label="Email address"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(null);
                    }}
                    disabled={isSubmitting}
                  />
                  {error && <span className="leafly-footer-error">{error}</span>}
                </div>

                <button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "SUBSCRIBING..." : "SUBSCRIBE"}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* =====================================================
            GOLD DIVIDER
            ===================================================== */}
        <div className="leafly-footer-divider">
          <span />
          <b>✦</b>
          <span />
        </div>

        {/* =====================================================
            LINK COLUMNS
            ===================================================== */}
        <div className="leafly-footer-links">
          {/* SHOP */}
          <div className="leafly-footer-column">
            <p className="leafly-footer-column-title">SHOP TEAS</p>
            {shopLinks.map((link) => (
              <Link key={link.label} to={link.href}>
                {link.label}
              </Link>
            ))}
          </div>

          {/* EXPLORE */}
          <div className="leafly-footer-column">
            <p className="leafly-footer-column-title">EXPLORE LEAFLY</p>
            {exploreLinks.map((link) => (
              <Link key={link.label} to={link.href}>
                {link.label}
              </Link>
            ))}
          </div>

          {/* CUSTOMER CARE */}
          <div className="leafly-footer-column">
            <p className="leafly-footer-column-title">CUSTOMER CARE</p>
            {careLinks.map((link) => (
              <Link key={link.label} to={link.href}>
                {link.label}
              </Link>
            ))}
          </div>

          {/* CONNECT WITH US */}
          <div className="leafly-footer-column">
            <p className="leafly-footer-column-title">CONNECT WITH US</p>

            <a
              href="https://www.instagram.com/leafly.greentea?igsi=MWI2dG5qenQyYjUxZA=="
              target="_blank"
              rel="noopener noreferrer"
              className="leafly-footer-social-link"
              aria-label="Instagram"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="1" className="leafly-social-fill" />
              </svg>
              <span>Instagram</span>
            </a>

            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="leafly-footer-social-link"
              aria-label="Facebook"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M14 8h3V4h-3c-3.3 0-5 1.9-5 5v3H6v4h3v5h4v-5h3.5l.5-4H13V9c0-.7.3-1 1-1Z" />
              </svg>
              <span>Facebook</span>
            </a>

            <a
              href="mailto:leaflydatabase@gmail.com"
              className="leafly-footer-social-link"
              aria-label="Email Leafly"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m4 7 8 6 8-6" />
              </svg>
              <span>leaflydatabase@gmail.com</span>
            </a>

            <p className="leafly-footer-origin">
              <span>◇</span>
              100% Single Origin
              <br />
              Authentic Indian Teas
            </p>
          </div>
        </div>
      </div>

      {/* =====================================================
          BOTTOM GOLD BAR
          ===================================================== */}
      <div className="leafly-footer-bottom">
        <div className="leafly-footer-bottom-inner">
          <p className="leafly-footer-copyright">© {new Date().getFullYear()} Leafly. All rights reserved.</p>

          <p className="leafly-footer-motto">REAL TEA. BETTER MOMENTS.</p>

          <div className="leafly-footer-legal">
            <Link to="/privacy-policy">Privacy Policy</Link>
            <span>•</span>
            <Link to="/terms-and-conditions">Terms & Conditions</Link>
            <span>•</span>
            <Link to="/faqs">FAQs</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}