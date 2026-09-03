/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from "react";
import { giftHampers as initialHampers, type GiftHamper } from "../data/gifting";
import { db } from "../lib/firebase";
import { collection, onSnapshot, doc, setDoc, deleteDoc, getDocs, writeBatch } from "firebase/firestore";

type GiftingContextType = {
  hampers: GiftHamper[];
  addHamper: (hamper: GiftHamper) => Promise<{ success: boolean; error?: string }>;
  updateHamper: (updatedHamper: GiftHamper) => Promise<{ success: boolean; error?: string }>;
  deleteHamper: (id: number | string) => Promise<{ success: boolean; error?: string }>;
  loading: boolean;
};

const GiftingContext = createContext<GiftingContextType | undefined>(undefined);

function sanitizeHamperPayload(hamper: GiftHamper): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(hamper)) {
    if (value !== undefined) {
      if (key === "price" || key === "oldPrice" || key === "stock") {
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

export function GiftingProvider({ children }: { children: React.ReactNode }) {
  const [hampers, setHampers] = useState<GiftHamper[]>(initialHampers);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hampersRef = collection(db, "hampers");

    // Initialize data if empty (runs in background)
    const initializeData = async () => {
      try {
        const snapshot = await getDocs(hampersRef);
        if (snapshot.empty) {
          console.log("Initializing Firestore hampers...");
          const batch = writeBatch(db);
          initialHampers.forEach((hamper) => {
            const docRef = doc(hampersRef, String(hamper.id));
            const clean = sanitizeHamperPayload({
              ...hamper,
              stock: hamper.stock ?? 10,
              inStock: hamper.inStock ?? true,
            });
            batch.set(docRef, clean);
          });
          await batch.commit();
          console.log("Firestore hampers initialized successfully.");
        }
      } catch (error) {
        console.error("Error initializing hampers:", error);
      }
    };

    // Set up real-time listener immediately
    const unsubscribe = onSnapshot(
      hampersRef,
      (snapshot) => {
        if (snapshot.empty) {
          setHampers(initialHampers);
          setLoading(false);
          initializeData();
          return;
        }

        const fetchedHampers: GiftHamper[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as GiftHamper;
          const rawId = docSnap.id;
          const parsedId = !isNaN(Number(rawId)) ? Number(rawId) : rawId;
          const stock = typeof data.stock === "number" ? data.stock : 10;
          const inStock = data.inStock !== false && stock > 0;

          fetchedHampers.push({
            ...data,
            id: parsedId as number,
            price: Number(data.price) || 0,
            oldPrice: data.oldPrice ? Number(data.oldPrice) : undefined,
            stock,
            inStock,
            category: data.category || "Luxury Gift Sets",
            includes: Array.isArray(data.includes) ? data.includes : [],
          });
        });

        // Sort by ID to maintain consistent order
        fetchedHampers.sort((a, b) => {
          const numA = Number(a.id);
          const numB = Number(b.id);
          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
          return String(a.id).localeCompare(String(b.id));
        });
        setHampers(fetchedHampers);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching hampers from Firestore:", error);
        // Fallback to local data on error
        setHampers(initialHampers);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const addHamper = async (hamper: GiftHamper): Promise<{ success: boolean; error?: string }> => {
    try {
      const newId = hamper.id || Date.now();
      const stock = typeof hamper.stock === "number" ? hamper.stock : 10;
      const inStock = hamper.inStock !== false && stock > 0;
      const newHamper: GiftHamper = {
        ...hamper,
        id: newId as number,
        price: Number(hamper.price) || 0,
        oldPrice: hamper.oldPrice ? Number(hamper.oldPrice) : undefined,
        stock,
        inStock,
      };
      const clean = sanitizeHamperPayload(newHamper);
      await setDoc(doc(db, "hampers", String(newId)), clean);
      setHampers((prev) => [...prev.filter((p) => String(p.id) !== String(newId)), newHamper]);
      return { success: true };
    } catch (error) {
      console.error("Error adding hamper:", error);
      const msg = error instanceof Error ? error.message : String(error);
      return { success: false, error: msg };
    }
  };

  const updateHamper = async (updatedHamper: GiftHamper): Promise<{ success: boolean; error?: string }> => {
    try {
      const docId = String(updatedHamper.id);
      const stock = typeof updatedHamper.stock === "number" ? updatedHamper.stock : 10;
      const inStock = updatedHamper.inStock !== false && stock > 0;
      const normalizedHamper: GiftHamper = {
        ...updatedHamper,
        price: Number(updatedHamper.price) || 0,
        oldPrice: updatedHamper.oldPrice ? Number(updatedHamper.oldPrice) : undefined,
        stock,
        inStock,
      };
      const clean = sanitizeHamperPayload(normalizedHamper);
      await setDoc(doc(db, "hampers", docId), clean, { merge: true });
      setHampers((prev) => prev.map((p) => (String(p.id) === docId ? normalizedHamper : p)));
      return { success: true };
    } catch (error) {
      console.error("Error updating hamper:", error);
      const msg = error instanceof Error ? error.message : String(error);
      return { success: false, error: msg };
    }
  };

  const deleteHamper = async (id: number | string): Promise<{ success: boolean; error?: string }> => {
    try {
      const docId = String(id);
      await deleteDoc(doc(db, "hampers", docId));
      setHampers((prev) => prev.filter((p) => String(p.id) !== docId));
      return { success: true };
    } catch (error) {
      console.error("Error deleting hamper:", error);
      const msg = error instanceof Error ? error.message : String(error);
      return { success: false, error: msg };
    }
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
