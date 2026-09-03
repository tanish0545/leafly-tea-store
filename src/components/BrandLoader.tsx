import { useState, useEffect } from "react";
import logo from "../assets/leafly-logo.webp";
import "./BrandLoader.css";

export default function BrandLoader() {
  const [visible, setVisible] = useState(() => {
    // Show on initial entry per session
    try {
      return !sessionStorage.getItem("leafly_brand_intro_seen");
    } catch {
      return true;
    }
  });
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    if (!visible) return;

    // Check for prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = prefersReducedMotion ? 400 : 1500;

    const fadeTimer = setTimeout(() => {
      setFadingOut(true);
    }, duration);

    const removeTimer = setTimeout(() => {
      setVisible(false);
      try {
        sessionStorage.setItem("leafly_brand_intro_seen", "true");
      } catch {
        // ignore
      }
    }, duration + 450);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div className={`leafly-brand-loader ${fadingOut ? "loader-fade-out" : ""}`} aria-hidden="true">
      <div className="brand-loader-backdrop" />
      
      {/* Subtle floating ambient leaves around logo */}
      <div className="brand-loader-particles">
        <span className="ambient-leaf leaf-1" />
        <span className="ambient-leaf leaf-2" />
        <span className="ambient-leaf leaf-3" />
        <span className="ambient-leaf leaf-4" />
      </div>

      <div className="brand-loader-center">
        <div className="brand-loader-logo-wrap">
          <img src={logo} alt="Leafly" className="brand-loader-logo" />
        </div>

        <div className="brand-loader-progress-track">
          <div className="brand-loader-progress-bar" />
        </div>

        <p className="brand-loader-subtitle">
          <em>Brewing something beautiful...</em>
        </p>
      </div>
    </div>
  );
}
