import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { type TeawareCategory, type TeawareItem } from "../data/teaware";
import { useTeaware } from "../context/TeawareContext";
import { useWishlist } from "../context/WishlistContext";
import { getProductSlug } from "../data/products";
import Footer from "../components/Footer";
import SEO from "../components/SEO";
import { generateBreadcrumbSchema } from "../lib/seoData";
import "./Teaware.css";

const categories: Array<"All Teaware" | TeawareCategory> = [
  "All Teaware",
  "Teapots",
  "Tea Cups",
  "Serving & Trays",
  "Storage & Accessories",
];

export default function Teaware() {
  const navigate = useNavigate();
  const { teaware } = useTeaware();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();

  const [category, setCategory] = useState<"All Teaware" | TeawareCategory>("All Teaware");
  const [sortBy, setSortBy] = useState("Featured Collection");
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TeawareItem | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 500);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedItem(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (selectedItem) {
      const prevBodyOverflow = document.body.style.overflow;
      const prevHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevBodyOverflow;
        document.documentElement.style.overflow = prevHtmlOverflow;
      };
    }
  }, [selectedItem]);

  const filteredProducts = useMemo(() => {
    return teaware
      .filter((item) => {
        if (category !== "All Teaware" && item.category !== category) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "Name: A to Z") return a.name.localeCompare(b.name);
        return 0; // Featured
      });
  }, [category, sortBy, teaware]);

  const clearFilters = () => {
    setCategory("All Teaware");
    setSortBy("Featured Collection");
  };

  const toggleWishlist = (item: TeawareItem) => {
    const isWishlisted = isInWishlist(item.id);
    if (isWishlisted) {
      removeFromWishlist(item.id);
    } else {
      addToWishlist({
        id: item.id,
        name: item.name,
        category: item.category,
        origin: item.material,
        caffeine: "Teaware",
        weight: item.capacity || "1 Unit",
        price: item.price,
        oldPrice: item.oldPrice,
        badge: item.badge || "",
        image: item.image,
        inStock: item.inStock !== false,
        stock: typeof item.stock === "number" ? item.stock : 10,
      });
    }
  };

  return (
    <main className="teaware-page">
      <SEO
        title="Artisan Teaware & Accessories | Teapots, Cups & Canisters | Leafly"
        description="Shop artisanal tea accessories by Leafly. Handcrafted borosilicate glass teapots with infusers, ceramic cups, bamboo trays, and UV-shield airtight storage canisters."
        canonicalPath="/teaware"
        schema={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Teaware", url: "/teaware" },
        ])}
      />
      {/* =====================================================
          HERO
          ===================================================== */}
      <section className="teaware-hero">
        <div className="teaware-hero-inner">
          <p className="teaware-hero-eyebrow">
            <span>✦</span>
            ARTISAN BREWING GEAR
          </p>

          <div className="teaware-hero-ornament">
            <span />
            <b>✦</b>
            <span />
          </div>

          <h1>
            Vessels crafted for
            <br />
            <em>the mindful pour.</em>
          </h1>

          <p className="teaware-hero-description">
            Discover handcrafted borosilicate teapots, high-fired ceramic cups, organic bamboo trays, and airtight canisters — curated to honor the leaf and elevate your daily ritual.
          </p>
        </div>
      </section>

      {/* =====================================================
          COLLECTION
          ===================================================== */}
      <section className="teaware-collection" id="teaware-collection">
        <div className="teaware-collection-header">
          <div>
            <p className="teaware-eyebrow">CURATED COLLECTION · ARTISAN EDITION</p>
            <h2>Teaware for every ritual.</h2>
          </div>

          <span className="teaware-count">
            {filteredProducts.length} {filteredProducts.length === 1 ? "vessel" : "vessels"}
          </span>
        </div>

        {/* CATEGORY TABS */}
        <div className="teaware-category-tabs" role="tablist" aria-label="Teaware categories">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              className={category === item ? "teaware-category-tab active" : "teaware-category-tab"}
              onClick={() => setCategory(item)}
              role="tab"
              aria-selected={category === item}
            >
              {item}
            </button>
          ))}
        </div>

        {/* FILTER BAR */}
        <div className="teaware-filter-bar">
          <div className="teaware-filters">
            <span className="teaware-filter-status">
              <span className="teaware-status-dot">✦</span>
              Curated Artisan Vessels · Direct from Master Potters
            </span>
          </div>

          <div className="teaware-sort">
            <label htmlFor="teaware-sort-select">SORT BY</label>
            <select
              id="teaware-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Sort teaware"
            >
              <option>Featured Collection</option>
              <option>Name: A to Z</option>
            </select>
          </div>
        </div>

        {/* ACTIVE FILTER SUMMARY */}
        {category !== "All Teaware" && (
          <div className="teaware-active-filters">
            <span>Showing category: <strong>{category}</strong></span>
            <button type="button" onClick={clearFilters}>
              Clear filter ×
            </button>
          </div>
        )}

        {/* PRODUCT GRID */}
        <div className="teaware-product-grid">
          {filteredProducts.map((item, index) => {
            const isWishlisted = isInWishlist(item.id);
            const isAvailable = item.inStock !== false && typeof item.stock === "number" && item.stock > 0;

            return (
              <article className={`teaware-card ${isAvailable ? "" : "teaware-coming-soon-card"}`} key={item.id}>
                {/* PRODUCT IMAGE */}
                <div
                  className="teaware-image-wrap"
                  onClick={() => navigate(`/teaware/${getProductSlug(item)}`)}
                  style={{ cursor: "pointer" }}
                >
                  <img
                    src={item.image}
                    alt={`Leafly ${item.name}`}
                    className="teaware-image"
                    loading={index < 4 ? "eager" : "lazy"}
                    decoding="async"
                    {...(index < 2 ? { fetchPriority: "high" as const } : {})}
                  />

                  <span className="teaware-badge coming-soon">
                    {item.badge ? `${item.badge} · COMING SOON` : "COMING SOON"}
                  </span>

                  <button
                    type="button"
                    className={isWishlisted ? "teaware-wishlist-button active" : "teaware-wishlist-button"}
                    aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                    aria-pressed={isWishlisted}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleWishlist(item);
                    }}
                  >
                    {isWishlisted ? "♥" : "♡"}
                  </button>
                </div>

                {/* PRODUCT CONTENT */}
                <div className="teaware-content">
                  <div className="teaware-meta-row">
                    <p className="teaware-meta">
                      {item.material} · {item.category}
                    </p>
                    <span className="teaware-stock-pill out-of-stock">
                      Coming Soon
                    </span>
                  </div>

                  <h3
                    onClick={() => navigate(`/teaware/${getProductSlug(item)}`)}
                    style={{ cursor: "pointer" }}
                  >
                    {item.name}
                  </h3>

                  {/* SHORT DESCRIPTION */}
                  <p className="teaware-short-desc">
                    {item.description}
                  </p>

                  <div className="teaware-price-row">
                    <span className="teaware-price-val">₹{Number(item.price).toLocaleString("en-IN")}</span>
                    {item.oldPrice && item.oldPrice > item.price && (
                      <span className="teaware-old-price-val">₹{Number(item.oldPrice).toLocaleString("en-IN")}</span>
                    )}
                  </div>

                  <p className="teaware-details">
                    {item.capacity || "Standard Capacity"} · Food-Grade Craftsmanship
                  </p>

                  {/* ACTIONS */}
                  <div className="teaware-actions">
                    <button
                      type="button"
                      className="teaware-details-button"
                      onClick={() => navigate(`/teaware/${getProductSlug(item)}`)}
                    >
                      VIEW DETAILS
                    </button>

                    <button
                      type="button"
                      className="teaware-add-btn disabled coming-soon"
                      disabled={true}
                      aria-label={`${item.name} is coming soon`}
                    >
                      COMING SOON
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* =====================================================
          PRODUCT DETAIL MODAL (Quick View Option)
          ===================================================== */}
      {selectedItem && (() => {
        const liveSelectedItem = teaware.find((t) => String(t.id) === String(selectedItem.id)) || selectedItem;

        return (
          <div
            className="teaware-modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-label={liveSelectedItem.name}
            onClick={() => setSelectedItem(null)}
            ref={(el) => {
              if (el) el.scrollTop = 0;
            }}
          >
            <div
              className="teaware-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="teaware-modal-close"
                onClick={() => setSelectedItem(null)}
                aria-label="Close modal"
              >
                ✕
              </button>

              <div className="teaware-modal-image-wrap">
                <img
                  src={liveSelectedItem.image}
                  alt={liveSelectedItem.name}
                  className="teaware-modal-image"
                />
              </div>

              <div className="teaware-modal-info">
                <span className="teaware-badge coming-soon">
                  COMING SOON
                </span>

                <p className="teaware-meta">
                  {liveSelectedItem.material} · {liveSelectedItem.category}
                </p>

                <h2>{liveSelectedItem.name}</h2>

                <div className="teaware-modal-price-row">
                  <span className="teaware-modal-price">₹{Number(liveSelectedItem.price).toLocaleString("en-IN")}</span>
                  {liveSelectedItem.oldPrice && liveSelectedItem.oldPrice > liveSelectedItem.price && (
                    <span className="teaware-modal-old-price">₹{Number(liveSelectedItem.oldPrice).toLocaleString("en-IN")}</span>
                  )}
                  <span className="teaware-stock-pill coming-soon">
                    Coming Soon
                  </span>
                </div>

                <p className="teaware-modal-desc">{liveSelectedItem.description}</p>

                <div className="teaware-features-list">
                  <h4>ARTISAN SPECIFICATIONS</h4>
                  <ul>
                    {liveSelectedItem.features.map((feat, idx) => (
                      <li key={idx}>
                        <span className="teaware-feature-dot">✦</span>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="teaware-modal-actions">
                  <button
                    type="button"
                    className="teaware-modal-add-btn disabled coming-soon"
                    disabled={true}
                    aria-label={`${liveSelectedItem.name} is coming soon`}
                  >
                    COMING SOON
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* =====================================================
          BACK TO TOP
          ===================================================== */}
      {showBackToTop && (
        <button
          type="button"
          className="teaware-back-to-top"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Back to top"
        >
          ↑
        </button>
      )}

      <Footer />
    </main>
  );
}

