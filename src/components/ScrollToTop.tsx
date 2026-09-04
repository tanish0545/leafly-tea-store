import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useEffect(() => {
    if (!hash) {
      const resetScroll = () => {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      };

      // Immediate reset
      resetScroll();

      // Next paint frame reset (handles initial layout calculations)
      const rafId = requestAnimationFrame(resetScroll);

      // Post-page-transition reset (matches PageTransition 120ms fadeOut)
      const timerId = setTimeout(resetScroll, 130);

      return () => {
        cancelAnimationFrame(rafId);
        clearTimeout(timerId);
      };
    } else {
      const element = document.querySelector(hash);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [pathname, hash]);

  return null;
}
