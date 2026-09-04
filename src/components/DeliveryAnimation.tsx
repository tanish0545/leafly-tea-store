import { useEffect, useMemo, useState } from "react";
import deliveryBoyImg from "../assets/delivery-boy.webp";
import "./DeliveryAnimation.css";

type DeliveryAnimationProps = {
  onComplete?: () => void;
  compact?: boolean;
};

export default function DeliveryAnimation({
  onComplete,
  compact = false,
}: DeliveryAnimationProps) {
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const [phase, setPhase] = useState<"dispatching" | "confirmed">(
    prefersReducedMotion ? "confirmed" : "dispatching"
  );

  useEffect(() => {
    if (prefersReducedMotion) {
      if (onComplete) {
        const timer = window.setTimeout(() => {
          onComplete();
        }, 1500);
        return () => window.clearTimeout(timer);
      }
      return;
    }

    const t1 = window.setTimeout(() => setPhase("confirmed"), 2200);
    const t2 = onComplete ? window.setTimeout(() => onComplete(), 4200) : undefined;

    return () => {
      window.clearTimeout(t1);
      if (t2) window.clearTimeout(t2);
    };
  }, [onComplete, prefersReducedMotion]);

  return (
    <div
      className={`leafly-delivery-stage ${compact ? "leafly-delivery-compact" : "leafly-delivery-fullscreen"}`}
      role="status"
      aria-live="polite"
      aria-label="Order placed. Dispatching your tea in progress"
    >
      {/* 1. CINEMATIC DARK GREEN & WARM GOLD AMBIENT BACKGROUND */}
      <div className="leafly-delivery-ambient-wrap" aria-hidden="true">
        <div className="leafly-delivery-ambient-glow-center" />
        <div className="leafly-delivery-ambient-glow-bottom" />
        <div className="leafly-delivery-vignette" />
      </div>

      {/* 2. MAIN SCENE CONTENT */}
      <div className="leafly-delivery-scene">
        {/* HUD: TOP STATUS & TYPOGRAPHY */}
        <div className="leafly-delivery-hud-zone">
          <div className="leafly-delivery-hud">
            {phase === "dispatching" ? (
              <div className="leafly-delivery-text-block fade-in">
                <div className="leafly-delivery-eyebrow-wrap">
                  <span className="leafly-eyebrow-leaf">❧</span>
                  <p className="leafly-delivery-eyebrow">TEA RITUAL IN MOTION</p>
                  <span className="leafly-eyebrow-leaf">❧</span>
                </div>
                <h2 className="leafly-delivery-heading">DISPATCHING YOUR TEA</h2>
                <span className="leafly-delivery-subtext">Carefully packed with intention</span>
              </div>
            ) : (
              <div className="leafly-delivery-text-block pop-in">
                <span className="leafly-success-badge" aria-hidden="true">✓</span>
                <p className="leafly-delivery-eyebrow">CONFIRMED</p>
                <h2 className="leafly-delivery-heading">ORDER ON ITS JOURNEY</h2>
                <span className="leafly-delivery-subtext">Your fresh harvest tea is on its way</span>
              </div>
            )}
          </div>
        </div>

        {/* TRACK: SMOOTH GPU DELIVERY COURIER ANIMATION */}
        <div className="leafly-delivery-track-zone" aria-hidden="true">
          <div className="leafly-delivery-ground" />
          <div className="leafly-delivery-courier-stream">
            <div className="leafly-courier-glide">
              <div className="leafly-courier-bob">
                <img
                  src={deliveryBoyImg}
                  alt="Leafly Tea Courier"
                  className="leafly-courier-img"
                  loading="eager"
                  fetchPriority="high"
                />
                <div className="leafly-courier-package-glow" />
                <div className="leafly-courier-shadow" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
