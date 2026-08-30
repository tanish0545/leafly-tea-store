/* eslint-disable react-refresh/only-export-components, react-hooks/set-state-in-effect */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  type ReactNode,
} from "react";
import type { UserCoupon, CouponValidationResult } from "../types/contracts";
import { useAuth } from "./AuthContext";
import { useOrderContext } from "./OrderContext";
import { isFirstOrderEligible, isFirstOrderCouponCode } from "../lib/validation";

export type { UserCoupon, CouponValidationResult };

type CouponContextType = {
  coupons: UserCoupon[];
  isFirstOrder: boolean;
  addCoupon: (coupon: Omit<UserCoupon, "id" | "earnedAt">) => Promise<void>;
  markCouponUsed: (code: string) => Promise<void>;
  restoreCoupon: (code: string) => Promise<void>;
  validateUserCoupon: (code: string, subtotal: number) => CouponValidationResult;
};

export const LEAFLY10_COUPON: UserCoupon = {
  id: "coupon-leafly10",
  code: "Leafly10",
  title: "Leafly First-Harvest Welcome",
  discountType: "percentage",
  discountValue: 10,
  minOrderValue: 0,
  status: "available",
  applicableCondition: "10% OFF on your very first harvest order",
  expiryDate: "31 Dec 2026",
  earnedAt: new Date().toISOString(),
};

const CouponContext = createContext<CouponContextType | undefined>(undefined);

const COUPON_STORAGE_PREFIX = "leafly_coupons_";

export function CouponProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const { orders } = useOrderContext();

  // Determine true first-order eligibility strictly from authenticated order history
  const isFirstOrder = useMemo(() => isFirstOrderEligible(orders), [orders]);

  const [coupons, setCoupons] = useState<UserCoupon[]>([
    {
      ...LEAFLY10_COUPON,
      status: isFirstOrder ? "available" : "used",
    },
  ]);

  useEffect(() => {
    const baseFirstOrderCoupon: UserCoupon = {
      ...LEAFLY10_COUPON,
      status: isFirstOrder ? "available" : "used",
    };

    if (!currentUser?.uid) {
      setCoupons([baseFirstOrderCoupon]);
      return;
    }

    try {
      const storageKey = `${COUPON_STORAGE_PREFIX}${currentUser.uid}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed: UserCoupon[] = JSON.parse(saved);
        // Ensure first-order coupon status reflects true order history
        const updated = parsed.map((c) =>
          isFirstOrderCouponCode(c.code)
            ? { ...c, status: isFirstOrder ? ("available" as const) : ("used" as const) }
            : c
        );
        setCoupons(updated);
      } else {
        setCoupons([baseFirstOrderCoupon]);
        localStorage.setItem(storageKey, JSON.stringify([baseFirstOrderCoupon]));
      }
    } catch {
      setCoupons([baseFirstOrderCoupon]);
    }
  }, [currentUser?.uid, isFirstOrder]);

  const addCoupon = async (newCoupon: Omit<UserCoupon, "id" | "earnedAt">) => {
    if (!currentUser?.uid) return;

    const couponId = `coupon-${newCoupon.code.toLowerCase()}-${Date.now()}`;
    const fullCoupon: UserCoupon = {
      ...newCoupon,
      id: couponId,
      earnedAt: new Date().toISOString(),
    };

    setCoupons((prev) => {
      const next = [fullCoupon, ...prev];
      localStorage.setItem(`${COUPON_STORAGE_PREFIX}${currentUser.uid}`, JSON.stringify(next));
      return next;
    });
  };

  const markCouponUsed = async (code: string) => {
    if (!currentUser?.uid) return;

    setCoupons((prev) => {
      const next = prev.map((c) =>
        c.code.toUpperCase() === code.toUpperCase()
          ? { ...c, status: "used" as const }
          : c
      );
      localStorage.setItem(`${COUPON_STORAGE_PREFIX}${currentUser.uid}`, JSON.stringify(next));
      return next;
    });
  };

  const restoreCoupon = async (code: string) => {
    if (!currentUser?.uid) return;

    setCoupons((prev) => {
      const next = prev.map((c) =>
        c.code.toUpperCase() === code.toUpperCase() && c.status === "used"
          ? { ...c, status: "available" as const }
          : c
      );
      localStorage.setItem(`${COUPON_STORAGE_PREFIX}${currentUser.uid}`, JSON.stringify(next));
      return next;
    });
  };

  /**
   * Validates a coupon against the customer's order history and eligibility rules.
   * First-order coupons (e.g. Leafly10) are strictly rejected if customer has already placed an order.
   */
  const validateUserCoupon = (inputCode: string, subtotal: number): CouponValidationResult => {
    const trimmed = inputCode.trim();
    if (!trimmed) {
      return {
        isValid: false,
        code: "",
        discountType: "percentage",
        discountValue: 0,
        minOrderValue: 0,
        message: "Please enter a coupon code.",
      };
    }

    const normalized = trimmed.toUpperCase();

    // 1. Check First-Order Welcome Coupons
    if (isFirstOrderCouponCode(normalized)) {
      if (!isFirstOrder) {
        return {
          isValid: false,
          code: trimmed,
          discountType: "percentage",
          discountValue: 0,
          minOrderValue: 0,
          message: "This coupon is only valid on your first order.",
        };
      }

      const discountPercentage = 10;
      const discountAmount = Math.round((subtotal * discountPercentage) / 100);
      return {
        isValid: true,
        code: "Leafly10",
        discountType: "percentage",
        discountValue: discountPercentage,
        minOrderValue: 0,
        message: `Coupon Leafly10 applied! (10% OFF · ₹${discountAmount.toLocaleString("en-IN")} saved)`,
      };
    }

    // 2. Check Returning Customer Reward Coupon
    if (normalized === "HARVEST15") {
      const discountPercentage = 15;
      const discountAmount = Math.round((subtotal * discountPercentage) / 100);
      return {
        isValid: true,
        code: "HARVEST15",
        discountType: "percentage",
        discountValue: discountPercentage,
        minOrderValue: 0,
        message: `Coupon HARVEST15 applied! (15% OFF · ₹${discountAmount.toLocaleString("en-IN")} saved)`,
      };
    }

    return {
      isValid: false,
      code: trimmed,
      discountType: "percentage",
      discountValue: 0,
      minOrderValue: 0,
      message: "Invalid coupon code.",
    };
  };

  return (
    <CouponContext.Provider
      value={{
        coupons,
        isFirstOrder,
        addCoupon,
        markCouponUsed,
        restoreCoupon,
        validateUserCoupon,
      }}
    >
      {children}
    </CouponContext.Provider>
  );
}

export function useCoupons() {
  const context = useContext(CouponContext);
  if (!context) {
    throw new Error("useCoupons must be used within a CouponProvider");
  }
  return context;
}
