import { Link } from "react-router-dom";
import Footer from "../components/Footer";
import SEO from "../components/SEO";
import { generateBreadcrumbSchema } from "../lib/seoData";
import "./PrivacyPolicy.css";

export default function PrivacyPolicy() {
  return (
    <main className="privacy-policy-page">
      <SEO
        title="Privacy Policy — Leafly"
        description="Read Leafly's Privacy Policy. Learn how we handle your personal data, secure payment processing, order details, and shopping privacy."
        canonicalPath="/privacy-policy"
        schema={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Privacy Policy", url: "/privacy-policy" },
        ])}
      />
      {/* =====================================================
          HERO
          ===================================================== */}
      <section className="policy-hero">
        <div className="policy-hero-inner">
          <p className="policy-eyebrow">
            <span>✦</span>
            TRANSPARENCY & DATA PROTECTION
          </p>

          <div className="policy-ornament">
            <span />
            <b>✦</b>
            <span />
          </div>

          <h1>
            Privacy
            <br />
            <em>Policy.</em>
          </h1>

          <p className="policy-hero-sub">
            Your trust is sacred. We believe in total clarity regarding how your personal information is gathered, utilized, and safeguarded throughout your tea ritual experience.
          </p>
        </div>
      </section>

      {/* =====================================================
          CONTENT SECTIONS
          ===================================================== */}
      <div className="policy-content-wrap">
        <div className="policy-content">
          <article className="policy-section">
            <div className="policy-section-num">01</div>
            <h2>Information We Collect</h2>
            <p>
              To provide our premium whole-leaf tea service, manage your orders, and personalize your recommendations, Leafly collects the following necessary information:
            </p>
            <ul>
              <li><strong>Account & Identity Information:</strong> Your full name, email address, password hashes, and optional profile data (such as date of birth or preferred tea categories) when you register or sign in.</li>
              <li><strong>Delivery & Contact Details:</strong> Shipping address, landmark, state, city, PIN code, and phone number required for carrier routing and dispatch coordination.</li>
              <li><strong>Order & Transaction Records:</strong> Purchased tea variants, order timestamps, discount coupon usage, order statuses, and transaction reference identifiers.</li>
              <li><strong>Payment Information:</strong> For online transactions, payments are securely processed by authorized payment partners (such as Razorpay). Leafly does not collect, capture, or store raw card numbers, CVVs, or bank credentials on our servers.</li>
            </ul>
          </article>

          <article className="policy-section">
            <div className="policy-section-num">02</div>
            <h2>How We Use Your Information</h2>
            <p>
              Your data is utilized strictly for service fulfillment, operations, and experience enhancement:
            </p>
            <ul>
              <li>Fulfilling and tracking your tea orders and coordinating express delivery.</li>
              <li>Maintaining your customer profile, order history, and saved preferences across devices.</li>
              <li>Providing responsive customer care, resolving queries, and processing authorized returns or replacements.</li>
              <li>Sending transactional updates (order confirmations, delivery dispatches, password resets).</li>
            </ul>
          </article>

          <article className="policy-section">
            <div className="policy-section-num">03</div>
            <h2>No Selling or Third-Party Advertising Sharing</h2>
            <p>
              <strong>We do not sell, rent, or lease your personal information to any third parties for advertising or marketing brokers.</strong> Your personal data is never commercialized.
            </p>
          </article>

          <article className="policy-section">
            <div className="policy-section-num">04</div>
            <h2>Essential Service Providers</h2>
            <p>
              To deliver our products and maintain reliable online services, we share necessary operational details with trusted infrastructure and service providers under strict confidentiality:
            </p>
            <ul>
              <li><strong>Payment Processors:</strong> Licensed payment gateways (such as Razorpay) to securely authenticate and verify payments.</li>
              <li><strong>Logistics & Courier Partners:</strong> Certified shipping couriers to route and deliver packages directly to your doorstep.</li>
              <li><strong>Authentication & Database Infrastructure:</strong> Secure cloud infrastructure (such as Google Firebase) for user session authentication, encrypted data storage, and order state synchronization.</li>
            </ul>
          </article>

          <article className="policy-section">
            <div className="policy-section-num">05</div>
            <h2>Data Security & Retention</h2>
            <p>
              We employ SSL/TLS 256-bit transport layer encryption, secure credential hashing, and role-restricted database rules to safeguard your information. Your account details remain retained as long as your profile remains active or as required by statutory record-keeping regulations.
            </p>
          </article>

          <article className="policy-section">
            <div className="policy-section-num">06</div>
            <h2>Your Rights & Contact</h2>
            <p>
              You have the right to access, review, update, or request deletion of your personal account details at any time via your <Link to="/profile">Profile Settings</Link> or by reaching out to our team at <a href="mailto:leaflydatabase@gmail.com">leaflydatabase@gmail.com</a>.
            </p>
          </article>
        </div>
      </div>

      <Footer />
    </main>
  );
}
