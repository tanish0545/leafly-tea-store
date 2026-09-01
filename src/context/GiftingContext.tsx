/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from "react";
import { giftHampers as initialHampers, type GiftHamper } from "../data/gifting";
import { db } from "../lib/firebase";
import { collection, onSnapshot, doc, setDoc, deleteDoc, getDocs, writeBatch } from "firebase/firestore";

type GiftingContextType = {
  hampers: GiftHamper[];
  addHamper: (hamper: GiftHamper) => Promise<void>;
  updateHamper: (updatedHamper: GiftHamper) => Promise<void>;
  deleteHamper: (id: number | string) => Promise<void>;
  loading: boolean;
};

const GiftingContext = createContext<GiftingContextType | undefined>(undefined);

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
            const docRef = doc(hampersRef, hamper.id.toString());
            batch.set(docRef, hamper);
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
        snapshot.forEach((doc) => {
          const data = doc.data() as GiftHamper;
          fetchedHampers.push({ ...data, id: Number(doc.id) || data.id });
        });

        // Sort by ID to maintain consistent order
        fetchedHampers.sort((a, b) => Number(a.id) - Number(b.id));
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

  const addHamper = async (hamper: GiftHamper) => {
    try {
      const newId = hamper.id || Date.now();
      const newHamper = { ...hamper, id: newId };
      await setDoc(doc(db, "hampers", newHamper.id.toString()), newHamper);
      setHampers((prev) => [...prev.filter((p) => p.id !== newHamper.id), newHamper]);
    } catch (error) {
      console.error("Error adding hamper:", error);
    }
  };

  const updateHamper = async (updatedHamper: GiftHamper) => {
    try {
      await setDoc(doc(db, "hampers", updatedHamper.id.toString()), updatedHamper, { merge: true });
      setHampers((prev) => prev.map((p) => (p.id === updatedHamper.id ? updatedHamper : p)));
    } catch (error) {
      console.error("Error updating hamper:", error);
    }
  };

  const deleteHamper = async (id: number | string) => {
    try {
      await deleteDoc(doc(db, "hampers", id.toString()));
      setHampers((prev) => prev.filter((p) => p.id !== id && String(p.id) !== String(id)));
    } catch (error) {
      console.error("Error deleting hamper:", error);
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
