/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ProductVariantKey } from "../data/products";

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

export function CartProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [animatingProduct, setAnimatingProduct] = useState<CartProduct | null>(null);

  const [items, setItems] = useState<CartItem[]>(() => {
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

    // Trigger shared "Added to Ritual" animation
    setAnimatingProduct(product);

    setItems((current) => {
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
    setItems((current) =>
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
    setItems((current) =>
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
    setItems((current) =>
      current.filter(
        (item) => item.id !== key && String(item.product.id) !== key
      )
    );
  };

  const clearCart = () => {
    setItems([]);
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