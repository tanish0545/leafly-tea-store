import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useProducts } from "../context/ProductContext";
import { getProductSlug } from "../data/products";
import "./SearchModal.css";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const POPULAR_SEARCHES = [
  "Green Tea",
  "Oolong",
  "White Tea",
  "Black Tea",
  "Assam",
  "Darjeeling",
  "Himalayan",
  "Infuser",
];

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const navigate = useNavigate();
  const { products } = useProducts();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClose = useCallback(() => {
    setQuery("");
    onClose();
  }, [onClose]);

  // Focus and body overflow lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  // Filter products
  const searchResults = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return [];

    return products.filter((product) => {
      const matchName = product.name?.toLowerCase().includes(trimmed);
      const matchCategory = product.category?.toLowerCase().includes(trimmed);
      const matchOrigin = product.origin?.toLowerCase().includes(trimmed);
      const matchDesc = product.description?.toLowerCase().includes(trimmed);
      return matchName || matchCategory || matchOrigin || matchDesc;
    });
  }, [products, query]);

  if (!isOpen) return null;

  const handleSelectProduct = (product: { id: number | string; name: string }) => {
    handleClose();
    navigate(`/shop/${getProductSlug(product)}`);
  };

  const handleTagClick = (tag: string) => {
    setQuery(tag);
    inputRef.current?.focus();
  };

  return (
    <div className="leafly-search-backdrop" onClick={handleClose} role="dialog" aria-modal="true" aria-label="Search teas">
      <div className="leafly-search-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Search input bar */}
        <div className="leafly-search-bar">
          <svg className="leafly-search-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="11" cy="11" r="7" />
            <line x1="16.5" y1="16.5" x2="22" y2="22" />
          </svg>

          <input
            ref={inputRef}
            type="text"
            className="leafly-search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search teas, origins, collections, teaware..."
            aria-label="Search teas"
          />

          {query && (
            <button
              type="button"
              className="leafly-search-clear-btn"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
            >
              ×
            </button>
          )}

          <button
            type="button"
            className="leafly-search-close-btn"
            onClick={handleClose}
            aria-label="Close search"
          >
            <span>ESC</span>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Search Content */}
        <div className="leafly-search-body">
          {/* Default suggestion tags when query is empty */}
          {!query.trim() && (
            <div className="leafly-search-suggestions">
              <div className="leafly-search-section-header">
                <span className="leafly-search-section-eyebrow">DISCOVER POPULAR HARVESTS</span>
              </div>
              <div className="leafly-search-tags">
                {POPULAR_SEARCHES.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="leafly-search-tag"
                    onClick={() => handleTagClick(tag)}
                  >
                    <span>{tag}</span>
                    <span className="leafly-search-tag-arrow">→</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Results List */}
          {query.trim() && searchResults.length > 0 && (
            <div className="leafly-search-results">
              <div className="leafly-search-results-count">
                <span>{searchResults.length} {searchResults.length === 1 ? "tea" : "teas"} found</span>
              </div>
              <div className="leafly-search-results-list">
                {searchResults.map((product) => (
                  <div
                    key={product.id}
                    className="leafly-search-result-item"
                    onClick={() => handleSelectProduct(product)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSelectProduct(product);
                    }}
                  >
                    <div className="leafly-search-result-thumb">
                      <img src={product.image} alt={product.name} loading="lazy" />
                    </div>
                    <div className="leafly-search-result-info">
                      <div className="leafly-search-result-meta">
                        <span className="leafly-search-result-category">{product.category}</span>
                        {product.origin && (
                          <span className="leafly-search-result-origin">· {product.origin}</span>
                        )}
                      </div>
                      <h4 className="leafly-search-result-name">{product.name}</h4>
                    </div>
                    <div className="leafly-search-result-right">
                      <span className="leafly-search-result-price">
                        {currencyFormatter.format(product.price)}
                      </span>
                      <span className="leafly-search-result-arrow">→</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No results empty state */}
          {query.trim() && searchResults.length === 0 && (
            <div className="leafly-search-empty">
              <div className="leafly-search-empty-icon">🍃</div>
              <h3>No harvests found for "{query}"</h3>
              <p>Try searching for "Green Tea", "Darjeeling", "Oolong", or "White Tea".</p>
              <div className="leafly-search-tags leafly-search-tags-center">
                {POPULAR_SEARCHES.slice(0, 4).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="leafly-search-tag"
                    onClick={() => handleTagClick(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}