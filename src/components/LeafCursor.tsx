import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import "./LeafCursor.css";

export default function LeafCursor() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");

  const [visible, setVisible] = useState(false);
  const [cursorState, setCursorState] = useState<"normal" | "hover" | "cart" | "clicking">("normal");
  const [isTextInput, setIsTextInput] = useState(false);

  const cursorRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: -100, y: -100 });
  const target = useRef({ x: -100, y: -100 });
  const animFrameId = useRef<number | null>(null);

  // Check if device is touch or prefers reduced motion
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const checkTouch = () => {
      return (
        window.matchMedia("(pointer: coarse)").matches ||
        "ontouchstart" in window ||
        navigator.maxTouchPoints > 0
      );
    };
    setIsTouchDevice(checkTouch());
  }, []);

  useEffect(() => {
    if (isAdmin || isTouchDevice) {
      document.documentElement.classList.remove("has-leaf-cursor");
      return;
    }

    document.documentElement.classList.add("has-leaf-cursor");

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const onMouseMove = (e: MouseEvent) => {
      target.current = { x: e.clientX, y: e.clientY };
      if (!visible) setVisible(true);

      // Inspect hovered target to determine state
      const targetEl = e.target as HTMLElement | null;
      if (!targetEl) return;

      // Detect text inputs / textareas to yield to native text I-beam
      const isInput =
        targetEl.tagName === "INPUT" &&
        !["button", "submit", "reset", "checkbox", "radio"].includes(
          (targetEl as HTMLInputElement).type
        );
      const isTextArea = targetEl.tagName === "TEXTAREA";
      const isEditable = targetEl.isContentEditable;

      if (isInput || isTextArea || isEditable) {
        setIsTextInput(true);
        return;
      } else {
        setIsTextInput(false);
      }

      // Detect clickable or cart elements
      const isCartBtn = Boolean(
        targetEl.closest(".pdp-cart-button, .pdp-buy-now-button, .btn-add-to-cart, [data-cart-action]")
      );
      const isClickable = Boolean(
        targetEl.closest(
          "button, a, [role='button'], .pdp-thumb-btn, .gallery-thumb-btn, select, label, .clickable, .tab-item, input[type='submit']"
        )
      );

      if (isCartBtn) {
        setCursorState("cart");
      } else if (isClickable) {
        setCursorState("hover");
      } else {
        setCursorState("normal");
      }
    };

    const onMouseDown = () => {
      setCursorState("clicking");
    };

    const onMouseUp = () => {
      setCursorState("normal");
    };

    const onMouseLeave = () => {
      setVisible(false);
    };

    const onMouseEnter = () => {
      setVisible(true);
    };

    // Smooth animation loop
    const updateCursor = () => {
      if (prefersReducedMotion) {
        pos.current.x = target.current.x;
        pos.current.y = target.current.y;
      } else {
        // Subtle lerp for ultra-smooth fluid movement
        pos.current.x += (target.current.x - pos.current.x) * 0.75;
        pos.current.y += (target.current.y - pos.current.y) * 0.75;
      }

      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0)`;
      }

      animFrameId.current = requestAnimationFrame(updateCursor);
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    document.addEventListener("mouseleave", onMouseLeave);
    document.addEventListener("mouseenter", onMouseEnter);

    animFrameId.current = requestAnimationFrame(updateCursor);

    return () => {
      document.documentElement.classList.remove("has-leaf-cursor");
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("mouseenter", onMouseEnter);
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [isAdmin, isTouchDevice, visible]);

  if (isAdmin || isTouchDevice) {
    return null;
  }

  return (
    <div
      ref={cursorRef}
      className={`leaf-cursor-wrapper ${visible && !isTextInput ? "visible" : "hidden"} state-${cursorState}`}
      aria-hidden="true"
    >
      {/* LUXURY LEAFLY TEA LEAF SVG */}
      <svg
        className="leaf-cursor-svg"
        viewBox="0 0 32 32"
        width="28"
        height="28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Gradients for natural Leafly green body and warm gold spine */}
          <linearGradient id="leafBodyGrad" x1="2" y1="2" x2="28" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#134e38" />
            <stop offset="60%" stopColor="#0b2b1e" />
            <stop offset="100%" stopColor="#061d14" />
          </linearGradient>

          <linearGradient id="leafVeinGold" x1="4" y1="4" x2="26" y2="26" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#dfbc6d" />
            <stop offset="50%" stopColor="#c9a24b" />
            <stop offset="100%" stopColor="#9a7322" />
          </linearGradient>

          <filter id="leafGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="2.5" floodColor="#061d14" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* Outer botanical leaf contour */}
        <path
          d="M3.5 3.5 C 3.5 3.5, 14 2, 22.5 10.5 C 29.5 17.5, 28 26.5, 27 28 C 25.5 27, 16.5 25.5, 9.5 18.5 C 2 10.5, 3.5 3.5, 3.5 3.5 Z"
          fill="url(#leafBodyGrad)"
          stroke="#c9a24b"
          strokeWidth="0.85"
          filter="url(#leafGlow)"
          className="leaf-silhouette"
        />

        {/* Central main vein leading to leaf apex */}
        <path
          d="M3.5 3.5 Q 14 14, 27 28"
          stroke="url(#leafVeinGold)"
          strokeWidth="1.2"
          strokeLinecap="round"
          className="leaf-spine"
        />

        {/* Lateral veins */}
        <path
          d="M9 9 Q 14 8, 17 6.5"
          stroke="#c9a24b"
          strokeWidth="0.75"
          strokeOpacity="0.75"
          strokeLinecap="round"
        />
        <path
          d="M14 14 Q 19 13.5, 22 11.5"
          stroke="#c9a24b"
          strokeWidth="0.75"
          strokeOpacity="0.75"
          strokeLinecap="round"
        />
        <path
          d="M12 12 Q 10 16, 7.5 19"
          stroke="#c9a24b"
          strokeWidth="0.75"
          strokeOpacity="0.7"
          strokeLinecap="round"
        />
        <path
          d="M17 17 Q 16 21, 14 23.5"
          stroke="#c9a24b"
          strokeWidth="0.75"
          strokeOpacity="0.7"
          strokeLinecap="round"
        />

        {/* Golden dewdrop glint at leaf tip */}
        <circle cx="4.5" cy="4.5" r="1" fill="#dfbc6d" className="leaf-glint" />
      </svg>
    </div>
  );
}
