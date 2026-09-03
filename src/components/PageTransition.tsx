import { type ReactNode, useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import "./PageTransition.css";

interface PageTransitionProps {
  children: ReactNode;
}

export default function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionStage, setTransitionStage] = useState<"fadeIn" | "fadeOut">("fadeIn");
  const isFirstMount = useRef(true);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    if (location.pathname !== displayLocation.pathname) {
      // Check if reduced motion is enabled
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (prefersReducedMotion) {
        setDisplayLocation(location);
        return;
      }

      setTransitionStage("fadeOut");

      const timer = setTimeout(() => {
        setDisplayLocation(location);
        setTransitionStage("fadeIn");
      }, 120);

      return () => clearTimeout(timer);
    }
  }, [location, displayLocation]);

  return (
    <div className={`leafly-page-transition-wrap ${transitionStage}`}>
      {children}
    </div>
  );
}
