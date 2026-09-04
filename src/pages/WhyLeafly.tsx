import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate, Link } from "react-router-dom";
import Footer from "../components/Footer";
import SEO from "../components/SEO";
import { generateOrganizationSchema, generateBreadcrumbSchema } from "../lib/seoData";

// Visual assets from project
import heroTeaImg from "../assets/main.webp";
import storyGardenImg from "../assets/tea-plantation-hero.jpg";
import centerCupImg from "../assets/Five-small.webp";

import "./WhyLeafly.css";

const TYPEWRITER_STEPS = [
  "W",
  "WH",
  "WHY",
  "WHY L",
  "WHY LE",
  "WHY LEAFLY",
];

export default function WhyLeafly() {
  const navigate = useNavigate();

  // Typewriter intro loader state
  const [loading, setLoading] = useState(true);
  const [typedText, setTypedText] = useState("");
  const [showQuestionMark, setShowQuestionMark] = useState(false);
  const [loaderFadeOut, setLoaderFadeOut] = useState(false);

  useEffect(() => {
    // Ensure viewport starts at top
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    // Check reduced motion preference
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setLoading(false);
      return;
    }

    let stepIndex = 0;
    // Step interval: 140ms * 6 steps = ~840ms typing
    const typingInterval = setInterval(() => {
      if (stepIndex < TYPEWRITER_STEPS.length) {
        setTypedText(TYPEWRITER_STEPS[stepIndex]);
        stepIndex++;
      } else {
        clearInterval(typingInterval);
        // Reveal enlarged gold question mark
        setShowQuestionMark(true);

        // Elegant short pause ~280ms then begin smooth fade out (~400ms)
        setTimeout(() => {
          setLoaderFadeOut(true);
        }, 280);

        // Total intro: ~840ms typing + 280ms pause + 400ms fade = ~1.52s
        setTimeout(() => {
          setLoading(false);
        }, 680);
      }
    }, 140);

    return () => clearInterval(typingInterval);
  }, []);

  return (
    <main className={`why-leafly-page ${loading ? "page-intro-active" : "page-intro-complete"}`}>
      <SEO
        title="Why Leafly — Sourcing, Craft & The Mindful Tea Experience | Leafly"
        description="Discover why Leafly exists: 100% single-origin whole leaves, direct ethical partnerships with Indian tea gardens, small-batch packing, and zero shortcuts."
        canonicalPath="/why-leafly"
        schema={[
          generateOrganizationSchema(),
          generateBreadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Why Leafly", url: "/why-leafly" },
          ]),
        ]}
      />

      {/* =====================================================
          1. TYPEWRITER LOADING INTRO (PORTALED TO BODY)
          ===================================================== */}
      {loading &&
        createPortal(
          <div
            className={`why-leafly-typewriter-loader ${loaderFadeOut ? "fade-out" : ""}`}
            aria-live="polite"
          >
            <div className="typewriter-backdrop" />
            <div className="typewriter-ambient-glow" />
            <div className="typewriter-content">
              <span className="typewriter-brand-eyebrow">A MINDFUL RITUAL</span>
              <h1 className="typewriter-heading">
                <span className="typewriter-text">{typedText}</span>
                {showQuestionMark && (
                  <span className="typewriter-qmark" aria-hidden="true">
                    {" "}?
                  </span>
                )}
              </h1>
              <div className="typewriter-gold-accent">
                <span className="typewriter-line" />
                <span className="typewriter-spark">✦</span>
                <span className="typewriter-line" />
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* =====================================================
          2. HERO SECTION
          ===================================================== */}
      <section className="why-hero-v2">
        <div className="why-hero-v2-container">
          <div className="why-hero-v2-left">
            <p className="why-eyebrow-badge">
              <span className="badge-spark">✦</span> OUR PROMISE
            </p>

            <h1 className="why-hero-title">
              More Than Tea,
              <br />
              <em className="gold-script">It&apos;s a Way of Life.</em>
            </h1>

            <p className="why-hero-lead">
              At Leafly, we believe tea is not just a drink, it&apos;s a ritual of wellness,
              connection and conscious living.
            </p>

            <p className="why-hero-sublead">
              Every leaf we source, every blend we craft, carries our promise of purity,
              sustainability and purpose.
            </p>

            <div className="why-hero-actions">
              <button
                type="button"
                className="why-btn-gold"
                onClick={() => navigate("/shop")}
              >
                EXPLORE TEAS
                <span className="btn-arrow">→</span>
              </button>
              <button
                type="button"
                className="why-btn-ghost"
                onClick={() => {
                  const el = document.getElementById("leafly-difference");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                OUR DIFFERENCE
              </button>
            </div>
          </div>

          <div className="why-hero-v2-right">
            <div className="why-hero-visual-frame">
              <div className="why-hero-visual-glow" />
              <img
                src={heroTeaImg}
                alt="Leafly Artisan Tea Steeping Ritual"
                className="why-hero-img"
                loading="eager"
                fetchPriority="high"
              />
              <div className="why-hero-img-badge">
                <span className="img-badge-leaf">🍃</span>
                <div>
                  <strong>100% Whole Leaf</strong>
                  <small>Direct Single Origin</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================
            3. HERO VALUE POINTS (4 PILLARS)
            ===================================================== */}
        <div className="why-value-pillars-strip">
          <div className="why-value-pillars-grid">
            <div className="why-pillar-card">
              <div className="why-pillar-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                </svg>
              </div>
              <div className="why-pillar-body">
                <h4>PURE &amp; AUTHENTIC</h4>
                <p>Finest whole leaf teas sourced at origin.</p>
              </div>
            </div>

            <div className="why-pillar-card">
              <div className="why-pillar-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <polyline points="7.5 4.21 12 6.81 16.5 4.21" />
                  <polyline points="7.5 19.79 7.5 14.6 3 12" />
                  <polyline points="21 12 16.5 14.6 16.5 19.79" />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
              </div>
              <div className="why-pillar-body">
                <h4>ETHICAL &amp; SUSTAINABLE</h4>
                <p>Supporting farmers &amp; sustainable practices.</p>
              </div>
            </div>

            <div className="why-pillar-card">
              <div className="why-pillar-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <div className="why-pillar-body">
                <h4>CRAFTED WITH CARE</h4>
                <p>Blends created by certified tea experts.</p>
              </div>
            </div>

            <div className="why-pillar-card">
              <div className="why-pillar-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </div>
              <div className="why-pillar-body">
                <h4>WELLNESS IN EVERY CUP</h4>
                <p>Natural, healthy &amp; made for your lifestyle.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          4. THE LEAFLY DIFFERENCE
          ===================================================== */}
      <section className="why-difference-section" id="leafly-difference">
        <div className="why-section-header">
          <p className="why-section-kicker">UNCOMPROMISING STANDARDS</p>
          <h2 className="why-section-title">THE LEAFLY DIFFERENCE</h2>
          <div className="why-gold-divider">
            <span />
            <b>✦</b>
            <span />
          </div>
          <p className="why-section-desc">
            How our deliberate approach to whole leaf sourcing elevates every cup above commercial tea dust.
          </p>
        </div>

        <div className="why-difference-grid">
          <div className="why-diff-card">
            <div className="diff-card-num">01</div>
            <div className="diff-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                <path d="M2 12h20" />
              </svg>
            </div>
            <h3>ORIGIN MATTERS</h3>
            <p>We source the finest teas from India&apos;s most renowned tea gardens across Darjeeling, Assam, and Kangra.</p>
          </div>

          <div className="why-diff-card">
            <div className="diff-card-num">02</div>
            <div className="diff-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h3>QUALITY FIRST</h3>
            <p>Handpicked whole leaves for unmatched aroma, clean liquor clarity, and authentic flavor freshness.</p>
          </div>

          <div className="why-diff-card">
            <div className="diff-card-num">03</div>
            <div className="diff-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <h3>EXPERTLY CURATED</h3>
            <p>Blends crafted by veteran tea sommeliers with decades of estate evaluation experience.</p>
          </div>

          <div className="why-diff-card">
            <div className="diff-card-num">04</div>
            <div className="diff-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
              </svg>
            </div>
            <h3>SUSTAINABLE CHOICE</h3>
            <p>We care for people and planet with responsible harvesting, bio-compostable tin liners, and fair compensation.</p>
          </div>

          <div className="why-diff-card">
            <div className="diff-card-num">05</div>
            <div className="diff-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h3>MADE FOR YOU</h3>
            <p>Teas that fit your lifestyle, mood, and wellness goals — whether sunrise focus or serene twilight resting.</p>
          </div>
        </div>
      </section>

      {/* =====================================================
          5. STORY-DRIVEN SECTION
          ===================================================== */}
      <section className="why-story-section">
        <div className="why-story-container">
          <div className="why-story-content">
            <p className="why-eyebrow-badge">
              <span className="badge-spark">✦</span> OUR STORY
            </p>

            <h2 className="why-story-title">
              Rooted in Tradition,
              <br />
              <em>Driven by Purpose.</em>
            </h2>

            <p className="why-story-paragraph">
              Leafly was born from an unapologetic passion for authentic Indian tea and an unwavering
              belief in making a positive, enduring impact on the estates that produce it.
            </p>

            <p className="why-story-paragraph">
              From small high-mountain tea gardens directly to your cup, we ensure complete transparency,
              uncompromised quality, and genuine farmer reverence at every step of the harvest.
            </p>

            <div className="why-story-cta-row">
              <Link to="/about" className="why-story-btn">
                READ OUR JOURNEY →
              </Link>
            </div>
          </div>

          <div className="why-story-visual">
            <div className="why-story-img-frame">
              <img
                src={storyGardenImg}
                alt="High altitude mist-covered tea gardens of India"
                className="why-story-img"
                loading="lazy"
              />
              <div className="why-story-caption">
                <p>Singtom &amp; Makaibari Terraces · High Elevation Elevation Harvest</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          6. TEA BENEFITS SECTION
          ===================================================== */}
      <section className="why-benefits-section">
        <div className="why-benefits-header">
          <p className="why-section-kicker">WELLNESS IN HARMONY</p>
          <h2 className="why-section-title">THE GOODNESS IN EVERY CUP</h2>
          <div className="why-gold-divider">
            <span />
            <b>✦</b>
            <span />
          </div>
        </div>

        <div className="why-benefits-grid">
          <div className="why-benefit-block">
            <div className="benefit-icon-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <h3>BOOSTS IMMUNITY</h3>
            <p>Abundant natural polyphenols and catechins for daily vitality and cellular protection.</p>
          </div>

          <div className="why-benefit-block">
            <div className="benefit-icon-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3>AIDS RELAXATION</h3>
            <p>Calming L-theanine amino acids that promote deep relaxation and soothe everyday tension.</p>
          </div>

          <div className="why-benefit-block">
            <div className="benefit-icon-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            </div>
            <h3>IMPROVES FOCUS</h3>
            <p>Sustained, jitters-free cognitive clarity that sharpens concentration without energy crashes.</p>
          </div>

          <div className="why-benefit-block">
            <div className="benefit-icon-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <h3>SUPPORTS DIGESTION</h3>
            <p>Clean digestive tannins and botanical herbs gently nurturing your post-meal gut equilibrium.</p>
          </div>
        </div>
      </section>

      {/* =====================================================
          7. VISUAL "WHY CHOOSE LEAFLY?" SECTION (3-COLUMN)
          ===================================================== */}
      <section className="why-choose-section">
        <div className="why-choose-container">
          <div className="why-choose-col left-col">
            <p className="why-eyebrow-badge">
              <span className="badge-spark">✦</span> THE PHILOSOPHY
            </p>
            <h2 className="why-choose-title">
              Why Choose
              <br />
              <em>Leafly?</em>
            </h2>
            <p className="why-choose-desc">
              We combine the pure bounty of nature with the timeless artisanal craft of tea
              to bring you a mindful, restorative tea experience.
            </p>
            <button
              type="button"
              className="why-btn-gold"
              onClick={() => navigate("/shop")}
            >
              EXPLORE OUR TEAS →
            </button>
          </div>

          <div className="why-choose-col center-col">
            <div className="why-choose-cup-frame">
              <img
                src={centerCupImg}
                alt="Leafly hand-poured golden liquor in artisan teaware"
                className="why-choose-cup-img"
                loading="lazy"
              />
              <div className="why-cup-ring-glow" />
            </div>
          </div>

          <div className="why-choose-col right-col">
            <div className="why-choose-points">
              <div className="why-choose-point">
                <span className="point-spark">◈</span>
                <div>
                  <h4>PURE INGREDIENTS</h4>
                  <p>Nothing artificial, zero synthetic oils — only whole orthodox estate leaves.</p>
                </div>
              </div>

              <div className="why-choose-point">
                <span className="point-spark">◈</span>
                <div>
                  <h4>SMALL BATCH BLENDS</h4>
                  <p>Handcrafted and foil-sealed in limited harvests for maximum aromatic integrity.</p>
                </div>
              </div>

              <div className="why-choose-point">
                <span className="point-spark">◈</span>
                <div>
                  <h4>MINDFUL LIVING</h4>
                  <p>A deliberate, meditative step towards a centered and balanced daily ritual.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          8. STATISTICS / TRUST SECTION
          ===================================================== */}
      <section className="why-stats-section">
        <div className="why-stats-container">
          <div className="why-stat-box">
            <span className="stat-num">50+</span>
            <span className="stat-label">Premium Single Estates</span>
          </div>

          <div className="why-stat-box">
            <span className="stat-num">100%</span>
            <span className="stat-label">Natural &amp; Pure Leaves</span>
          </div>

          <div className="why-stat-box">
            <span className="stat-num">25,000+</span>
            <span className="stat-label">Mindful Tea Drinkers</span>
          </div>

          <div className="why-stat-box">
            <span className="stat-num">4.9/5</span>
            <span className="stat-label">Customer Satisfaction</span>
          </div>
        </div>
      </section>

      {/* =====================================================
          9. FINAL CTA SECTION
          ===================================================== */}
      <section className="why-final-cta-section">
        <div className="why-final-cta-inner">
          <p className="why-eyebrow-badge center">
            <span className="badge-spark">✦</span> EMBARK ON THE RITUAL
          </p>

          <h2 className="why-final-cta-heading">
            Your Perfect Cup
            <br />
            <em>Starts Here.</em>
          </h2>

          <p className="why-final-cta-subtext">
            Discover single-origin teas and handcrafted vessels created with purpose,
            care and a little Leafly magic.
          </p>

          <div className="why-final-cta-buttons">
            <button
              type="button"
              className="why-btn-gold large"
              onClick={() => navigate("/shop")}
            >
              EXPLORE TEAS
            </button>
            <button
              type="button"
              className="why-btn-ghost large"
              onClick={() => navigate("/gifting")}
            >
              DISCOVER GIFTING
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}