import { useState, useEffect } from "react";
import logo from "../assets/leafly-logo.webp";
import "./BrandLoader.css";

export default function BrandLoader() {
  const [visible, setVisible] = useState(true);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    // Check for prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setVisible(false);
      return;
    }

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // 0.0s - 1.1s: Tea leaf gently floats down
    // 0.95s - 1.8s: Realistic water ripples expand
    // 1.5s - 2.6s: Book emerges and smoothly opens with Leafly branding
    // 2.65s: Smooth fade-out starts
    // 3.05s: Unmount loader
    const fadeTimer = setTimeout(() => {
      setFadingOut(true);
      document.body.style.overflow = prevOverflow;
    }, 2650);

    const removeTimer = setTimeout(() => {
      setVisible(false);
    }, 3050);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`leafly-brand-loader ${fadingOut ? "loader-fade-out" : ""}`}
      role="status"
      aria-label="Loading Leafly"
      aria-live="polite"
    >
      {/* Deep luxury forest-to-night gradient backdrop */}
      <div className="brand-loader-backdrop" />
      <div className="brand-loader-ambient-glow" />

      {/* PHASE 1 & 2: Water Surface, Falling Tea Leaf & Realistic Concentric Ripples */}
      <div className="brand-water-scene" aria-hidden="true">
        <div className="brand-water-sheen" />

        {/* Falling Green Tea Leaf */}
        <div className="brand-falling-leaf-wrap">
          <svg
            className="brand-falling-leaf-svg"
            viewBox="0 0 32 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="brand-leaf-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#62a35b" />
                <stop offset="45%" stopColor="#2e6d51" />
                <stop offset="100%" stopColor="#0d3625" />
              </linearGradient>
              <linearGradient id="brand-vein-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#dfc07b" />
                <stop offset="100%" stopColor="#c9a24b" />
              </linearGradient>
            </defs>
            {/* Elegant botanical whole tea leaf curve */}
            <path
              d="M16 2 C27 11 31 25 23 39 C19 45 16 48 16 48 C16 48 13 45 9 39 C1 25 5 11 16 2 Z"
              fill="url(#brand-leaf-grad)"
            />
            {/* Delicate gold leaf veins */}
            <path
              d="M16 7 L16 44"
              stroke="url(#brand-vein-grad)"
              strokeWidth="0.85"
              strokeLinecap="round"
              opacity="0.9"
            />
            <path d="M16 15 Q21 13 24 11" stroke="#dfc07b" strokeWidth="0.6" opacity="0.75" />
            <path d="M16 21 Q10 19 7 17" stroke="#dfc07b" strokeWidth="0.6" opacity="0.75" />
            <path d="M16 27 Q22 25 25 23" stroke="#dfc07b" strokeWidth="0.6" opacity="0.75" />
            <path d="M16 33 Q11 31 8 29" stroke="#dfc07b" strokeWidth="0.6" opacity="0.75" />
          </svg>
        </div>

        {/* Realistic Water Impact Ripples */}
        <div className="brand-impact-ripples">
          <span className="ripple r-1" />
          <span className="ripple r-2" />
          <span className="ripple r-3" />
        </div>
      </div>

      {/* PHASE 3: Book Appears and Opens with Leafly Branding */}
      <div className="brand-book-scene" aria-hidden="true">
        <div className="brand-book">
          <div className="brand-book-shadow" />

          {/* Inner Left Page (Parchment page revealed when cover swings open) */}
          <div className="brand-book-page-inner-left">
            <span className="inner-left-ornament">❧</span>
            <span className="inner-left-title">PURE LEAF</span>
            <span className="inner-left-divider" />
            <span className="inner-left-sub">SINGLE ORIGIN</span>
          </div>

          {/* Left Page / Cover (Opens with 3D perspective to reveal inside) */}
          <div className="brand-book-page-left">
            <div className="brand-book-cover-crest">
              <span className="crest-spark">✦</span>
              <span className="crest-text">LEAFLY</span>
              <span className="crest-line" />
              <span className="crest-sub">TEA PURVEYORS</span>
            </div>
          </div>

          {/* Right Page (Inner Spread with Brand Identity) */}
          <div className="brand-book-page-right">
            <span className="brand-inner-ornament">✦</span>
            <div className="brand-inner-logo-wrap">
              <img src={logo} alt="Leafly" className="brand-inner-logo" />
            </div>
            <em className="brand-inner-tagline">The Art of Mindful Tea</em>
            <span className="brand-inner-sub">EST. 2024 · SINGLE ORIGIN</span>
          </div>

          {/* Golden Centerfold Book Spine */}
          <div className="brand-book-spine" />
        </div>

        {/* Elegant typography indicator below book */}
        <div className="brand-loader-footer">
          <p className="brand-loader-caption">A MINDFUL RITUAL BEGINS</p>
          <div className="brand-loader-gold-line">
            <span />
          </div>
        </div>
      </div>
    </div>
  );
}
