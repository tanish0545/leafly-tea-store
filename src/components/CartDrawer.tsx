import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import "./CartDrawer.css";

export default function CartDrawer() {
  const navigate = useNavigate();

  const {
    items,
    cartCount,
    subtotal,
    isCartOpen,
    closeCart,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
    clearCart,
  } = useCart();

  useEffect(() => {
    if (!isCartOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeCart();
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isCartOpen, closeCart]);

  if (!isCartOpen) {
    return null;
  }

  const handleContinueShopping = () => {
    closeCart();
    navigate("/shop");
  };

  const hasUnavailableItems = items.some(
    item => item.product.inStock === false || (typeof item.product.stock === "number" && item.product.stock <= 0)
  );

  return (
    <div className="leafly-cart-overlay" onClick={closeCart}>
      <aside
        className="leafly-cart-drawer"
        onClick={(event) => event.stopPropagation()}
        aria-label="Shopping cart"
        ref={(el) => {
          if (el) el.scrollTop = 0;
        }}
      >
        {/* HEADER */}

        <div className="leafly-cart-header">
          <div>
            <p className="leafly-cart-eyebrow">
              YOUR LEAFLY
            </p>

            <h2>
              Shopping cart
            </h2>

            <span>
              {cartCount}{" "}
              {cartCount === 1
                ? "item"
                : "items"}
            </span>
          </div>

          <button
            type="button"
            className="leafly-cart-close"
            onClick={closeCart}
            aria-label="Close cart"
          >
            ✕
          </button>
        </div>

        {/* CART CONTENT */}

        <div
          className="leafly-cart-content"
          ref={(el) => {
            if (el) el.scrollTop = 0;
          }}
        >
          {items.length === 0 ? (
            <div className="leafly-cart-empty">
              <div className="leafly-cart-empty-leaf">
                ❧
              </div>

              <h3>
                Your cart is waiting.
              </h3>

              <p>
                Add a beautiful tea to
                begin your ritual.
              </p>

              <button
                type="button"
                onClick={handleContinueShopping}
              >
                CONTINUE SHOPPING
              </button>
            </div>
          ) : (
            <>
              <div
                className="leafly-cart-items"
                ref={(el) => {
                  if (el) el.scrollTop = 0;
                }}
              >
                {items.map((item) => {
                  const isItemUnavailable = item.product.inStock === false || (typeof item.product.stock === "number" && item.product.stock <= 0);
                  return (
                  <article
                    className={`leafly-cart-item ${isItemUnavailable ? "item-unavailable" : ""}`}
                    key={item.id}
                  >
                    <div className="leafly-cart-item-image">
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                      />
                    </div>

                    <div className="leafly-cart-item-info">
                      <p>
                        {item.product.origin} ·{" "}
                        {item.product.category}
                      </p>

                      <h3>
                        {item.product.name}
                      </h3>

                      <span className="leafly-cart-variant-meta">
                        <strong className="leafly-variant-badge">{item.variant || item.weight}</strong>
                        {" · "}
                        {item.product.caffeine} caffeine
                      </span>

                      {isItemUnavailable && (
                        <div className="leafly-cart-item-oos-badge">
                          Currently unavailable — Please remove to checkout
                        </div>
                      )}

                      <strong>
                        ₹
                        {(
                          item.price *
                          item.quantity
                        ).toLocaleString(
                          "en-IN"
                        )}
                      </strong>

                      <div className="leafly-cart-item-bottom">
                        <div className="leafly-quantity">
                          <button
                            type="button"
                            onClick={() =>
                              decreaseQuantity(item.id)
                            }
                            aria-label={`Decrease ${item.product.name} (${item.variant})`}
                          >
                            −
                          </button>

                          <span>
                            {item.quantity}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              increaseQuantity(item.id)
                            }
                            aria-label={`Increase ${item.product.name} (${item.variant})`}
                          >
                            +
                          </button>
                        </div>

                        <button
                          type="button"
                          className="leafly-remove-item"
                          onClick={() =>
                            removeFromCart(item.id)
                          }
                        >
                          REMOVE
                        </button>
                      </div>
                    </div>
                  </article>
                );
                })}
              </div>

              <div className="leafly-cart-actions">
                <button
                  type="button"
                  className="leafly-clear-cart"
                  onClick={clearCart}
                >
                  CLEAR CART
                </button>
              </div>
            </>
          )}
        </div>

        {/* FOOTER */}

        {items.length > 0 && (
          <div className="leafly-cart-footer">
            <div className="leafly-cart-subtotal">
              <span>SUBTOTAL</span>

              <strong>
                ₹
                {subtotal.toLocaleString(
                  "en-IN"
                )}
              </strong>
            </div>

            <p>
              Coupons and shipping calculated at checkout.
            </p>

            {hasUnavailableItems && (
              <div className="leafly-cart-oos-warning" role="alert">
                <span className="oos-icon">⚠️</span>
                <span>An item in your cart is currently out of stock. Please remove it before proceeding.</span>
              </div>
            )}

            <button
              type="button"
              className={`leafly-checkout-button ${hasUnavailableItems ? "disabled" : ""}`}
              disabled={hasUnavailableItems}
              onClick={() => {
                if (hasUnavailableItems) return;
                closeCart();
                navigate("/checkout");
              }}
            >
              PROCEED TO CHECKOUT
              <span>❧</span>
            </button>

            <button
              type="button"
              className="leafly-continue-shopping"
              onClick={handleContinueShopping}
            >
              CONTINUE SHOPPING
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}