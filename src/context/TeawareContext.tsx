/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useMemo } from "react";
import { type TeawareItem, type TeawareCategory } from "../data/teaware";
import { useProducts } from "./ProductContext";
import type { Product } from "../data/products";

type TeawareContextType = {
  teaware: TeawareItem[];
  addTeaware: (item: TeawareItem) => Promise<{ success: boolean; error?: string }>;
  updateTeaware: (updatedItem: TeawareItem) => Promise<{ success: boolean; error?: string }>;
  deleteTeaware: (id: number | string) => Promise<{ success: boolean; error?: string }>;
  toggleTeawareActive: (id: number | string, active?: boolean) => Promise<{ success: boolean; error?: string }>;
  loading: boolean;
};

const TeawareContext = createContext<TeawareContextType | undefined>(undefined);

export function TeawareProvider({ children }: { children: React.ReactNode }) {
  const { products, addProduct, updateProduct, deleteProduct, loading } = useProducts();

  const teaware = useMemo<TeawareItem[]>(() => {
    return products
      .filter((p) => (p.category || "").toLowerCase() === "teaware" && !p.isRemoved)
      .map((p) => {
        const idNum = !isNaN(Number(p.id)) ? Number(p.id) : (p.id as unknown as number);
        const stock = typeof p.stock === "number" ? p.stock : 10;
        const inStock = p.inStock !== false && stock > 0;
        return {
          id: idNum,
          name: p.name,
          category: (p.subCategory as TeawareCategory) || "Teapots",
          material: p.material || p.origin || "Artisan Borosilicate & Ceramic",
          capacity: p.capacity || p.weight || "",
          price: Number(p.price) || 0,
          oldPrice: p.oldPrice ? Number(p.oldPrice) : undefined,
          rating: p.rating || 4.9,
          reviewCount: p.reviewCount || 24,
          badge: p.badge || "",
          image: p.image,
          description: p.description || "",
          features: p.features || [],
          stock,
          inStock,
          sku: p.sku || `LF-TW-${idNum}`,
          isActive: p.isActive !== false,
          isRemoved: Boolean(p.isRemoved),
          removedAt: p.removedAt || null,
        };
      });
  }, [products]);

  const addTeaware = async (item: TeawareItem) => {
    const prod: Product = {
      id: item.id || Date.now(),
      name: item.name,
      category: "teaware",
      subCategory: item.category,
      material: item.material,
      capacity: item.capacity,
      price: Number(item.price) || 0,
      oldPrice: item.oldPrice ? Number(item.oldPrice) : undefined,
      rating: item.rating || 5.0,
      reviewCount: item.reviewCount || 0,
      badge: item.badge,
      image: item.image,
      description: item.description,
      features: item.features || [],
      stock: typeof item.stock === "number" ? item.stock : 10,
      inStock: item.inStock !== false && (typeof item.stock !== "number" || item.stock > 0),
      isActive: item.isActive !== false,
      isRemoved: false,
      origin: item.material || "Artisan Craft",
      weight: item.capacity || "1 Unit",
      caffeine: "None",
      sku: item.sku || `LF-TW-${item.id || Date.now()}`,
    };
    return addProduct(prod);
  };

  const updateTeaware = async (updatedItem: TeawareItem) => {
    const existing = products.find((p) => String(p.id) === String(updatedItem.id));
    const prod: Product = {
      ...existing,
      id: updatedItem.id,
      name: updatedItem.name,
      category: "teaware",
      subCategory: updatedItem.category,
      material: updatedItem.material,
      capacity: updatedItem.capacity,
      price: Number(updatedItem.price) || 0,
      oldPrice: updatedItem.oldPrice ? Number(updatedItem.oldPrice) : undefined,
      rating: updatedItem.rating || 5.0,
      reviewCount: updatedItem.reviewCount || 0,
      badge: updatedItem.badge,
      image: updatedItem.image,
      description: updatedItem.description,
      features: updatedItem.features || [],
      stock: typeof updatedItem.stock === "number" ? updatedItem.stock : 10,
      inStock: updatedItem.inStock !== false && (typeof updatedItem.stock !== "number" || updatedItem.stock > 0),
      isActive: updatedItem.isActive !== false,
      isRemoved: false,
      origin: updatedItem.material || existing?.origin || "Artisan Craft",
      weight: updatedItem.capacity || existing?.weight || "1 Unit",
      caffeine: "None",
      sku: updatedItem.sku || existing?.sku || `LF-TW-${updatedItem.id}`,
    };
    return updateProduct(prod);
  };

  const toggleTeawareActive = async (id: number | string, active?: boolean) => {
    const target = teaware.find((t) => String(t.id) === String(id));
    if (!target) return { success: false, error: "Teaware item not found" };
    const newActive = active !== undefined ? active : !target.isActive;
    return updateTeaware({ ...target, isActive: newActive });
  };

  const deleteTeaware = async (id: number | string) => {
    return deleteProduct(id);
  };

  return (
    <TeawareContext.Provider value={{ teaware, addTeaware, updateTeaware, deleteTeaware, toggleTeawareActive, loading }}>
      {children}
    </TeawareContext.Provider>
  );
}

export function useTeaware() {
  const context = useContext(TeawareContext);
  if (!context) {
    throw new Error("useTeaware must be used within a TeawareProvider");
  }
  return context;
}
