import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import {
  type Product,
  type ProductVariantKey,
  getProductSlug,
  isProductInStock,
  getProductAvailableVariants,
  AVAILABLE_BENEFITS,
  SUPPORTED_WEIGHT_KEYS,
} from "../data/products";
import { useProducts } from "../context/ProductContext";
import Footer from "../components/Footer";
import SEO from "../components/SEO";
import { generateBreadcrumbSchema } from "../lib/seoData";
import teaPlantationHero from "../assets/tea-plantation-hero.jpg";

import "./Shop.css";

const BENEFIT_OPTIONS = AVAILABLE_BENEFITS;

const WEIGHT_OPTIONS = SUPPORTED_WEIGHT_KEYS;

const ORIGIN_OPTIONS = ["Darjeeling", "Assam", "Nilgiri", "Other"];

const TEA_TYPES = [
  { label: "Green Tea", value: "Green" },
  { label: "White Tea", value: "White" },
  { label: "Black Tea", value: "Black" },
  { label: "Oolong Tea", value: "Oolong" },
];

const CAFFEINE_LEVELS = ["Low", "Medium", "High"];

export default function Shop() {
  const navigate = useNavigate();
  const { products } = useProducts();

  const {
    items,
    addToCart: addProductToCart,
    increaseQuantity,
    decreaseQuantity,
    cartCount,
    openCart,
  } = useCart();

  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();

  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get("q") || searchParams.get("search") || "";
  const categoryParam = searchParams.get("category") || "";

  // Filter states
  const [searchQuery, setSearchQuery] = useState(queryParam);
  const [selectedTeaTypes, setSelectedTeaTypes] = useState<string[]>(() => {
    if (categoryParam) {
      const match = TEA_TYPES.find(
        (t) => t.value.toLowerCase() === categoryParam.toLowerCase() || t.label.toLowerCase() === categoryParam.toLowerCase()
      );
      if (match) return [match.value];
    }
    return [];
  });
  const [selectedOrigins, setSelectedOrigins] = useState<string[]>([]);
  const [selectedCaffeine, setSelectedCaffeine] = useState<string[]>([]);
  const [selectedWeights, setSelectedWeights] = useState<string[]>([]);
  const [selectedBenefits, setSelectedBenefits] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState<number>(1000);
  const [sortBy, setSortBy] = useState<string>("featured");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Mobile drawer state
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Collapsible accordion states
  const [openSections, setOpenSections] = useState({
    teaType: true,
    origin: true,
    caffeine: true,
    price: true,
    weights: true,
    benefits: true,
  });

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // UI action states
  const [addingId, setAddingId] = useState<number | string | null>(null);
  const [addedId, setAddedId] = useState<number | string | null>(null);
  const [cardVariants, setCardVariants] = useState<Record<string | number, ProductVariantKey>>({});
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalVariant, setModalVariant] = useState<ProductVariantKey>("100g");
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Sync categoryParam from URL if changed externally
  useEffect(() => {
    if (categoryParam) {
      const match = TEA_TYPES.find(
        (t) => t.value.toLowerCase() === categoryParam.toLowerCase() || t.label.toLowerCase() === categoryParam.toLowerCase()
      );
      if (match) {
        setSelectedTeaTypes([match.value]);
      }
    }
  }, [categoryParam]);

  // Back to top listener
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 500);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Modal ESC handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedProduct(null);
        setIsMobileFilterOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Body scroll lock for modal and mobile filter drawer
  useEffect(() => {
    if (selectedProduct || isMobileFilterOpen) {
      const originalBodyOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
      };
    }
  }, [selectedProduct, isMobileFilterOpen]);

  // Dynamic filter count calculations
  const counts = useMemo(() => {
    const teaTypeCounts: Record<string, number> = {};
    TEA_TYPES.forEach((t) => {
      teaTypeCounts[t.value] = products.filter((p) => p.category === t.value).length;
    });

    const originCounts: Record<string, number> = {
      Darjeeling: products.filter((p) => p.origin === "Darjeeling").length,
      Assam: products.filter((p) => p.origin === "Assam").length,
      Nilgiri: products.filter((p) => p.origin === "Nilgiri").length,
      Other: products.filter((p) => !["Darjeeling", "Assam", "Nilgiri"].includes(p.origin)).length,
    };

    const caffeineCounts: Record<string, number> = {
      Low: products.filter((p) => p.caffeine === "Low").length,
      Medium: products.filter((p) => p.caffeine === "Medium").length,
      High: products.filter((p) => p.caffeine === "High").length,
    };

    const weightCounts: Record<string, number> = {};
    WEIGHT_OPTIONS.forEach((w) => {
      weightCounts[w] = products.filter((p) => {
        const variants = getProductAvailableVariants(p);
        return variants.some((v) => v.key === w || v.weight.toLowerCase() === w.toLowerCase());
      }).length;
    });

    const benefitCounts: Record<string, number> = {};
    BENEFIT_OPTIONS.forEach((b) => {
      benefitCounts[b] = products.filter((p) => {
        const itemBenefits = Array.isArray(p.benefits) ? p.benefits : [];
        return itemBenefits.includes(b);
      }).length;
    });

    return { teaTypeCounts, originCounts, caffeineCounts, weightCounts, benefitCounts };
  }, [products]);

  // Filtering products
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((item) => {
        const benefits = Array.isArray(item.benefits) ? item.benefits : [];
        return (
          item.name.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.origin.toLowerCase().includes(q) ||
          item.caffeine.toLowerCase().includes(q) ||
          (item.description && item.description.toLowerCase().includes(q)) ||
          benefits.some((b) => b.toLowerCase().includes(q))
        );
      });
    }

    // Tea types
    if (selectedTeaTypes.length > 0) {
      result = result.filter((item) => selectedTeaTypes.includes(item.category));
    }

    // Origins
    if (selectedOrigins.length > 0) {
      result = result.filter((item) => {
        if (selectedOrigins.includes("Other")) {
          if (!["Darjeeling", "Assam", "Nilgiri"].includes(item.origin)) return true;
        }
        return selectedOrigins.includes(item.origin);
      });
    }

    // Caffeine
    if (selectedCaffeine.length > 0) {
      result = result.filter((item) => selectedCaffeine.includes(item.caffeine));
    }

    // Available weights
    if (selectedWeights.length > 0) {
      result = result.filter((item) => {
        const variants = getProductAvailableVariants(item);
        return variants.some((v) => selectedWeights.includes(v.key as string));
      });
    }

    // Benefits
    if (selectedBenefits.length > 0) {
      result = result.filter((item) => {
        const benefits = Array.isArray(item.benefits) ? item.benefits : [];
        return benefits.some((b) => selectedBenefits.includes(b));
      });
    }

    // Price range
    if (maxPrice < 1500) {
      result = result.filter((item) => {
        const variants = getProductAvailableVariants(item);
        const minPrice = variants.length > 0 ? Math.min(...variants.map((v) => v.price)) : item.price;
        return minPrice <= maxPrice;
      });
    }

    // Sorting
    if (sortBy === "price-asc") {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-desc") {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === "name-asc") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "popular") {
      result.sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0));
    } else if (sortBy === "rating") {
      result.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    }

    return result;
  }, [
    products,
    searchQuery,
    selectedTeaTypes,
    selectedOrigins,
    selectedCaffeine,
    selectedWeights,
    selectedBenefits,
    maxPrice,
    sortBy,
  ]);

  // Wishlist toggle
  const toggleWishlist = (id: number | string) => {
    const product = products.find((item) => String(item.id) === String(id));
    if (!product) return;
    if (isInWishlist(id)) {
      removeFromWishlist(id);
    } else {
      addToWishlist(product);
    }
  };

  // Add to cart
  const addToCart = (id: number | string) => {
    const product = products.find((item) => String(item.id) === String(id));
    if (!product || addingId !== null || !isProductInStock(product)) return;

    const availableVariants = getProductAvailableVariants(product);
    const currentVariant =
      cardVariants[product.id] && availableVariants.some((v) => v.key === cardVariants[product.id])
        ? cardVariants[product.id]
        : (availableVariants[0]?.key ?? "100g");
    const activeVariantData = availableVariants.find((v) => v.key === currentVariant) ?? availableVariants[0];
    const finalPrice = activeVariantData ? activeVariantData.price : product.price;
    const finalOldPrice = activeVariantData ? activeVariantData.oldPrice : product.oldPrice;

    setAddingId(product.id);
    addProductToCart(product, 1, currentVariant, finalPrice, finalOldPrice);
    setAddingId(null);
    setAddedId(product.id);

    window.setTimeout(() => {
      setAddedId(null);
    }, 1500);
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSelectedTeaTypes([]);
    setSelectedOrigins([]);
    setSelectedCaffeine([]);
    setSelectedWeights([]);
    setSelectedBenefits([]);
    setMaxPrice(1500);
    setSearchQuery("");
    setSortBy("featured");
    setSearchParams({});
  };

  // Active filter count
  const activeFiltersCount =
    selectedTeaTypes.length +
    selectedOrigins.length +
    selectedCaffeine.length +
    selectedWeights.length +
    selectedBenefits.length +
    (maxPrice < 1500 ? 1 : 0) +
    (searchQuery.trim() ? 1 : 0);

  // Quick Filter Pill definitions
  const quickPills = [
    { label: "All Teas", type: "all" },
    { label: "Green Tea", type: "teaType", value: "Green" },
    { label: "White Tea", type: "teaType", value: "White" },
    { label: "Black Tea", type: "teaType", value: "Black" },
    { label: "Oolong Tea", type: "teaType", value: "Oolong" },
    { label: "Assam Tea", type: "origin", value: "Assam" },
    { label: "Darjeeling", type: "origin", value: "Darjeeling" },
    { label: "Low Caffeine", type: "caffeine", value: "Low" },
  ];

  const handleQuickPill = (pill: (typeof quickPills)[0]) => {
    if (pill.type === "all") {
      clearAllFilters();
    } else if (pill.type === "teaType" && pill.value) {
      setSelectedTeaTypes((prev) =>
        prev.includes(pill.value!) ? prev.filter((v) => v !== pill.value) : [...prev, pill.value!]
      );
    } else if (pill.type === "origin" && pill.value) {
      setSelectedOrigins((prev) =>
        prev.includes(pill.value!) ? prev.filter((v) => v !== pill.value) : [...prev, pill.value!]
      );
    } else if (pill.type === "caffeine" && pill.value) {
      setSelectedCaffeine((prev) =>
        prev.includes(pill.value!) ? prev.filter((v) => v !== pill.value) : [...prev, pill.value!]
      );
    }
  };

  const isQuickPillActive = (pill: (typeof quickPills)[0]) => {
    if (pill.type === "all") {
      return (
        selectedTeaTypes.length === 0 &&
        selectedOrigins.length === 0 &&
        selectedCaffeine.length === 0 &&
        selectedWeights.length === 0 &&
        selectedBenefits.length === 0 &&
        maxPrice === 1500 &&
        !searchQuery.trim()
      );
    }
    if (pill.type === "teaType" && pill.value) return selectedTeaTypes.includes(pill.value);
    if (pill.type === "origin" && pill.value) return selectedOrigins.includes(pill.value);
    if (pill.type === "caffeine" && pill.value) return selectedCaffeine.includes(pill.value);
    return false;
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Reusable filter content used in both Desktop Sidebar and Mobile Bottom Sheet
  const renderFilterSections = () => (
    <div className="leafly-filter-accordions">
      {/* 1. Tea Type */}
      <div className="filter-group">
        <button
          type="button"
          className="filter-group-header"
          onClick={() => toggleSection("teaType")}
          aria-expanded={openSections.teaType}
        >
          <span>Tea Type</span>
          <span className={`accordion-chevron ${openSections.teaType ? "open" : ""}`}>▾</span>
        </button>
        {openSections.teaType && (
          <div className="filter-options-list">
            {TEA_TYPES.map((type) => {
              const isChecked = selectedTeaTypes.includes(type.value);
              const count = counts.teaTypeCounts[type.value] ?? 0;
              return (
                <label key={type.value} className="filter-checkbox-item">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {
                      setSelectedTeaTypes((prev) =>
                        isChecked ? prev.filter((t) => t !== type.value) : [...prev, type.value]
                      );
                    }}
                  />
                  <span className="checkbox-custom" />
                  <span className="filter-label-text">{type.label}</span>
                  <span className="filter-count">({count})</span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Origin */}
      <div className="filter-group">
        <button
          type="button"
          className="filter-group-header"
          onClick={() => toggleSection("origin")}
          aria-expanded={openSections.origin}
        >
          <span>Origin</span>
          <span className={`accordion-chevron ${openSections.origin ? "open" : ""}`}>▾</span>
        </button>
        {openSections.origin && (
          <div className="filter-options-list">
            {ORIGIN_OPTIONS.map((origin) => {
              const isChecked = selectedOrigins.includes(origin);
              const count = counts.originCounts[origin] ?? 0;
              return (
                <label key={origin} className="filter-checkbox-item">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {
                      setSelectedOrigins((prev) =>
                        isChecked ? prev.filter((o) => o !== origin) : [...prev, origin]
                      );
                    }}
                  />
                  <span className="checkbox-custom" />
                  <span className="filter-label-text">{origin}</span>
                  <span className="filter-count">({count})</span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Caffeine Level */}
      <div className="filter-group">
        <button
          type="button"
          className="filter-group-header"
          onClick={() => toggleSection("caffeine")}
          aria-expanded={openSections.caffeine}
        >
          <span>Caffeine Level</span>
          <span className={`accordion-chevron ${openSections.caffeine ? "open" : ""}`}>▾</span>
        </button>
        {openSections.caffeine && (
          <div className="filter-options-list">
            {CAFFEINE_LEVELS.map((level) => {
              const isChecked = selectedCaffeine.includes(level);
              const count = counts.caffeineCounts[level] ?? 0;
              return (
                <label key={level} className="filter-checkbox-item">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {
                      setSelectedCaffeine((prev) =>
                        isChecked ? prev.filter((c) => c !== level) : [...prev, level]
                      );
                    }}
                  />
                  <span className="checkbox-custom" />
                  <span className="filter-label-text">{level}</span>
                  <span className="filter-count">({count})</span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Price Range */}
      <div className="filter-group">
        <button
          type="button"
          className="filter-group-header"
          onClick={() => toggleSection("price")}
          aria-expanded={openSections.price}
        >
          <span>Price Range</span>
          <span className={`accordion-chevron ${openSections.price ? "open" : ""}`}>▾</span>
        </button>
        {openSections.price && (
          <div className="filter-price-box">
            <div className="price-range-label">
              <span>₹0 - ₹{maxPrice}</span>
            </div>
            <input
              type="range"
              min="200"
              max="1500"
              step="50"
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="leafly-range-slider"
              aria-label="Filter maximum price"
            />
            <div className="price-range-endpoints">
              <span>₹0</span>
              <span>₹1500</span>
            </div>
          </div>
        )}
      </div>

      {/* 5. Available Weights */}
      <div className="filter-group">
        <button
          type="button"
          className="filter-group-header"
          onClick={() => toggleSection("weights")}
          aria-expanded={openSections.weights}
        >
          <span>Available Weights</span>
          <span className={`accordion-chevron ${openSections.weights ? "open" : ""}`}>▾</span>
        </button>
        {openSections.weights && (
          <div className="filter-options-list">
            {WEIGHT_OPTIONS.map((weight) => {
              const isChecked = selectedWeights.includes(weight);
              const count = counts.weightCounts[weight] ?? 0;
              return (
                <label key={weight} className="filter-checkbox-item">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {
                      setSelectedWeights((prev) =>
                        isChecked ? prev.filter((w) => w !== weight) : [...prev, weight]
                      );
                    }}
                  />
                  <span className="checkbox-custom" />
                  <span className="filter-label-text">{weight}</span>
                  <span className="filter-count">({count})</span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. Benefits */}
      <div className="filter-group">
        <button
          type="button"
          className="filter-group-header"
          onClick={() => toggleSection("benefits")}
          aria-expanded={openSections.benefits}
        >
          <span>Benefits</span>
          <span className={`accordion-chevron ${openSections.benefits ? "open" : ""}`}>▾</span>
        </button>
        {openSections.benefits && (
          <div className="filter-options-list">
            {BENEFIT_OPTIONS.map((benefit) => {
              const isChecked = selectedBenefits.includes(benefit);
              const count = counts.benefitCounts[benefit] ?? 0;
              return (
                <label key={benefit} className="filter-checkbox-item">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {
                      setSelectedBenefits((prev) =>
                        isChecked ? prev.filter((b) => b !== benefit) : [...prev, benefit]
                      );
                    }}
                  />
                  <span className="checkbox-custom" />
                  <span className="filter-label-text">{benefit}</span>
                  <span className="filter-count">({count})</span>
                </label>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <main className="leafly-shop-page">
      <SEO
        title="Shop Premium Loose Leaf Teas | Single Origin Tea Collection | Leafly"
        description="Explore single-origin loose leaf green tea, black tea, white tea, and artisan oolong from Darjeeling and Assam. Handcrafted small batches delivered fresh across India."
        canonicalPath="/shop"
        schema={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Shop", url: "/shop" },
        ])}
      />

      {/* =====================================================
          1. EDITORIAL SHOP HERO
          ===================================================== */}
      <section className="shop-ref-hero">
        <div
          className="shop-ref-hero-bg"
          style={{ backgroundImage: `url(${teaPlantationHero})` }}
          aria-hidden="true"
        />
        <div className="shop-ref-hero-overlay" aria-hidden="true" />

        <div className="shop-ref-hero-content">
          <div className="hero-text-col">
            <h1 className="shop-ref-hero-title">Shop Our Teas</h1>
            <p className="shop-ref-hero-subtitle">
              Pure leaves, Authentic origins. A better you.
            </p>

            <div className="shop-ref-hero-badges">
              <div className="hero-benefit-badge">
                <span className="badge-icon">🍃</span>
                <span>100% Natural</span>
              </div>
              <div className="hero-benefit-badge">
                <span className="badge-icon">🍵</span>
                <span>Sustainably Sourced</span>
              </div>
              <div className="hero-benefit-badge">
                <span className="badge-icon">🌿</span>
                <span>Rich in Antioxidants</span>
              </div>
              <div className="hero-benefit-badge">
                <span className="badge-icon">🌍</span>
                <span>Globally Inspired</span>
              </div>
            </div>
          </div>

          <div className="hero-script-col" aria-hidden="true">
            <div className="hero-script-watermark">
              Good Tea
              <br />
              <span className="script-indent">Better Days</span>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          2. QUICK CATEGORY PILLS & INTEGRATED SEARCH
          ===================================================== */}
      <section className="shop-quick-bar-wrapper">
        <div className="shop-quick-bar-container">
          <div className="quick-filter-pills" role="tablist" aria-label="Quick category filters">
            {quickPills.map((pill) => {
              const active = isQuickPillActive(pill);
              return (
                <button
                  key={pill.label}
                  type="button"
                  className={`quick-pill ${active ? "active" : ""}`}
                  onClick={() => handleQuickPill(pill)}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>

          <form
            className="quick-search-form"
            onSubmit={(e) => {
              e.preventDefault();
            }}
          >
            <div className="quick-search-box">
              <input
                type="text"
                placeholder="Search for teas, origins or benefits..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search teas"
                className="quick-search-input"
              />
              <button
                type="submit"
                className="quick-search-btn"
                aria-label="Search"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* =====================================================
          3. MAIN SHOP LAYOUT: SIDEBAR + PRODUCT GRID
          ===================================================== */}
      <section className="shop-main-layout">
        <div className="shop-main-container">
          {/* DESKTOP FILTER SIDEBAR */}
          <aside className="shop-filter-sidebar" aria-label="Product filters">
            <div className="filter-sidebar-header">
              <h2 className="filter-sidebar-title">Filters</h2>
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  className="filter-clear-all-btn"
                  onClick={clearAllFilters}
                >
                  Clear All
                </button>
              )}
            </div>

            {renderFilterSections()}
          </aside>

          {/* MAIN PRODUCT AREA */}
          <div className="shop-content-area">
            {/* TOOLBAR */}
            <div className="shop-toolbar-row">
              <div className="toolbar-left">
                {/* Mobile Filter Toggle Button */}
                <button
                  type="button"
                  className="mobile-filter-trigger-btn"
                  onClick={() => setIsMobileFilterOpen(true)}
                  aria-label="Open filter menu"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="4" y1="21" x2="4" y2="14" />
                    <line x1="4" y1="10" x2="4" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12" y2="3" />
                    <line x1="20" y1="21" x2="20" y2="16" />
                    <line x1="20" y1="12" x2="20" y2="3" />
                    <line x1="1" y1="14" x2="7" y2="14" />
                    <line x1="9" y1="8" x2="15" y2="8" />
                    <line x1="17" y1="16" x2="23" y2="16" />
                  </svg>
                  <span>Filters {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ""}</span>
                </button>

                <span className="results-counter">
                  Showing <strong>{filteredProducts.length}</strong> of {products.length} teas
                </span>
              </div>

              {/* Active Filter Chips */}
              <div className="toolbar-center-chips" aria-label="Active filters">
                {selectedTeaTypes.map((type) => (
                  <button
                    key={type}
                    type="button"
                    className="active-filter-chip"
                    onClick={() => setSelectedTeaTypes((prev) => prev.filter((t) => t !== type))}
                  >
                    <span>{type} Tea</span>
                    <span className="chip-remove">×</span>
                  </button>
                ))}

                {selectedOrigins.map((origin) => (
                  <button
                    key={origin}
                    type="button"
                    className="active-filter-chip"
                    onClick={() => setSelectedOrigins((prev) => prev.filter((o) => o !== origin))}
                  >
                    <span>{origin}</span>
                    <span className="chip-remove">×</span>
                  </button>
                ))}

                {selectedCaffeine.map((caff) => (
                  <button
                    key={caff}
                    type="button"
                    className="active-filter-chip"
                    onClick={() => setSelectedCaffeine((prev) => prev.filter((c) => c !== caff))}
                  >
                    <span>{caff} Caffeine</span>
                    <span className="chip-remove">×</span>
                  </button>
                ))}

                {selectedWeights.map((weight) => (
                  <button
                    key={weight}
                    type="button"
                    className="active-filter-chip"
                    onClick={() => setSelectedWeights((prev) => prev.filter((w) => w !== weight))}
                  >
                    <span>{weight}</span>
                    <span className="chip-remove">×</span>
                  </button>
                ))}

                {selectedBenefits.map((benefit) => (
                  <button
                    key={benefit}
                    type="button"
                    className="active-filter-chip"
                    onClick={() => setSelectedBenefits((prev) => prev.filter((b) => b !== benefit))}
                  >
                    <span>{benefit}</span>
                    <span className="chip-remove">×</span>
                  </button>
                ))}

                {maxPrice < 1500 && (
                  <button
                    type="button"
                    className="active-filter-chip"
                    onClick={() => setMaxPrice(1500)}
                  >
                    <span>₹0 – ₹{maxPrice}</span>
                    <span className="chip-remove">×</span>
                  </button>
                )}

                {searchQuery.trim() && (
                  <button
                    type="button"
                    className="active-filter-chip"
                    onClick={() => setSearchQuery("")}
                  >
                    <span>&ldquo;{searchQuery}&rdquo;</span>
                    <span className="chip-remove">×</span>
                  </button>
                )}

                {activeFiltersCount > 1 && (
                  <button
                    type="button"
                    className="active-clear-all-link"
                    onClick={clearAllFilters}
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Sort and View controls */}
              <div className="toolbar-right">
                <div className="sort-dropdown-wrap">
                  <label htmlFor="shop-sort-select" className="sort-label">Sort by</label>
                  <select
                    id="shop-sort-select"
                    className="shop-sort-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    aria-label="Sort teas"
                  >
                    <option value="featured">Featured</option>
                    <option value="popular">Popular</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="name-asc">Name: A to Z</option>
                    <option value="rating">Top Rated</option>
                  </select>
                </div>

                <div className="view-mode-toggles" role="group" aria-label="View mode">
                  <button
                    type="button"
                    className={`view-toggle-btn ${viewMode === "grid" ? "active" : ""}`}
                    onClick={() => setViewMode("grid")}
                    aria-label="Grid view"
                    title="Grid view"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="3" y="3" width="7" height="7" rx="1" />
                      <rect x="14" y="3" width="7" height="7" rx="1" />
                      <rect x="14" y="14" width="7" height="7" rx="1" />
                      <rect x="3" y="14" width="7" height="7" rx="1" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className={`view-toggle-btn ${viewMode === "list" ? "active" : ""}`}
                    onClick={() => setViewMode("list")}
                    aria-label="List view"
                    title="List view"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="4" y1="6" x2="20" y2="6" />
                      <line x1="4" y1="12" x2="20" y2="12" />
                      <line x1="4" y1="18" x2="20" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* PRODUCT GRID / LIST */}
            <div className={`shop-product-grid ${viewMode === "list" ? "is-list-view" : ""}`}>
              {filteredProducts.map((product, index) => {
                const isWishlisted = isInWishlist(product.id);
                const isAdding = addingId === product.id;
                const isAdded = addedId === product.id;
                const inStock = isProductInStock(product);
                const availableVariants = getProductAvailableVariants(product);
                const currentVariant =
                  cardVariants[product.id] && availableVariants.some((v) => v.key === cardVariants[product.id])
                    ? cardVariants[product.id]
                    : (availableVariants[0]?.key ?? "100g");
                const activeVariantData =
                  availableVariants.find((v) => v.key === currentVariant) ?? availableVariants[0];
                const displayPrice = activeVariantData ? activeVariantData.price : product.price;
                const displayOldPrice = activeVariantData ? activeVariantData.oldPrice : product.oldPrice;
                const hasDiscount = displayOldPrice && displayOldPrice > displayPrice;
                const discountPercent = hasDiscount
                  ? Math.round(((displayOldPrice - displayPrice) / displayOldPrice) * 100)
                  : 0;

                const badgeClass = !inStock
                  ? "badge-out-of-stock"
                  : product.badge
                  ? `badge-${product.badge.toLowerCase().replace(/\s+/g, "-")}`
                  : "badge-standard";

                return (
                  <article
                    className={`ref-product-card ${!inStock ? "is-out-of-stock" : ""}`}
                    key={product.id}
                  >
                    {/* CARD IMAGE CONTAINER */}
                    <div className="card-image-box">
                      <img
                        src={product.image}
                        alt={`Leafly ${product.name} - ${product.origin} ${product.category} tea`}
                        className="card-main-image"
                        onClick={() => navigate(`/shop/${getProductSlug(product)}`)}
                        loading={index < 4 ? "eager" : "lazy"}
                        decoding="async"
                        {...(index < 2 ? { fetchPriority: "high" as const } : {})}
                      />

                      {/* BADGE */}
                      {!inStock ? (
                        <span className="card-floating-badge badge-out-of-stock">
                          OUT OF STOCK
                        </span>
                      ) : product.badge ? (
                        <span className={`card-floating-badge ${badgeClass}`}>
                          {product.badge.toUpperCase()}
                        </span>
                      ) : null}

                      {/* FLOATING WISHLIST BUTTON */}
                      <button
                        type="button"
                        className={`card-wishlist-btn ${isWishlisted ? "active" : ""}`}
                        aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                        aria-pressed={isWishlisted}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWishlist(product.id);
                        }}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill={isWishlisted ? "#e53e3e" : "none"}
                          stroke={isWishlisted ? "#e53e3e" : "#0b2b1e"}
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                      </button>
                    </div>

                    {/* CARD CONTENT */}
                    <div className="card-body">
                      <p className="card-origin-category">
                        {product.origin.toUpperCase()} · {product.category.toUpperCase()} TEA
                      </p>

                      <h3
                        className="card-product-title"
                        onClick={() => navigate(`/shop/${getProductSlug(product)}`)}
                      >
                        {product.name}
                      </h3>

                      {/* WEIGHT VARIANT BUTTONS */}
                      <div className="card-weight-selector" role="group" aria-label="Available weights">
                        {availableVariants.map((v) => (
                          <button
                            key={v.key}
                            type="button"
                            className={`card-weight-pill ${currentVariant === v.key ? "active" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setCardVariants((prev) => ({ ...prev, [product.id]: v.key }));
                            }}
                          >
                            {v.weight}
                          </button>
                        ))}
                      </div>

                      {/* SPECIFICATION LINE */}
                      <p className="card-specs-line">
                        {currentVariant} · {product.caffeine} Caffeine
                      </p>

                      {/* RATING ROW */}
                      <div
                        className="card-rating-row"
                        aria-label={`${(product.rating ?? 4.9).toFixed(1)} out of 5 stars`}
                      >
                        <span className="card-stars" aria-hidden="true">★★★★★</span>
                        <span className="card-rating-val">{(product.rating ?? 4.9).toFixed(1)}</span>
                        <span className="card-review-count">({product.reviewCount ?? 120})</span>
                      </div>

                      {/* PRICE ROW */}
                      <div className="card-price-row">
                        <strong className="card-price-current">
                          ₹{displayPrice.toLocaleString("en-IN")}
                        </strong>

                        {hasDiscount && (
                          <>
                            <del className="card-price-old">
                              ₹{displayOldPrice.toLocaleString("en-IN")}
                            </del>
                            <span className="card-discount-tag">
                              {discountPercent}% OFF
                            </span>
                          </>
                        )}
                      </div>

                      {/* ACTIONS ROW */}
                      <div className="card-actions-row">
                        <button
                          type="button"
                          className="card-btn-details"
                          onClick={() => navigate(`/shop/${getProductSlug(product)}`)}
                        >
                          Details
                        </button>

                        {(() => {
                          if (!inStock) {
                            return (
                              <button
                                type="button"
                                className="card-btn-cart disabled out-of-stock"
                                disabled
                                aria-disabled="true"
                              >
                                OUT OF STOCK
                              </button>
                            );
                          }

                          const cartItem = items.find(
                            (item) =>
                              item.id === `${product.id}-${currentVariant}` ||
                              (item.product.id === product.id && item.variant === currentVariant)
                          );
                          const currentQty = cartItem?.quantity || 0;

                          if (currentQty > 0) {
                            return (
                              <div className="card-qty-stepper" aria-label={`Quantity in cart: ${currentQty}`}>
                                <button
                                  type="button"
                                  className="card-qty-btn dec"
                                  aria-label="Decrease quantity"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (cartItem) decreaseQuantity(cartItem.id);
                                  }}
                                >
                                  −
                                </button>
                                <span className="card-qty-num">{currentQty}</span>
                                <button
                                  type="button"
                                  className="card-qty-btn inc"
                                  aria-label="Increase quantity"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (cartItem) increaseQuantity(cartItem.id);
                                  }}
                                >
                                  +
                                </button>
                              </div>
                            );
                          }

                          return (
                            <button
                              type="button"
                              className={`card-btn-cart ${isAdded ? "added" : ""}`}
                              disabled={isAdding}
                              onClick={() => addToCart(product.id)}
                            >
                              {isAdding ? (
                                <>
                                  <span className="cart-spinner" />
                                  Adding...
                                </>
                              ) : isAdded ? (
                                <>
                                  Added ✓
                                </>
                              ) : (
                                <>
                                  Add to Cart
                                  <span className="cart-btn-icon">🛒</span>
                                </>
                              )}
                            </button>
                          );
                        })()}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* EMPTY STATE */}
            {filteredProducts.length === 0 && (
              <div className="shop-empty-state">
                <span className="empty-symbol">✦</span>
                <h3>No teas found matching your filters</h3>
                <p>Try clearing some filters or searching with a different term.</p>
                <button
                  type="button"
                  className="empty-reset-btn"
                  onClick={clearAllFilters}
                >
                  Reset All Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* =====================================================
          4. BOTTOM TRUST & PROMISES ROW (MATCHING REFERENCE)
          ===================================================== */}
      <section className="shop-trust-bar">
        <div className="shop-trust-container">
          <div className="shop-trust-item">
            <div className="shop-trust-icon-box">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="1" y="3" width="15" height="13" rx="2" />
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
            </div>
            <div className="shop-trust-info">
              <strong>Free Shipping</strong>
              <p>On orders above ₹999</p>
            </div>
          </div>

          <div className="shop-trust-item">
            <div className="shop-trust-icon-box">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div className="shop-trust-info">
              <strong>Secure Payments</strong>
              <p>UPI, Cards, Net Banking</p>
            </div>
          </div>

          <div className="shop-trust-item">
            <div className="shop-trust-icon-box">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <polyline points="9 12 11 14 15 10" />
              </svg>
            </div>
            <div className="shop-trust-info">
              <strong>Quality Assured</strong>
              <p>Lab Tested & Certified</p>
            </div>
          </div>

          <div className="shop-trust-item">
            <div className="shop-trust-icon-box">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
            </div>
            <div className="shop-trust-info">
              <strong>Easy Returns</strong>
              <p>Hassle Free</p>
            </div>
          </div>

          <div className="shop-trust-item shop-trust-brand">
            <span className="shop-trust-leaf" aria-hidden="true">🍃</span>
            <div className="shop-trust-info">
              <strong>A Healthier Tomorrow</strong>
              <p>Pure Indian Living</p>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          5. MOBILE FILTER DRAWER (SLIDE-UP BOTTOM SHEET)
          ===================================================== */}
      {isMobileFilterOpen && (
        <div
          className="mobile-drawer-backdrop"
          onClick={() => setIsMobileFilterOpen(false)}
          role="presentation"
        >
          <div
            className="mobile-drawer-sheet"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Filter products"
          >
            <div className="mobile-drawer-handle" />

            <div className="mobile-drawer-header">
              <h3>Filters</h3>
              <div className="mobile-drawer-header-actions">
                {activeFiltersCount > 0 && (
                  <button
                    type="button"
                    className="drawer-clear-btn"
                    onClick={clearAllFilters}
                  >
                    Clear All
                  </button>
                )}
                <button
                  type="button"
                  className="drawer-close-btn"
                  onClick={() => setIsMobileFilterOpen(false)}
                  aria-label="Close filters"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="mobile-drawer-content">
              {renderFilterSections()}
            </div>

            <div className="mobile-drawer-footer">
              <button
                type="button"
                className="mobile-drawer-apply-btn"
                onClick={() => setIsMobileFilterOpen(false)}
              >
                Apply Filters ({filteredProducts.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          6. QUICK VIEW / PRODUCT DETAIL MODAL
          ===================================================== */}
      {selectedProduct && (
        <div
          className="product-detail-overlay"
          onClick={() => setSelectedProduct(null)}
          role="presentation"
        >
          <div
            className="product-detail-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedProduct.name} details`}
          >
            <button
              type="button"
              className="product-detail-close"
              aria-label="Close product details"
              onClick={() => setSelectedProduct(null)}
            >
              ×
            </button>

            <div className="product-detail-image">
              <img src={selectedProduct.image} alt={selectedProduct.name} />
              {selectedProduct.badge && (
                <span className={`card-floating-badge badge-${selectedProduct.badge.toLowerCase().replace(/\s+/g, "-")}`}>
                  {selectedProduct.badge.toUpperCase()}
                </span>
              )}
            </div>

            <div className="product-detail-content">
              <p className="product-detail-meta">
                {selectedProduct.origin} · {selectedProduct.category} Tea
              </p>

              <h2>{selectedProduct.name}</h2>

              <p className="product-detail-description">
                A carefully selected {selectedProduct.category.toLowerCase()} tea from {selectedProduct.origin}, chosen for character, freshness and a memorable tea-drinking ritual.
              </p>

              {(() => {
                const modalAvailableVariants = getProductAvailableVariants(selectedProduct);
                const activeModalVariant = modalAvailableVariants.some((v) => v.key === modalVariant)
                  ? modalVariant
                  : (modalAvailableVariants[0]?.key ?? "100g");
                const activeModalVariantData =
                  modalAvailableVariants.find((v) => v.key === activeModalVariant) ?? modalAvailableVariants[0];
                const modalPrice = activeModalVariantData ? activeModalVariantData.price : selectedProduct.price;
                const modalOldPrice = activeModalVariantData ? activeModalVariantData.oldPrice : selectedProduct.oldPrice;

                return (
                  <>
                    <div className="product-detail-variants">
                      <span className="product-detail-variant-label">SELECT QUANTITY / WEIGHT</span>
                      <div className="product-detail-variant-buttons" role="radiogroup" aria-label="Quantity options">
                        {modalAvailableVariants.map((v) => (
                          <button
                            key={v.key}
                            type="button"
                            className={`product-variant-btn ${activeModalVariant === v.key ? "active" : ""}`}
                            onClick={() => setModalVariant(v.key)}
                            role="radio"
                            aria-checked={activeModalVariant === v.key}
                          >
                            {v.weight}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="product-detail-specs">
                      <div>
                        <span>ORIGIN</span>
                        <strong>{selectedProduct.origin}</strong>
                      </div>
                      <div>
                        <span>TEA TYPE</span>
                        <strong>{selectedProduct.category}</strong>
                      </div>
                      <div>
                        <span>WEIGHT</span>
                        <strong>{activeModalVariant}</strong>
                      </div>
                      <div>
                        <span>CAFFEINE</span>
                        <strong>{selectedProduct.caffeine}</strong>
                      </div>
                    </div>

                    <div className="product-detail-price">
                      <strong>₹{modalPrice.toLocaleString("en-IN")}</strong>
                      {modalOldPrice && <del>₹{modalOldPrice.toLocaleString("en-IN")}</del>}
                    </div>

                    <button
                      type="button"
                      className="product-detail-cart"
                      onClick={() => {
                        addProductToCart(
                          selectedProduct,
                          1,
                          activeModalVariant,
                          modalPrice,
                          modalOldPrice
                        );
                        setSelectedProduct(null);
                      }}
                    >
                      ADD TO CART
                      <span>🛒</span>
                    </button>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          7. FLOATING CART & BACK TO TOP
          ===================================================== */}
      {cartCount > 0 && (
        <button
          type="button"
          className="floating-cart"
          aria-label={`${cartCount} teas in cart`}
          onClick={openCart}
        >
          <span className="floating-cart-icon">🛒</span>
          <span>{cartCount} {cartCount === 1 ? "tea" : "teas"} in cart</span>
          <span className="floating-cart-leaf" aria-hidden="true">❧</span>
        </button>
      )}

      {showBackToTop && (
        <button
          type="button"
          className="back-to-top"
          onClick={scrollToTop}
          aria-label="Back to top"
          title="Back to top"
        >
          <span aria-hidden="true">❧</span>
          <small>TOP</small>
        </button>
      )}

      <Footer />
    </main>
  );
}