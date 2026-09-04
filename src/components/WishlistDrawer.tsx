import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart, type CartProduct, resolveLiveCatalogProduct } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { useProducts } from "../context/ProductContext";
import { useTeaware } from "../context/TeawareContext";
import { useGifting } from "../context/GiftingContext";
import "./WishlistDrawer.css";

export default function WishlistDrawer() {
  const { items, isWishlistOpen, closeWishlist, removeFromWishlist, clearWishlist } =
    useWishlist();

  const { addToCart } = useCart();
  const { products } = useProducts();
  const { teaware } = useTeaware();
  const { hampers } = useGifting();

  const navigate = useNavigate();

  const [addingId, setAddingId] = useState<number | string | null>(null);
  const [addedId, setAddedId] = useState<number | string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const isProductOutOfStock = (product: CartProduct): boolean => {
    const live = resolveLiveCatalogProduct(product, products, teaware, hampers);
    if (live) {
      return !live.inStock || live.stock <= 0;
    }
    // Differentiate: NOT FOUND vs FOUND + stock = 0.
    // If not found in live catalogs yet (e.g. initial load), do NOT assume out of stock.
    // Only flag as OOS if snapshot explicitly specified stock <= 0 and inStock === false.
    if (product.inStock === false && typeof product.stock === "number" && product.stock === 0) {
      return true;
    }
    return false;
  };

  useEffect(() => {
    if (!isWishlistOpen) {
      return;
    }

    const handleEscape = (
      event: KeyboardEvent
    ) => {
      if (event.key === "Escape") {
        closeWishlist();
      }
    };

    document.addEventListener(
      "keydown",
      handleEscape
    );

    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape
      );

      document.body.style.overflow = "";
    };
  }, [isWishlistOpen, closeWishlist]);

  const handleAddToCart = (id: number | string) => {
    const wishlistItem = items.find(
      (item) => String(item.product.id) === String(id)
    );

    if (!wishlistItem || addingId !== null) {
      return;
    }

    const live = resolveLiveCatalogProduct(wishlistItem.product, products, teaware, hampers);
    const isOutOfStock = live ? (!live.inStock || live.stock <= 0) : isProductOutOfStock(wishlistItem.product);

    if (isOutOfStock) {
      return;
    }

    const productToAdd = live
      ? {
          ...wishlistItem.product,
          price: live.price,
          oldPrice: live.oldPrice,
          stock: live.stock,
          inStock: live.inStock,
          image: live.image,
        }
      : wishlistItem.product;

    setAddingId(id);

    window.setTimeout(() => {
      addToCart(productToAdd);
      setAddingId(null);
      setAddedId(id);

      window.setTimeout(() => {
        setAddedId(null);
      }, 1500);
    }, 650);
  };

  const handleClearConfirm = () => {
    clearWishlist();
    setShowClearConfirm(false);
  };

  const handleExploreTeas = () => {
    closeWishlist();
    navigate("/shop");
  };

  if (!isWishlistOpen) {
    return null;
  }

  return (
    <div
      className="leafly-wishlist-overlay"
      onClick={closeWishlist}
      role="dialog"
      aria-modal="true"
      aria-label="Wishlist drawer"
    >
      <aside
        className="leafly-wishlist-drawer"
        onClick={(event) =>
          event.stopPropagation()
        }
        aria-label="Your wishlist"
        ref={(el) => {
          if (el) el.scrollTop = 0;
        }}
      >
        {/* HEADER */}

        <div className="leafly-wishlist-header">
          <div>
            <p className="leafly-wishlist-eyebrow">
              SAVED RITUALS
            </p>

            <h2>
              Your Wishlist
            </h2>
          </div>

          <button
            type="button"
            className="leafly-wishlist-close"
            onClick={closeWishlist}
            aria-label="Close wishlist"
          >
            ✕
          </button>
        </div>

        {/* CONTENT */}

        <div
          className="leafly-wishlist-content"
          ref={(el) => {
            if (el) el.scrollTop = 0;
          }}
        >
          {items.length === 0 ? (
            <div className="leafly-wishlist-empty">
              <div className="leafly-wishlist-empty-heart">
                ♡
              </div>

              <h3>
                Your Wishlist is Quiet
              </h3>

              <p>
                Save the teas you want to return to.
              </p>

              <button
                type="button"
                onClick={handleExploreTeas}
              >
                EXPLORE TEAS
              </button>
            </div>
          ) : (
            <>
              <div
                className="leafly-wishlist-items"
                ref={(el) => {
                  if (el) el.scrollTop = 0;
                }}
              >
                {items.map(
                  ({ product }) => {
                    const isAdding =
                      addingId === product.id;

                    const isAdded =
                      addedId === product.id;

                    return (
                      <article
                        key={product.id}
                        className="leafly-wishlist-item"
                      >
                        <div className="leafly-wishlist-item-image">
                          <img
                            src={product.image}
                            alt={product.name}
                          />
                        </div>

                        <div className="leafly-wishlist-item-info">
                          <p className="leafly-wishlist-category">
                            {product.origin} ·{" "}
                            {product.category}
                          </p>

                          <h3>
                            {product.name}
                          </h3>

                          <span className="leafly-wishlist-details">
                            {product.weight} ·{" "}
                            {product.caffeine}{" "}
                            caffeine
                          </span>

                          <div className="leafly-wishlist-item-footer">
                            {(() => {
                              const live = resolveLiveCatalogProduct(product, products, teaware, hampers);
                              const currentPrice = live ? live.price : product.price;
                              const currentOldPrice = live ? live.oldPrice : product.oldPrice;
                              return (
                                <div className="leafly-wishlist-price">
                                  <strong>
                                    ₹{currentPrice.toLocaleString("en-IN")}
                                  </strong>
                                  {currentOldPrice && currentOldPrice > currentPrice && (
                                    <span className="leafly-wishlist-oldprice">
                                      ₹{currentOldPrice.toLocaleString("en-IN")}
                                    </span>
                                  )}
                                </div>
                              );
                            })()}

                            <button
                              type="button"
                              className="leafly-wishlist-remove"
                              onClick={() =>
                                removeFromWishlist(
                                  product.id
                                )
                              }
                              aria-label={`Remove ${product.name} from wishlist`}
                            >
                              ♥
                            </button>
                          </div>
                        </div>

                        {(() => {
                          const isOutOfStock = isProductOutOfStock(product);
                          return (
                            <button
                              type="button"
                              className={`leafly-wishlist-add-to-cart ${
                                isOutOfStock
                                  ? "out-of-stock"
                                  : isAdding
                                    ? "loading"
                                    : ""
                              } ${isAdded ? "added" : ""}`}
                              onClick={() =>
                                !isOutOfStock && handleAddToCart(product.id)
                              }
                              disabled={addingId !== null || isOutOfStock}
                              aria-label={
                                isOutOfStock
                                  ? `${product.name} is currently out of stock`
                                  : `Add ${product.name} to cart`
                              }
                            >
                              {isOutOfStock
                                ? "OUT OF STOCK"
                                : isAdded
                                  ? "ADDED ✓"
                                  : isAdding
                                    ? "..."
                                    : "ADD TO CART"}
                            </button>
                          );
                        })()}
                      </article>
                    );
                  }
                )}
              </div>

              <div className="leafly-wishlist-footer">
                <p>
                  Keep the teas that caught your attention close.
                </p>

                <button
                  type="button"
                  className="leafly-wishlist-clear"
                  onClick={() =>
                    setShowClearConfirm(true)
                  }
                >
                  CLEAR ALL
                </button>
              </div>
            </>
          )}
        </div>

        {/* CLEAR CONFIRMATION */}

        {showClearConfirm && (
          <div
            className="leafly-wishlist-confirm-overlay"
            onClick={() =>
              setShowClearConfirm(false)
            }
          >
            <div
              className="leafly-wishlist-confirm-modal"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <p>Remove all saved teas?</p>

              <div className="leafly-wishlist-confirm-actions">
                <button
                  type="button"
                  className="leafly-wishlist-confirm-cancel"
                  onClick={() =>
                    setShowClearConfirm(false)
                  }
                >
                  CANCEL
                </button>

                <button
                  type="button"
                  className="leafly-wishlist-confirm-clear"
                  onClick={
                    handleClearConfirm
                  }
                >
                  CLEAR ALL
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
