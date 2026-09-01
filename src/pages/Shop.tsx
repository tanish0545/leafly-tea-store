import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import {
  type Product,
  type ProductVariantKey,
  getProductSlug,
} from "../data/products";
import { useProducts } from "../context/ProductContext";
import Footer from "../components/Footer";
import { Helmet } from "react-helmet-async";

import "./Shop.css";
const categories = [
  "All Teas",
  "Green",
  "White",
  "Black",
  "Oolong",
];

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

  const {
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
  } = useWishlist();

  const [category, setCategory] = useState("All Teas");

  const [priceFilter, setPriceFilter] =
    useState("All Prices");

  const [originFilter, setOriginFilter] =
    useState("All Origins");

  const [caffeineFilter, setCaffeineFilter] =
    useState("All Caffeine Levels");

  const [sortBy, setSortBy] =
    useState("Featured Collection");

  const [addingId, setAddingId] =
    useState<number | null>(null);

  const [addedId, setAddedId] =
    useState<number | null>(null);

  const [cardVariants, setCardVariants] =
    useState<Record<number, ProductVariantKey>>({});

  const [selectedProduct, setSelectedProduct] =
    useState<Product | null>(null);

  const [modalVariant, setModalVariant] =
    useState<ProductVariantKey>("100g");

  const [showBackToTop, setShowBackToTop] =
    useState(false);

  /*
   * BACK TO TOP VISIBILITY
   */
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 500);
    };

    handleScroll();

    window.addEventListener(
      "scroll",
      handleScroll,
      { passive: true }
    );

    return () => {
      window.removeEventListener(
        "scroll",
        handleScroll
      );
    };
  }, []);

  /*
   * ESCAPE CLOSES PRODUCT MODAL
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedProduct(null);
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, []);

  /*
   * FILTERED PRODUCTS
   */
  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (category !== "All Teas") {
      result = result.filter(
        (item) => item.category === category
      );
    }

    if (priceFilter !== "All Prices") {
      result = result.filter((item) => {
        if (priceFilter === "Under ₹700") {
          return item.price < 700;
        }
        if (priceFilter === "₹700 - ₹900") {
          return (
            item.price >= 700 &&
            item.price <= 900
          );
        }
        if (priceFilter === "Above ₹900") {
          return item.price > 900;
        }
        return true;
      });
    }

    if (originFilter !== "All Origins") {
      result = result.filter(
        (item) => item.origin === originFilter
      );
    }

    if (caffeineFilter !== "All Caffeine Levels") {
      result = result.filter(
        (item) =>
          item.caffeine === caffeineFilter
      );
    }

    if (sortBy === "Price: Low to High") {
      result.sort((a, b) => a.price - b.price);
    } else if (
      sortBy === "Price: High to Low"
    ) {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === "Name: A to Z") {
      result.sort((a, b) =>
        a.name.localeCompare(b.name)
      );
    }

    return result;
  }, [
    products,
    category,
    priceFilter,
    originFilter,
    caffeineFilter,
    sortBy,
  ]);

  /*
   * WISHLIST
   */
  const toggleWishlist = (id: number) => {
    const product = products.find(
      (item) => item.id === id
    );

    if (!product) {
      return;
    }

    if (isInWishlist(id)) {
      removeFromWishlist(id);
    } else {
      addToWishlist(product);
    }
  };

  /*
   * CART
   */
  const addToCart = (id: number) => {
    const product = products.find(
      (item) => item.id === id
    );

    if (!product || addingId !== null) {
      return;
    }

    const currentVariant = cardVariants[id] ?? "100g";
    const variantData = product.variants ? product.variants[currentVariant] : null;
    const finalPrice = variantData ? variantData.price : (currentVariant === "250g" ? Math.round(product.price * 2.2) : product.price);
    const finalOldPrice = variantData?.oldPrice ?? (currentVariant === "250g" && product.oldPrice ? Math.round(product.oldPrice * 2.2) : product.oldPrice);

    setAddingId(id);

    // Immediately add to cart and trigger centralized AddedToRitual animation
    addProductToCart(product, 1, currentVariant, finalPrice, finalOldPrice);
    setAddingId(null);
    setAddedId(id);

    window.setTimeout(() => {
      setAddedId(null);
    }, 1500);
  };

  /*
   * CLEAR FILTERS
   */
  const clearFilters = () => {
    setCategory("All Teas");
    setPriceFilter("All Prices");
    setOriginFilter("All Origins");
    setCaffeineFilter(
      "All Caffeine Levels"
    );
    setSortBy("Featured Collection");
  };

  /*
   * BACK TO TOP
   */
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <main className="leafly-shop-page">
      <Helmet>
        <title>Shop Premium Tea Collections | Leafly</title>
        <meta name="description" content="Browse our complete collection of premium teas, including Green, White, Black, and Oolong. Filter by origin, price, and caffeine level." />
      </Helmet>

      {/* =====================================================
          HERO
          ===================================================== */}

      <section className="shop-hero">
        <div className="shop-hero-content">

          <div className="shop-eyebrow">
            <span />
            <p>THE LEAFLY TEA HOUSE</p>
            <span />
          </div>

          <h1>
            Exceptional tea,
            <br />
            <em>chosen with intention.</em>
          </h1>

          <p className="shop-hero-description">
            Explore our collection of
            single-origin teas, carefully
            selected for character,
            freshness and rituals that
            make every cup worth slowing
            down for.
          </p>

        </div>
      </section>


      {/* =====================================================
          COLLECTION
          ===================================================== */}

      <section
        className="shop-collection"
        id="tea-collection"
      >

        <div className="shop-collection-header">

          <div>
            <p className="collection-eyebrow">
              THE COLLECTION
            </p>

            <h2>
              Tea for every ritual.
            </h2>
          </div>

          <span className="tea-count">
            {filteredProducts.length}{" "}
            {filteredProducts.length === 1
              ? "tea"
              : "teas"}
          </span>

        </div>


        {/* CATEGORY TABS */}

        <div
          className="category-tabs"
          role="tablist"
          aria-label="Tea categories"
        >

          {categories.map((item) => (
            <button
              key={item}
              type="button"
              className={
                category === item
                  ? "category-tab active"
                  : "category-tab"
              }
              onClick={() =>
                setCategory(item)
              }
              role="tab"
              aria-selected={
                category === item
              }
            >
              {item}
            </button>
          ))}

        </div>


        {/* FILTER BAR */}

        <div className="shop-filter-bar">

          <div className="shop-filters">

            <select
              value={priceFilter}
              onChange={(event) =>
                setPriceFilter(
                  event.target.value
                )
              }
              aria-label="Filter by price"
            >
              <option>
                All Prices
              </option>
              <option>
                Under ₹750
              </option>
              <option>
                ₹750 – ₹1000
              </option>
              <option>
                Above ₹1000
              </option>
            </select>


            <select
              value={originFilter}
              onChange={(event) =>
                setOriginFilter(
                  event.target.value
                )
              }
              aria-label="Filter by origin"
            >
              <option>
                All Origins
              </option>
              <option>
                Darjeeling
              </option>
              <option>
                Assam
              </option>
              <option>
                Kashmir
              </option>
            </select>


            <select
              value={caffeineFilter}
              onChange={(event) =>
                setCaffeineFilter(
                  event.target.value
                )
              }
              aria-label="Filter by caffeine"
            >
              <option>
                All Caffeine Levels
              </option>
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>

          </div>


          <div className="shop-sort">

            <span>Sort by</span>

            <select
              value={sortBy}
              onChange={(event) =>
                setSortBy(
                  event.target.value
                )
              }
              aria-label="Sort products"
            >
              <option>
                Featured Collection
              </option>

              <option>
                Price: Low to High
              </option>

              <option>
                Price: High to Low
              </option>

              <option>
                Name: A to Z
              </option>
            </select>

          </div>

        </div>


        {/* ACTIVE FILTER SUMMARY */}

        {(category !== "All Teas" ||
          priceFilter !== "All Prices" ||
          originFilter !== "All Origins" ||
          caffeineFilter !==
            "All Caffeine Levels") && (
          <div className="active-filters">

            <span>
              Showing filtered results
            </span>

            <button
              type="button"
              onClick={clearFilters}
            >
              Clear filters ×
            </button>

          </div>
        )}


        {/* PRODUCT GRID */}

        <div className="shop-product-grid">

          {filteredProducts.map((product, index) => {
            const isWishlisted = isInWishlist(product.id);
            const isAdding = addingId === product.id;
            const isAdded = addedId === product.id;

            return (
              <article
                className="shop-product-card"
                key={product.id}
              >

                {/* PRODUCT IMAGE */}

                <div className="product-image-wrap">

                  <img
                    src={product.image}
                    alt={`Leafly ${product.name}`}
                    className="product-image"
                    onClick={() => navigate(`/shop/${getProductSlug(product)}`)}
                    style={{ cursor: "pointer" }}
                    loading={index < 4 ? "eager" : "lazy"}
                    decoding="async"
                    {...(index < 2 ? { fetchPriority: "high" as const } : {})}
                  />

                  <span
                    className={`product-badge ${product.badge.toLowerCase()}`}
                  >
                    {product.badge}
                  </span>

                  <button
                    type="button"
                    className={
                      isWishlisted
                        ? "wishlist-button active"
                        : "wishlist-button"
                    }
                    aria-label={
                      isWishlisted
                        ? "Remove from wishlist"
                        : "Add to wishlist"
                    }
                    aria-pressed={
                      isWishlisted
                    }
                    onClick={() =>
                      toggleWishlist(
                        product.id
                      )
                    }
                  >
                    {isWishlisted
                      ? "♥"
                      : "♡"}
                  </button>

                </div>


                {/* PRODUCT CONTENT */}

                <div className="product-content">

                    <p className="product-meta">
                      {product.origin} ·{" "}
                      {product.category} Tea
                    </p>

                    <h3
                      onClick={() => navigate(`/shop/${getProductSlug(product)}`)}
                      style={{ cursor: "pointer" }}
                    >
                      {product.name}
                    </h3>

                    {/* QUANTITY / WEIGHT VARIANT SELECTOR */}
                    <div className="card-variant-selector">
                      <button
                        type="button"
                        className={`card-variant-btn ${(cardVariants[product.id] ?? "100g") === "100g" ? "active" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCardVariants((prev) => ({ ...prev, [product.id]: "100g" }));
                        }}
                      >
                        100g
                      </button>
                      <button
                        type="button"
                        className={`card-variant-btn ${cardVariants[product.id] === "250g" ? "active" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCardVariants((prev) => ({ ...prev, [product.id]: "250g" }));
                        }}
                      >
                        250g
                      </button>
                    </div>

                    <p className="product-details">
                      {cardVariants[product.id] ?? "100g"} ·{" "}
                      {product.caffeine} Caffeine
                    </p>

                    {/* RATING ROW: ★★★★★ 4.8 · 126 Reviews */}
                    <div
                      className="product-card-rating"
                      aria-label={`${(product.rating ?? 4.8).toFixed(1)} out of 5 stars based on ${product.reviewCount ?? 126} reviews`}
                    >
                      <div className="product-card-stars" aria-hidden="true">
                        {"★".repeat(5)}
                      </div>
                      <span className="product-card-rating-num">
                        {(product.rating ?? 4.8).toFixed(1)}
                      </span>
                      <span className="product-card-rating-sep">·</span>
                      <span className="product-card-review-count">
                        {product.reviewCount ?? 126} Reviews
                      </span>
                    </div>

                    <div className="product-price">
                      <strong>
                        ₹
                        {(
                          (cardVariants[product.id] ?? "100g") === "250g"
                            ? product.variants?.["250g"]?.price ?? Math.round(product.price * 2.2)
                            : product.variants?.["100g"]?.price ?? product.price
                        ).toLocaleString("en-IN")}
                      </strong>

                      {(
                        (cardVariants[product.id] ?? "100g") === "250g"
                          ? product.variants?.["250g"]?.oldPrice ?? (product.oldPrice ? Math.round(product.oldPrice * 2.2) : undefined)
                          : product.variants?.["100g"]?.oldPrice ?? product.oldPrice
                      ) && (
                        <del>
                          ₹
                          {(
                            (cardVariants[product.id] ?? "100g") === "250g"
                              ? product.variants?.["250g"]?.oldPrice ?? (product.oldPrice ? Math.round(product.oldPrice * 2.2) : undefined)
                              : product.variants?.["100g"]?.oldPrice ?? product.oldPrice
                          )!.toLocaleString("en-IN")}
                        </del>
                      )}
                    </div>


                    {/* ACTIONS */}

                    <div className="product-actions">

                      <button
                        type="button"
                        className="details-button"
                        onClick={() => navigate(`/shop/${getProductSlug(product)}`)}
                      >
                        DETAILS
                        <span>+</span>
                      </button>

                      {(() => {
                        const currentVariant = cardVariants[product.id] ?? "100g";
                        const cartItem = items.find(
                          (item) =>
                            item.id === `${product.id}-${currentVariant}` ||
                            (item.product.id === product.id && item.variant === currentVariant)
                        );
                        const currentQty = cartItem?.quantity || 0;

                        if (currentQty > 0) {
                          return (
                            <div className="product-qty-stepper" aria-label={`Quantity in cart: ${currentQty}`}>
                              <button
                                type="button"
                                className="product-qty-btn product-qty-dec"
                                aria-label="Decrease quantity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (cartItem) decreaseQuantity(cartItem.id);
                                }}
                              >
                                −
                              </button>
                              <span className="product-qty-value">{currentQty}</span>
                              <button
                                type="button"
                                className="product-qty-btn product-qty-inc"
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
                            className={
                              isAdded
                                ? "add-cart-button added"
                                : "add-cart-button"
                            }
                            disabled={isAdding}
                            onClick={() =>
                              addToCart(
                                product.id
                              )
                            }
                          >
                            {isAdding ? (
                              <>
                                <span className="cart-spinner" />
                                ADDING...
                              </>
                            ) : isAdded ? (
                              <>
                                ADDED
                                <span>✓</span>
                              </>
                            ) : (
                              <>
                                ADD TO CART
                                <span>🛒</span>
                              </>
                            )}
                          </button>
                        );
                      })()}

                    </div>

                  </div>

                </article>
              );
            }
          )}

        </div>


        {/* EMPTY STATE */}

        {filteredProducts.length === 0 && (
          <div className="shop-empty">

            <span>✦</span>

            <h3>
              No teas found.
            </h3>

            <p>
              Try adjusting your filters.
            </p>

            <button
              type="button"
              onClick={clearFilters}
            >
              RESET FILTERS
            </button>

          </div>
        )}

      </section>


      {/* =====================================================
          SHOP PROMISES
          ===================================================== */}

      <section className="shop-promises">

        <div>
          <span>◌</span>

          <strong>
            WHOLE LEAF TEAS
          </strong>

          <p>
            Real leaves, real flavour.
          </p>
        </div>

        <div>
          <span>⌂</span>

          <strong>
            SINGLE ORIGIN
          </strong>

          <p>
            Teas from distinct regions.
          </p>
        </div>

        <div>
          <span>♨</span>

          <strong>
            FRESHLY PACKED
          </strong>

          <p>
            Packed in small batches.
          </p>
        </div>

        <div>
          <span>◇</span>

          <strong>
            SECURE & SAFE
          </strong>

          <p>
            Secure payments, always.
          </p>
        </div>

      </section>

      <Footer />


      {/* =====================================================
          PRODUCT DETAIL MODAL
          ===================================================== */}

      {selectedProduct && (
        <div
          className="product-detail-overlay"
          onClick={() =>
            setSelectedProduct(null)
          }
          role="presentation"
        >

          <div
            className="product-detail-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedProduct.name} details`}
          >

            <button
              type="button"
              className="product-detail-close"
              aria-label="Close product details"
              onClick={() =>
                setSelectedProduct(null)
              }
            >
              ×
            </button>


            {/* IMAGE */}

            <div className="product-detail-image">

              <img
                src={selectedProduct.image}
                alt={selectedProduct.name}
              />

              <span
                className={`product-badge ${selectedProduct.badge.toLowerCase()}`}
              >
                {selectedProduct.badge}
              </span>

            </div>


            {/* INFORMATION */}

            <div className="product-detail-content">

              <p className="product-detail-meta">
                {selectedProduct.origin} ·{" "}
                {selectedProduct.category} Tea
              </p>

              <h2>
                {selectedProduct.name}
              </h2>

              <p className="product-detail-description">
                A carefully selected{" "}
                {selectedProduct.category.toLowerCase()}{" "}
                tea from{" "}
                {selectedProduct.origin},
                chosen for character,
                freshness and a memorable
                tea-drinking ritual.
              </p>


              {/* QUANTITY / WEIGHT VARIANT SELECTOR */}

              <div className="product-detail-variants">
                <span className="product-detail-variant-label">SELECT QUANTITY / WEIGHT</span>
                <div className="product-detail-variant-buttons" role="radiogroup" aria-label="Quantity options">
                  <button
                    type="button"
                    className={`product-variant-btn ${modalVariant === "100g" ? "active" : ""}`}
                    onClick={() => setModalVariant("100g")}
                    role="radio"
                    aria-checked={modalVariant === "100g"}
                  >
                    100g
                  </button>
                  <button
                    type="button"
                    className={`product-variant-btn ${modalVariant === "250g" ? "active" : ""}`}
                    onClick={() => setModalVariant("250g")}
                    role="radio"
                    aria-checked={modalVariant === "250g"}
                  >
                    250g
                  </button>
                </div>
              </div>

              <div className="product-detail-specs">

                <div>
                  <span>ORIGIN</span>
                  <strong>
                    {selectedProduct.origin}
                  </strong>
                </div>

                <div>
                  <span>TEA TYPE</span>
                  <strong>
                    {selectedProduct.category}
                  </strong>
                </div>

                <div>
                  <span>WEIGHT</span>
                  <strong>
                    {modalVariant}
                  </strong>
                </div>

                <div>
                  <span>CAFFEINE</span>
                  <strong>
                    {selectedProduct.caffeine}
                  </strong>
                </div>

              </div>


              <div className="product-detail-price">

                <strong>
                  ₹
                  {(
                    selectedProduct.variants
                      ? selectedProduct.variants[modalVariant].price
                      : modalVariant === "250g"
                        ? Math.round(selectedProduct.price * 2.2)
                        : selectedProduct.price
                  ).toLocaleString("en-IN")}
                </strong>

                {(selectedProduct.variants
                  ? selectedProduct.variants[modalVariant].oldPrice
                  : modalVariant === "250g" && selectedProduct.oldPrice
                    ? Math.round(selectedProduct.oldPrice * 2.2)
                    : selectedProduct.oldPrice) && (
                  <del>
                    ₹
                    {(
                      selectedProduct.variants
                        ? selectedProduct.variants[modalVariant].oldPrice!
                        : modalVariant === "250g" && selectedProduct.oldPrice
                          ? Math.round(selectedProduct.oldPrice * 2.2)
                          : selectedProduct.oldPrice!
                    ).toLocaleString("en-IN")}
                  </del>
                )}

              </div>


              <button
                type="button"
                className="product-detail-cart"
                onClick={() => {
                  const variantData = selectedProduct.variants
                    ? selectedProduct.variants[modalVariant]
                    : {
                        weight: modalVariant,
                        price:
                          modalVariant === "250g"
                            ? Math.round(selectedProduct.price * 2.2)
                            : selectedProduct.price,
                        oldPrice:
                          modalVariant === "250g" && selectedProduct.oldPrice
                            ? Math.round(selectedProduct.oldPrice * 2.2)
                            : selectedProduct.oldPrice,
                      };

                  addProductToCart(
                    selectedProduct,
                    1,
                    modalVariant,
                    variantData.price,
                    variantData.oldPrice
                  );

                  setSelectedProduct(null);
                }}
              >
                ADD TO CART
                <span>🛒</span>
              </button>

            </div>

          </div>

        </div>
      )}


      {/* =====================================================
          FLOATING CART
          ===================================================== */}

      {cartCount > 0 && (
        <button
          type="button"
          className="floating-cart"
          aria-label={`${cartCount} teas in cart`}
          onClick={openCart}
        >

          <span className="floating-cart-icon">
            🛒
          </span>

          <span>
            {cartCount}{" "}
            {cartCount === 1
              ? "tea"
              : "teas"}{" "}
            in cart
          </span>

          <span
            className="floating-cart-leaf"
            aria-hidden="true"
          >
            ❧
          </span>

        </button>
      )}


      {/* =====================================================
          BACK TO TOP
          LEAF SYMBOL — NO ARROW
          ===================================================== */}

      {showBackToTop && (
        <button
          type="button"
          className="back-to-top"
          onClick={scrollToTop}
          aria-label="Back to top"
          title="Back to top"
        >
          <span aria-hidden="true">
            ❧
          </span>

          <small>
            TOP
          </small>
        </button>
      )}

    </main>
  );
}