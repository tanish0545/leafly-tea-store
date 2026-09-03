import { useState, useEffect, useCallback } from "react";
import "./FlyToCart.css";

interface FlyingItem {
  id: string;
  image: string;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  targetX: number;
  targetY: number;
}

export default function FlyToCart() {
  const [flyingItems, setFlyingItems] = useState<FlyingItem[]>([]);

  const handleFlyEvent = useCallback((event: CustomEvent<{ image: string; startRect?: DOMRect }>) => {
    // Honor prefers-reduced-motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Just bounce the cart icon directly
      triggerCartBounce();
      return;
    }

    const { image, startRect } = event.detail;

    // Find the cart button in Navbar (desktop or mobile)
    const cartButton =
      document.querySelector<HTMLElement>(".leafly-nav-actions .leafly-cart-nav-button") ||
      document.querySelector<HTMLElement>(".leafly-mobile-top-actions .leafly-cart-nav-button") ||
      document.querySelector<HTMLElement>(".leafly-cart-nav-button");

    if (!cartButton) return;

    const targetRect = cartButton.getBoundingClientRect();
    const targetX = targetRect.left + targetRect.width / 2;
    const targetY = targetRect.top + targetRect.height / 2;

    // Default start position if startRect is missing (e.g. center of screen)
    const startX = startRect ? startRect.left : window.innerWidth / 2 - 40;
    const startY = startRect ? startRect.top : window.innerHeight / 2 - 40;
    const startWidth = startRect ? Math.min(startRect.width, 100) : 80;
    const startHeight = startRect ? Math.min(startRect.height, 100) : 80;

    const newItemId = `fly-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const newItem: FlyingItem = {
      id: newItemId,
      image,
      startX,
      startY,
      startWidth,
      startHeight,
      targetX,
      targetY,
    };

    setFlyingItems((prev) => [...prev, newItem]);

    // Duration of flight animation is 720ms
    setTimeout(() => {
      triggerCartBounce();
      setFlyingItems((prev) => prev.filter((item) => item.id !== newItemId));
    }, 720);
  }, []);

  useEffect(() => {
    const listener = (e: Event) => handleFlyEvent(e as CustomEvent<{ image: string; startRect?: DOMRect }>);
    window.addEventListener("leafly-fly-to-cart", listener);
    return () => window.removeEventListener("leafly-fly-to-cart", listener);
  }, [handleFlyEvent]);

  if (flyingItems.length === 0) return null;

  return (
    <div className="leafly-fly-to-cart-container" aria-hidden="true">
      {flyingItems.map((item) => {
        const deltaX = item.targetX - (item.startX + item.startWidth / 2);
        const deltaY = item.targetY - (item.startY + item.startHeight / 2);

        return (
          <div
            key={item.id}
            className="flying-cart-ghost"
            style={{
              left: `${item.startX}px`,
              top: `${item.startY}px`,
              width: `${item.startWidth}px`,
              height: `${item.startHeight}px`,
              ["--delta-x" as string]: `${deltaX}px`,
              ["--delta-y" as string]: `${deltaY}px`,
            }}
          >
            <img src={item.image} alt="" className="flying-ghost-img" />
          </div>
        );
      })}
    </div>
  );
}

function triggerCartBounce() {
  const buttons = document.querySelectorAll<HTMLElement>(".leafly-cart-nav-button");
  buttons.forEach((btn) => {
    btn.classList.remove("cart-bounce");
    // Trigger reflow to restart animation cleanly
    void btn.offsetWidth;
    btn.classList.add("cart-bounce");
    setTimeout(() => {
      btn.classList.remove("cart-bounce");
    }, 500);
  });
}
