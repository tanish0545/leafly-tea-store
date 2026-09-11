import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { products as initialProducts, type Product, normalizeTeaCategory, calculate25gPrice, calculate25gOldPrice } from "../data/products";
import { db, auth } from "../lib/firebase";
import { collection, onSnapshot, doc, setDoc, deleteDoc, getDocs, writeBatch, arrayUnion } from "firebase/firestore";

type ProductContextType = {
  products: Product[];
  removedProducts: Product[];
  addProduct: (product: Product) => Promise<{ success: boolean; error?: string }>;
  updateProduct: (updatedProduct: Product) => Promise<{ success: boolean; error?: string }>;
  deleteProduct: (id: number | string) => Promise<{ success: boolean; error?: string }>;
  removeProduct: (id: number | string) => Promise<{ success: boolean; error?: string }>;
  restoreProduct: (id: number | string) => Promise<{ success: boolean; error?: string }>;
  permanentlyDeleteProduct: (id: number | string) => Promise<{ success: boolean; error?: string }>;
  loading: boolean;
};

const ProductContext = createContext<ProductContextType | undefined>(undefined);

function sanitizeProductPayload(product: Product): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(product)) {
    if (value !== undefined) {
      if (key === "price" || key === "oldPrice" || key === "stock" || key === "rating" || key === "reviewCount") {
        if (value !== null && value !== "") {
          clean[key] = Number(value);
        }
      } else if (key === "inStock" || key === "isActive" || key === "isRemoved") {
        clean[key] = Boolean(value);
      } else if (key === "removedAt") {
        clean[key] = value ? String(value) : null;
      } else if (key === "benefits" || key === "disabledVariants" || key === "features" || key === "includes" || key === "images") {
        clean[key] = Array.isArray(value) ? [...value] : [];
      } else if (key === "variants" && value !== null && typeof value === "object" && !Array.isArray(value)) {
        const cleanVariants: Record<string, unknown> = {};
        for (const [vKey, vVal] of Object.entries(value as Record<string, unknown>)) {
          if (vVal && typeof vVal === "object" && !Array.isArray(vVal)) {
            const vObj = vVal as Record<string, unknown>;
            const variantEntry: Record<string, unknown> = {
              weight: (vObj.weight as string) || vKey,
              price: Number(vObj.price) || 0,
            };
            if (vObj.oldPrice !== undefined && vObj.oldPrice !== null && vObj.oldPrice !== "") {
              const numOld = Number(vObj.oldPrice);
              if (!isNaN(numOld) && numOld > 0) {
                variantEntry.oldPrice = numOld;
              }
            }
            cleanVariants[vKey] = variantEntry;
          }
        }
        clean[key] = cleanVariants;
      } else if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        clean[key] = { ...value };
      } else {
        clean[key] = value;
      }
    }
  }
  return clean;
}

export function ProductProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>(() => initialProducts.filter((p) => !p.isRemoved));
  const [removedProducts, setRemovedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const permanentlyDeletedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const productsRef = collection(db, "products");
    const metaRef = doc(db, "system", "catalog_meta");

    // Listen to persistent system metadata for permanently deleted IDs
    const unsubscribeMeta = onSnapshot(
      metaRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (Array.isArray(data?.permanentlyDeletedIds)) {
            permanentlyDeletedIdsRef.current = new Set(data.permanentlyDeletedIds.map(String));
          }
        }
      },
      (err) => {
        console.warn("Could not listen to system/catalog_meta:", err);
      }
    );

    // Initialize data if empty (runs only if an authorized admin is authenticated)
    const initializeData = async () => {
      const currentUserEmail = auth.currentUser?.email?.toLowerCase();
      if (!currentUserEmail || (currentUserEmail !== "leaflydatabase@gmail.com" && currentUserEmail !== "admin@leafly.com")) {
        return;
      }
      try {
        const snapshot = await getDocs(productsRef);
        if (snapshot.empty) {
          console.log("Initializing Firestore products catalog with tea, teaware, and gifting...");
          const batch = writeBatch(db);
          initialProducts.forEach((product) => {
            const docRef = doc(productsRef, String(product.id));
            const clean = sanitizeProductPayload({
              ...product,
              stock: product.stock ?? 10,
              inStock: product.inStock ?? true,
              isActive: product.isActive !== false,
              isRemoved: false,
              removedAt: null,
            });
            batch.set(docRef, clean);
          });
          await batch.commit();
          console.log("Firestore products initialized successfully.");
        } else {
          // Self-heal: ensure existing Firestore documents have Darjeeling origin for tea,
          // and if teaware/gifting items are missing from Firestore, seed them ONLY if never removed.
          const existingIds = new Set(snapshot.docs.map((d) => d.id));
          const batch = writeBatch(db);
          let hasBatchWrites = false;

          initialProducts.forEach((prod) => {
            const pid = String(prod.id);
            if (!existingIds.has(pid) && !permanentlyDeletedIdsRef.current.has(pid)) {
              const docRef = doc(productsRef, pid);
              batch.set(
                docRef,
                sanitizeProductPayload({
                  ...prod,
                  stock: prod.stock ?? 10,
                  inStock: prod.inStock ?? true,
                  isActive: prod.isActive !== false,
                  isRemoved: false,
                  removedAt: null,
                })
              );
              hasBatchWrites = true;
            }
          });

          snapshot.forEach(async (docSnap) => {
            const data = docSnap.data() as Product;
            const cat = (data.category || "").toLowerCase();
            const isTea = cat !== "teaware" && cat !== "gifting";
            if (isTea && data.origin && data.origin.toLowerCase().includes("assam")) {
              try {
                const docRef = doc(productsRef, docSnap.id);
                await setDoc(docRef, { origin: "Darjeeling" }, { merge: true });
              } catch (e) {
                console.warn("Could not auto-heal Firestore product origin:", e);
              }
            }
          });

          if (hasBatchWrites) {
            await batch.commit();
            console.log("Firestore missing teaware/gifting products seeded successfully.");
          }
        }
      } catch (error) {
        console.error("Error initializing products:", error);
      }
    };

    // Set up real-time listener immediately
    const unsubscribeProducts = onSnapshot(
      productsRef,
      (snapshot) => {
        if (snapshot.empty) {
          setProducts(initialProducts.filter((p) => !p.isRemoved));
          setRemovedProducts([]);
          setLoading(false);
          initializeData();
          return;
        }

        const activeProductsList: Product[] = [];
        const removedProductsList: Product[] = [];
        const removedIdsSet = new Set<string>();

        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Product;
          const rawId = docSnap.id;
          const parsedId = !isNaN(Number(rawId)) ? Number(rawId) : rawId;
          const idStr = String(parsedId);
          const fallbackInitial = initialProducts.find(
            (p) => String(p.id) === idStr || p.name.toLowerCase() === (data.name || "").toLowerCase()
          );

          const isRemoved = Boolean(data.isRemoved);
          const removedAt = data.removedAt || (isRemoved ? (fallbackInitial?.removedAt || new Date().toISOString()) : null);
          const isActive = data.isActive !== undefined ? Boolean(data.isActive) : (fallbackInitial?.isActive !== false);

          if (isRemoved) {
            removedIdsSet.add(idStr);
          }

          const stock = typeof data.stock === "number" ? data.stock : (fallbackInitial?.stock ?? 10);
          const inStock = data.inStock !== false && stock > 0;
          const images =
            Array.isArray(data.images) && data.images.length > 0
              ? data.images
              : fallbackInitial?.images || (data.image ? [data.image] : (fallbackInitial?.image ? [fallbackInitial.image] : []));
          const benefits =
            Array.isArray(data.benefits)
              ? data.benefits
              : fallbackInitial?.benefits || [];
          const features =
            Array.isArray(data.features)
              ? data.features
              : fallbackInitial?.features || [];
          const includes =
            Array.isArray(data.includes)
              ? data.includes
              : fallbackInitial?.includes || [];

          // Detect category:
          const rawCat = (data.category || fallbackInitial?.category || "").toLowerCase();
          const isTeaware = rawCat === "teaware" || rawCat === "teapots" || rawCat === "tea cups" || rawCat === "serving & trays" || rawCat === "storage & accessories";
          const isGifting = rawCat === "gifting" || rawCat.includes("gift") || rawCat.includes("hamper");
          const isTea = !isTeaware && !isGifting;

          let productCategory = isTeaware ? "teaware" : isGifting ? "gifting" : normalizeTeaCategory(data.category || fallbackInitial?.category);

          // Canonical tea naming & category
          let productName = data.name || fallbackInitial?.name || "";
          if (isTea) {
            const nameLower = productName.toLowerCase().trim();
            if (
              nameLower === "white tea" ||
              nameLower === "golden dusk" ||
              nameLower === "golden dusk + chamomile" ||
              nameLower === "golden dusk chamomile" ||
              nameLower === "chamomile white" ||
              (idStr === "2" && (!data.name || nameLower.includes("golden dusk") || nameLower.includes("white tea")))
            ) {
              productName = "Golden Dusk Black Tea + Chamomile";
            } else if (idStr === "1" && !data.name) {
              productName = "Natural Green Tea";
            } else if (idStr === "3" && !data.name) {
              productName = "Premium Oolong Black Tea";
            } else if (idStr === "4" && !data.name) {
              productName = "Red Oolong Tea";
            }

            if (idStr === "2" && (!data.category || data.category.toLowerCase().includes("white") || data.category.toLowerCase().includes("dusk"))) {
              productCategory = "Black Tea";
            }
          }

          let productOrigin = isTea ? "Darjeeling" : (data.origin || fallbackInitial?.origin || (isTeaware ? data.material || "Artisan Craft" : "Darjeeling & Indian Terroirs"));
          if (isTea) {
            productOrigin = "Darjeeling";
          }

          // Variants: handle tea products
          const disabledVariants = Array.isArray(data.disabledVariants)
            ? data.disabledVariants
            : (fallbackInitial?.disabledVariants || []);

          const variants: Record<string, { weight: string; price: number; oldPrice?: number }> = {};
          if (data.variants && typeof data.variants === "object" && !Array.isArray(data.variants)) {
            for (const [vk, vv] of Object.entries(data.variants)) {
              if (vv && typeof vv === "object") {
                const vObj = vv as Record<string, unknown>;
                const pNum = Number(vObj.price);
                if (!isNaN(pNum)) {
                  const vOldNum = vObj.oldPrice !== undefined && vObj.oldPrice !== null ? Number(vObj.oldPrice) : undefined;
                  variants[vk] = {
                    weight: (vObj.weight as string) || vk,
                    price: pNum,
                    ...(vOldNum !== undefined && !isNaN(vOldNum) && vOldNum > 0 ? { oldPrice: vOldNum } : {}),
                  };
                }
              }
            }
          } else if (fallbackInitial?.variants) {
            for (const [vk, vv] of Object.entries(fallbackInitial.variants)) {
              if (vv) {
                variants[vk] = {
                  weight: vv.weight || vk,
                  price: Number(vv.price) || 0,
                  ...(vv.oldPrice ? { oldPrice: Number(vv.oldPrice) } : {}),
                };
              }
            }
          }

          if (isTea) {
            if (!variants["25g"] && !disabledVariants.includes("25g")) {
              if (fallbackInitial?.variants?.["25g"]) {
                variants["25g"] = { ...fallbackInitial.variants["25g"] };
              } else if (variants["50g"]) {
                const p50 = variants["50g"].price;
                const old50 = variants["50g"].oldPrice;
                variants["25g"] = {
                  weight: "25g",
                  price: calculate25gPrice(p50),
                  oldPrice: calculate25gOldPrice(old50),
                };
              }
            }
            for (const dKey of disabledVariants) {
              delete variants[dKey];
            }
          }

          const parsedProduct: Product = {
            ...data,
            id: parsedId,
            name: productName,
            category: productCategory,
            subCategory: data.subCategory || (isTeaware ? (data.category as any) : undefined) || fallbackInitial?.subCategory,
            material: data.material || fallbackInitial?.material,
            capacity: data.capacity || fallbackInitial?.capacity,
            sku: data.sku || fallbackInitial?.sku || (isTeaware ? `LF-TW-${parsedId}` : isGifting ? `LF-GF-${parsedId}` : `LF-TEA-${parsedId}`),
            subtitle: data.subtitle || fallbackInitial?.subtitle,
            features,
            includes,
            origin: productOrigin,
            price: Number(data.price) || fallbackInitial?.price || 0,
            oldPrice: data.oldPrice ? Number(data.oldPrice) : fallbackInitial?.oldPrice,
            stock,
            inStock,
            isActive,
            isRemoved,
            removedAt,
            image: data.image || fallbackInitial?.image || "",
            images,
            benefits,
            variants: variants as unknown as Product["variants"],
            disabledVariants,
          };

          if (isRemoved) {
            removedProductsList.push(parsedProduct);
          } else {
            activeProductsList.push(parsedProduct);
          }
        });

        // Merge initial products that haven't been removed or permanently deleted
        const productsMap = new Map<string, Product>();
        initialProducts.forEach((p) => {
          const pid = String(p.id);
          // CRITICAL: NEVER resurrect intentionally removed or permanently deleted products
          if (!removedIdsSet.has(pid) && !permanentlyDeletedIdsRef.current.has(pid)) {
            productsMap.set(pid, { ...p, isActive: p.isActive !== false, isRemoved: false, removedAt: null });
          }
        });
        activeProductsList.forEach((p) => productsMap.set(String(p.id), p));
        const finalActiveList = Array.from(productsMap.values()).filter((p) => !p.isRemoved);

        // Sort by ID to maintain consistent catalog order
        finalActiveList.sort((a, b) => {
          const numA = Number(a.id);
          const numB = Number(b.id);
          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
          return String(a.id).localeCompare(String(b.id));
        });

        removedProductsList.sort((a, b) => {
          if (a.removedAt && b.removedAt) {
            return new Date(b.removedAt).getTime() - new Date(a.removedAt).getTime();
          }
          return String(b.id).localeCompare(String(a.id));
        });

        setProducts(finalActiveList);
        setRemovedProducts(removedProductsList);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching products from Firestore:", error);
        setProducts(initialProducts.filter((p) => !p.isRemoved));
        setRemovedProducts([]);
        setLoading(false);
      }
    );

    return () => {
      unsubscribeProducts();
      unsubscribeMeta();
    };
  }, []);

  const addProduct = async (product: Product): Promise<{ success: boolean; error?: string }> => {
    try {
      const newId = product.id || Date.now();
      const cat = (product.category || "").toLowerCase();
      const isTea = cat !== "teaware" && cat !== "gifting";
      const newProduct: Product = {
        ...product,
        id: newId,
        origin: isTea
          ? product.origin && product.origin.toLowerCase().includes("darjeeling") ? product.origin : "Darjeeling"
          : product.origin || product.material || "Artisan Craft",
        price: Number(product.price) || 0,
        oldPrice: product.oldPrice ? Number(product.oldPrice) : undefined,
        stock: typeof product.stock === "number" ? product.stock : 10,
        inStock: product.inStock !== false && (typeof product.stock !== "number" || product.stock > 0),
        isActive: product.isActive !== false,
        isRemoved: false,
        removedAt: null,
        benefits: Array.isArray(product.benefits) ? product.benefits : [],
        disabledVariants: Array.isArray(product.disabledVariants) ? product.disabledVariants : [],
        features: Array.isArray(product.features) ? product.features : [],
        includes: Array.isArray(product.includes) ? product.includes : [],
        variants: product.variants || {},
      };
      const cleanPayload = sanitizeProductPayload(newProduct);
      await setDoc(doc(db, "products", String(newId)), cleanPayload);
      setProducts((prev) => [...prev.filter((p) => String(p.id) !== String(newId)), newProduct]);
      return { success: true };
    } catch (error) {
      console.error("Error adding product to Firestore:", error);
      const msg = error instanceof Error ? error.message : String(error);
      return { success: false, error: msg };
    }
  };

  const updateProduct = async (updatedProduct: Product): Promise<{ success: boolean; error?: string }> => {
    try {
      const docId = String(updatedProduct.id);
      const cat = (updatedProduct.category || "").toLowerCase();
      const isTea = cat !== "teaware" && cat !== "gifting";
      const stock = typeof updatedProduct.stock === "number" ? updatedProduct.stock : 10;
      const inStock = updatedProduct.inStock !== false && stock > 0;

      const normalizedProduct: Product = {
        ...updatedProduct,
        origin: isTea
          ? updatedProduct.origin && updatedProduct.origin.toLowerCase().includes("darjeeling") ? updatedProduct.origin : "Darjeeling"
          : updatedProduct.origin || updatedProduct.material || "Artisan Craft",
        price: Number(updatedProduct.price) || 0,
        oldPrice: updatedProduct.oldPrice ? Number(updatedProduct.oldPrice) : undefined,
        stock,
        inStock,
        isActive: updatedProduct.isActive !== false,
        isRemoved: Boolean(updatedProduct.isRemoved),
        removedAt: updatedProduct.removedAt || null,
        benefits: Array.isArray(updatedProduct.benefits) ? updatedProduct.benefits : [],
        disabledVariants: Array.isArray(updatedProduct.disabledVariants) ? updatedProduct.disabledVariants : [],
        features: Array.isArray(updatedProduct.features) ? updatedProduct.features : [],
        includes: Array.isArray(updatedProduct.includes) ? updatedProduct.includes : [],
        variants: updatedProduct.variants || {},
      };

      const cleanPayload = sanitizeProductPayload(normalizedProduct);
      await setDoc(doc(db, "products", docId), cleanPayload);
      setProducts((prev) =>
        prev.map((p) => (String(p.id) === docId ? normalizedProduct : p))
      );
      return { success: true };
    } catch (error) {
      console.error("Error updating product in Firestore:", error);
      const msg = error instanceof Error ? error.message : String(error);
      return { success: false, error: msg };
    }
  };

  // Persistent Soft Delete
  const removeProduct = async (id: number | string): Promise<{ success: boolean; error?: string }> => {
    try {
      const docId = String(id);
      const now = new Date().toISOString();
      const productToRemove = products.find((p) => String(p.id) === docId);

      // Soft delete: update doc in Firestore with isRemoved: true and timestamp
      await setDoc(
        doc(db, "products", docId),
        { isRemoved: true, removedAt: now },
        { merge: true }
      );

      if (productToRemove) {
        const removedItem: Product = {
          ...productToRemove,
          isRemoved: true,
          removedAt: now,
        };
        setProducts((prev) => prev.filter((p) => String(p.id) !== docId));
        setRemovedProducts((prev) => [removedItem, ...prev.filter((p) => String(p.id) !== docId)]);
      }

      return { success: true };
    } catch (error) {
      console.error("Error removing product from Firestore:", error);
      const msg = error instanceof Error ? error.message : String(error);
      return { success: false, error: msg };
    }
  };

  const deleteProduct = removeProduct;

  // Restore Soft-Deleted Product to its original category
  const restoreProduct = async (id: number | string): Promise<{ success: boolean; error?: string }> => {
    try {
      const docId = String(id);
      const itemToRestore = removedProducts.find((p) => String(p.id) === docId);

      await setDoc(
        doc(db, "products", docId),
        { isRemoved: false, removedAt: null },
        { merge: true }
      );

      if (itemToRestore) {
        const activeItem: Product = {
          ...itemToRestore,
          isRemoved: false,
          removedAt: null,
        };
        setRemovedProducts((prev) => prev.filter((p) => String(p.id) !== docId));
        setProducts((prev) => {
          const updated = [...prev.filter((p) => String(p.id) !== docId), activeItem];
          updated.sort((a, b) => {
            const numA = Number(a.id);
            const numB = Number(b.id);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return String(a.id).localeCompare(String(b.id));
          });
          return updated;
        });
      }

      return { success: true };
    } catch (error) {
      console.error("Error restoring product in Firestore:", error);
      const msg = error instanceof Error ? error.message : String(error);
      return { success: false, error: msg };
    }
  };

  // Safe Permanent Deletion
  const permanentlyDeleteProduct = async (id: number | string): Promise<{ success: boolean; error?: string }> => {
    try {
      const docId = String(id);
      await deleteDoc(doc(db, "products", docId));
      try {
        await setDoc(
          doc(db, "system", "catalog_meta"),
          { permanentlyDeletedIds: arrayUnion(docId) },
          { merge: true }
        );
        permanentlyDeletedIdsRef.current.add(docId);
      } catch (metaErr) {
        console.warn("Could not save permanently deleted ID in catalog_meta:", metaErr);
      }

      setRemovedProducts((prev) => prev.filter((p) => String(p.id) !== docId));
      setProducts((prev) => prev.filter((p) => String(p.id) !== docId));
      return { success: true };
    } catch (error) {
      console.error("Error permanently deleting product from Firestore:", error);
      const msg = error instanceof Error ? error.message : String(error);
      return { success: false, error: msg };
    }
  };

  return (
    <ProductContext.Provider
      value={{
        products,
        removedProducts,
        addProduct,
        updateProduct,
        deleteProduct,
        removeProduct,
        restoreProduct,
        permanentlyDeleteProduct,
        loading,
      }}
    >
      {children}
    </ProductContext.Provider>
  );
}

export function useProducts() {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error("useProducts must be used within a ProductProvider");
  }
  return context;
}
