import { Link } from "react-router-dom";
import Footer from "../components/Footer";
import SEO from "../components/SEO";
import { generateBreadcrumbSchema } from "../lib/seoData";
import "./FreshnessGuarantee.css";

export default function FreshnessGuarantee() {
  return (
    <main className="freshness-page">
      <SEO
        title="Freshness Guarantee — Small-Batch Sealed Whole Leaf Teas | Leafly"
        description="Discover the Leafly freshness promise: 100% orthodox whole leaves vacuum-sealed within weeks of harvest in 4-layer aroma-barrier pouches."
        canonicalPath="/freshness-guarantee"
        schema={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Freshness Guarantee", url: "/freshness-guarantee" },
        ])}
      />
      {/* =====================================================
          HERO
          ===================================================== */}
      <section className="freshness-hero">
        <div className="freshness-hero-inner">
          <p className="freshness-eyebrow">
            <span>✦</span>
            THE LEAFLY QUALITY PROMISE
          </p>

          <div className="freshness-ornament">
            <span />
            <b>✦</b>
            <span />
          </div>

          <h1>
            Freshness &
            <br />
            <em>Origin Guarantee.</em>
          </h1>

          <p className="freshness-hero-sub">
            We believe you deserve tea that smells like the high-mountain morning it was plucked from. Here is our unwavering commitment to pure, uncompromised whole-leaf freshness.
          </p>
        </div>
      </section>

      {/* =====================================================
          FOUR PILLARS
          ===================================================== */}
      <section className="freshness-pillars">
        <div className="freshness-pillars-inner">
          <div className="freshness-pillar-card">
            <span className="freshness-pillar-icon">🏔️</span>
            <h3>Single-Origin Terroir</h3>
            <p>100% traceable to certified single estates in Darjeeling, Assam, Nilgiri, and Kashmir.</p>
          </div>

          <div className="freshness-pillar-card">
            <span className="freshness-pillar-icon">🍃</span>
            <h3>Whole Orthodox Leaf</h3>
            <p>Only unbroken, whole-leaf grades — never commercial CTC dust or machine fannings.</p>
          </div>

          <div className="freshness-pillar-card">
            <span className="freshness-pillar-icon">🔒</span>
            <h3>Aroma-Lock Barrier</h3>
            <p>Sealed in four-layer oxygen-barrier foil pouches with one-way degassing valves.</p>
          </div>

          <div className="freshness-pillar-card">
            <span className="freshness-pillar-icon">✨</span>
            <h3>100% Taste Guarantee</h3>
            <p>If your tea does not delight with fresh aroma and clean clarity, we replace it instantly.</p>
          </div>
        </div>
      </section>

      {/* =====================================================
          MAIN CONTENT
          ===================================================== */}
      <section className="freshness-content-section">
        <div className="freshness-content-inner">
          <article className="freshness-block">
            <h2>1. Why Freshness Matters in Orthodox Tea</h2>
            <p>
              Tea leaves contain hundreds of delicate volatile aromatic compounds (terpenes, linalool, and polyphenols) that give each harvest its signature muscatel, floral, malty, or earthy notes. Commercial supermarket teas often spend 12–18 months in non-airtight warehouses before reaching shelves, losing their vibrancy and antioxidant vitality.
            </p>
            <p>
              At Leafly, our batches are sourced within weeks of seasonal plucking (Spring First Flush, Summer Second Flush, Monsoon Flush, and Autumnal Flush), vacuum-packed at source, and dispatched directly to you.
            </p>
          </article>

          <article className="freshness-block">
            <h2>2. Whole Leaf Integrity vs. Commercial CTC Dust</h2>
            <p>
              The difference between commodity tea and artisan tea is whole-leaf integrity. When whole leaves unfurl slowly in hot water:
            </p>
            <ul>
              <li><strong>Layered Flavor Release:</strong> Complex top notes, mid-palate sweetness, and lingering floral finishes release harmoniously rather than instant bitter tannins.</li>
              <li><strong>Multiple Steepings:</strong> High-mountain whole leaves can be re-steeped 3 to 5 times, revealing new flavor dimensions in every cup.</li>
              <li><strong>Zero Additives:</strong> We never spray synthetic flavor oils, artificial aromas, or chemical preservatives. What you smell is 100% natural leaf botanical oils.</li>
            </ul>
          </article>

          <article className="freshness-block">
            <h2>3. Our Aroma-Lock Packaging Science</h2>
            <p>
              To protect delicate whole leaves against their four natural enemies — light, air (oxygen), moisture, and ambient kitchen aromas:
            </p>
            <ol>
              <li><strong>Multi-Layer Metallic Barrier:</strong> Blocks 100% of UV rays and sunlight degradation.</li>
              <li><strong>Food-Grade Zip Seal:</strong> Re-sealable airtight closure keeps ambient moisture out after opening.</li>
              <li><strong>Resealable Canisters:</strong> Available for our Reserve collections, double-lidded to ensure long-term aroma retention.</li>
            </ol>
          </article>

          <article className="freshness-block">
            <h2>4. Home Storage & Preservation Guide</h2>
            <p>
              To enjoy peak flavor from your Leafly tea for 18 to 24 months, we recommend following these simple ritual storage guidelines:
            </p>
            <div className="freshness-storage-grid">
              <div className="freshness-storage-item">
                <strong>✓ Cool & Dark</strong>
                <p>Store in a cool cupboard or tea pantry away from stovetops and direct sunlight.</p>
              </div>
              <div className="freshness-storage-item">
                <strong>✓ Keep Dry</strong>
                <p>Always seal the zip firmly. Never store tea in the refrigerator once opened.</p>
              </div>
              <div className="freshness-storage-item">
                <strong>✓ Isolate Aromas</strong>
                <p>Keep tea away from strong spices (garlic, cumin, coffee) as tea naturally absorbs ambient odors.</p>
              </div>
              <div className="freshness-storage-item">
                <strong>✓ Dry Spoon</strong>
                <p>Always use a dry spoon or bamboo tea scoop to avoid introducing moisture into the pouch.</p>
              </div>
            </div>
          </article>

          <article className="freshness-block">
            <h2>5. Our 100% Delight & Replacement Guarantee</h2>
            <p>
              We want every cup of Leafly to be a restorative moment. If for any reason your tea arrives without its promised aroma, or if a pouch seal was compromised in transit:
            </p>
            <p>
              Reach out to our concierge team at <a href="mailto:hello@leaflytea.in">hello@leaflytea.in</a> within 7 days of receiving your order. We will send you a replacement blend or provide full store credit without any return hassle.
            </p>
          </article>

          <article className="freshness-block freshness-cta-card">
            <h2>Ready to Taste the Difference of Pure Harvests?</h2>
            <p>Explore our seasonal single-estate flushes and teaware designed for pure brewing clarity.</p>
            <div className="freshness-cta-links">
              <Link to="/shop" className="freshness-btn-primary">Explore Single-Origin Teas</Link>
              <Link to="/teaware" className="freshness-btn-secondary">Browse Artisan Teaware</Link>
            </div>
          </article>
        </div>
      </section>

      <Footer />
    </main>
  );
}
