/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ProductVariantKey, Product } from "../data/products";
import type { TeawareItem } from "../data/teaware";
import type { GiftHamper } from "../data/gifting";
import { useProducts } from "./ProductContext";
import { useTeaware } from "./TeawareContext";
import { useGifting } from "./GiftingContext";

export type CartProduct = {
  id: number | string;
  name: string;
  category: string;
  origin: string;
  caffeine: string;
  weight: string;
  price: number;
  oldPrice?: number;
  badge?: string;
  image: string;
  stock?: number;
  inStock?: boolean;
};

export type CartItem = {
  id: string; // Composite key: `${product.id}-${variant}`
  product: CartProduct;
  variant: ProductVariantKey;
  weight: string;
  price: number;
  oldPrice?: number;
  quantity: number;
};

type CartContextType = {
  items: CartItem[];
  cartCount: number;
  subtotal: number;
  isCartOpen: boolean;
  animatingProduct: CartProduct | null;

  addToCart: (
    product: CartProduct,
    quantity?: number,
    variant?: ProductVariantKey,
    customPrice?: number,
    customOldPrice?: number
  ) => void;
  triggerAddedAnimation: (product: CartProduct) => void;
  closeAddedAnimation: () => void;
  increaseQuantity: (id: string | number) => void;
  decreaseQuantity: (id: string | number) => void;
  removeFromCart: (id: string | number) => void;
  clearCart: () => void;

  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
};

const CartContext = createContext<
  CartContextType | undefined
>(undefined);

const STORAGE_KEY = "leafly-cart-v2";

import AddedToRitualModal from "../components/AddedToRitualModal";

export function resolveLiveCatalogProduct(
  itemProduct: CartProduct,
  products: Product[],
  teaware: TeawareItem[],
  hampers: GiftHamper[]
): { price: number; oldPrice?: number; stock: number; inStock: boolean; image: string; name: string } | null {
  const pId = String(itemProduct.id);
  const pCat = itemProduct.category || "";

  // 1. Check Gifting Hampers
  if (pCat === "Luxury Gift Sets" || pCat === "Gift Hamper" || pCat.toLowerCase().includes("hamper") || pCat.toLowerCase().includes("gift")) {
    const match = hampers.find(h => String(h.id) === pId || h.name === itemProduct.name);
    if (match) {
      const stock = typeof match.stock === "number" ? match.stock : 10;
      return {
        price: Number(match.price) || 0,
        oldPrice: match.oldPrice ? Number(match.oldPrice) : undefined,
        stock,
        inStock: match.inStock !== false && stock > 0,
        image: match.image,
        name: match.name,
      };
    }
  }

  // 2. Check Teaware
  if (
    pCat === "Teapots" ||
    pCat === "Tea Cups" ||
    pCat === "Serving & Trays" ||
    pCat === "Storage & Accessories" ||
    itemProduct.caffeine === "Teaware"
  ) {
    const match = teaware.find(t => String(t.id) === pId || t.name === itemProduct.name);
    if (match) {
      const stock = typeof match.stock === "number" ? match.stock : 10;
      return {
        price: Number(match.price) || 0,
        oldPrice: match.oldPrice ? Number(match.oldPrice) : undefined,
        stock,
        inStock: match.inStock !== false && stock > 0,
        image: match.image,
        name: match.name,
      };
    }
  }

  // 3. Check Tea Products
  const teaMatch = products.find(p => String(p.id) === pId || p.name === itemProduct.name);
  if (teaMatch) {
    const stock = typeof teaMatch.stock === "number" ? teaMatch.stock : 10;
    return {
      price: Number(teaMatch.price) || 0,
      oldPrice: teaMatch.oldPrice ? Number(teaMatch.oldPrice) : undefined,
      stock,
      inStock: teaMatch.inStock !== false && stock > 0,
      image: teaMatch.image,
      name: teaMatch.name,
    };
  }

  // 4. Fallback search across teaware then hampers if category wasn't explicit
  const twFallback = teaware.find(t => String(t.id) === pId && t.name === itemProduct.name);
  if (twFallback) {
    const stock = typeof twFallback.stock === "number" ? twFallback.stock : 10;
    return {
      price: Number(twFallback.price) || 0,
      oldPrice: twFallback.oldPrice ? Number(twFallback.oldPrice) : undefined,
      stock,
      inStock: twFallback.inStock !== false && stock > 0,
      image: twFallback.image,
      name: twFallback.name,
    };
  }

  const hFallback = hampers.find(h => String(h.id) === pId && h.name === itemProduct.name);
  if (hFallback) {
    const stock = typeof hFallback.stock === "number" ? hFallback.stock : 10;
    return {
      price: Number(hFallback.price) || 0,
      oldPrice: hFallback.oldPrice ? Number(hFallback.oldPrice) : undefined,
      stock,
      inStock: hFallback.inStock !== false && stock > 0,
      image: hFallback.image,
      name: hFallback.name,
    };
  }

  return null;
}

export function CartProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { products } = useProducts();
  const { teaware } = useTeaware();
  const { hampers } = useGifting();

  const [animatingProduct, setAnimatingProduct] = useState<CartProduct | null>(null);

  const [rawItems, setRawItems] = useState<CartItem[]>(() => {
    try {
      const saved =
        localStorage.getItem(STORAGE_KEY);

      if (!saved) {
        return [];
      }

      const parsed = JSON.parse(saved);

      if (!Array.isArray(parsed)) {
        return [];
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return parsed.map((item: any) => {
        const variant: ProductVariantKey = item.variant === "250g" ? "250g" : "100g";
        const compositeId = item.id && typeof item.id === "string" && item.id.includes("-")
          ? item.id
          : `${item.product?.id || item.id || 1}-${variant}`;

        return {
          id: compositeId,
          product: item.product,
          variant,
          weight: item.weight || variant,
          price: typeof item.price === "number" ? item.price : item.product?.price || 0,
          oldPrice: item.oldPrice ?? item.product?.oldPrice,
          quantity: item.quantity || 1,
        };
      });
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] =
    useState(false);

  // Synchronize cart items with live catalog data dynamically whenever products, teaware, or hampers update
  const items = useMemo<CartItem[]>(() => {
    return rawItems.map((item) => {
      const live = resolveLiveCatalogProduct(item.product, products, teaware, hampers);
      if (!live) return item;

      // Resolve variant pricing if tea product has customized variants
      let effectivePrice = live.price;
      let effectiveOldPrice = live.oldPrice;

      const tea = products.find((p) => String(p.id) === String(item.product.id) || p.name === item.product.name);
      if (tea && item.variant && tea.variants?.[item.variant]) {
        const varData = tea.variants[item.variant];
        if (varData?.price) {
          effectivePrice = Number(varData.price);
          effectiveOldPrice = varData.oldPrice ? Number(varData.oldPrice) : undefined;
        }
      }

      return {
        ...item,
        price: effectivePrice,
        oldPrice: effectiveOldPrice,
        product: {
          ...item.product,
          price: effectivePrice,
          oldPrice: effectiveOldPrice,
          stock: live.stock,
          inStock: live.inStock,
          image: live.image,
        },
      };
    });
  }, [rawItems, products, teaware, hampers]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(items)
      );
    } catch {
      // Ignore storage errors.
    }
  }, [items]);

  const triggerAddedAnimation = (product: CartProduct) => {
    setAnimatingProduct(product);
  };

  const closeAddedAnimation = () => {
    setAnimatingProduct(null);
  };

  const addToCart = (
    product: CartProduct,
    quantity = 1,
    variant: ProductVariantKey = "100g",
    customPrice?: number,
    customOldPrice?: number
  ) => {
    if (product && (product.inStock === false || (typeof product.stock === "number" && product.stock <= 0))) {
      return;
    }

    const itemPrice = typeof customPrice === "number" ? customPrice : product.price;
    const itemOldPrice = customOldPrice ?? product.oldPrice;
    const cartItemId = `${product.id}-${variant}`;

    // Trigger Fly-To-Cart visual animation
    if (typeof window !== "undefined") {
      let startRect: DOMRect | undefined;
      const activeEl = document.activeElement;
      if (activeEl && activeEl.closest) {
        const card = activeEl.closest(".product-card, .teaware-card, .gifting-hamper-card, .pdp-layout, .pdp-image-wrap");
        const img = card?.querySelector("img");
        if (img) {
          startRect = img.getBoundingClientRect();
        } else {
          startRect = activeEl.getBoundingClientRect();
        }
      }
      window.dispatchEvent(
        new CustomEvent("leafly-fly-to-cart", {
          detail: { image: product.image, startRect },
        })
      );
    }

    setRawItems((current) => {
      const existingIndex = current.findIndex(
        (item) =>
          item.id === cartItemId ||
          (item.product.id === product.id && item.variant === variant)
      );

      if (existingIndex > -1) {
        return current.map((item, index) =>
          index === existingIndex
            ? {
                ...item,
                quantity: item.quantity + quantity,
              }
            : item
        );
      }

      return [
        ...current,
        {
          id: cartItemId,
          product: {
            ...product,
            weight: variant,
            price: itemPrice,
            oldPrice: itemOldPrice,
          },
          variant,
          weight: variant,
          price: itemPrice,
          oldPrice: itemOldPrice,
          quantity,
        },
      ];
    });
  };

  const increaseQuantity = (id: string | number) => {
    const key = String(id);
    setRawItems((current) =>
      current.map((item) =>
        item.id === key || String(item.product.id) === key
          ? {
              ...item,
              quantity: item.quantity + 1,
            }
          : item
      )
    );
  };

  const decreaseQuantity = (id: string | number) => {
    const key = String(id);
    setRawItems((current) =>
      current
        .map((item) =>
          item.id === key || String(item.product.id) === key
            ? {
                ...item,
                quantity: item.quantity - 1,
              }
            : item
        )
        .filter(
          (item) => item.quantity > 0
        )
    );
  };

  const removeFromCart = (id: string | number) => {
    const key = String(id);
    setRawItems((current) =>
      current.filter(
        (item) => item.id !== key && String(item.product.id) !== key
      )
    );
  };

  const clearCart = () => {
    setRawItems([]);
  };

  const openCart = () => {
    setIsCartOpen(true);
  };

  const closeCart = () => {
    setIsCartOpen(false);
  };

  const toggleCart = () => {
    setIsCartOpen((current) => !current);
  };

  const cartCount = useMemo(
    () =>
      items.reduce(
        (total, item) =>
          total + item.quantity,
        0
      ),
    [items]
  );

  const subtotal = useMemo(
    () =>
      items.reduce(
        (total, item) =>
          total +
          item.price *
            item.quantity,
        0
      ),
    [items]
  );

  return (
    <CartContext.Provider
      value={{
        items,
        cartCount,
        subtotal,
        isCartOpen,
        animatingProduct,

        addToCart,
        triggerAddedAnimation,
        closeAddedAnimation,
        increaseQuantity,
        decreaseQuantity,
        removeFromCart,
        clearCart,

        openCart,
        closeCart,
        toggleCart,
      }}
    >
      {children}
      <AddedToRitualModal
        product={animatingProduct}
        onClose={closeAddedAnimation}
      />
    </CartContext.Provider>
  );
}

export function useCart() {
  const context =
    useContext(CartContext);

  if (!context) {
    throw new Error(
      "useCart must be used inside CartProvider"
    );
  }

  return context;
}