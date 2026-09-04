import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { type Product, type ProductVariantKey, getProductSlug, isProductInStock } from "../data/products";
import { useTeaware } from "../context/TeawareContext";
import { useGifting } from "../context/GiftingContext";
import { useProducts } from "../context/ProductContext";
import Footer from "../components/Footer";
import SEO from "../components/SEO";
import { generateProductSchema, generateTeawareSchema, generateBreadcrumbSchema } from "../lib/seoData";
import "./ProductDetail.css";

export default function ProductDetail() {
  const { slug, id } = useParams<{ slug?: string; id?: string }>();
  const navigate = useNavigate();
  const { products } = useProducts();
  const { teaware } = useTeaware();
  const { hampers } = useGifting();

  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();

  const [selectedVariant, setSelectedVariant] = useState<ProductVariantKey>("100g");
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

  const identifier = (slug || id || "").toLowerCase().trim();

  const teawareItem = teaware.find(
    (t) => getProductSlug(t) === identifier || String(t.id) === identifier
  );

  const hamperItem = hampers.find(
    (h) => getProductSlug(h) === identifier || String(h.id) === identifier
  );

  const product: Product | undefined =
    products.find(
      (p) => getProductSlug(p) === identifier || String(p.id) === identifier
    ) ||
    (teawareItem
      ? {
          id: teawareItem.id,
          name: teawareItem.name,
          category: "Teaware" as unknown as Product["category"],
          origin: teawareItem.material || "Artisan Craft",
          caffeine: "Teaware" as unknown as Product["caffeine"],
          weight: teawareItem.capacity || "1 Unit",
          price: Number(teawareItem.price) || 0,
          oldPrice: teawareItem.oldPrice ? Number(teawareItem.oldPrice) : undefined,
          badge: teawareItem.badge || "Ceremonial",
          image: teawareItem.image,
          variants: {
            "100g": {
              weight: teawareItem.capacity || "Standard",
              price: Number(teawareItem.price) || 0,
              oldPrice: teawareItem.oldPrice ? Number(teawareItem.oldPrice) : undefined,
            },
            "250g": {
              weight: teawareItem.capacity || "Standard",
              price: Number(teawareItem.price) || 0,
              oldPrice: teawareItem.oldPrice ? Number(teawareItem.oldPrice) : undefined,
            },
          },
          rating: teawareItem.rating,
          reviewCount: teawareItem.reviewCount,
          description: teawareItem.description,
          stock: typeof teawareItem.stock === "number" ? teawareItem.stock : 10,
          inStock: teawareItem.inStock !== false && (typeof teawareItem.stock !== "number" || teawareItem.stock > 0),
        }
      : hamperItem
      ? {
          id: hamperItem.id,
          name: hamperItem.name,
          category: "Gifting" as unknown as Product["category"],
          origin: "Curated Estate Blend",
          caffeine: "Varied" as unknown as Product["caffeine"],
          weight: "Gift Box",
          price: Number(hamperItem.price) || 0,
          oldPrice: hamperItem.oldPrice ? Number(hamperItem.oldPrice) : undefined,
          badge: hamperItem.badge || "Luxury Gift Set",
          image: hamperItem.image,
          variants: {
            "100g": {
              weight: "Gift Box",
              price: Number(hamperItem.price) || 0,
              oldPrice: hamperItem.oldPrice ? Number(hamperItem.oldPrice) : undefined,
            },
            "250g": {
              weight: "Gift Box",
              price: Number(hamperItem.price) || 0,
              oldPrice: hamperItem.oldPrice ? Number(hamperItem.oldPrice) : undefined,
            },
          },
          description: hamperItem.description || hamperItem.subtitle,
          stock: typeof hamperItem.stock === "number" ? hamperItem.stock : 10,
          inStock: hamperItem.inStock !== false && (typeof hamperItem.stock !== "number" || hamperItem.stock > 0),
        }
      : undefined);

  /* --- product not found ----------------------------------- */

  if (!product) {
    return (
      <main className="product-detail-page">
        <div className="pdp-not-found">
          <div className="pdp-not-found-mark" aria-hidden="true">
            ❧
          </div>
          <h1>Tea Not Found</h1>
          <p>We couldn&apos;t find this tea in our collection.</p>
          <button
            type="button"
            className="pdp-not-found-button"
            onClick={() => navigate("/shop")}
          >
            BROWSE ALL TEAS
          </button>
        </div>
        <Footer />
      </main>
    );
  }

  /* --- variant pricing & details ---------------------------- */

  const inStock = isProductInStock(product);

  const currentVariantData = product.variants
    ? product.variants[selectedVariant]
    : {
        weight: selectedVariant,
        price:
          selectedVariant === "250g"
            ? Math.round(product.price * 2.2)
            : product.price,
        oldPrice:
          selectedVariant === "250g" && product.oldPrice
            ? Math.round(product.oldPrice * 2.2)
            : product.oldPrice,
      };

  const currentPrice = currentVariantData.price;
  const currentOldPrice = currentVariantData.oldPrice;
  const currentWeight = currentVariantData.weight;

  const wishlisted = isInWishlist(product.id);

  const handleAddToCart = () => {
    if (addingToCart || !inStock) return;
    setAddingToCart(true);

    addToCart(
      product,
      quantity,
      selectedVariant,
      currentPrice,
      currentOldPrice
    );
    setAddingToCart(false);
    setAddedToCart(true);

    window.setTimeout(() => setAddedToCart(false), 1500);
  };

  const handleBuyNow = () => {
    if (!inStock) return;
    addToCart(
      product,
      quantity,
      selectedVariant,
      currentPrice,
      currentOldPrice
    );
    navigate("/checkout");
  };

  const handleWishlistToggle = () => {
    if (wishlisted) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product);
    }
  };

  const savings = currentOldPrice
    ? Math.round(((currentOldPrice - currentPrice) / currentOldPrice) * 100)
    : null;

  /* --- render ---------------------------------------------- */

  const isTeaware = Boolean(teawareItem);
  const canonicalPath = isTeaware
    ? `/teaware/${getProductSlug(product)}`
    : `/shop/${getProductSlug(product)}`;

  const pageTitle = isTeaware
    ? `${product.name} | Artisan Teaware | Leafly`
    : `${product.name} | Premium ${product.category} Tea | Leafly`;

  const pageDescription = product.description
    ? product.description
    : isTeaware
    ? `Discover ${product.name}, a handcrafted teaware piece from Leafly. Crafted from ${teawareItem?.material || "artisanal materials"} for mindful tea rituals.`
    : `Discover ${product.name}, a premium single-origin ${product.category} tea from ${product.origin} by Leafly. Hand-harvested whole leaves crafted for mindful brewing moments. Available in 100g and 250g tins.`;

  const breadcrumbs = isTeaware
    ? [
        { name: "Home", url: "/" },
        { name: "Teaware", url: "/teaware" },
        { name: product.name, url: canonicalPath },
      ]
    : [
        { name: "Home", url: "/" },
        { name: "Shop", url: "/shop" },
        {
          name: `${product.category} Tea`,
          url: `/collections/${product.category.toLowerCase()}-tea`,
        },
        { name: product.name, url: canonicalPath },
      ];

  const productSchema = isTeaware && teawareItem
    ? generateTeawareSchema(teawareItem, canonicalPath)
    : generateProductSchema(product, canonicalPath);

  const breadcrumbSchema = generateBreadcrumbSchema(breadcrumbs);

  return (
    <main className="product-detail-page">
      <SEO
        title={pageTitle}
        description={pageDescription}
        canonicalPath={canonicalPath}
        image={product.image}
        type="product"
        schema={[productSchema, breadcrumbSchema]}
      />
      {/* HEADER / BREADCRUMB */}

      <div className="pdp-header">
        <button
          type="button"
          className="pdp-back"
          onClick={() => navigate(isTeaware ? "/teaware" : "/shop")}
          aria-label="Back to collection"
        >
          ← BACK TO {isTeaware ? "TEAWARE" : "SHOP"}
        </button>

        <div className="pdp-breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <span>/</span>
          <Link to={isTeaware ? "/teaware" : "/shop"}>
            {isTeaware ? "Teaware" : "Shop"}
          </Link>
          <span>/</span>
          <strong>{product.name}</strong>
        </div>
      </div>

      {/* MAIN CONTENT GRID */}

      <div className="pdp-layout">
        {/* IMAGE */}

        <div className="pdp-image-wrap">
          <img
            src={product.image}
            alt={`Leafly ${product.name} - ${isTeaware ? teawareItem?.material : `${product.origin} ${product.category} Tea`}`}
            className="pdp-image"
            loading="eager"
            fetchPriority="high"
            decoding="async"
          />
          {!inStock ? (
            <span className="pdp-badge out-of-stock" style={{ background: "#c53030", color: "#ffffff" }}>
              Out of Stock
            </span>
          ) : (
            <span
              className={`pdp-badge ${isTeaware ? "coming-soon" : product.badge ? product.badge.toLowerCase() : ""}`}
            >
              {isTeaware ? "Coming Soon" : product.badge}
            </span>
          )}
        </div>

        {/* PRODUCT INFO */}

        <div className="pdp-info">
          <p className="pdp-eyebrow">
            <span aria-hidden="true">✦</span>
            {isTeaware
              ? `${teawareItem?.material} · ${teawareItem?.category}`
              : `${product.origin} · ${product.category} Tea`}
          </p>

          <h1 className="pdp-name">{product.name}</h1>

          {/* RATING ROW */}
          <div
            className="pdp-rating-row"
            aria-label={`${(product.rating ?? 4.9).toFixed(1)} out of 5 stars based on ${product.reviewCount ?? 128} reviews`}
          >
            <div className="pdp-stars" aria-hidden="true">
              ★★★★★
            </div>
            <span className="pdp-rating-score">
              {(product.rating ?? 4.9).toFixed(1)}
            </span>
            <span className="pdp-rating-sep">·</span>
            <span className="pdp-review-count">
              {product.reviewCount ?? 128} Reviews
            </span>
          </div>

          <p className="pdp-description">
            {product.description ||
              (isTeaware
                ? teawareItem?.description
                : `A carefully selected ${product.category.toLowerCase()} tea from ${product.origin}, chosen for character, freshness and a memorable tea-drinking ritual.`)}
          </p>

          {inStock ? (
            <div className="pdp-stock-status">
              <span className="pdp-stock-dot">●</span>
              <span>In Stock · Handcrafted & Freshly Packed</span>
            </div>
          ) : (
            <div className="pdp-stock-status out" style={{ color: "#c53030" }}>
              <span className="pdp-stock-dot" style={{ color: "#e53e3e" }}>●</span>
              <span>Currently Out of Stock · Fresh Harvest Arriving Soon</span>
            </div>
          )}

          <div className="pdp-divider" aria-hidden="true">
            <span />
            <b>◈</b>
            <span />
          </div>

          {/* QUANTITY / WEIGHT VARIANT SELECTOR (TEA ONLY) */}
          {!isTeaware && (
            <div className="pdp-variant-section">
              <span className="pdp-variant-title">SELECT WEIGHT / VARIANT</span>
              <div
                className="pdp-variant-buttons"
                role="radiogroup"
                aria-label="Quantity options"
              >
                <button
                  type="button"
                  className={`pdp-variant-btn ${selectedVariant === "100g" ? "active" : ""}`}
                  onClick={() => setSelectedVariant("100g")}
                  role="radio"
                  aria-checked={selectedVariant === "100g"}
                >
                  100g
                </button>
                <button
                  type="button"
                  className={`pdp-variant-btn ${selectedVariant === "250g" ? "active" : ""}`}
                  onClick={() => setSelectedVariant("250g")}
                  role="radio"
                  aria-checked={selectedVariant === "250g"}
                >
                  250g
                </button>
              </div>
            </div>
          )}

          {/* SPECS */}
          <div className="pdp-specs">
            {isTeaware ? (
              <>
                <div className="pdp-spec">
                  <span>MATERIAL</span>
                  <strong>{teawareItem?.material}</strong>
                </div>
                <div className="pdp-spec">
                  <span>CATEGORY</span>
                  <strong>{teawareItem?.category}</strong>
                </div>
                <div className="pdp-spec">
                  <span>CAPACITY</span>
                  <strong>{teawareItem?.capacity || "Standard"}</strong>
                </div>
                <div className="pdp-spec">
                  <span>STATUS</span>
                  <strong style={{ color: inStock ? "#1e824c" : "#b98428" }}>
                    {inStock ? "In Stock" : isTeaware ? "Coming Soon" : "Out of Stock"}
                  </strong>
                </div>
              </>
            ) : (
              <>
                <div className="pdp-spec">
                  <span>ORIGIN</span>
                  <strong>{product.origin}</strong>
                </div>
                <div className="pdp-spec">
                  <span>TEA TYPE</span>
                  <strong>{product.category}</strong>
                </div>
                <div className="pdp-spec">
                  <span>WEIGHT</span>
                  <strong>{currentWeight}</strong>
                </div>
                <div className="pdp-spec">
                  <span>CAFFEINE</span>
                  <strong>{product.caffeine}</strong>
                </div>
                <div className="pdp-spec">
                  <span>STATUS</span>
                  <strong style={{ color: inStock ? "#1e824c" : "#b98428" }}>
                    {inStock ? "In Stock" : "Out of Stock"}
                  </strong>
                </div>
              </>
            )}
          </div>

          {/* PRICE */}
          <div className="pdp-price-row">
            <span className="pdp-price">
              ₹{currentPrice.toLocaleString("en-IN")}
            </span>
            {currentOldPrice && currentOldPrice > currentPrice && (
              <del className="pdp-old-price">
                ₹{currentOldPrice.toLocaleString("en-IN")}
              </del>
            )}
            {savings && <span className="pdp-savings">{savings}% OFF</span>}
          </div>

          {/* QUANTITY COUNTER */}
          <div className="pdp-qty-row">
            <span className="pdp-qty-label">QUANTITY</span>
            <div className="pdp-qty-selector">
              <button
                type="button"
                className="pdp-qty-btn"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1 || !inStock}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="pdp-qty-val">{quantity}</span>
              <button
                type="button"
                className="pdp-qty-btn"
                onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                disabled={quantity >= 10 || !inStock}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </div>

          {/* ACTIONS */}
          <div className="pdp-actions">
            {isTeaware && !inStock ? (
              <>
                <button
                  type="button"
                  className="pdp-cart-button disabled out-of-stock"
                  disabled={true}
                  aria-label={`${product.name} is coming soon`}
                >
                  COMING SOON
                </button>
                <button
                  type="button"
                  className="pdp-buy-now-button disabled"
                  disabled={true}
                  aria-label={`${product.name} is coming soon`}
                >
                  UNAVAILABLE
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className={`pdp-cart-button ${addedToCart ? "added" : ""} ${!inStock ? "disabled out-of-stock" : ""}`}
                  disabled={addingToCart || !inStock}
                  onClick={handleAddToCart}
                  aria-label={
                    !inStock
                      ? `${product.name} is out of stock`
                      : addedToCart
                      ? "Added to cart"
                      : `Add ${quantity} of ${product.name} to cart`
                  }
                >
                  {!inStock ? (
                    "OUT OF STOCK"
                  ) : addingToCart ? (
                    <>
                      <span className="pdp-cart-spinner" aria-hidden="true" />
                      ADDING...
                    </>
                  ) : addedToCart ? (
                    <>ADDED ✓</>
                  ) : (
                    <>ADD TO CART 🛒</>
                  )}
                </button>

                <button
                  type="button"
                  className={`pdp-buy-now-button ${!inStock ? "disabled" : ""}`}
                  disabled={!inStock}
                  onClick={handleBuyNow}
                  aria-label={!inStock ? `${product.name} is unavailable` : `Buy ${product.name} now`}
                >
                  {!inStock ? "UNAVAILABLE" : "BUY NOW ❧"}
                </button>
              </>
            )}

            <button
              type="button"
              className={`pdp-wishlist-button ${wishlisted ? "wishlisted" : ""}`}
              onClick={handleWishlistToggle}
              aria-label={
                wishlisted
                  ? `Remove ${product.name} from wishlist`
                  : `Add ${product.name} to wishlist`
              }
              aria-pressed={wishlisted}
            >
              {wishlisted ? "♥" : "♡"}
            </button>
          </div>
        </div>
      </div>

      {/* RITUAL & PAIRING INTERNAL LINKS */}
      <section className="pdp-ritual-links" aria-label="Explore Tea Rituals" style={{
        maxWidth: "1200px",
        margin: "48px auto 24px",
        padding: "24px 20px",
        borderTop: "1px solid rgba(201, 162, 75, 0.25)",
        display: "flex",
        flexWrap: "wrap",
        gap: "20px",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", fontSize: "14px", fontWeight: 500 }}>
          {!isTeaware && (
            <Link to={`/collections/${product.category.toLowerCase()}-tea`} style={{ color: "#0b2b1e", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <span>🍃</span> Explore {product.category} Tea Collection →
            </Link>
          )}
          <Link to="/tea-maker" style={{ color: "#0b2b1e", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <span>♨</span> Interactive Steeping Guide →
          </Link>
          <Link to="/teaware" style={{ color: "#0b2b1e", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <span>☕</span> Handcrafted Teaware &amp; Cups →
          </Link>
          <Link to="/gifting" style={{ color: "#0b2b1e", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <span>♧</span> Luxury Tea Gift Boxes →
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
