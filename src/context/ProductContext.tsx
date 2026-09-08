import React, { createContext, useContext, useState, useEffect } from "react";
import { products as initialProducts, type Product, type TeaCategory, normalizeTeaCategory, calculate25gPrice, calculate25gOldPrice } from "../data/products";
import { db, auth } from "../lib/firebase";
import { collection, onSnapshot, doc, setDoc, deleteDoc, getDocs, writeBatch } from "firebase/firestore";

type ProductContextType = {
  products: Product[];
  addProduct: (product: Product) => Promise<{ success: boolean; error?: string }>;
  updateProduct: (updatedProduct: Product) => Promise<{ success: boolean; error?: string }>;
  deleteProduct: (id: number | string) => Promise<{ success: boolean; error?: string }>;
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
      } else if (key === "inStock") {
        clean[key] = Boolean(value);
      } else if (key === "benefits") {
        clean[key] = Array.isArray(value) ? [...value] : [];
      } else if (key === "disabledVariants") {
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
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const productsRef = collection(db, "products");

    // Initialize data if empty (runs only if an authorized admin is authenticated)
    const initializeData = async () => {
      const currentUserEmail = auth.currentUser?.email?.toLowerCase();
      if (!currentUserEmail || (currentUserEmail !== "leaflydatabase@gmail.com" && currentUserEmail !== "admin@leafly.com")) {
        return;
      }
      try {
        const snapshot = await getDocs(productsRef);
        if (snapshot.empty) {
          console.log("Initializing Firestore products catalog...");
          const batch = writeBatch(db);
          initialProducts.forEach((product) => {
            const docRef = doc(productsRef, String(product.id));
            const clean = sanitizeProductPayload({
              ...product,
              stock: product.stock ?? 10,
              inStock: product.inStock ?? true,
            });
            batch.set(docRef, clean);
          });
          await batch.commit();
          console.log("Firestore products initialized successfully.");
        }
      } catch (error) {
        console.error("Error initializing products:", error);
      }
    };

    // Set up real-time listener immediately
    const unsubscribe = onSnapshot(
      productsRef,
      (snapshot) => {
        if (snapshot.empty) {
          setProducts(initialProducts);
          setLoading(false);
          initializeData();
          return;
        }

        const fetchedProducts: Product[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Product;
          const rawId = docSnap.id;
          const parsedId = !isNaN(Number(rawId)) ? Number(rawId) : rawId;
          const stock = typeof data.stock === "number" ? data.stock : 10;
          const inStock = data.inStock !== false && stock > 0;
          const fallbackInitial = initialProducts.find(
            (p) => String(p.id) === String(parsedId) || p.name.toLowerCase() === (data.name || "").toLowerCase()
          );
          const images =
            Array.isArray(data.images) && data.images.length > 0
              ? data.images
              : fallbackInitial?.images || (data.image ? [data.image] : []);
          const benefits =
            Array.isArray(data.benefits)
              ? data.benefits
              : fallbackInitial?.benefits || [];

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

          // If 25g is not present in variants and not explicitly disabled, calculate proportional 25g price from 50g
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

          // Enforce disabledVariants across all keys
          for (const dKey of disabledVariants) {
            delete variants[dKey];
          }

          // Canonical metadata enforcement for the 4 Leafly tea products
          const idStr = String(parsedId);
          let productName = data.name || fallbackInitial?.name || "";
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

          // Category normalization: normalize whatever category is in data/fallback
          let productCategory: TeaCategory = normalizeTeaCategory(data.category || fallbackInitial?.category);

          // If product 2 in Firestore had old "White" or "White Tea" category, ensure it's Black Tea
          if (idStr === "2" && (!data.category || data.category.toLowerCase().includes("white") || data.category.toLowerCase().includes("dusk"))) {
            productCategory = "Black Tea";
          }

          let productOrigin = data.origin || fallbackInitial?.origin || "Darjeeling";

          fetchedProducts.push({
            ...data,
            id: parsedId,
            name: productName,
            category: productCategory,
            origin: productOrigin,
            price: Number(data.price) || 0,
            oldPrice: data.oldPrice ? Number(data.oldPrice) : undefined,
            stock,
            inStock,
            images,
            benefits,
            variants: variants as unknown as Product["variants"],
            disabledVariants,
          });
        });

        // Filter out obsolete/extra mock items so Leafly maintains exactly the 4 products
        const validIds = ["1", "2", "3", "4"];
        const canonicalProducts = fetchedProducts.filter((p) => validIds.includes(String(p.id)));
        const finalProductsList = canonicalProducts.length === 4 ? canonicalProducts : fetchedProducts;

        // Sort by ID to maintain consistent catalog order
        finalProductsList.sort((a, b) => {
          const numA = Number(a.id);
          const numB = Number(b.id);
          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
          return String(a.id).localeCompare(String(b.id));
        });

        setProducts(finalProductsList);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching products from Firestore:", error);
        // Fallback to local data on error
        setProducts(initialProducts);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const addProduct = async (product: Product): Promise<{ success: boolean; error?: string }> => {
    try {
      const newId = product.id || Date.now();
      const newProduct: Product = {
        ...product,
        id: newId,
        price: Number(product.price) || 0,
        oldPrice: product.oldPrice ? Number(product.oldPrice) : undefined,
        stock: typeof product.stock === "number" ? product.stock : 10,
        inStock: product.inStock !== false && (typeof product.stock !== "number" || product.stock > 0),
        benefits: Array.isArray(product.benefits) ? product.benefits : [],
        disabledVariants: Array.isArray(product.disabledVariants) ? product.disabledVariants : [],
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
      const stock = typeof updatedProduct.stock === "number" ? updatedProduct.stock : 10;
      const inStock = updatedProduct.inStock !== false && stock > 0;

      const normalizedProduct: Product = {
        ...updatedProduct,
        price: Number(updatedProduct.price) || 0,
        oldPrice: updatedProduct.oldPrice ? Number(updatedProduct.oldPrice) : undefined,
        stock,
        inStock,
        benefits: Array.isArray(updatedProduct.benefits) ? updatedProduct.benefits : [],
        disabledVariants: Array.isArray(updatedProduct.disabledVariants) ? updatedProduct.disabledVariants : [],
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

  const deleteProduct = async (id: number | string): Promise<{ success: boolean; error?: string }> => {
    try {
      const docId = String(id);
      await deleteDoc(doc(db, "products", docId));
      setProducts((prev) => prev.filter((p) => String(p.id) !== docId));
      return { success: true };
    } catch (error) {
      console.error("Error deleting product from Firestore:", error);
      const msg = error instanceof Error ? error.message : String(error);
      return { success: false, error: msg };
    }
  };

  return (
    <ProductContext.Provider value={{ products, addProduct, updateProduct, deleteProduct, loading }}>
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
