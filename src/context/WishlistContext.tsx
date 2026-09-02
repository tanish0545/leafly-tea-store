/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CartProduct } from "./CartContext";

export type WishlistItem = {
  product: CartProduct;
};

type WishlistContextType = {
  items: WishlistItem[];
  wishlistCount: number;
  isWishlistOpen: boolean;
  wishlistIds: (number | string)[];

  addToWishlist: (product: CartProduct) => void;
  removeFromWishlist: (id: number | string) => void;
  clearWishlist: () => void;
  isInWishlist: (id: number | string) => boolean;

  openWishlist: () => void;
  closeWishlist: () => void;
  toggleWishlist: () => void;
};

const WishlistContext = createContext<
  WishlistContextType | undefined
>(undefined);

const STORAGE_KEY = "leafly_wishlist";

export function WishlistProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [items, setItems] = useState<WishlistItem[]>(() => {
    try {
      const saved =
        localStorage.getItem(STORAGE_KEY);

      if (!saved) {
        return [];
      }

      const parsed = JSON.parse(saved);

      return Array.isArray(parsed)
        ? parsed
        : [];
    } catch {
      return [];
    }
  });

  const [isWishlistOpen, setIsWishlistOpen] =
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

  const addToWishlist = (
    product: CartProduct
  ) => {
    setItems((current) => {
      const exists =
        current.find(
          (item) =>
            String(item.product.id) === String(product.id)
        );

      if (exists) {
        return current;
      }

      return [
        ...current,
        {
          product,
        },
      ];
    });
  };

  const removeFromWishlist = (id: number | string) => {
    setItems((current) =>
      current.filter(
        (item) =>
          String(item.product.id) !== String(id)
      )
    );
  };

  const clearWishlist = () => {
    setItems([]);
  };

  const isInWishlist = (id: number | string) => {
    return items.some(
      (item) =>
        String(item.product.id) === String(id)
    );
  };

  const openWishlist = () => {
    setIsWishlistOpen(true);
  };

  const closeWishlist = () => {
    setIsWishlistOpen(false);
  };

  const toggleWishlist = () => {
    setIsWishlistOpen(
      (current) => !current
    );
  };

  const wishlistIds = useMemo(
    () => items.map(
      (item) =>
        item.product.id
    ),
    [items]
  );

  const wishlistCount = useMemo(
    () => items.length,
    [items]
  );

  return (
    <WishlistContext.Provider
      value={{
        items,
        wishlistCount,
        isWishlistOpen,
        wishlistIds,
        addToWishlist,
        removeFromWishlist,
        clearWishlist,
        isInWishlist,
        openWishlist,
        closeWishlist,
        toggleWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);

  if (!context) {
    throw new Error(
      "useWishlist must be used within a WishlistProvider"
    );
  }

  return context;
}
