import { useEffect, useRef, useCallback } from "react";
import "./GreenTeaBenefits.css";

/**
 * Seven real photographic/realistic editorial benefits for green tea:
 * 1. Belly Fat Reduction (public/images/benefits/belly-fat-reduction.webp)
 * 2. Supports Healthy Hair (public/images/benefits/healthy-hair.webp)
 * 3. Helps Manage Sugar (public/images/benefits/sugar-management.webp)
 * 4. Supports Heart Health (public/images/benefits/heart-health.webp)
 * 5. Improves Digestion (public/images/benefits/digestion.webp)
 * 6. Immunity Booster (public/images/benefits/immunity.webp)
 * 7. Collagen Booster (public/images/benefits/collagen.webp)
 */
interface BenefitItem {
  id: number;
  title: string;
  image: string;
  alt: string;
}

const GREEN_TEA_BENEFITS: BenefitItem[] = [
  {
    id: 1,
    title: "Belly Fat Reduction",
    image: "/images/benefits/belly-fat-reduction.webp",
    alt: "Belly Fat Reduction — person measuring waist with measuring tape",
  },
  {
    id: 2,
    title: "Supports Healthy Hair",
    image: "/images/benefits/healthy-hair.webp",
    alt: "Supports Healthy Hair — long, shiny, lustrous healthy hair",
  },
  {
    id: 3,
    title: "Helps Manage Sugar",
    image: "/images/benefits/sugar-management.webp",
    alt: "Helps Manage Sugar — hand holding a blood glucose monitor",
  },
  {
    id: 4,
    title: "Supports Heart Health",
    image: "/images/benefits/heart-health.webp",
    alt: "Supports Heart Health — anatomical human heart medical illustration",
  },
  {
    id: 5,
    title: "Improves Digestion",
    image: "/images/benefits/digestion.webp",
    alt: "Improves Digestion — human digestive system anatomical illustration",
  },
  {
    id: 6,
    title: "Immunity Booster",
    image: "/images/benefits/immunity.webp",
    alt: "Immunity Booster — scientific microscopic illustration of immune cells",
  },
  {
    id: 7,
    title: "Collagen Booster",
    image: "/images/benefits/collagen.webp",
    alt: "Collagen Booster — close-up of healthy, radiant, glowing skin texture",
  },
];

export default function GreenTeaBenefits() {
  const trackRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const singleSetRef = useRef<HTMLDivElement>(null);

  // Position & physics references
  const offsetRef = useRef<number>(0);
  const isPausedRef = useRef<boolean>(false);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartXRef = useRef<number>(0);
  const dragStartOffsetRef = useRef<number>(0);
  const lastTimeRef = useRef<number | null>(null);
  const singleSetWidthRef = useRef<number>(1400);

  // Smooth train-like speed: 34 pixels per second (calm, fluid, legible)
  const SPEED_PX_PER_SEC = 34;

  // Measure single set width for seamless wrap
  const measureSetWidth = useCallback(() => {
    if (singleSetRef.current) {
      const width = singleSetRef.current.offsetWidth;
      if (width > 0) {
        singleSetWidthRef.current = width;
      }
    }
  }, []);

  // Update layout & dimensions on mount and resize
  useEffect(() => {
    measureSetWidth();
    const handleResize = () => {
      measureSetWidth();
    };
    window.addEventListener("resize", handleResize, { passive: true });
    return () => window.removeEventListener("resize", handleResize);
  }, [measureSetWidth]);

  // Continuous right-to-left animation loop
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let prefersReducedMotion = mediaQuery.matches;

    const handleMotionChange = (e: MediaQueryListEvent) => {
      prefersReducedMotion = e.matches;
    };
    mediaQuery.addEventListener("change", handleMotionChange);

    let animationFrameId: number;

    const animate = (timestamp: number) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = timestamp;
      }
      const deltaTime = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      // Only advance automatically if not paused, not dragging, and reduced motion is off
      if (!isPausedRef.current && !isDraggingRef.current && !prefersReducedMotion) {
        const deltaPixels = SPEED_PX_PER_SEC * Math.min(deltaTime, 0.1);
        offsetRef.current += deltaPixels;

        const maxOffset = singleSetWidthRef.current;
        if (maxOffset > 0 && offsetRef.current >= maxOffset) {
          offsetRef.current = offsetRef.current % maxOffset;
        }
      }

      // Hardware-accelerated subpixel translation
      if (trackRef.current) {
        trackRef.current.style.transform = `translate3d(-${offsetRef.current}px, 0, 0)`;
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
      mediaQuery.removeEventListener("change", handleMotionChange);
    };
  }, []);

  // Manual Previous/Next Controls (smooth single item step)
  const handleNudge = (direction: "prev" | "next") => {
    const itemStep = singleSetWidthRef.current / GREEN_TEA_BENEFITS.length;
    const step = itemStep > 0 ? itemStep : 160;

    if (direction === "next") {
      offsetRef.current += step;
    } else {
      offsetRef.current -= step;
      if (offsetRef.current < 0) {
        offsetRef.current += singleSetWidthRef.current;
      }
    }

    if (singleSetWidthRef.current > 0 && offsetRef.current >= singleSetWidthRef.current) {
      offsetRef.current = offsetRef.current % singleSetWidthRef.current;
    }

    if (trackRef.current) {
      trackRef.current.style.transform = `translate3d(-${offsetRef.current}px, 0, 0)`;
    }
  };

  // Touch handlers for natural mobile swiping
  const handleTouchStart = (e: React.TouchEvent) => {
    isDraggingRef.current = true;
    dragStartXRef.current = e.touches[0].clientX;
    dragStartOffsetRef.current = offsetRef.current;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current) return;
    const currentX = e.touches[0].clientX;
    const diff = dragStartXRef.current - currentX;
    let newOffset = dragStartOffsetRef.current + diff;

    const maxOffset = singleSetWidthRef.current;
    if (maxOffset > 0) {
      while (newOffset < 0) newOffset += maxOffset;
      if (newOffset >= maxOffset) newOffset = newOffset % maxOffset;
    }

    offsetRef.current = newOffset;
    if (trackRef.current) {
      trackRef.current.style.transform = `translate3d(-${offsetRef.current}px, 0, 0)`;
    }
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
  };

  return (
    <section
      className="gt-benefits-section"
      aria-label="Green Tea Botanical Benefits"
    >
      <div className="gt-benefits-container">
        {/* SECTION HEADER */}
        <div className="gt-benefits-header">
          <div className="gt-benefits-eyebrow">
            <span className="gt-eyebrow-line" />
            <span className="gt-eyebrow-leaf">🍃</span>
            <p>DAILY BOTANICAL VITALITY</p>
            <span className="gt-eyebrow-line" />
          </div>
          <h2 className="gt-benefits-title">
            Whole Leaf Goodness, <em>Natural Harmony.</em>
          </h2>
          <p className="gt-benefits-subtitle">
            Gently hand-harvested green tea leaves rich in natural antioxidants, crafted to support your daily ritual and holistic well-being.
          </p>
        </div>

        {/* CAROUSEL VIEWPORT WITH CONTROLS & SOFT GRADIENT EDGE MASKS */}
        <div
          className="gt-carousel-viewport"
          ref={containerRef}
          onMouseEnter={() => {
            isPausedRef.current = true;
          }}
          onMouseLeave={() => {
            isPausedRef.current = false;
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          {/* Previous Arrow Control */}
          <button
            type="button"
            className="gt-carousel-arrow gt-arrow-prev"
            onClick={() => handleNudge("prev")}
            aria-label="Previous green tea benefits"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          {/* Left/Right Edge Gradient Shields for Seamless Bleed */}
          <div className="gt-edge-shield gt-edge-left" aria-hidden="true" />
          <div className="gt-edge-shield gt-edge-right" aria-hidden="true" />

          {/* TRAIN TRACK — CONTINUOUS RIGHT-TO-LEFT HORIZONTAL MOTION */}
          <div className="gt-carousel-track" ref={trackRef}>
            {/* SET 1: Primary Accessible Set */}
            <div className="gt-benefits-set" ref={singleSetRef}>
              {GREEN_TEA_BENEFITS.map((benefit) => (
                <div
                  className="gt-benefit-item"
                  key={`set1-${benefit.id}`}
                >
                  <div className="gt-benefit-image-wrap">
                    <img
                      src={benefit.image}
                      alt={benefit.alt}
                      className="gt-benefit-image"
                      width={120}
                      height={120}
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <h3 className="gt-benefit-title">{benefit.title}</h3>
                </div>
              ))}
            </div>

            {/* SET 2: Duplicated for Seamless Infinite Loop */}
            <div className="gt-benefits-set" aria-hidden="true">
              {GREEN_TEA_BENEFITS.map((benefit) => (
                <div
                  className="gt-benefit-item"
                  key={`set2-${benefit.id}`}
                >
                  <div className="gt-benefit-image-wrap">
                    <img
                      src={benefit.image}
                      alt=""
                      className="gt-benefit-image"
                      width={120}
                      height={120}
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <div className="gt-benefit-title">{benefit.title}</div>
                </div>
              ))}
            </div>

            {/* SET 3: Additional Duplication for Ultrawide Displays */}
            <div className="gt-benefits-set" aria-hidden="true">
              {GREEN_TEA_BENEFITS.map((benefit) => (
                <div
                  className="gt-benefit-item"
                  key={`set3-${benefit.id}`}
                >
                  <div className="gt-benefit-image-wrap">
                    <img
                      src={benefit.image}
                      alt=""
                      className="gt-benefit-image"
                      width={120}
                      height={120}
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <div className="gt-benefit-title">{benefit.title}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Next Arrow Control */}
          <button
            type="button"
            className="gt-carousel-arrow gt-arrow-next"
            onClick={() => handleNudge("next")}
            aria-label="Next green tea benefits"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
