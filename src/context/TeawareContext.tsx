/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from "react";
import { teawareProducts as initialTeaware, type TeawareItem } from "../data/teaware";
import { db } from "../lib/firebase";
import { collection, onSnapshot, doc, setDoc, deleteDoc, getDocs, writeBatch } from "firebase/firestore";

type TeawareContextType = {
  teaware: TeawareItem[];
  addTeaware: (item: TeawareItem) => Promise<{ success: boolean; error?: string }>;
  updateTeaware: (updatedItem: TeawareItem) => Promise<{ success: boolean; error?: string }>;
  deleteTeaware: (id: number | string) => Promise<{ success: boolean; error?: string }>;
  loading: boolean;
};

const TeawareContext = createContext<TeawareContextType | undefined>(undefined);

function sanitizeTeawarePayload(item: TeawareItem): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(item)) {
    if (value !== undefined) {
      if (key === "price" || key === "oldPrice" || key === "stock" || key === "rating" || key === "reviewCount") {
        if (value !== null && value !== "") {
          clean[key] = Number(value);
        }
      } else if (key === "inStock") {
        clean[key] = Boolean(value);
      } else if (Array.isArray(value)) {
        clean[key] = [...value];
      } else if (value !== null && typeof value === "object") {
        clean[key] = { ...(value as Record<string, unknown>) };
      } else {
        clean[key] = value;
      }
    }
  }
  return clean;
}

export function TeawareProvider({ children }: { children: React.ReactNode }) {
  const [teaware, setTeaware] = useState<TeawareItem[]>(initialTeaware);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const teawareRef = collection(db, "teaware");

    // Initialize data if empty (runs in background)
    const initializeData = async () => {
      try {
        const snapshot = await getDocs(teawareRef);
        if (snapshot.empty) {
          console.log("Initializing Firestore teaware...");
          const batch = writeBatch(db);
          initialTeaware.forEach((item) => {
            const docRef = doc(teawareRef, String(item.id));
            const clean = sanitizeTeawarePayload({
              ...item,
              stock: item.stock ?? 10,
              inStock: item.inStock ?? true,
            });
            batch.set(docRef, clean);
          });
          await batch.commit();
          console.log("Firestore teaware initialized successfully.");
        }
      } catch (error) {
        console.error("Error initializing teaware:", error);
      }
    };

    // Set up real-time listener immediately
    const unsubscribe = onSnapshot(
      teawareRef,
      (snapshot) => {
        if (snapshot.empty) {
          setTeaware(initialTeaware);
          setLoading(false);
          initializeData();
          return;
        }

        const fetchedTeaware: TeawareItem[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as TeawareItem;
          const rawId = docSnap.id;
          const parsedId = !isNaN(Number(rawId)) ? Number(rawId) : rawId;
          const stock = typeof data.stock === "number" ? data.stock : 10;
          const inStock = data.inStock !== false && stock > 0;

          fetchedTeaware.push({
            ...data,
            id: parsedId as number,
            price: Number(data.price) || 0,
            oldPrice: data.oldPrice ? Number(data.oldPrice) : undefined,
            stock,
            inStock,
            category: data.category || "Teapots",
            features: Array.isArray(data.features) ? data.features : [],
          });
        });

        // Sort by ID to maintain consistent order
        fetchedTeaware.sort((a, b) => {
          const numA = Number(a.id);
          const numB = Number(b.id);
          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
          return String(a.id).localeCompare(String(b.id));
        });
        setTeaware(fetchedTeaware);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching teaware from Firestore:", error);
        // Fallback to local data on error
        setTeaware(initialTeaware);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const addTeaware = async (item: TeawareItem): Promise<{ success: boolean; error?: string }> => {
    try {
      const newId = item.id || Date.now();
      const stock = typeof item.stock === "number" ? item.stock : 10;
      const inStock = item.inStock !== false && stock > 0;
      const newItem: TeawareItem = {
        ...item,
        id: newId as number,
        price: Number(item.price) || 0,
        oldPrice: item.oldPrice ? Number(item.oldPrice) : undefined,
        stock,
        inStock,
      };
      const clean = sanitizeTeawarePayload(newItem);
      await setDoc(doc(db, "teaware", String(newId)), clean);
      setTeaware((prev) => [...prev.filter((p) => String(p.id) !== String(newId)), newItem]);
      return { success: true };
    } catch (error) {
      console.error("Error adding teaware:", error);
      const msg = error instanceof Error ? error.message : String(error);
      return { success: false, error: msg };
    }
  };

  const updateTeaware = async (updatedItem: TeawareItem): Promise<{ success: boolean; error?: string }> => {
    try {
      const docId = String(updatedItem.id);
      const stock = typeof updatedItem.stock === "number" ? updatedItem.stock : 10;
      const inStock = updatedItem.inStock !== false && stock > 0;
      const normalizedItem: TeawareItem = {
        ...updatedItem,
        price: Number(updatedItem.price) || 0,
        oldPrice: updatedItem.oldPrice ? Number(updatedItem.oldPrice) : undefined,
        stock,
        inStock,
      };
      const clean = sanitizeTeawarePayload(normalizedItem);
      await setDoc(doc(db, "teaware", docId), clean, { merge: true });
      setTeaware((prev) => prev.map((p) => (String(p.id) === docId ? normalizedItem : p)));
      return { success: true };
    } catch (error) {
      console.error("Error updating teaware:", error);
      const msg = error instanceof Error ? error.message : String(error);
      return { success: false, error: msg };
    }
  };

  const deleteTeaware = async (id: number | string): Promise<{ success: boolean; error?: string }> => {
    try {
      const docId = String(id);
      await deleteDoc(doc(db, "teaware", docId));
      setTeaware((prev) => prev.filter((p) => String(p.id) !== docId));
      return { success: true };
    } catch (error) {
      console.error("Error deleting teaware:", error);
      const msg = error instanceof Error ? error.message : String(error);
      return { success: false, error: msg };
    }
  };

  return (
    <TeawareContext.Provider value={{ teaware, addTeaware, updateTeaware, deleteTeaware, loading }}>
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
