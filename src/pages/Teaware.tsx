import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { type TeawareCategory, type TeawareItem } from "../data/teaware";
import { useTeaware } from "../context/TeawareContext";
import { useWishlist } from "../context/WishlistContext";
import { getProductSlug } from "../data/products";
import Footer from "../components/Footer";
import { Helmet } from "react-helmet-async";
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
        badge: "Coming Soon",
        image: item.image,
      });
    }
  };

  return (
    <main className="teaware-page">
      <Helmet>
        <title>Artisan Teaware & Accessories | Leafly</title>
        <meta name="description" content="Discover handcrafted borosilicate teapots, high-fired ceramic cups, organic bamboo trays, and airtight canisters." />
      </Helmet>
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
            <p className="teaware-eyebrow">CURATED COLLECTION · COMING SOON</p>
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
              Exclusive Artisan Edition · Launching Soon
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

            return (
              <article className="teaware-card teaware-coming-soon-card" key={item.id}>
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
                    COMING SOON
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
                  <p className="teaware-meta">
                    {item.material} · {item.category}
                  </p>

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

                  <p className="teaware-details">
                    {item.capacity || "Standard Capacity"} · Food-Grade Craftsmanship
                  </p>

                  {/* ACTIONS */}
                  <div className="teaware-actions coming-soon-actions">
                    <button
                      type="button"
                      className="teaware-details-button"
                      onClick={() => navigate(`/teaware/${getProductSlug(item)}`)}
                    >
                      VIEW DETAILS
                    </button>

                    <div className="teaware-coming-soon-badge-btn" aria-label="Coming Soon">
                      <span>✦</span>
                      COMING SOON
                    </div>
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
      {selectedItem && (
        <div
          className="teaware-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={selectedItem.name}
          onClick={() => setSelectedItem(null)}
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
                src={selectedItem.image}
                alt={selectedItem.name}
                className="teaware-modal-image"
              />
            </div>

            <div className="teaware-modal-info">
              <span className="teaware-badge coming-soon">
                COMING SOON
              </span>

              <p className="teaware-meta">
                {selectedItem.material} · {selectedItem.category}
              </p>

              <h2>{selectedItem.name}</h2>

              <p className="teaware-modal-desc">{selectedItem.description}</p>

              <div className="teaware-features-list">
                <h4>ARTISAN SPECIFICATIONS</h4>
                <ul>
                  {selectedItem.features.map((feat, idx) => (
                    <li key={idx}>
                      <span className="teaware-feature-dot">✦</span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="teaware-modal-actions">
                <div className="teaware-modal-coming-soon-banner">
                  <span>✦</span>
                  COMING SOON · LAUNCHING SHORTLY
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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

