import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import heroVideo from "../assets/leafly-hero.mp4";
import heroPoster from "../assets/leafly-hero-poster.webp";
import "./Hero.css";

export default function Hero() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    const hero = heroRef.current;
    if (!video || !hero || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.15 }
    );

    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="hero" ref={heroRef} className="hero-section">

      {/* =====================================================
          FULLSCREEN BACKGROUND VIDEO
          ===================================================== */}

      <video
        ref={videoRef}
        className="hero-background-video"
        src={heroVideo}
        poster={heroPoster}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
        aria-label="Leafly artisanal tea harvesting and mindful brewing ritual"
      />

      {/* =====================================================
          CINEMATIC OVERLAYS
          ===================================================== */}

      <div className="hero-overlay" />
      <div className="hero-vignette" />

      {/* =====================================================
          HERO CONTENT
          ===================================================== */}

      <div className="hero-content-wrapper">

        <div className="hero-copy">

          {/* Eyebrow */}

          <p className="hero-eyebrow">
            PREMIUM TEA · CRAFTED WITH INTENTION
          </p>

          {/* Main heading */}

          <h1 className="hero-title">
            Steeped in a
            <br />
            Different Kind
            <br />
            <span>of Luxury.</span>
          </h1>

          {/* Description */}

          <p className="hero-description">
            Exceptional leaves. Thoughtful craft. A refined tea experience
            created for slower, more mindful moments.
          </p>

          {/* CTA Buttons */}

          <div className="hero-actions">

            <Link
              to="/shop"
              className="hero-primary-button"
            >
              <span className="button-label">
                SHOP COLLECTION
              </span>

              <span className="button-arrow">
                →
              </span>
            </Link>

            <Link
              to="/about"
              className="hero-secondary-button"
            >
              <span className="button-label">
                DISCOVER LEAFLY
              </span>

              <span className="button-arrow">
                →
              </span>
            </Link>

          </div>

        </div>
      </div>

      {/* =====================================================
          BOTTOM INFORMATION
          ===================================================== */}

      <div className="hero-bottom">

        {/* Brand caption */}

        <div className="hero-brand-caption">

          <span className="brand-line" />

          <p>
            LEAFLY · NATURAL TEA
          </p>

        </div>

        {/* =================================================
            CENTER SCROLL INDICATOR
            ================================================= */}

        <div className="hero-scroll">

          <span className="scroll-label">
            SCROLL
          </span>

          <div className="mouse-scroll">

            <div className="mouse-wheel" />

          </div>

        </div>

      </div>

    </section>
  );
}