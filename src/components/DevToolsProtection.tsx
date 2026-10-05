import { useEffect, useState, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import "./DevToolsProtection.css";

export default function DevToolsProtection() {
  const location = useLocation();
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);
  const isOpenRef = useRef(false);

  const isAdminRoute = location.pathname.toLowerCase().startsWith("/admin");

  // Keep ref in sync
  isOpenRef.current = isDevToolsOpen;

  const updateDevToolsState = useCallback((isOpen: boolean) => {
    if (isOpenRef.current !== isOpen) {
      isOpenRef.current = isOpen;
      setIsDevToolsOpen(isOpen);
    }
  }, []);

  // Body scroll locking when overlay is active
  useEffect(() => {
    if (isDevToolsOpen && !isAdminRoute) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    } else {
      document.body.style.overflow = "";
    }
  }, [isDevToolsOpen, isAdminRoute]);

  // Main protection effect
  useEffect(() => {
    // If on admin route, do NOT apply protection. Normal developer/admin access.
    if (isAdminRoute) {
      updateDevToolsState(false);
      return;
    }

    // 1. Block common DevTools keyboard shortcuts on customer-facing pages
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = (e.key || "").toLowerCase();
      const code = (e.code || "").toLowerCase();
      const keyCode = e.keyCode || e.which;

      // F12
      const isF12 = key === "f12" || code === "f12" || keyCode === 123;

      // Ctrl + Shift + I/J/C/K/E (Windows/Linux) or Cmd + Shift + I/J/C (Mac)
      const isCtrlShiftInspector =
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        (["i", "j", "c", "k", "e"].includes(key) ||
          ["keyi", "keyj", "keyc", "keyk", "keye"].includes(code));

      // Mac equivalents: Cmd + Option + I/J/C/U
      const isMacOptionInspector =
        e.metaKey &&
        e.altKey &&
        (["i", "j", "c", "u"].includes(key) ||
          ["keyi", "keyj", "keyc", "keyu"].includes(code));

      // Ctrl + U or Cmd + U (View Source)
      const isViewSource =
        (e.ctrlKey || e.metaKey) &&
        !e.shiftKey &&
        !e.altKey &&
        (key === "u" || code === "keyu");

      if (isF12 || isCtrlShiftInspector || isMacOptionInspector || isViewSource) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    // 2. Disable context menu (right-click) on customer-facing pages
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // 3. Lightweight DevTools-open detection (docked & undocked)
    const checkDevTools = () => {
      if (typeof window === "undefined") return;

      const outerW = window.outerWidth;
      const outerH = window.outerHeight;
      const innerW = window.innerWidth;
      const innerH = window.innerHeight;

      if (!outerW || !outerH || !innerW || !innerH) return;

      const rawWidthDiff = outerW - innerW;
      const rawHeightDiff = outerH - innerH;

      // Docked checks (robust against browser zoom):
      // - Docked to right/left: width shrinks significantly while height difference is standard chrome (< 160px)
      const isDockedSide = rawWidthDiff > 180 && rawHeightDiff < 160;
      // - Docked to bottom: height shrinks significantly while width difference is standard borders (< 40px)
      const isDockedBottom = rawHeightDiff > 220 && rawWidthDiff < 40;

      // Undocked / Console evaluation check
      let isConsoleOpen = false;
      try {
        const probe = /./;
        probe.toString = function () {
          isConsoleOpen = true;
          return "";
        };
        // Console evaluation triggers toString when DevTools console panel is active
        console.table({ probe });
      } catch {
        // Fallback safely
      }

      const isOpen = isDockedSide || isDockedBottom || isConsoleOpen;
      updateDevToolsState(isOpen);
    };

    // Attach listeners with capture to intercept before any other handlers
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    document.addEventListener("contextmenu", handleContextMenu, { capture: true });
    window.addEventListener("resize", checkDevTools, { passive: true });
    window.addEventListener("focus", checkDevTools, { passive: true });

    // Initial check
    checkDevTools();

    // Gentle 800ms polling to catch DevTools opening/closing without user interaction
    const intervalId = window.setInterval(checkDevTools, 800);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      document.removeEventListener("contextmenu", handleContextMenu, { capture: true });
      window.removeEventListener("resize", checkDevTools);
      window.removeEventListener("focus", checkDevTools);
      window.clearInterval(intervalId);
    };
  }, [isAdminRoute, updateDevToolsState]);

  // If on admin route or DevTools is not detected, do not render overlay
  if (isAdminRoute || !isDevToolsOpen) {
    return null;
  }

  return (
    <div
      className="leafly-devtools-overlay"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="leafly-devtools-title"
      aria-describedby="leafly-devtools-desc"
    >
      <div className="leafly-devtools-card">
        {/* Brand Badge */}
        <div className="leafly-devtools-badge">
          <span className="leafly-devtools-badge-dot" />
          <span className="leafly-devtools-badge-text">Leafly Security</span>
        </div>

        {/* Shield / Leaf Gold Emblem */}
        <div className="leafly-devtools-icon-wrapper" aria-hidden="true">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M12 8c2 2 2 5 0 7-2-2-2-5 0-7z" />
          </svg>
        </div>

        {/* Title */}
        <h2 id="leafly-devtools-title" className="leafly-devtools-title">
          Developer Tools Restricted
        </h2>

        {/* Ornamental Divider */}
        <div className="leafly-devtools-divider" aria-hidden="true" />

        {/* Core Message */}
        <p id="leafly-devtools-desc" className="leafly-devtools-message">
          This area is restricted to authorized developers.
        </p>

        {/* Minimal Hint */}
        <p className="leafly-devtools-hint">
          Please close developer tools to resume your browsing experience.
        </p>
      </div>
    </div>
  );
}
