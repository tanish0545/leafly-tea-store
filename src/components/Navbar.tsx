import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import logo from "../assets/leafly-logo.webp";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { useAuth } from "../context/AuthContext";
import UserAvatar from "./UserAvatar";
import SearchModal from "./SearchModal";
import "./Navbar.css";

const navLinks = [
  { label: "Home", path: "/" },
  { label: "Shop", path: "/shop" },
  { label: "Teaware", path: "/teaware" },
  { label: "Tea Collections", path: "/tea-collections" },
  { label: "Tea Maker", path: "/tea-maker" },
  { label: "Why Leafly", path: "/why-leafly" },
  { label: "Gifting", path: "/gifting" },
  { label: "Journal", path: "/journal" },
];

export default function Navbar() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { isAuthenticated, user } = useAuth();

  const {
    cartCount,
    openCart,
  } = useCart();

  const {
    wishlistCount,
    openWishlist,
  } = useWishlist();

  const closeMenu = () => {
    setMenuOpen(false);
  };

  const handleCartClick = () => {
    closeMenu();
    openCart();
  };

  const handleWishlistClick = () => {
    closeMenu();
    openWishlist();
  };

  if (location.pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <header className="leafly-navbar">

      {/* =====================================================
          LOGO
      ===================================================== */}

      <Link
        to="/"
        className="leafly-navbar-logo"
        aria-label="Leafly Home"
        onClick={closeMenu}
      >
        <img
          src={logo}
          alt="Leafly"
          loading="eager"
          fetchPriority="high"
        />

        {/* Decorative butterfly 1 */}

        <span
          className="leafly-logo-butterfly butterfly-one"
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 32 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M16 12C11 4 3 3 3 8.5C3 13 10 14 16 13"
              fill="currentColor"
            />

            <path
              d="M16 12C21 4 29 3 29 8.5C29 13 22 14 16 13"
              fill="currentColor"
            />

            <path
              d="M16 12C12 15 7 19 9.5 21C12 23 15 17 16 13"
              fill="currentColor"
            />

            <path
              d="M16 12C20 15 25 19 22.5 21C20 23 17 17 16 13"
              fill="currentColor"
            />

            <ellipse
              cx="16"
              cy="13"
              rx="1.3"
              ry="5"
              fill="#f7f3ec"
            />
          </svg>
        </span>


        {/* Decorative butterfly 2 */}

        <span
          className="leafly-logo-butterfly butterfly-two"
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 32 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M16 12C11 4 3 3 3 8.5C3 13 10 14 16 13"
              fill="currentColor"
            />

            <path
              d="M16 12C21 4 29 3 29 8.5C29 13 22 14 16 13"
              fill="currentColor"
            />

            <path
              d="M16 12C12 15 7 19 9.5 21C12 23 15 17 16 13"
              fill="currentColor"
            />

            <path
              d="M16 12C20 15 25 19 22.5 21C20 23 17 17 16 13"
              fill="currentColor"
            />

            <ellipse
              cx="16"
              cy="13"
              rx="1.3"
              ry="5"
              fill="#f7f3ec"
            />
          </svg>
        </span>
      </Link>


      {/* =====================================================
          DESKTOP NAVIGATION
      ===================================================== */}

      <nav
        className="leafly-desktop-nav"
        aria-label="Main navigation"
      >
        {navLinks.map((link) => {
          const isActive =
            link.path === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(link.path);

          return (
            <Link
              key={link.label}
              to={link.path}
              className={`leafly-nav-link ${isActive ? "active" : ""}`}
              aria-current={isActive ? "page" : undefined}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>


      {/* =====================================================
          DESKTOP ACTIONS
      ===================================================== */}

      <div className="leafly-nav-actions">

        {/* SEARCH */}

        <button
          type="button"
          aria-label="Search"
          className="leafly-icon-button"
          onClick={() => setSearchOpen(true)}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle
              cx="11"
              cy="11"
              r="6.5"
            />

            <path d="m16 16 4.5 4.5" />
          </svg>
        </button>


        {/* WISHLIST */}

        <button
          type="button"
          aria-label={`Wishlist, ${wishlistCount} items`}
          className="leafly-icon-button leafly-wishlist-nav-button"
          onClick={handleWishlistClick}
        >
          <svg
            width="21"
            height="21"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.8 8.7c0 5.2-8.8 10.2-8.8 10.2S3.2 13.9 3.2 8.7A4.7 4.7 0 0 1 12 6.1a4.7 4.7 0 0 1 8.8 2.6Z" />
          </svg>

          {wishlistCount > 0 && (
            <span className="leafly-wishlist-count">
              {wishlistCount > 99
                ? "99+"
                : wishlistCount}
            </span>
          )}
        </button>


        {/* CART */}

        <button
          type="button"
          aria-label={`Shopping cart, ${cartCount} items`}
          className="leafly-icon-button leafly-cart-nav-button"
          onClick={handleCartClick}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 1.9-1.4L21 7H6" />

            <circle
              cx="10"
              cy="19"
              r="1.3"
            />

            <circle
              cx="18"
              cy="19"
              r="1.3"
            />
          </svg>

          {cartCount > 0 && (
            <span className="leafly-cart-count">
              {cartCount > 99
                ? "99+"
                : cartCount}
            </span>
          )}
        </button>


        {/* PROFILE */}
        <Link
          to={isAuthenticated ? "/profile" : "/login"}
          aria-label={isAuthenticated ? "Account Profile" : "Sign In"}
          className="leafly-icon-button leafly-nav-profile-btn"
          onClick={closeMenu}
        >
          {isAuthenticated && user?.photoURL ? (
            <UserAvatar
              photoURL={user.photoURL}
              name={user.displayName || user.name}
              email={user.email}
              size={28}
              showBorder={true}
            />
          ) : (
            <svg
              width="21"
              height="21"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle
                cx="12"
                cy="8"
                r="3.5"
              />

              <path d="M5 20c.8-3.5 3.2-5.5 7-5.5s6.2 2 7 5.5" />
            </svg>
          )}
        </Link>

      </div>


      {/* =====================================================
          MOBILE TOP ACTIONS
      ===================================================== */}

      <div className="leafly-mobile-top-actions">
        <button
          type="button"
          aria-label="Search"
          className="leafly-mobile-profile"
          onClick={() => {
            closeMenu();
            setSearchOpen(true);
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4.5 4.5" />
          </svg>
        </button>

        <button
          type="button"
          aria-label={`Wishlist, ${wishlistCount} items`}
          className="leafly-mobile-profile leafly-wishlist-nav-button"
          onClick={handleWishlistClick}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.8 8.7c0 5.2-8.8 10.2-8.8 10.2S3.2 13.9 3.2 8.7A4.7 4.7 0 0 1 12 6.1a4.7 4.7 0 0 1 8.8 2.6Z" />
          </svg>
          {wishlistCount > 0 && (
            <span className="leafly-wishlist-count">
              {wishlistCount > 99 ? "99+" : wishlistCount}
            </span>
          )}
        </button>

        <button
          type="button"
          aria-label={`Shopping cart, ${cartCount} items`}
          className="leafly-mobile-profile leafly-cart-nav-button"
          onClick={handleCartClick}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 1.9-1.4L21 7H6" />
            <circle cx="10" cy="19" r="1.3" />
            <circle cx="18" cy="19" r="1.3" />
          </svg>
          {cartCount > 0 && (
            <span className="leafly-cart-count">
              {cartCount > 99 ? "99+" : cartCount}
            </span>
          )}
        </button>

        <Link
          to={isAuthenticated ? "/profile" : "/login"}
          aria-label={isAuthenticated ? "Account Profile" : "Sign In"}
          className="leafly-mobile-profile"
          onClick={closeMenu}
        >
          {isAuthenticated && user?.photoURL ? (
            <UserAvatar
              photoURL={user.photoURL}
              name={user.displayName || user.name}
              email={user.email}
              size={26}
              showBorder={true}
            />
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="8" r="3.5" />
              <path d="M5 20c.8-3.5 3.2-5.5 7-5.5s6.2 2 7 5.5" />
            </svg>
          )}
        </Link>
      </div>


      {/* =====================================================
          MOBILE MENU BUTTON
      ===================================================== */}

      <button
        type="button"
        className="leafly-mobile-menu-button"
        aria-label={
          menuOpen
            ? "Close navigation"
            : "Open navigation"
        }
        aria-expanded={menuOpen}
        onClick={() =>
          setMenuOpen((open) => !open)
        }
      >
        {menuOpen ? (
          <span className="leafly-close-icon">
            ×
          </span>
        ) : (
          <span className="leafly-menu-icon">
            <span />
            <span />
            <span />
          </span>
        )}
      </button>


      {/* =====================================================
          MOBILE MENU
      ===================================================== */}

      <div
        className={`leafly-mobile-menu ${
          menuOpen
            ? "leafly-mobile-menu-open"
            : ""
        }`}
      >

        {navLinks.map((link) => {
          const isActive =
            link.path === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(link.path);

          return (
            <Link
              key={link.label}
              to={link.path}
              className={`leafly-mobile-link ${isActive ? "active" : ""}`}
              onClick={closeMenu}
              aria-current={isActive ? "page" : undefined}
            >
              {link.label}
              <span>❧</span>
            </Link>
          );
        })}


        {/* MOBILE ACTIONS */}

        <div className="leafly-mobile-actions">

          {/* SEARCH */}

          <button
            type="button"
            onClick={() => {
              closeMenu();
              setSearchOpen(true);
            }}
          >
            Search
          </button>


          {/* WISHLIST */}

          <button
            type="button"
            onClick={handleWishlistClick}
          >
            Wishlist

            {wishlistCount > 0 && (
              <span className="leafly-mobile-wishlist-count">
                {wishlistCount}
              </span>
            )}
          </button>


          {/* CART */}

          <button
            type="button"
            onClick={handleCartClick}
          >
            Cart

            {cartCount > 0 && (
              <span className="leafly-mobile-cart-count">
                {cartCount}
              </span>
            )}
          </button>


          {/* PROFILE / LOGIN */}

          <Link
            to={isAuthenticated ? "/profile" : "/login"}
            onClick={closeMenu}
            className="leafly-mobile-drawer-profile-link"
          >
            {isAuthenticated && user?.photoURL && (
              <UserAvatar
                photoURL={user.photoURL}
                name={user.displayName || user.name}
                email={user.email}
                size={22}
                showBorder={true}
              />
            )}
            <span>{isAuthenticated ? (user?.displayName || "Profile") : "Sign In"}</span>
          </Link>

        </div>

      </div>

      {/* SEARCH MODAL */}
      <SearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
      />

    </header>
  );
}