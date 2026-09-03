import { Link } from "react-router-dom";
import Footer from "../components/Footer";
import SEO from "../components/SEO";
import { generateBreadcrumbSchema } from "../lib/seoData";
import "./ShippingPolicy.css";

export default function ShippingPolicy() {
  return (
    <main className="shipping-policy-page">
      <SEO
        title="Shipping Policy — Nationwide Delivery & Packaging | Leafly"
        description="Read Leafly's shipping and delivery policy. Fast nationwide dispatch, tamper-proof airtight packaging, and complimentary free shipping on orders above ₹999."
        canonicalPath="/shipping-policy"
        schema={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Shipping Policy", url: "/shipping-policy" },
        ])}
      />
      {/* =====================================================
          HERO
          ===================================================== */}
      <section className="policy-hero">
        <div className="policy-hero-inner">
          <p className="policy-eyebrow">
            <span>✦</span>
            CUSTOMER CARE & LOGISTICS
          </p>

          <div className="policy-ornament">
            <span />
            <b>✦</b>
            <span />
          </div>

          <h1>
            Shipping &
            <br />
            <em>Delivery Policy.</em>
          </h1>

          <p className="policy-hero-sub">
            From India&apos;s most revered high-altitude tea estates to your ritual space — packaged with aroma-locking integrity and handled with utmost care.
          </p>
        </div>
      </section>

      {/* =====================================================
          HIGHLIGHTS STRIP
          ===================================================== */}
      <section className="policy-highlights">
        <div className="policy-highlights-inner">
          <div className="policy-highlight-card">
            <span className="policy-highlight-icon">🚚</span>
            <h3>Pan-India Coverage</h3>
            <p>Delivery across 19,000+ pin codes via premium air and surface courier partners.</p>
          </div>

          <div className="policy-highlight-card">
            <span className="policy-highlight-icon">⚡</span>
            <h3>24-48 Hour Dispatch</h3>
            <p>Freshly packed and dispatched within 1–2 business days of order confirmation.</p>
          </div>

          <div className="policy-highlight-card">
            <span className="policy-highlight-icon">🌿</span>
            <h3>Free Shipping &gt; ₹499</h3>
            <p>Complimentary standard shipping on all domestic orders above ₹499.</p>
          </div>

          <div className="policy-highlight-card">
            <span className="policy-highlight-icon">🛡️</span>
            <h3>Transit Protection</h3>
            <p>100% replacement guarantee in the rare event of transit damage or tampering.</p>
          </div>
        </div>
      </section>

      {/* =====================================================
          MAIN POLICY CONTENT
          ===================================================== */}
      <section className="policy-content-section">
        <div className="policy-content-inner">
          <article className="policy-block">
            <h2>1. Shipping Coverage & Serviceable Locations</h2>
            <p>
              Leafly ships directly to homes, studios, and offices across all states and Union Territories in India. We partner with India&apos;s leading logistics networks (Blue Dart, Delhivery, DTDC, and Express Air) to ensure timely, temperature-monitored delivery.
            </p>
            <p>
              For international shipping inquiries, please connect with our concierge team at <a href="mailto:hello@leaflytea.in">hello@leaflytea.in</a> for custom phytosanitary clearance and global express rates.
            </p>
          </article>

          <article className="policy-block">
            <h2>2. Order Processing & Dispatch Timeline</h2>
            <p>
              Every Leafly tea batch is stored in humidity-regulated, nitrogen-flushed containers. Upon receiving your order, our master packers seal your selected leaves in multi-layer aroma-barrier pouches.
            </p>
            <ul>
              <li><strong>Orders placed Monday – Friday:</strong> Processed and dispatched within 24 to 48 hours.</li>
              <li><strong>Orders placed on Weekends & National Holidays:</strong> Dispatched on the next business day.</li>
            </ul>
          </article>

          <article className="policy-block">
            <h2>3. Estimated Delivery Timelines</h2>
            <div className="policy-table-wrap">
              <table className="policy-table">
                <thead>
                  <tr>
                    <th>Shipping Method</th>
                    <th>Destination</th>
                    <th>Estimated Timeline</th>
                    <th>Shipping Fee</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Standard Shipping</strong></td>
                    <td>Metro Cities (Delhi, Mumbai, Bengaluru, Kolkata, Chennai, Hyderabad)</td>
                    <td>3 – 5 Business Days</td>
                    <td>FREE over ₹499 (Flat ₹49 below ₹499)</td>
                  </tr>
                  <tr>
                    <td><strong>Standard Shipping</strong></td>
                    <td>Rest of India (Tier 2/3 Cities & Regional Towns)</td>
                    <td>5 – 7 Business Days</td>
                    <td>FREE over ₹499 (Flat ₹49 below ₹499)</td>
                  </tr>
                  <tr>
                    <td><strong>Express Priority Air</strong></td>
                    <td>Major Metros & Select Pincodes</td>
                    <td>1 – 2 Business Days</td>
                    <td>₹99 flat rate</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </article>

          <article className="policy-block">
            <h2>4. Live Order Tracking & Real-Time Notifications</h2>
            <p>
              The moment your package departs our blending studio, you will receive an SMS and email notification containing:
            </p>
            <ul>
              <li>Your unique AWB (Air Waybill) tracking number.</li>
              <li>Direct live tracking link with real-time courier milestone updates.</li>
              <li>Estimated date and delivery window.</li>
            </ul>
            <p>
              You can also check live status anytime by visiting <Link to="/orders">My Orders</Link> in your Leafly account.
            </p>
          </article>

          <article className="policy-block">
            <h2>5. Weather & Mountain Terrain Considerations</h2>
            <p>
              Because our single-origin flushes are sourced directly from high-elevation estates in Darjeeling, Assam, Nilgiri, and Kangra, heavy monsoon rains or winter snowfall in mountain passes can occasionally delay initial dispatch by 24–48 hours. When this occurs, our team proactively informs you via email with updated timelines.
            </p>
          </article>

          <article className="policy-block">
            <h2>6. Damaged, Tampered, or Compromised Shipments</h2>
            <p>
              We take tremendous pride in our protective outer boxes and aroma-lock seals. If your package arrives visibly damaged, tampered with, or wet:
            </p>
            <ol>
              <li>Please take 2–3 clear photographs of the outer packaging and inner contents.</li>
              <li>Email our support concierge at <a href="mailto:hello@leaflytea.in">hello@leaflytea.in</a> or message through our <Link to="/contact">Contact Page</Link> within 48 hours of delivery.</li>
              <li>We will issue a complimentary expedited replacement or 100% store credit immediately — with zero return friction.</li>
            </ol>
          </article>

          <article className="policy-block policy-contact-card">
            <h2>Need Assistance with an Active Shipment?</h2>
            <p>Our dedicated tea logistics team is here to assist with address corrections, delivery instructions, or urgent dispatch requests.</p>
            <div className="policy-contact-links">
              <Link to="/contact" className="policy-btn-primary">Message Concierge</Link>
              <Link to="/profile" className="policy-btn-secondary">View My Orders</Link>
            </div>
          </article>
        </div>
      </section>

      <Footer />
    </main>
  );
}
