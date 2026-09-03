import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import Footer from "../components/Footer";
import SEO from "../components/SEO";
import { generateBreadcrumbSchema } from "../lib/seoData";
import "./FAQs.css";

type FaqCategory =
  | "All Questions"
  | "Tea Freshness & Origins"
  | "Brewing & Tea Maker"
  | "Orders & Tracking"
  | "Shipping & Delivery"
  | "Returns & Quality Policy";

interface FaqItem {
  id: string;
  category: FaqCategory;
  question: string;
  answer: string;
}

const FAQ_DATA: FaqItem[] = [
  // Tea Freshness & Origins
  {
    id: "fresh-1",
    category: "Tea Freshness & Origins",
    question: "How is Leafly tea different from supermarket commercial teas?",
    answer: "Most commercial teas use mechanized CTC (Crush, Tear, Curl) dust and fannings blended from multiple industrial sources and stored for up to 18 months. Leafly sources 100% whole orthodox leaves directly from single certified estates in Darjeeling, Assam, Nilgiri, and Kashmir. We vacuum-pack each batch within weeks of plucking to preserve natural volatile aromatic oils."
  },
  {
    id: "fresh-2",
    category: "Tea Freshness & Origins",
    question: "Do you add any artificial flavorings, preservatives, or sweeteners?",
    answer: "Never. Every Leafly tea is 100% pure orthodox leaf or blended solely with organic, sun-dried whole spices and botanicals (such as Darjeeling lemongrass, Malabar green cardamom, and highland mint). We never spray synthetic essence oils."
  },
  {
    id: "fresh-3",
    category: "Tea Freshness & Origins",
    question: "How long does Leafly tea stay fresh once opened?",
    answer: "Thanks to our four-layer multi-barrier foil pouches with airtight zip seals, your tea retains peak aroma and flavor for 18 to 24 months. Keep the pouch zipped tightly in a cool, dry cupboard away from direct sunlight, heat, and strong spices."
  },

  // Brewing & Tea Maker
  {
    id: "brew-1",
    category: "Brewing & Tea Maker",
    question: "Can I re-steep whole leaf teas multiple times?",
    answer: "Yes! High-altitude orthodox whole leaves are crafted for multiple infusions. Delicate green and white teas can be steeped 2 to 3 times, while high-mountain oolongs and select single-estate black teas can yield 4 to 6 sublime steepings, evolving with subtle new notes each time."
  },
  {
    id: "brew-2",
    category: "Brewing & Tea Maker",
    question: "How does the interactive Tea Maker on the website work?",
    answer: "Our Tea Maker guide (accessible under /tea-maker) walks you step-by-step through water temperature, leaf-to-water ratios, steeping countdown timers, and optional whole-botanical infusions tailored to your chosen tea category and strength preference."
  },
  {
    id: "brew-3",
    category: "Brewing & Tea Maker",
    question: "What water temperature should I use for green and white teas?",
    answer: "Delicate green and white teas should never be brewed with boiling water, which can scald tender buds and release harsh tannins. We recommend 75°C–80°C for White & Green teas, 85°C–90°C for Oolongs, and 95°C–100°C for robust Black teas."
  },

  // Orders & Tracking
  {
    id: "order-1",
    category: "Orders & Tracking",
    question: "How can I track my order once placed?",
    answer: "As soon as your package is dispatched, you will receive an SMS and email containing your live tracking Air Waybill (AWB) link. You can also view real-time status anytime under 'My Orders' in your Leafly Account."
  },
  {
    id: "order-2",
    category: "Orders & Tracking",
    question: "What payment methods are supported?",
    answer: "We support UPI (Google Pay, PhonePe, Paytm, BHIM), all major Credit/Debit Cards (Visa, Mastercard, RuPay, American Express), Net Banking across 50+ Indian banks, and Pay on Delivery."
  },
  {
    id: "order-3",
    category: "Orders & Tracking",
    question: "Can I cancel or modify my order after placing it?",
    answer: "Because orders are prepared rapidly to ensure same-day or next-day dispatch, please email hello@leaflytea.in or message us through the Contact page within 2 hours of placement to request address changes or cancellations."
  },

  // Shipping & Delivery
  {
    id: "ship-1",
    category: "Shipping & Delivery",
    question: "What are your shipping charges and delivery timelines?",
    answer: "We offer FREE Standard Shipping across India on all orders above ₹499 (flat ₹49 for orders below). Metro deliveries arrive in 3–5 business days, regional pin codes in 5–7 business days, and Express Priority Air in 1–2 business days."
  },
  {
    id: "ship-2",
    category: "Shipping & Delivery",
    question: "Do you ship internationally outside India?",
    answer: "Yes, we ship select collections internationally. For custom orders, phytosanitary requirements, and overseas shipping quotes, please reach out to hello@leaflytea.in."
  },

  // Returns & Quality Policy
  {
    id: "ret-1",
    category: "Returns & Quality Policy",
    question: "What is the Leafly Quality & Taste Policy?",
    answer: "If your tea arrives with a compromised aroma seal, damaged box, or does not meet our pristine harvest standards, email us within 7 days of delivery. We will immediately dispatch a fresh replacement or issue 100% store credit — no return shipping friction."
  },
  {
    id: "ret-2",
    category: "Returns & Quality Policy",
    question: "How do I report a damaged or defective teaware item?",
    answer: "In the rare event that glassware or ceramics arrive damaged during transit, please take 2–3 photos of the box and product and email hello@leaflytea.in within 48 hours. We will send an expedited replacement right away."
  }
];

const categories: FaqCategory[] = [
  "All Questions",
  "Tea Freshness & Origins",
  "Brewing & Tea Maker",
  "Orders & Tracking",
  "Shipping & Delivery",
  "Returns & Quality Policy",
];

export default function FAQs() {
  const [activeCategory, setActiveCategory] = useState<FaqCategory>("All Questions");
  const [searchQuery, setSearchQuery] = useState("");
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({ "fresh-1": true });

  const toggleFaq = (id: string) => {
    setOpenIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const filteredFaqs = useMemo(() => {
    return FAQ_DATA.filter((item) => {
      const matchesCategory =
        activeCategory === "All Questions" || item.category === activeCategory;
      const matchesSearch =
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  const faqPageSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": FAQ_DATA.slice(0, 15).map((f) => ({
      "@type": "Question",
      "name": f.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": f.answer,
      },
    })),
  };

  const breadcrumbs = [
    { name: "Home", url: "/" },
    { name: "FAQs", url: "/faqs" },
  ];

  return (
    <main className="faqs-page">
      <SEO
        title="Frequently Asked Questions — Tea Freshness, Brewing & Orders | Leafly"
        description="Find answers to common questions about Leafly single-origin teas, whole-leaf freshness, steeping temperatures, order tracking, shipping, and returns."
        canonicalPath="/faqs"
        schema={[faqPageSchema, generateBreadcrumbSchema(breadcrumbs)]}
      />
      {/* =====================================================
          HERO
          ===================================================== */}
      <section className="faqs-hero">
        <div className="faqs-hero-inner">
          <p className="faqs-eyebrow">
            <span>✦</span>
            HELP & CONCIERGE
          </p>

          <div className="faqs-ornament">
            <span />
            <b>✦</b>
            <span />
          </div>

          <h1>
            Frequently Asked
            <br />
            <em>Questions.</em>
          </h1>

          <p className="faqs-hero-sub">
            Answers to guide your mindful tea rituals, ordering experience, storage, and brewing practices.
          </p>

          {/* SEARCH BAR */}
          <div className="faqs-search-wrap">
            <input
              type="text"
              placeholder="Search questions (e.g. brewing, shipping, storage)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search FAQs"
            />
            {searchQuery && (
              <button
                type="button"
                className="faqs-search-clear"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </section>

      {/* =====================================================
          CATEGORY TABS & ACCORDION
          ===================================================== */}
      <section className="faqs-content-section">
        <div className="faqs-content-inner">
          {/* CATEGORY TABS */}
          <div className="faqs-tabs" role="tablist" aria-label="FAQ Categories">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={activeCategory === cat ? "faqs-tab active" : "faqs-tab"}
                onClick={() => setActiveCategory(cat)}
                role="tab"
                aria-selected={activeCategory === cat}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* FAQ ACCORDION */}
          <div className="faqs-accordion">
            {filteredFaqs.length === 0 ? (
              <div className="faqs-empty">
                <p>No questions found matching &ldquo;{searchQuery}&rdquo;.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setActiveCategory("All Questions");
                  }}
                >
                  Reset all filters
                </button>
              </div>
            ) : (
              filteredFaqs.map((faq) => {
                const isOpen = !!openIds[faq.id];
                return (
                  <article
                    key={faq.id}
                    className={`faq-card ${isOpen ? "open" : ""}`}
                  >
                    <button
                      type="button"
                      className="faq-question-btn"
                      onClick={() => toggleFaq(faq.id)}
                      aria-expanded={isOpen}
                    >
                      <div className="faq-question-text">
                        <span className="faq-category-tag">{faq.category}</span>
                        <h3>{faq.question}</h3>
                      </div>
                      <span className="faq-toggle-icon">{isOpen ? "−" : "+"}</span>
                    </button>

                    {isOpen && (
                      <div className="faq-answer">
                        <p>{faq.answer}</p>
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </div>

          {/* CONTACT CONCIERGE BANNER */}
          <div className="faqs-contact-banner">
            <div className="faqs-contact-copy">
              <h3>Still have questions about tea or your order?</h3>
              <p>Our dedicated tea concierge team is available to help recommend leaves and assist with custom rituals.</p>
            </div>
            <Link to="/contact" className="faqs-contact-btn">
              Contact Concierge →
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
