/* eslint-disable react-refresh/only-export-components, react-hooks/set-state-in-effect */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Order, OrderItem, OrderStatus, ShippingAddress } from "../types/contracts";
import { useAuth } from "./AuthContext";
import { db } from "../lib/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc } from "firebase/firestore";

export type { Order, OrderItem, OrderStatus, ShippingAddress };

type OrderContextType = {
  orders: Order[];
  latestOrder: Order | null;
  addOrder: (order: Order) => void;
  clearOrders: () => void;
  cancelOrder: (orderId: string, couponCode?: string | null) => Promise<void>;
};

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export function OrderProvider({ children }: { children: ReactNode }) {
  // Use firebaseUser and user from AuthContext, gated by loading
  const { firebaseUser, user, loading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);

  // Track the latest Order (used by OrderSuccess page)
  const latestOrderRef = useRef<Order | null>(null);

  // Derive canonical UID and normalized email
  const uid = firebaseUser?.uid ?? user?.uid ?? null;
  const userEmail = (firebaseUser?.email ?? user?.email ?? "").trim().toLowerCase();

  useEffect(() => {
    // While Firebase Auth is still initialising, do not alter state
    if (loading) return;

    // Auth resolved: if not logged in, clear orders
    if (!uid) {
      setOrders([]);
      latestOrderRef.current = null;
      return;
    }

    // In-memory buckets for dual-query deduplication
    let uidOrders: Order[] = [];
    let emailOrders: Order[] = [];

    const mergeAndSetOrders = () => {
      const map = new Map<string, Order>();

      // 1. First add email-matched legacy orders
      for (const order of emailOrders) {
        map.set(order.id, order);
      }

      // 2. Add/overwrite with UID-matched canonical orders (higher precision)
      for (const order of uidOrders) {
        map.set(order.id, order);
      }

      const merged = Array.from(map.values());
      // Sort newest first
      merged.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setOrders(merged);
      if (merged.length > 0) {
        latestOrderRef.current = merged[0];
      }
    };

    // 1. Primary real-time listener: orders matching authenticated UID
    const uidQuery = query(
      collection(db, "orders"),
      where("userId", "==", uid)
    );

    const unsubUid = onSnapshot(
      uidQuery,
      (snapshot) => {
        uidOrders = snapshot.docs.map((d) => ({
          ...d.data(),
          id: d.id,
        }) as Order);
        mergeAndSetOrders();
      },
      (error) => {
        console.error("OrderContext: Firestore UID listener error:", error);
      }
    );

    // 2. Backward-compatible secondary listener: orders matching customerEmail
    let unsubEmail: (() => void) | null = null;
    if (userEmail) {
      const emailQuery = query(
        collection(db, "orders"),
        where("customerEmail", "==", userEmail)
      );

      unsubEmail = onSnapshot(
        emailQuery,
        (snapshot) => {
          emailOrders = snapshot.docs.map((d) => ({
            ...d.data(),
            id: d.id,
          }) as Order);
          mergeAndSetOrders();
        },
        (error) => {
          console.warn("OrderContext: Firestore legacy email listener notice:", error);
        }
      );
    }

    return () => {
      unsubUid();
      if (unsubEmail) unsubEmail();
    };
  }, [uid, userEmail, loading]);

  const addOrder = (order: Order) => {
    // Optimistically prepend the order to local state
    setOrders((current) => {
      const exists = current.some((o) => o.id === order.id);
      return exists
        ? current.map((o) => (o.id === order.id ? order : o))
        : [order, ...current];
    });
    latestOrderRef.current = order;
  };

  const clearOrders = () => {
    setOrders([]);
    latestOrderRef.current = null;
  };

  const cancelOrder = async (orderId: string, _couponCode?: string | null) => {
    const orderRef = doc(db, "orders", orderId);
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) {
      throw new Error("Order not found.");
    }
    const orderData = orderSnap.data() as Order;

    if (orderData.createdAt) {
      const orderTime = new Date(orderData.createdAt).getTime();
      const now = Date.now();
      const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
      if (!isNaN(orderTime) && now - orderTime > TWO_HOURS_MS) {
        throw new Error(
          "Your tea is being packed now, so you can no longer cancel this order. The cancellation window was 2 hours."
        );
      }
    }

    // Double-cancellation protection: Only restore inventory once
    const alreadyRestored =
      (orderData.orderStatus || orderData.status || "").toLowerCase().trim() === "cancelled" ||
      Boolean((orderData as any).inventoryRestored);

    if (!alreadyRestored && Array.isArray(orderData.items)) {
      for (const item of orderData.items) {
        if (item.productId) {
          const idStr = String(item.productId);
          try {
            let itemDocRef = doc(db, "products", idStr);
            let itemSnap = await getDoc(itemDocRef);
            if (!itemSnap.exists()) {
              const twRef = doc(db, "teaware", idStr);
              const twSnap = await getDoc(twRef);
              if (twSnap.exists()) {
                itemDocRef = twRef;
                itemSnap = twSnap;
              }
            }
            if (!itemSnap.exists()) {
              const hRef = doc(db, "hampers", idStr);
              const hSnap = await getDoc(hRef);
              if (hSnap.exists()) {
                itemDocRef = hRef;
                itemSnap = hSnap;
              }
            }
            if (itemSnap.exists()) {
              const currentStock = typeof itemSnap.data().stock === "number" ? itemSnap.data().stock : 0;
              const qty = Number(item.quantity) || 1;
              const restoredStock = currentStock + qty;
              await updateDoc(itemDocRef, {
                stock: restoredStock,
                inStock: restoredStock > 0,
              });
            }
          } catch (stockErr) {
            console.error(`OrderContext: Failed to restore stock for item ${item.productId}:`, stockErr);
          }
        }
      }
    }

    try {
      const nowIso = new Date().toISOString();
      await updateDoc(orderRef, {
        status: "Cancelled",
        orderStatus: "Cancelled",
        updatedAt: nowIso,
      });

      // Optimistically update local state immediately so user sees Cancelled without delay
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status: "Cancelled",
                orderStatus: "Cancelled",
                updatedAt: nowIso,
              }
            : o
        )
      );
    } catch (error) {
      console.error("OrderContext: Firestore cancellation error:", error);
      throw error;
    }
  };

  const latestOrder = useMemo(
    () => (orders.length > 0 ? orders[0] : null),
    [orders]
  );

  return (
    <OrderContext.Provider
      value={{
        orders,
        latestOrder,
        addOrder,
        clearOrders,
        cancelOrder,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
}

export function useOrderContext() {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error("useOrderContext must be used within an OrderProvider");
  }
  return context;
}
