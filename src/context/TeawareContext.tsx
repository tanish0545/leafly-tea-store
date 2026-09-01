/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from "react";
import { teawareProducts as initialTeaware, type TeawareItem } from "../data/teaware";
import { db } from "../lib/firebase";
import { collection, onSnapshot, doc, setDoc, deleteDoc, getDocs, writeBatch } from "firebase/firestore";

type TeawareContextType = {
  teaware: TeawareItem[];
  addTeaware: (item: TeawareItem) => Promise<void>;
  updateTeaware: (updatedItem: TeawareItem) => Promise<void>;
  deleteTeaware: (id: number | string) => Promise<void>;
  loading: boolean;
};

const TeawareContext = createContext<TeawareContextType | undefined>(undefined);

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
            const docRef = doc(teawareRef, item.id.toString());
            batch.set(docRef, item);
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
        snapshot.forEach((doc) => {
          const data = doc.data() as TeawareItem;
          fetchedTeaware.push({ ...data, id: Number(doc.id) || data.id });
        });

        // Sort by ID to maintain consistent order
        fetchedTeaware.sort((a, b) => Number(a.id) - Number(b.id));
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

  const addTeaware = async (item: TeawareItem) => {
    try {
      const newId = item.id || Date.now();
      const newItem = { ...item, id: newId };
      await setDoc(doc(db, "teaware", newItem.id.toString()), newItem);
      setTeaware((prev) => [...prev.filter((p) => p.id !== newItem.id), newItem]);
    } catch (error) {
      console.error("Error adding teaware:", error);
    }
  };

  const updateTeaware = async (updatedItem: TeawareItem) => {
    try {
      await setDoc(doc(db, "teaware", updatedItem.id.toString()), updatedItem, { merge: true });
      setTeaware((prev) => prev.map((p) => (p.id === updatedItem.id ? updatedItem : p)));
    } catch (error) {
      console.error("Error updating teaware:", error);
    }
  };

  const deleteTeaware = async (id: number | string) => {
    try {
      await deleteDoc(doc(db, "teaware", id.toString()));
      setTeaware((prev) => prev.filter((p) => p.id !== id && String(p.id) !== String(id)));
    } catch (error) {
      console.error("Error deleting teaware:", error);
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
