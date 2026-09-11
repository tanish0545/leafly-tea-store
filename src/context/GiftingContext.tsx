/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useMemo } from "react";
import { type GiftHamper } from "../data/gifting";
import { useProducts } from "./ProductContext";
import type { Product } from "../data/products";

type GiftingContextType = {
  hampers: GiftHamper[];
  addHamper: (hamper: GiftHamper) => Promise<{ success: boolean; error?: string }>;
  updateHamper: (updatedHamper: GiftHamper) => Promise<{ success: boolean; error?: string }>;
  deleteHamper: (id: number | string) => Promise<{ success: boolean; error?: string }>;
  loading: boolean;
};

const GiftingContext = createContext<GiftingContextType | undefined>(undefined);

export function GiftingProvider({ children }: { children: React.ReactNode }) {
  const { products, addProduct, updateProduct, deleteProduct, loading } = useProducts();

  const hampers = useMemo<GiftHamper[]>(() => {
    return products
      .filter((p) => (p.category || "").toLowerCase() === "gifting" && !p.isRemoved)
      .map((p) => {
        const idNum = !isNaN(Number(p.id)) ? Number(p.id) : (p.id as unknown as number);
        const stock = typeof p.stock === "number" ? p.stock : 10;
        const inStock = p.inStock !== false && stock > 0;
        return {
          id: idNum,
          name: p.name,
          subtitle: p.subtitle || p.origin || "Curated Estate Blend",
          price: Number(p.price) || 0,
          oldPrice: p.oldPrice ? Number(p.oldPrice) : undefined,
          image: p.image,
          includes: p.includes || (p.features ? p.features : []),
          badge: p.badge || "",
          description: p.description || "",
          stock,
          inStock,
          sku: p.sku || `LF-GF-${idNum}`,
          category: p.subCategory || "Luxury Gift Sets",
          isActive: p.isActive !== false,
          isRemoved: Boolean(p.isRemoved),
          removedAt: p.removedAt || null,
        };
      });
  }, [products]);

  const addHamper = async (hamper: GiftHamper) => {
    const prod: Product = {
      id: hamper.id || Date.now(),
      name: hamper.name,
      category: "gifting",
      subCategory: hamper.category || "Luxury Gift Sets",
      subtitle: hamper.subtitle,
      price: Number(hamper.price) || 0,
      oldPrice: hamper.oldPrice ? Number(hamper.oldPrice) : undefined,
      badge: hamper.badge,
      image: hamper.image,
      includes: hamper.includes || [],
      description: hamper.description || hamper.subtitle,
      stock: typeof hamper.stock === "number" ? hamper.stock : 10,
      inStock: hamper.inStock !== false && (typeof hamper.stock !== "number" || hamper.stock > 0),
      isActive: hamper.isActive !== false,
      isRemoved: false,
      origin: hamper.subtitle || "Darjeeling & Indian Terroirs",
      weight: "Gift Box",
      caffeine: "Varied",
      sku: hamper.sku || `LF-GF-${hamper.id || Date.now()}`,
    };
    return addProduct(prod);
  };

  const updateHamper = async (updatedHamper: GiftHamper) => {
    const existing = products.find((p) => String(p.id) === String(updatedHamper.id));
    const prod: Product = {
      ...existing,
      id: updatedHamper.id,
      name: updatedHamper.name,
      category: "gifting",
      subCategory: updatedHamper.category || existing?.subCategory || "Luxury Gift Sets",
      subtitle: updatedHamper.subtitle,
      price: Number(updatedHamper.price) || 0,
      oldPrice: updatedHamper.oldPrice ? Number(updatedHamper.oldPrice) : undefined,
      badge: updatedHamper.badge,
      image: updatedHamper.image,
      includes: updatedHamper.includes || existing?.includes || [],
      description: updatedHamper.description || updatedHamper.subtitle || existing?.description,
      stock: typeof updatedHamper.stock === "number" ? updatedHamper.stock : 10,
      inStock: updatedHamper.inStock !== false && (typeof updatedHamper.stock !== "number" || updatedHamper.stock > 0),
      isActive: updatedHamper.isActive !== false,
      isRemoved: false,
      origin: updatedHamper.subtitle || existing?.origin || "Darjeeling & Indian Terroirs",
      weight: "Gift Box",
      caffeine: "Varied",
      sku: updatedHamper.sku || existing?.sku || `LF-GF-${updatedHamper.id}`,
    };
    return updateProduct(prod);
  };

  const deleteHamper = async (id: number | string) => {
    return deleteProduct(id);
  };

  return (
    <GiftingContext.Provider value={{ hampers, addHamper, updateHamper, deleteHamper, loading }}>
      {children}
    </GiftingContext.Provider>
  );
}

export function useGifting() {
  const context = useContext(GiftingContext);
  if (!context) {
    throw new Error("useGifting must be used within a GiftingProvider");
  }
  return context;
}
