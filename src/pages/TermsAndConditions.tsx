import { Link } from "react-router-dom";
import Footer from "../components/Footer";
import SEO from "../components/SEO";
import { generateBreadcrumbSchema } from "../lib/seoData";
import "./TermsAndConditions.css";

export default function TermsAndConditions() {
  return (
    <main className="terms-conditions-page">
      <SEO
        title="Terms & Conditions — Leafly"
        description="Read Leafly's Terms & Conditions. Store policies, pricing, intellectual property, order fulfillment, and user terms for leafly.vercel.app."
        canonicalPath="/terms-and-conditions"
        schema={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Terms & Conditions", url: "/terms-and-conditions" },
        ])}
      />
      {/* =====================================================
          HERO
          ===================================================== */}
      <section className="policy-hero">
        <div className="policy-hero-inner">
          <p className="policy-eyebrow">
            <span>✦</span>
            AGREEMENT & STORE POLICIES
          </p>

          <div className="policy-ornament">
            <span />
            <b>✦</b>
            <span />
          </div>

          <h1>
            Terms &
            <br />
            <em>Conditions.</em>
          </h1>

          <p className="policy-hero-sub">
            Welcome to Leafly Tea Store. By browsing our website, registering an account, or placing an order, you agree to the following terms governing your usage.
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
            <h2>Account Usage & Eligibility</h2>
            <p>
              When creating an account or placing an order on Leafly, you agree to provide authentic, accurate, and complete contact and shipping details. You are responsible for safeguarding your login credentials and for all activities conducted under your registered account.
            </p>
          </article>

          <article className="policy-section">
            <div className="policy-section-num">02</div>
            <h2>Product Information & Pricing</h2>
            <p>
              We endeavor to accurately display the descriptions, origins, tasting notes, and prices of our teas and teaware. All prices are stated in Indian Rupees (INR) and are inclusive of applicable goods and services taxes unless otherwise stated.
            </p>
            <p>
              We reserve the right to modify prices, discontinue products, or adjust available quantities without prior notice.
            </p>
          </article>

          <article className="policy-section">
            <div className="policy-section-num">03</div>
            <h2>Ordering & Payment Terms</h2>
            <p>
              Placing an order constitutes an offer to purchase. An order is deemed confirmed when you receive a confirmation email with a unique Order Reference ID (e.g., LF-YYYYMMDD-XXXX).
            </p>
            <ul>
              <li><strong>Online Payments:</strong> Processed through authorized gateways (including Razorpay). Transactions must be verified before orders are fulfilled.</li>
              <li><strong>Pay on Delivery (COD):</strong> Payment in cash or accepted digital delivery methods must be handed over to the courier partner upon physical handover.</li>
            </ul>
          </article>

          <article className="policy-section">
            <div className="policy-section-num">04</div>
            <h2>Shipping & Delivery</h2>
            <p>
              Orders are dispatched within 24–48 business hours via certified courier partners across India. Estimated delivery timeframes (3–6 business days) are guidelines provided in good faith. Leafly is not liable for logistical delays resulting from natural events, strikes, or regional transit restrictions.
            </p>
          </article>

          <article className="policy-section">
            <div className="policy-section-num">05</div>
            <h2>Cancellations, Returns & Replacements</h2>
            <p>
              Because tea is a consumable food beverage packed in aroma-sealed food-grade packaging:
            </p>
            <ul>
              <li><strong>Unopened Items:</strong> If you receive a damaged, defective, or incorrect product, notify our support team within 48 hours of delivery with photographic evidence for an immediate replacement or store refund.</li>
              <li><strong>Opened Items:</strong> Once tea canisters or pouches have been opened or seal broken, they cannot be accepted for return due to hygiene and food safety guidelines.</li>
            </ul>
          </article>

          <article className="policy-section">
            <div className="policy-section-num">06</div>
            <h2>Acceptable Use & Intellectual Property</h2>
            <p>
              All trademarks, logos, photographs, ritual animations, and written content on Leafly are the property of Leafly. Unauthorized duplication, scraping, or commercial exploitation is prohibited without prior written consent.
            </p>
          </article>

          <article className="policy-section">
            <div className="policy-section-num">07</div>
            <h2>Limitation of Liability</h2>
            <p>
              To the fullest extent permissible by law, Leafly shall not be liable for any indirect, incidental, or consequential damages resulting from website downtime or the use of products sold.
            </p>
          </article>

          <article className="policy-section">
            <div className="policy-section-num">08</div>
            <h2>Changes & Contact Information</h2>
            <p>
              We may revise these Terms & Conditions from time to time. For any legal inquiries, questions, or clarification, contact us at <a href="mailto:leaflydatabase@gmail.com">leaflydatabase@gmail.com</a> or visit our <Link to="/contact">Contact Page</Link>.
            </p>
          </article>
        </div>
      </div>

      <Footer />
    </main>
  );
}
