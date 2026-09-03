import { useLocation } from "react-router-dom";
import { useMemo } from "react";
import "./FloatingLeaves.css";

// Allowed pages for floating tea leaves atmosphere
const ALLOWED_PAGE_PREFIXES = [
  "/",
  "/why-leafly",
  "/tea-collections",
  "/collections",
  "/tea-maker",
  "/journal",
  "/gifting",
  "/teaware",
  "/shop",
];

// Strictly suppressed on admin, checkout, auth
const SUPPRESSED_PAGE_PREFIXES = [
  "/checkout",
  "/login",
  "/signup",
  "/reset-password",
  "/admin",
];

// Deterministic leaf parameters to avoid continuous re-rendering
const LEAF_CONFIGS = [
  { id: 1, left: "8%", size: 22, duration: 18, delay: 0, drift: 35, rotateStart: 15, rotateEnd: 210, opacity: 0.18 },
  { id: 2, left: "24%", size: 16, duration: 22, delay: 4, drift: -25, rotateStart: -20, rotateEnd: 160, opacity: 0.14 },
  { id: 3, left: "45%", size: 26, duration: 20, delay: 8, drift: 40, rotateStart: 45, rotateEnd: 270, opacity: 0.22 },
  { id: 4, left: "68%", size: 18, duration: 24, delay: 2, drift: -30, rotateStart: 0, rotateEnd: 195, opacity: 0.16 },
  { id: 5, left: "86%", size: 24, duration: 19, delay: 6, drift: 28, rotateStart: 30, rotateEnd: 240, opacity: 0.20 },
  { id: 6, left: "35%", size: 15, duration: 25, delay: 11, drift: -20, rotateStart: -40, rotateEnd: 180, opacity: 0.15 },
  { id: 7, left: "78%", size: 20, duration: 21, delay: 13, drift: 32, rotateStart: 10, rotateEnd: 220, opacity: 0.18 },
];

export default function FloatingLeaves() {
  const location = useLocation();

  const isEnabled = useMemo(() => {
    const path = location.pathname.toLowerCase();
    
    // Check if suppressed
    if (SUPPRESSED_PAGE_PREFIXES.some(prefix => path.startsWith(prefix))) {
      return false;
    }

    // Check if on allowed page
    if (path === "/" || ALLOWED_PAGE_PREFIXES.some(prefix => path.startsWith(prefix))) {
      return true;
    }

    return false;
  }, [location.pathname]);

  if (!isEnabled) return null;

  return (
    <div className="leafly-floating-leaves-container" aria-hidden="true">
      {LEAF_CONFIGS.map((leaf) => (
        <div
          key={leaf.id}
          className={`floating-tea-leaf leaf-variant-${leaf.id}`}
          style={{
            left: leaf.left,
            width: `${leaf.size}px`,
            height: `${leaf.size}px`,
            animationDuration: `${leaf.duration}s`,
            animationDelay: `${leaf.delay}s`,
            opacity: leaf.opacity,
            ["--leaf-drift" as string]: `${leaf.drift}px`,
            ["--leaf-rot-start" as string]: `${leaf.rotateStart}deg`,
            ["--leaf-rot-end" as string]: `${leaf.rotateEnd}deg`,
          }}
        >
          {/* Organic Tea Leaf SVG Silhouette */}
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M20.5 3.5C14 4 6 9.5 4.5 16C3.5 20.5 7 21.5 9.5 20.5C14.5 18.5 20 10.5 20.5 3.5Z"
              fill="#2D5A43"
            />
            <path
              d="M5.5 17.5C10 14 15 8.5 19 4.5"
              stroke="#C9A24B"
              strokeWidth="0.8"
              strokeLinecap="round"
              strokeOpacity="0.6"
            />
          </svg>
        </div>
      ))}
    </div>
  );
}
