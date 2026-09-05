import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import "./ProductGallery.css";

interface ProductGalleryProps {
  images: string[];
  productName: string;
  badgeText?: string | null;
  badgeStyle?: React.CSSProperties;
  inStock?: boolean;
  isTeaware?: boolean;
}

export default function ProductGallery({
  images,
  productName,
  badgeText,
  badgeStyle,
  inStock = true,
  isTeaware = false,
}: ProductGalleryProps) {
  // Ensure we always have at least 1 image
  const galleryImages = images.length > 0 ? images : ["/leafly-green-tea.webp"];

  const [activeIndex, setActiveIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isZooming, setIsZooming] = useState(false);
  const [zoomCoords, setZoomCoords] = useState({ x: 50, y: 50 });

  // Touch tracking for mobile swipe
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  // Reset active index when images change (e.g. user navigates between products)
  useEffect(() => {
    setActiveIndex(0);
  }, [galleryImages[0]]);

  const handleNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % galleryImages.length);
  }, [galleryImages.length]);

  const handlePrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
  }, [galleryImages.length]);

  const handleLightboxNext = useCallback(() => {
    setLightboxIndex((prev) => (prev + 1) % galleryImages.length);
  }, [galleryImages.length]);

  const handleLightboxPrev = useCallback(() => {
    setLightboxIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
  }, [galleryImages.length]);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setIsLightboxOpen(true);
  };

  const closeLightbox = () => {
    setIsLightboxOpen(false);
  };

  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (!isLightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeLightbox();
      } else if (e.key === "ArrowRight") {
        handleLightboxNext();
      } else if (e.key === "ArrowLeft") {
        handleLightboxPrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    // Lock background body scroll while lightbox is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isLightboxOpen, handleLightboxNext, handleLightboxPrev]);

  // Handle desktop mouse zoom
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomCoords({ x, y });
  };

  // Touch handlers for swipe gesture
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const onTouchEnd = (e: React.TouchEvent, isLightbox = false) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const diffX = touchStartX.current - e.changedTouches[0].clientX;
    const diffY = touchStartY.current - e.changedTouches[0].clientY;

    // Only swipe if horizontal motion exceeds vertical motion by reasonable margin
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 40) {
      if (diffX > 0) {
        // Swiped left -> next
        if (isLightbox) handleLightboxNext();
        else handleNext();
      } else {
        // Swiped right -> prev
        if (isLightbox) handleLightboxPrev();
        else handlePrev();
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const activeImage = galleryImages[activeIndex] || galleryImages[0];

  return (
    <div className="product-gallery-container">
      {/* MAIN LARGE IMAGE STAGE */}
      <div
        className="gallery-main-stage"
        onMouseEnter={() => setIsZooming(true)}
        onMouseLeave={() => setIsZooming(false)}
        onMouseMove={handleMouseMove}
        onClick={() => openLightbox(activeIndex)}
        onTouchStart={onTouchStart}
        onTouchEnd={(e) => onTouchEnd(e, false)}
        role="button"
        tabIndex={0}
        aria-label={`View fullscreen image of ${productName}`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openLightbox(activeIndex);
          }
        }}
      >
        <div className="gallery-main-frame">
          <img
            key={activeImage}
            src={activeImage}
            alt={`${productName} - View ${activeIndex + 1}`}
            className={`gallery-main-img ${isZooming ? "zoomed" : ""}`}
            style={
              isZooming
                ? {
                    transformOrigin: `${zoomCoords.x}% ${zoomCoords.y}%`,
                  }
                : undefined
            }
            loading="eager"
            fetchPriority="high"
            decoding="async"
          />
        </div>

        {/* BADGES */}
        {!inStock ? (
          <span
            className="gallery-badge out-of-stock"
            style={{
              background: isTeaware ? "#0b2b1e" : "#c53030",
              color: isTeaware ? "#c9a24b" : "#ffffff",
              border: isTeaware ? "1px solid rgba(201,162,75,0.4)" : "none",
            }}
          >
            {isTeaware ? "Coming Soon" : "Out of Stock"}
          </span>
        ) : badgeText ? (
          <span className="gallery-badge" style={badgeStyle}>
            {badgeText}
          </span>
        ) : null}

        {/* EXPAND / ZOOM HINT BUTTON */}
        <button
          type="button"
          className="gallery-expand-btn"
          onClick={(e) => {
            e.stopPropagation();
            openLightbox(activeIndex);
          }}
          aria-label="Open fullscreen gallery"
          title="Click to expand"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
          </svg>
        </button>

        {/* PREV / NEXT CHEVRONS ON DESKTOP HOVER / MOBILE */}
        {galleryImages.length > 1 && (
          <>
            <button
              type="button"
              className="gallery-stage-nav prev"
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              aria-label="Previous product image"
            >
              ‹
            </button>
            <button
              type="button"
              className="gallery-stage-nav next"
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              aria-label="Next product image"
            >
              ›
            </button>
          </>
        )}

        {/* DOT INDICATOR FOR MOBILE */}
        {galleryImages.length > 1 && (
          <div className="gallery-mobile-dots">
            {galleryImages.map((_, idx) => (
              <span
                key={idx}
                className={`gallery-dot ${idx === activeIndex ? "active" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveIndex(idx);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* THUMBNAILS STRIP */}
      {galleryImages.length > 1 && (
        <div className="gallery-thumbnails-strip" aria-label="Product thumbnails">
          {galleryImages.map((imgUrl, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button
                key={idx}
                type="button"
                className={`gallery-thumb-btn ${isActive ? "active" : ""}`}
                onClick={() => setActiveIndex(idx)}
                aria-label={`Select product image ${idx + 1} of ${galleryImages.length}`}
                aria-current={isActive ? "true" : undefined}
              >
                <img
                  src={imgUrl}
                  alt={`${productName} thumbnail ${idx + 1}`}
                  className="gallery-thumb-img"
                  loading="lazy"
                  decoding="async"
                />
                <span className="thumb-active-glow" />
              </button>
            );
          })}
        </div>
      )}

      {/* LIGHTBOX MODAL */}
      {isLightboxOpen &&
        createPortal(
          <div
            className="gallery-lightbox-overlay"
            onClick={closeLightbox}
            role="dialog"
            aria-modal="true"
            aria-label={`${productName} gallery modal`}
          >
            <div
              className="gallery-lightbox-content"
              onClick={(e) => e.stopPropagation()}
              onTouchStart={onTouchStart}
              onTouchEnd={(e) => onTouchEnd(e, true)}
            >
              {/* TOP CONTROLS */}
              <div className="lightbox-top-bar">
                <div className="lightbox-title-box">
                  <span className="lightbox-brand">LEAFLY SANCTUARY</span>
                  <h4 className="lightbox-product-name">{productName}</h4>
                  <span className="lightbox-counter">
                    Image {lightboxIndex + 1} of {galleryImages.length}
                  </span>
                </div>
                <button
                  type="button"
                  className="lightbox-close-btn"
                  onClick={closeLightbox}
                  aria-label="Close fullscreen gallery"
                >
                  ✕
                </button>
              </div>

              {/* MAIN LIGHTBOX IMAGE */}
              <div className="lightbox-img-wrapper">
                <img
                  key={galleryImages[lightboxIndex]}
                  src={galleryImages[lightboxIndex]}
                  alt={`${productName} - Fullscreen View ${lightboxIndex + 1}`}
                  className="lightbox-img"
                />

                {galleryImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      className="lightbox-nav-btn prev"
                      onClick={handleLightboxPrev}
                      aria-label="Previous image"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      className="lightbox-nav-btn next"
                      onClick={handleLightboxNext}
                      aria-label="Next image"
                    >
                      ›
                    </button>
                  </>
                )}
              </div>

              {/* BOTTOM THUMBNAILS CAROUSEL */}
              {galleryImages.length > 1 && (
                <div className="lightbox-bottom-strip">
                  {galleryImages.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`lightbox-thumb ${idx === lightboxIndex ? "active" : ""}`}
                      onClick={() => setLightboxIndex(idx)}
                      aria-label={`Jump to image ${idx + 1}`}
                    >
                      <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
