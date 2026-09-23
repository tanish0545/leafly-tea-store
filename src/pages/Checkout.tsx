/* eslint-disable react-hooks/set-state-in-effect */
import { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import {
  useOrderContext,
  type Order,
  type ShippingAddress,
} from "../context/OrderContext";
import PhoneInput from "../components/PhoneInput";
import { useAuth } from "../context/AuthContext";
import { validatePhoneNumber, isValidGmailAddress, GMAIL_ERROR_MESSAGE } from "../lib/validation";
import { COUNTRIES_LIST, INDIAN_STATES_AND_CITIES } from "../data/indianLocations";
import { auth, db } from "../lib/firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { NotificationService } from "../lib/notifications";
import { ApiService } from "../lib/apiClient";
import { load as loadCashfree } from "@cashfreepayments/cashfree-js";
import { useCoupons } from "../context/CouponContext";
import CashfreePaymentLogos from "../components/CashfreePaymentLogos";
import Footer from "../components/Footer";
import SEO from "../components/SEO";
import "./Checkout.css";

type AddressForm = {
  fullName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

type FormErrors = Partial<Record<string, string>>;

function cleanFirestoreObject<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        cleaned[key] = cleanFirestoreObject(value as Record<string, unknown>);
      } else {
        cleaned[key] = value;
      }
    }
  }
  return cleaned;
}

function getSavedAddressesKey(uid?: string | null): string | null {
  return uid ? `leafly_saved_addresses_${uid}` : null;
}

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function generateOrderId() {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = String(Math.floor(Math.random() * 9000 + 1000));
  return `LF-${datePart}-${randomPart}`;
}

function readSavedAddresses(uid?: string | null): ShippingAddress[] {
  const key = getSavedAddressesKey(uid);
  if (!key) return [];
  try {
    const saved = localStorage.getItem(key);
    if (!saved) {
      return [];
    }

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const defaultAddress: AddressForm = {
  fullName: "",
  addressLine1: "",
  addressLine2: "",
  city: "Mumbai",
  state: "Maharashtra",
  postalCode: "",
  country: "India",
};

export default function Checkout() {
  const navigate = useNavigate();
  const { items, subtotal } = useCart();
  const { addOrder } = useOrderContext();
  const { currentUser, firebaseUser, loading: authLoading, isAuthenticated } = useAuth();
  const { validateUserCoupon, markCouponUsed } = useCoupons();

  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountType: "percentage" | "fixed";
    discountValue: number;
    minOrderValue: number;
  } | null>(null);
  const [couponError, setCouponError] = useState("");
  const [couponSuccess, setCouponSuccess] = useState("");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login", { replace: true, state: { from: { pathname: "/checkout" } } });
    }
  }, [authLoading, isAuthenticated, navigate]);

  const resolvedAuthEmail = currentUser?.email || firebaseUser?.email || auth.currentUser?.email || "";
  const resolvedAuthPhone = currentUser?.phone || currentUser?.phoneNumber || firebaseUser?.phoneNumber || "";

  const [email, setEmail] = useState(() => resolvedAuthEmail);
  const [phone, setPhone] = useState(() => resolvedAuthPhone);

  useEffect(() => {
    const authEmail = currentUser?.email || firebaseUser?.email || auth.currentUser?.email;
    if (authEmail && (!email || email !== authEmail)) {
      setEmail(authEmail);
    }
    const authPhone = currentUser?.phone || currentUser?.phoneNumber || firebaseUser?.phoneNumber;
    if (authPhone && (!phone || phone !== authPhone)) {
      setPhone(authPhone);
    }
  }, [currentUser, firebaseUser, email, phone]);

  // ────────────────────────────────────────────────────────
  // FEATURE FLAG: Set to true to re-enable Cashfree online payment.
  // Cashfree backend files and env vars remain intact — only the UI is disabled.
  // ────────────────────────────────────────────────────────
  const ONLINE_PAYMENT_ENABLED = false;

  const [paymentMethod, setPaymentMethod] = useState<"cashfree" | "cod">("cod");
  const [paymentLoadingText, setPaymentLoadingText] = useState("");
  const [saveAddress, setSaveAddress] = useState(true);
  const [deliveryInstructions, setDeliveryInstructions] = useState("");

  // Location detection and map preview state (TC-22)
  const [isLocating, setIsLocating] = useState(false);
  const [showMapPreview, setShowMapPreview] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("Geolocation is not supported by your browser.");
      return;
    }
    setIsLocating(true);
    setLocationStatus("Locating delivery coordinates...");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            const detectedPincode = addr.postcode || "";
            const detectedCity = addr.city || addr.town || addr.village || addr.county || "";
            const detectedState = addr.state || "";
            const detectedRoad = [addr.house_number, addr.road, addr.suburb].filter(Boolean).join(", ");

            setShippingAddress((prev) => ({
              ...prev,
              addressLine1: detectedRoad || prev.addressLine1,
              city: detectedCity || prev.city,
              state: detectedState || prev.state,
              postalCode: detectedPincode || prev.postalCode,
              country: addr.country || prev.country || "India",
            }));
            setShowMapPreview(true);
            setLocationStatus("Location detected successfully.");
            setErrors((prev) => {
              const next = { ...prev };
              delete next.postalCode;
              delete next.city;
              delete next.state;
              delete next.addressLine1;
              return next;
            });
          } else {
            setShowMapPreview(true);
            setLocationStatus("GPS coordinates detected.");
          }
        } catch {
          setShowMapPreview(true);
          setLocationStatus("GPS coordinates detected.");
        } finally {
          setIsLocating(false);
          setTimeout(() => setLocationStatus(null), 4000);
        }
      },
      (err) => {
        setIsLocating(false);
        setLocationStatus("Unable to retrieve location: " + err.message);
        setTimeout(() => setLocationStatus(null), 4000);
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  };

  // Order submission feedback state
  const [isProcessing, setIsProcessing] = useState(false);
  const [isBursting, setIsBursting] = useState(false);
  const orderCompletedRef = useRef(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const [shippingAddress, setShippingAddress] = useState<AddressForm>(() => {
    if (currentUser?.uid) {
      const savedAddresses = readSavedAddresses(currentUser.uid);
      if (savedAddresses.length > 0) {
        const lastSaved = savedAddresses[0];
        return {
          fullName: lastSaved.fullName || currentUser?.displayName || currentUser?.name || "",
          addressLine1: lastSaved.addressLine1 || "",
          addressLine2: lastSaved.addressLine2 || "",
          city: lastSaved.city || "Mumbai",
          state: lastSaved.state || "Maharashtra",
          postalCode: lastSaved.postalCode || "",
          country: lastSaved.country || "India",
        };
      }
      return {
        ...defaultAddress,
        fullName: currentUser?.displayName || currentUser?.name || "",
      };
    }
    return { ...defaultAddress };
  });

  const prevUidRef = useRef<string | undefined>(currentUser?.uid);

  // Synchronize with authenticated profile when logged in, or clear when logging out
  useEffect(() => {
    const prevUid = prevUidRef.current;
    prevUidRef.current = currentUser?.uid;

    const activeUid = currentUser?.uid || firebaseUser?.uid;
    if (activeUid) {
      setEmail(resolvedAuthEmail || "");
      setPhone(resolvedAuthPhone || "");
      setDeliveryInstructions("");
      const savedAddresses = readSavedAddresses(activeUid);
      const authDisplayName = currentUser?.displayName || currentUser?.name || firebaseUser?.displayName || "";
      if (savedAddresses.length > 0) {
        const lastSaved = savedAddresses[0];
        setShippingAddress({
          fullName: lastSaved.fullName || authDisplayName,
          addressLine1: lastSaved.addressLine1 || "",
          addressLine2: lastSaved.addressLine2 || "",
          city: lastSaved.city || "Mumbai",
          state: lastSaved.state || "Maharashtra",
          postalCode: lastSaved.postalCode || "",
          country: lastSaved.country || "India",
        });
      } else {
        setShippingAddress({
          ...defaultAddress,
          fullName: authDisplayName,
        });
      }
    } else if (prevUid) {
      // User explicitly logged out: reset fields for safety
      setEmail("");
      setPhone("");
      setDeliveryInstructions("");
      setShippingAddress({ ...defaultAddress });
    }
  }, [currentUser?.uid, currentUser?.email, currentUser?.displayName, currentUser?.name, currentUser?.phone, currentUser?.phoneNumber]);

  const availableStates = useMemo(() => {
    if (shippingAddress.country === "India") {
      return Object.keys(INDIAN_STATES_AND_CITIES);
    }
    return [];
  }, [shippingAddress.country]);

  const availableCities = useMemo(() => {
    if (shippingAddress.country === "India" && shippingAddress.state) {
      return INDIAN_STATES_AND_CITIES[shippingAddress.state] || [];
    }
    return [];
  }, [shippingAddress.country, shippingAddress.state]);

  const handlePhoneChange = (newPhone: string) => {
    setPhone(newPhone);
    const phoneRes = validatePhoneNumber(newPhone, shippingAddress.country);
    setErrors((prev) => {
      const next = { ...prev };
      if (phoneRes.isValid) {
        delete next.phone;
      } else if (newPhone.trim() && prev.phone) {
        next.phone = phoneRes.error;
      }
      return next;
    });
  };

  const handleCountryChange = (newCountry: string) => {
    if (newCountry === "India") {
      const defaultState = "Maharashtra";
      const defaultCities = INDIAN_STATES_AND_CITIES[defaultState] || [];
      setShippingAddress((prev) => ({
        ...prev,
        country: newCountry,
        state: defaultState,
        city: defaultCities[0] || "Mumbai",
      }));
    } else {
      setShippingAddress((prev) => ({
        ...prev,
        country: newCountry,
        state: "",
        city: "",
      }));
    }

    // Immediately re-validate phone for the new country
    const phoneRes = validatePhoneNumber(phone, newCountry);
    setErrors((prev) => {
      const next = { ...prev };
      if (phoneRes.isValid) {
        delete next.phone;
      } else if (phone.trim() && prev.phone) {
        next.phone = phoneRes.error;
      }
      return next;
    });
  };

  const handleStateChange = (newState: string) => {
    const defaultCities = INDIAN_STATES_AND_CITIES[newState] || [];
    setShippingAddress((prev) => ({
      ...prev,
      state: newState,
      city: defaultCities[0] || "",
    }));
    setErrors((prev) => {
      if (!prev.state) return prev;
      const next = { ...prev };
      delete next.state;
      return next;
    });
  };

  const deliveryFee = useMemo(() => {
    if (items.length === 0) return 0;
    return subtotal >= 500 ? 0 : 50;
  }, [items.length, subtotal]);

  const discountAmount = useMemo(() => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.discountType === "percentage") {
      return Math.round((subtotal * appliedCoupon.discountValue) / 100);
    }
    return Math.min(subtotal, appliedCoupon.discountValue);
  }, [appliedCoupon, subtotal]);

  const total = useMemo(
    () => Math.max(0, subtotal - discountAmount + deliveryFee),
    [deliveryFee, subtotal, discountAmount]
  );

  const handleApplyCoupon = () => {
    setCouponError("");
    setCouponSuccess("");
    const trimmed = couponInput.trim();
    if (!trimmed) {
      setCouponError("Please enter a voucher or promo code.");
      return;
    }
    const res = validateUserCoupon(trimmed, subtotal);
    if (res.isValid) {
      setAppliedCoupon({
        code: res.code,
        discountType: res.discountType,
        discountValue: res.discountValue,
        minOrderValue: res.minOrderValue,
      });
      setCouponSuccess(res.message);
      setCouponInput("");
    } else {
      setCouponError(res.message || "Invalid coupon code.");
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError("");
    setCouponSuccess("");
  };

  const updateAddressField = (field: keyof AddressForm, value: string) => {
    setShippingAddress((current) => ({
      ...current,
      [field]: value,
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.submit;
      if (field === "postalCode") {
        const clean = value.trim();
        if (shippingAddress.country === "India") {
          if (/^[1-9][0-9]{5}$/.test(clean)) {
            delete next.postalCode;
          }
        } else if (clean.length >= 4) {
          delete next.postalCode;
        }
      } else if (prev[field]) {
        delete next[field];
      }
      return next;
    });
  };

  const validateCheckout = () => {
    const nextErrors: FormErrors = {};
    const cleanEmail = email.trim().toLowerCase();
    const isAuthEmail = Boolean(resolvedAuthEmail && cleanEmail === resolvedAuthEmail.toLowerCase());
    if (!cleanEmail) {
      nextErrors.email = "Email is required.";
    } else if (!isAuthEmail && !isValidGmailAddress(cleanEmail)) {
      nextErrors.email = GMAIL_ERROR_MESSAGE;
    }

    const trimmedName = shippingAddress.fullName.trim();
    if (!trimmedName) {
      nextErrors.fullName = "Full name is required.";
    } else if (trimmedName.length < 2) {
      nextErrors.fullName = "Full name must contain at least 2 characters.";
    } else if (
      /^(abc|123|test|xyz|asdf|qwerty|none|null|admin|sample|demo|tabs\s+hajs)$/i.test(trimmedName) ||
      /(.)\1{3,}/.test(trimmedName)
    ) {
      nextErrors.fullName = "Please enter a valid, legitimate human name.";
    } else if (!/^[a-zA-Z\s.'-]+$/.test(trimmedName)) {
      nextErrors.fullName = "Full name should only contain letters and spaces.";
    }

    const trimmedAddress = shippingAddress.addressLine1.trim();
    if (!trimmedAddress) {
      nextErrors.addressLine1 = "Address line 1 is required.";
    } else if (trimmedAddress.length < 5) {
      nextErrors.addressLine1 = "Please enter a complete street address (at least 5 characters).";
    } else if (/^(asdf|test|bnsnlks|qwerty|xyz|12345)$/i.test(trimmedAddress) || /(.)\1{4,}/.test(trimmedAddress)) {
      nextErrors.addressLine1 = "Please enter a valid street/house address.";
    }

    const trimmedCity = shippingAddress.city.trim();
    if (!trimmedCity) {
      nextErrors.city = "City is required.";
    } else if (trimmedCity.length < 2) {
      nextErrors.city = "City name is too short.";
    } else if (/^(nskllkan|asdf|test|xyz|123)$/i.test(trimmedCity) || /(.)\1{3,}/.test(trimmedCity)) {
      nextErrors.city = "Please enter a valid city name.";
    }

    if (!shippingAddress.state.trim()) {
      nextErrors.state = "State is required.";
    }

    if (!shippingAddress.country.trim()) {
      nextErrors.country = "Country is required.";
    }

    const cleanPostal = shippingAddress.postalCode.trim();
    if (!cleanPostal) {
      nextErrors.postalCode = "Postal/PIN code is required.";
    } else if (shippingAddress.country === "India") {
      if (!/^[1-9][0-9]{5}$/.test(cleanPostal)) {
        nextErrors.postalCode = "Indian PIN code must be exactly 6 valid digits (e.g. 400001).";
      }
    } else if (cleanPostal.length < 4 || cleanPostal.length > 12) {
      nextErrors.postalCode = "Please enter a valid postal code.";
    }

    const phoneRes = validatePhoneNumber(phone, shippingAddress.country);
    if (!phoneRes.isValid) {
      nextErrors.phone = phoneRes.error || "Please enter a valid phone number.";
    }

    // Live stock validation across all cart items (Teas, Teaware, Gift Hampers)
    const unavailableCartItems = items.filter(
      (item) => item.product.inStock === false || (typeof item.product.stock === "number" && item.product.stock <= 0)
    );
    if (unavailableCartItems.length > 0) {
      const names = unavailableCartItems.map((i) => i.product.name).join(", ");
      nextErrors.submit = `The following item(s) are currently out of stock or unavailable: ${names}. Please remove them from your cart to complete order.`;
      setErrors(nextErrors);
      return false;
    }

    // Showcase pre-launch validation: Teaware cannot be ordered
    const teawareCartItems = items.filter(
      (item) => item.product.category === "Teaware" || String(item.product.id).startsWith("tw-")
    );
    if (teawareCartItems.length > 0) {
      nextErrors.submit = "Teaware items are currently in showcase pre-launch mode and cannot be ordered.";
      setErrors(nextErrors);
      return false;
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  // Creates initial pending order for online payments before opening Cashfree gateway
  const createInitialOnlineOrder = async (
    orderId: string,
    orderTotal: number,
    orderSubtotal: number,
    orderDeliveryFee: number
  ): Promise<Order> => {
    const currentUid = auth.currentUser?.uid || currentUser?.uid;
    if (!currentUid) {
      throw new Error("Authentication session expired. Please sign in to complete your order.");
    }

    const order: Order = {
      id: orderId,
      userId: currentUid,
      customerId: currentUid,
      customerName: shippingAddress.fullName.trim(),
      customerEmail: (
        resolvedAuthEmail ||
        email.trim() ||
        currentUser?.email ||
        firebaseUser?.email ||
        auth.currentUser?.email ||
        ""
      ).toLowerCase(),
      customerPhone: phone.trim() || currentUser?.phone || undefined,
      createdAt: new Date().toISOString(),
      status: "Processing",
      orderStatus: "Processing",
      items: items.map((item) => ({
        id: item.id || `${item.product.id}-${item.variant}`,
        productId: item.product.id,
        name: item.product.name,
        variant: item.variant || item.weight,
        weight: item.weight || item.variant,
        image: item.product.image,
        price: item.price,
        quantity: item.quantity,
        category: item.product.category,
      })),
      subtotal: orderSubtotal,
      discount: discountAmount,
      couponCode: appliedCoupon ? appliedCoupon.code : undefined,
      deliveryFee: orderDeliveryFee,
      total: orderTotal,
      deliveryMethod: orderSubtotal >= 500 ? "Free Delivery" : "Standard Delivery",
      deliveryInstructions: deliveryInstructions.trim() || undefined,
      paymentMethod: "Cashfree Online Payment",
      paymentStatus: "Pending",
      shippingAddress: {
        fullName: shippingAddress.fullName.trim(),
        addressLine1: shippingAddress.addressLine1.trim(),
        addressLine2: shippingAddress.addressLine2.trim(),
        city: shippingAddress.city.trim(),
        state: shippingAddress.state.trim(),
        postalCode: shippingAddress.postalCode.trim(),
        country: shippingAddress.country.trim(),
      },
    };

    if (saveAddress && currentUid) {
      const storageKey = getSavedAddressesKey(currentUid);
      if (storageKey) {
        const savedAddresses = readSavedAddresses(currentUid);
        const nextSaved = [
          {
            fullName: order.shippingAddress.fullName,
            addressLine1: order.shippingAddress.addressLine1,
            addressLine2: order.shippingAddress.addressLine2,
            city: order.shippingAddress.city,
            state: order.shippingAddress.state,
            postalCode: order.shippingAddress.postalCode,
            country: order.shippingAddress.country,
          },
          ...savedAddresses.filter(
            (address) =>
              !(
                address.fullName === order.shippingAddress.fullName &&
                address.addressLine1 === order.shippingAddress.addressLine1 &&
                address.city === order.shippingAddress.city &&
                address.postalCode === order.shippingAddress.postalCode
              )
          ),
        ].slice(0, 5);

        localStorage.setItem(storageKey, JSON.stringify(nextSaved));
      }
    }

    // Persist initial order to Firestore
    const cleanOrder = cleanFirestoreObject(order as unknown as Record<string, unknown>);
    await setDoc(doc(db, "orders", order.id), cleanOrder);

    if (appliedCoupon) {
      try {
        await markCouponUsed(appliedCoupon.code);
      } catch (couponErr) {
        console.warn("Could not mark coupon as used:", couponErr);
      }
    }

    // Decrement stock in real-time
    for (const item of order.items) {
      if (item.productId) {
        const idStr = String(item.productId);
        try {
          let docRef = doc(db, "products", idStr);
          let snap = await getDoc(docRef);
          if (!snap.exists()) {
            const twRef = doc(db, "teaware", idStr);
            const twSnap = await getDoc(twRef);
            if (twSnap.exists()) {
              docRef = twRef;
              snap = twSnap;
            }
          }
          if (!snap.exists()) {
            const hRef = doc(db, "hampers", idStr);
            const hSnap = await getDoc(hRef);
            if (hSnap.exists()) {
              docRef = hRef;
              snap = hSnap;
            }
          }
          if (snap.exists()) {
            const currentStock = typeof snap.data().stock === "number" ? snap.data().stock : 10;
            const newStock = Math.max(0, currentStock - item.quantity);
            await updateDoc(docRef, {
              stock: newStock,
              inStock: newStock > 0,
            });
          }
        } catch (stockError) {
          console.error(`Failed to update stock for item ${item.productId}:`, stockError);
        }
      }
    }

    addOrder(order);
    try {
      sessionStorage.setItem("leafly_last_order", JSON.stringify(order));
    } catch {
      // ignore
    }

    return order;
  };

  // Complete Cash on Delivery flow
  const finishOrder = async (
    orderId: string,
    orderTotal: number,
    orderSubtotal: number,
    orderDeliveryFee: number
  ) => {
    const currentUid = auth.currentUser?.uid || currentUser?.uid;
    if (!currentUid) {
      setIsProcessing(false);
      setIsBursting(false);
      setErrors({ submit: "Authentication session expired. Please sign in to complete your order." });
      return;
    }

    const order: Order = {
      id: orderId,
      userId: currentUid,
      customerId: currentUid,
      customerName: shippingAddress.fullName.trim(),
      customerEmail: (
        resolvedAuthEmail ||
        email.trim() ||
        currentUser?.email ||
        firebaseUser?.email ||
        auth.currentUser?.email ||
        ""
      ).toLowerCase(),
      customerPhone: phone.trim() || currentUser?.phone || undefined,
      createdAt: new Date().toISOString(),
      status: "Confirmed",
      orderStatus: "Confirmed",
      items: items.map((item) => ({
        id: item.id || `${item.product.id}-${item.variant}`,
        productId: item.product.id,
        name: item.product.name,
        variant: item.variant || item.weight,
        weight: item.weight || item.variant,
        image: item.product.image,
        price: item.price,
        quantity: item.quantity,
        category: item.product.category,
      })),
      subtotal: orderSubtotal,
      discount: discountAmount,
      couponCode: appliedCoupon ? appliedCoupon.code : undefined,
      deliveryFee: orderDeliveryFee,
      total: orderTotal,
      deliveryMethod: orderSubtotal >= 500 ? "Free Delivery" : "Standard Delivery",
      deliveryInstructions: deliveryInstructions.trim() || undefined,
      paymentMethod: "Pay on Delivery",
      paymentStatus: "Pay on Delivery",
      shippingAddress: {
        fullName: shippingAddress.fullName.trim(),
        addressLine1: shippingAddress.addressLine1.trim(),
        addressLine2: shippingAddress.addressLine2.trim(),
        city: shippingAddress.city.trim(),
        state: shippingAddress.state.trim(),
        postalCode: shippingAddress.postalCode.trim(),
        country: shippingAddress.country.trim(),
      },
    };

    if (saveAddress && currentUid) {
      const storageKey = getSavedAddressesKey(currentUid);
      if (storageKey) {
        const savedAddresses = readSavedAddresses(currentUid);
        const nextSaved = [
          {
            fullName: order.shippingAddress.fullName,
            addressLine1: order.shippingAddress.addressLine1,
            addressLine2: order.shippingAddress.addressLine2,
            city: order.shippingAddress.city,
            state: order.shippingAddress.state,
            postalCode: order.shippingAddress.postalCode,
            country: order.shippingAddress.country,
          },
          ...savedAddresses.filter(
            (address) =>
              !(
                address.fullName === order.shippingAddress.fullName &&
                address.addressLine1 === order.shippingAddress.addressLine1 &&
                address.city === order.shippingAddress.city &&
                address.postalCode === order.shippingAddress.postalCode
              )
          ),
        ].slice(0, 5);

        localStorage.setItem(storageKey, JSON.stringify(nextSaved));
      }
    }

    try {
      const cleanOrder = cleanFirestoreObject(order as unknown as Record<string, unknown>);
      await setDoc(doc(db, "orders", order.id), cleanOrder);

      if (appliedCoupon) {
        try {
          await markCouponUsed(appliedCoupon.code);
        } catch (couponErr) {
          console.warn("Could not mark coupon as used:", couponErr);
        }
      }
      for (const item of order.items) {
        if (item.productId) {
          const idStr = String(item.productId);
          try {
            let docRef = doc(db, "products", idStr);
            let snap = await getDoc(docRef);
            if (!snap.exists()) {
              const twRef = doc(db, "teaware", idStr);
              const twSnap = await getDoc(twRef);
              if (twSnap.exists()) {
                docRef = twRef;
                snap = twSnap;
              }
            }
            if (!snap.exists()) {
              const hRef = doc(db, "hampers", idStr);
              const hSnap = await getDoc(hRef);
              if (hSnap.exists()) {
                docRef = hRef;
                snap = hSnap;
              }
            }
            if (snap.exists()) {
              const currentStock = typeof snap.data().stock === "number" ? snap.data().stock : 10;
              const newStock = Math.max(0, currentStock - item.quantity);
              await updateDoc(docRef, {
                stock: newStock,
                inStock: newStock > 0,
              });
            }
          } catch (stockError) {
            console.error(`Failed to update stock for item ${item.productId}:`, stockError);
          }
        }
      }

      await addOrder(order);

      // Trigger Notifications (Fire and Forget)
      NotificationService.sendOrderConfirmationEmail({
        id: order.id,
        customerName: order.shippingAddress.fullName,
        email: order.customerEmail,
        phone: order.customerPhone || "",
        total: order.total,
        subtotal: order.subtotal,
        deliveryFee: order.deliveryFee,
        discount: order.discount,
        couponCode: order.couponCode || undefined,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        shippingAddress: order.shippingAddress,
        items: order.items.map((i) => ({
          name: i.name,
          variant: i.variant,
          weight: i.weight,
          quantity: i.quantity,
          price: i.price,
        })),
        createdAt: order.createdAt,
      });

      NotificationService.sendOrderConfirmationSMS({
        id: order.id,
        customerName: order.shippingAddress.fullName,
        email: order.customerEmail,
        phone: order.customerPhone || "",
        total: order.total,
      });

      try {
        sessionStorage.setItem("leafly_last_order", JSON.stringify(order));
      } catch {
        // ignore
      }

      orderCompletedRef.current = true;
      navigate("/order-success", { replace: true });
    } catch (error) {
      console.error("Error saving order to Firestore:", error);
      setIsProcessing(false);
      setIsBursting(false);
      setErrors({ submit: "Failed to place order. Please check your connection and try again." });
    }
  };

  const handlePlaceOrder = async () => {
    if (isProcessing) {
      return;
    }

    if (items.length === 0) {
      setErrors({ cart: "Your cart is empty. Add a tea to continue." });
      navigate("/shop");
      return;
    }

    const isValid = validateCheckout();

    if (!isValid) {
      setErrors((prev) => ({
        ...prev,
        submit: "Please check all required shipping and contact details.",
      }));
      return;
    }

    // Live inventory verification across products, teaware, and hampers before placing order
    setIsProcessing(true);
    setPaymentLoadingText(
      paymentMethod === "cashfree"
        ? "VERIFYING HARVEST AVAILABILITY..."
        : "BREWING YOUR RITUAL..."
    );

    let outOfStockItemName = "";

    for (const item of items) {
      if (item.product?.id) {
        if (item.product.inStock === false || (typeof item.product.stock === "number" && item.product.stock <= 0)) {
          outOfStockItemName = item.product.name || "Item";
          break;
        }

        const pId = String(item.product.id);
        const cat = (item.product.category || "").toLowerCase();

        let preferredCol = "products";
        const isTeaware =
          cat === "teapots" ||
          cat === "tea cups" ||
          cat === "serving & trays" ||
          cat === "storage & accessories" ||
          cat.includes("teaware");

        if (isTeaware) {
          preferredCol = "teaware";
        } else if (cat.includes("hamper") || cat.includes("gift")) {
          preferredCol = "hampers";
        }

        try {
          let snap = await getDoc(doc(db, preferredCol, pId));

          if (!snap.exists() && preferredCol !== "teaware") {
            const twSnap = await getDoc(doc(db, "teaware", pId));
            if (twSnap.exists()) snap = twSnap;
          }
          if (!snap.exists() && preferredCol !== "hampers") {
            const hSnap = await getDoc(doc(db, "hampers", pId));
            if (hSnap.exists()) snap = hSnap;
          }
          if (!snap.exists() && preferredCol !== "products") {
            const pSnap = await getDoc(doc(db, "products", pId));
            if (pSnap.exists()) snap = pSnap;
          }

          if (snap.exists()) {
            const data = snap.data();
            const currentStock = typeof data.stock === "number" ? data.stock : 10;
            const inStock = data.inStock !== false && currentStock > 0;
            if (!inStock || currentStock < item.quantity) {
              outOfStockItemName = item.product.name || data.name || "Item";
              break;
            }
          }
        } catch (err) {
          console.warn("Could not verify stock live:", err);
        }
      }
    }

    if (outOfStockItemName) {
      setIsProcessing(false);
      setPaymentLoadingText("");
      setErrors((prev) => ({
        ...prev,
        submit: `This item is currently unavailable: "${outOfStockItemName}". Please remove it from your cart to proceed.`,
      }));
      return;
    }

    // Safety guard: online payment is currently disabled
    if (paymentMethod === "cashfree" || !ONLINE_PAYMENT_ENABLED) {
      if (paymentMethod === "cashfree") {
        setErrors((prev) => ({
          ...prev,
          payment: "Online payment is currently unavailable. Please select Pay on Delivery.",
        }));
        setIsProcessing(false);
        return;
      }
    }

    const orderId = generateOrderId();

    // ==========================================
    // 1. CASH ON DELIVERY (COD) FLOW
    // ==========================================
    if (paymentMethod === "cod") {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.payment;
        return next;
      });
      setIsBursting(true);
      await finishOrder(orderId, total, subtotal, deliveryFee);
      return;
    }

    // ==========================================
    // 2. CASHFREE ONLINE PAYMENT FLOW
    // ==========================================
    try {
      setPaymentLoadingText("INITIALIZING SECURE CHECKOUT...");
      setErrors((prev) => {
        const next = { ...prev };
        delete next.payment;
        return next;
      });

      // Step A: Save initial order in Firestore with "Processing" & "Pending"
      const initialOrder = await createInitialOnlineOrder(
        orderId,
        total,
        subtotal,
        deliveryFee
      );

      // Step B: Call backend API to create Cashfree order & session
      setPaymentLoadingText("CONNECTING TO CASHFREE GATEWAY...");
      const cfResponse = await ApiService.createCashfreeOrder({
        orderId,
        customerId: initialOrder.userId,
        customerName: shippingAddress.fullName.trim(),
        customerEmail: initialOrder.customerEmail || "",
        customerPhone: phone.trim(),
        items: items.map((i) => ({
          productId: i.product.id,
          name: i.product.name,
          price: i.price,
          quantity: i.quantity,
        })),
        subtotal,
        deliveryFee,
        discount: discountAmount,
        couponCode: appliedCoupon?.code,
        total,
        origin: window.location.origin,
      });

      if (!cfResponse || !cfResponse.paymentSessionId) {
        throw new Error(
          cfResponse?.error ||
            "Unable to start secure payment session. Please retry or choose Pay on Delivery."
        );
      }

      // Step C: Initialize Cashfree Web SDK
      setPaymentLoadingText("OPENING SECURE PAYMENT...");
      const cashfreeMode =
        (import.meta.env.VITE_CASHFREE_ENV || "sandbox").toLowerCase() === "production"
          ? "production"
          : "sandbox";

      const cashfree = await loadCashfree({
        mode: cashfreeMode,
      });

      if (!cashfree) {
        throw new Error(
          "Unable to load Cashfree payment interface. Please check your network connection."
        );
      }

      // Step D: Open Cashfree Hosted Checkout
      // - Mobile: redirectTarget: "_self" activates native UPI Intent app switching (Google Pay, PhonePe, Paytm, etc.)
      // - Desktop: redirectTarget: "_modal" activates the luxury in-page Cashfree modal with "Scan & Pay with any UPI app" + QR code & Cards/NetBanking
      const isMobileDevice =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        ) || window.innerWidth < 768;

      const redirectTarget = isMobileDevice ? "_self" : "_modal";

      const checkoutResult = await cashfree.checkout({
        paymentSessionId: cfResponse.paymentSessionId,
        redirectTarget,
      });

      // If redirected (_self on mobile), the browser navigates to Cashfree and will return to return_url
      if (checkoutResult?.redirect) {
        return;
      }

      // Step E: Modal resolved — Verify payment server-side
      setPaymentLoadingText("VERIFYING PAYMENT STATUS WITH CASHFREE...");
      const verifyResult = await ApiService.verifyCashfreePayment(orderId, {
        email: initialOrder.customerEmail,
        name: shippingAddress.fullName.trim(),
      });

      if (verifyResult.verified) {
        // Payment verified authoritatively by server!
        const confirmedOrder: Order = {
          ...initialOrder,
          status: "Confirmed",
          orderStatus: "Confirmed",
          paymentStatus: "Paid",
          paymentId: verifyResult.paymentId || undefined,
          paymentMethod: verifyResult.paymentMethod || "Cashfree Online Payment",
        };

        addOrder(confirmedOrder);
        try {
          sessionStorage.setItem("leafly_last_order", JSON.stringify(confirmedOrder));
        } catch {
          // ignore
        }

        orderCompletedRef.current = true;
        setIsBursting(true);
        navigate("/order-success", { replace: true });
      } else {
        // User dismissed the modal without paying, or payment failed
        console.warn("[Cashfree Notice] Payment not verified or incomplete:", checkoutResult);
        setIsProcessing(false);
        setPaymentLoadingText("");
        setErrors((prev) => ({
          ...prev,
          payment:
            verifyResult.message ||
            "Payment was not completed. You can retry payment whenever you're ready, or choose Pay on Delivery.",
        }));
      }
    } catch (paymentErr) {
      console.error("[Cashfree Flow Error]:", paymentErr);
      setIsProcessing(false);
      setPaymentLoadingText("");
      setErrors((prev) => ({
        ...prev,
        payment:
          paymentErr instanceof Error
            ? paymentErr.message
            : "An error occurred while connecting to Cashfree. Please retry or choose Pay on Delivery.",
      }));
    }
  };


  if (items.length === 0 && !isProcessing && !orderCompletedRef.current) {
    return (
      <main className="checkout-page checkout-page-empty">
        <div className="checkout-empty-state">
          <p className="checkout-eyebrow">YOUR CART</p>
          <h1>YOUR CART IS EMPTY</h1>
          <p>Your next tea ritual is waiting.</p>
          <button type="button" className="checkout-primary-button" onClick={() => navigate("/shop")}>
            EXPLORE TEAS
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="checkout-page">
      <SEO
        title="Secure Checkout | Leafly"
        description="Secure checkout for your Leafly tea order."
        noindex={true}
      />
      <div className="checkout-header">
        <div>
          <p className="checkout-eyebrow">LEAFLY CHECKOUT</p>
          <h1>CHECKOUT</h1>
          <p className="checkout-tagline">Complete your tea ritual.</p>
        </div>

        <div className="checkout-progress" aria-label="Checkout progress">
          <span>01 CART</span>
          <span className="checkout-progress-active">02 CHECKOUT</span>
          <span>03 CONFIRMED</span>
        </div>
      </div>

      <div className="checkout-layout">
        <section className="checkout-column">
          {!currentUser && (
            <div className="checkout-auth-banner" role="alert">
              <div className="checkout-auth-banner-content">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#c9a24b" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <div>
                  <strong>Authentication Required to Order</strong>
                  <p>Please log in or create an account to complete your checkout.</p>
                </div>
              </div>
              <button
                type="button"
                className="checkout-auth-banner-btn"
                onClick={() => navigate("/login", { state: { from: { pathname: "/checkout" } } })}
              >
                SIGN IN / REGISTER
              </button>
            </div>
          )}

          <div className="checkout-card">
            <div className="checkout-card-header">
              <p>CONTACT INFORMATION</p>
              {resolvedAuthEmail && <span style={{ fontSize: "11px", color: "#a87d22", fontWeight: 600 }}>✦ Verified Account</span>}
            </div>

            <div className="checkout-field-grid two-up">
              <label className="checkout-field">
                <span>
                  Email <span style={{ color: "#c53030" }}>*</span> {resolvedAuthEmail ? "(Tied to your verified account)" : ""}
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (errors.email) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.email;
                        return next;
                      });
                    }
                  }}
                  readOnly={Boolean(resolvedAuthEmail)}
                  style={resolvedAuthEmail ? { backgroundColor: "#f3efe6", cursor: "not-allowed" } : undefined}
                  aria-invalid={Boolean(errors.email)}
                />
                {errors.email && <small>{errors.email}</small>}
              </label>

              <PhoneInput
                id="checkout-phone"
                label="Phone"
                value={phone}
                country={shippingAddress.country}
                onCountryChange={handleCountryChange}
                onChange={handlePhoneChange}
                error={errors.phone}
                required
              />
            </div>
          </div>

          <div className="checkout-card">
            <div className="checkout-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
              <p>DELIVERY ADDRESS</p>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={handleDetectLocation}
                  disabled={isLocating}
                  className="checkout-location-btn"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "rgba(201, 162, 75, 0.12)",
                    border: "1px solid rgba(201, 162, 75, 0.35)",
                    color: "#8c6823",
                    padding: "4px 10px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                  title="Detect your current delivery address automatically"
                >
                  <span aria-hidden="true">📍</span>
                  {isLocating ? "Detecting..." : "Use Current Location"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowMapPreview((prev) => !prev)}
                  className="checkout-map-toggle-btn"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    background: showMapPreview ? "#0b2b1e" : "transparent",
                    border: "1px solid rgba(11, 43, 30, 0.2)",
                    color: showMapPreview ? "#ffffff" : "#0b2b1e",
                    padding: "4px 10px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  🗺️ {showMapPreview ? "Hide Map" : "View Map"}
                </button>
              </div>
            </div>
            {locationStatus && (
              <p style={{ margin: "4px 0 10px", fontSize: "11.5px", color: "#8c6823" }}>{locationStatus}</p>
            )}

            <div className="checkout-field-grid">
              <label className="checkout-field full-width">
                <span>
                  Full Name <span style={{ color: "#c53030" }}>*</span>
                </span>
                <input
                  type="text"
                  value={shippingAddress.fullName}
                  onChange={(event) => updateAddressField("fullName", event.target.value)}
                  aria-invalid={Boolean(errors.fullName)}
                />
                {errors.fullName && <small>{errors.fullName}</small>}
              </label>

              <label className="checkout-field full-width">
                <span>
                  Address Line 1 <span style={{ color: "#c53030" }}>*</span>
                </span>
                <input
                  type="text"
                  value={shippingAddress.addressLine1}
                  onChange={(event) => updateAddressField("addressLine1", event.target.value)}
                  aria-invalid={Boolean(errors.addressLine1)}
                />
                {errors.addressLine1 && <small>{errors.addressLine1}</small>}
              </label>

              <label className="checkout-field full-width">
                <span>Address Line 2 (Optional)</span>
                <input
                  type="text"
                  value={shippingAddress.addressLine2}
                  onChange={(event) => updateAddressField("addressLine2", event.target.value)}
                />
              </label>

              <label className="checkout-field">
                <span>
                  Country <span style={{ color: "#c53030" }}>*</span>
                </span>
                <select
                  className="checkout-select"
                  value={shippingAddress.country}
                  onChange={(event) => handleCountryChange(event.target.value)}
                  aria-invalid={Boolean(errors.country)}
                >
                  {COUNTRIES_LIST.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                {errors.country && <small>{errors.country}</small>}
              </label>

              <label className="checkout-field">
                <span>
                  State / Province <span style={{ color: "#c53030" }}>*</span>
                </span>
                {shippingAddress.country === "India" ? (
                  <select
                    className="checkout-select"
                    value={shippingAddress.state}
                    onChange={(event) => handleStateChange(event.target.value)}
                    aria-invalid={Boolean(errors.state)}
                  >
                    <option value="">Select State / UT</option>
                    {availableStates.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={shippingAddress.state}
                    onChange={(event) => updateAddressField("state", event.target.value)}
                    aria-invalid={Boolean(errors.state)}
                  >
                  </input>
                )}
                {errors.state && <small>{errors.state}</small>}
              </label>

              <label className="checkout-field">
                <span>
                  City <span style={{ color: "#c53030" }}>*</span>
                </span>
                {shippingAddress.country === "India" && availableCities.length > 0 ? (
                  <select
                    className="checkout-select"
                    value={shippingAddress.city}
                    onChange={(event) => updateAddressField("city", event.target.value)}
                    aria-invalid={Boolean(errors.city)}
                  >
                    <option value="">Select City</option>
                    {availableCities.map((ct) => (
                      <option key={ct} value={ct}>{ct}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={shippingAddress.city}
                    onChange={(event) => updateAddressField("city", event.target.value)}
                    aria-invalid={Boolean(errors.city)}
                  />
                )}
                {errors.city && <small>{errors.city}</small>}
              </label>

              <label className="checkout-field">
                <span>
                  Postal Code <span style={{ color: "#c53030" }}>*</span>
                </span>
                <input
                  type="text"
                  placeholder="e.g. 400001"
                  value={shippingAddress.postalCode}
                  onChange={(event) => updateAddressField("postalCode", event.target.value)}
                  aria-invalid={Boolean(errors.postalCode)}
                />
                {errors.postalCode && <small>{errors.postalCode}</small>}
              </label>

              <label className="checkout-field full-width">
                <span>Delivery Instructions (Optional)</span>
                <textarea
                  rows={3}
                  placeholder="Apartment number, gate instructions, preferred delivery location, etc."
                  value={deliveryInstructions}
                  onChange={(event) => setDeliveryInstructions(event.target.value)}
                />
              </label>
            </div>

            {showMapPreview && (
              <div className="checkout-map-container" style={{ marginTop: "16px", borderRadius: "10px", overflow: "hidden", border: "1px solid rgba(11, 43, 30, 0.12)" }}>
                <div style={{ padding: "8px 12px", background: "rgba(11, 43, 30, 0.04)", fontSize: "11px", color: "#0b2b1e", fontWeight: 600, display: "flex", justifyContent: "space-between" }}>
                  <span>Delivery Location Preview: {[shippingAddress.addressLine1, shippingAddress.city, shippingAddress.state, shippingAddress.postalCode, shippingAddress.country].filter(Boolean).join(", ") || "India"}</span>
                  <span style={{ color: "#c9a24b" }}>● Live Map</span>
                </div>
                <iframe
                  title="Delivery Location Map"
                  width="100%"
                  height="200"
                  style={{ border: 0, display: "block" }}
                  loading="lazy"
                  src={`https://maps.google.com/maps?q=${encodeURIComponent([shippingAddress.addressLine1, shippingAddress.city, shippingAddress.state, shippingAddress.postalCode, shippingAddress.country].filter(Boolean).join(", ") || "India")}&output=embed`}
                />
              </div>
            )}

            <label className="checkout-check-row">
              <input
                type="checkbox"
                checked={saveAddress}
                onChange={(event) => setSaveAddress(event.target.checked)}
              />
              <span>SAVE THIS ADDRESS</span>
            </label>
          </div>



          <div className="checkout-card">
            <div className="checkout-card-header">
              <p>PAYMENT METHOD</p>
            </div>

            <div className="checkout-option-list payment-options" role="radiogroup" aria-label="Payment Method Selection">
              {/* 1. Online Payment — TEMPORARILY DISABLED (COMING SOON) */}
              {ONLINE_PAYMENT_ENABLED ? (
                /* Active selectable Cashfree card — only shown when flag is true */
                <label className={`checkout-option ${paymentMethod === "cashfree" ? "selected" : ""}`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cashfree"
                    checked={paymentMethod === "cashfree"}
                    onChange={() => {
                      setPaymentMethod("cashfree");
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.payment;
                        return next;
                      });
                    }}
                    aria-label="Cashfree Online Payment (Cards, UPI, NetBanking)"
                  />
                  <div className="checkout-option-content">
                    <div className="checkout-option-header-row">
                      <strong className="checkout-option-title">ONLINE PAYMENT (UPI, Cards, NetBanking)</strong>
                      <span className="payment-secure-badge">SECURE · INSTANT</span>
                    </div>
                    <p className="checkout-option-desc">
                      Pay securely via UPI (Google Pay, PhonePe, Paytm, BHIM, Amazon Pay), Enter UPI ID (yourname@upi), Cards, or NetBanking.
                    </p>
                    <CashfreePaymentLogos />
                  </div>
                </label>
              ) : (
                /* Disabled card — COMING SOON */
                <div
                  className="checkout-option checkout-option-disabled"
                  aria-disabled="true"
                  role="presentation"
                  title="Online payment is coming soon"
                >
                  <div className="checkout-option-content">
                    <div className="checkout-option-header-row">
                      <strong className="checkout-option-title checkout-option-title-muted">ONLINE PAYMENT (UPI, Cards, NetBanking)</strong>
                      <span className="checkout-coming-soon-badge">COMING SOON</span>
                    </div>
                    <p className="checkout-unavailable-note">
                      Online payment is temporarily unavailable. Please use Pay on Delivery (Cash / UPI).
                    </p>
                    <CashfreePaymentLogos />
                  </div>
                </div>
              )}

              {paymentMethod === "cashfree" && ONLINE_PAYMENT_ENABLED && (
                <div className="checkout-online-message">
                  <div className="checkout-online-badge-row">
                    <span>🔒 <strong>100% Encrypted & Instant Checkout</strong> powered by Cashfree Payments</span>
                  </div>
                  <div className="checkout-flow-hints">
                    <div className="checkout-flow-hint-item">
                      <span className="checkout-hint-icon">📱</span>
                      <div>
                        <strong>Mobile UPI Apps:</strong> Instant handoff to your installed UPI app (Google Pay, PhonePe, Paytm, BHIM, Amazon Pay).
                      </div>
                    </div>
                    <div className="checkout-flow-hint-item">
                      <span className="checkout-hint-icon">🆔</span>
                      <div>
                        <strong>Pay using UPI ID:</strong> Enter your VPA (e.g. <em>yourname@upi</em>) in the Cashfree payment screen to approve on any app.
                      </div>
                    </div>
                    <div className="checkout-flow-hint-item">
                      <span className="checkout-hint-icon">🖥️</span>
                      <div>
                        <strong>Desktop Web:</strong> Scan & Pay QR with any mobile UPI app, or pay directly via Cards & 50+ NetBanking partners.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Pay on Delivery (Cash / UPI) - Active & Selectable */}
              <label className={`checkout-option ${paymentMethod === "cod" ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cod"
                  checked={paymentMethod === "cod"}
                  onChange={() => {
                    setPaymentMethod("cod");
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.payment;
                      return next;
                    });
                  }}
                  aria-label="Pay on Delivery (Cash / UPI) - Pay when your order is delivered. Cash or UPI accepted at delivery."
                />
                <div className="checkout-option-content">
                  <div className="checkout-option-header-row">
                    <strong className="checkout-option-title">PAY ON DELIVERY (Cash / UPI)</strong>
                  </div>
                  <p className="checkout-option-desc">
                    Pay when your order is delivered. Cash or UPI accepted at delivery.
                  </p>
                </div>
              </label>

              {paymentMethod === "cod" && (
                <div className="checkout-cod-message">
                  💵 <strong>Cash or UPI accepted at delivery:</strong> When your order arrives, you can pay the delivery partner via Cash or by scanning the UPI QR code on delivery.
                </div>
              )}
            </div>

          </div>
        </section>

        <aside className="checkout-summary-card">
          <div className="checkout-card-header">
            <p>ORDER SUMMARY</p>
          </div>

          <div className="checkout-summary-items">
            {items.map((item) => (
              <article key={item.id} className="checkout-summary-item">
                <div className="checkout-summary-image-wrap">
                  <img src={item.product.image} alt={item.product.name} loading="lazy" />
                </div>

                <div className="checkout-summary-copy">
                  <div className="checkout-summary-row">
                    <strong>{item.product.name}</strong>
                    <span>{currencyFormatter.format(item.price * item.quantity)}</span>
                  </div>
                  <small>{item.product.category} · {item.variant || item.weight}</small>
                  <div className="checkout-summary-meta">
                    <span>Qty: {item.quantity}</span>
                    <span>{currencyFormatter.format(item.price)}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* COUPON SECTION */}
          <div className="checkout-coupon-section">
            <label className="checkout-coupon-title">HAVE A VOUCHER OR PROMO CODE?</label>
            {appliedCoupon ? (
              <div className="checkout-applied-coupon-card">
                <div className="checkout-applied-coupon-info">
                  <span className="checkout-applied-badge">APPLIED</span>
                  <strong className="checkout-applied-code">{appliedCoupon.code}</strong>
                  <span className="checkout-applied-saving">
                    -{currencyFormatter.format(discountAmount)} OFF
                  </span>
                </div>
                <button
                  type="button"
                  className="checkout-remove-coupon-btn"
                  onClick={handleRemoveCoupon}
                  aria-label="Remove coupon"
                >
                  REMOVE
                </button>
              </div>
            ) : (
              <div className="checkout-coupon-form">
                <div className="checkout-coupon-input-wrap">
                  <input
                    type="text"
                    className="checkout-coupon-input"
                    placeholder="Enter promo code (e.g. Leafly10)"
                    value={couponInput}
                    onChange={(e) => {
                      setCouponInput(e.target.value);
                      if (couponError) setCouponError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleApplyCoupon();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="checkout-coupon-apply-btn"
                    onClick={handleApplyCoupon}
                    disabled={!couponInput.trim()}
                  >
                    APPLY
                  </button>
                </div>
                {couponError && <p className="checkout-coupon-msg error">{couponError}</p>}
                {couponSuccess && <p className="checkout-coupon-msg success">{couponSuccess}</p>}
              </div>
            )}
          </div>

          <div className="checkout-total-box">
            <div>
              <span>Subtotal</span>
              <strong>{currencyFormatter.format(subtotal)}</strong>
            </div>
            {discountAmount > 0 && (
              <div className="checkout-discount-row">
                <span>Voucher ({appliedCoupon?.code})</span>
                <strong className="checkout-discount-amount">-{currencyFormatter.format(discountAmount)}</strong>
              </div>
            )}
            <div>
              <span>Delivery</span>
              <strong>{deliveryFee === 0 ? "Free" : currencyFormatter.format(deliveryFee)}</strong>
            </div>
            <div className="checkout-total-final">
              <span>TOTAL</span>
              <strong>{currencyFormatter.format(total)}</strong>
            </div>
          </div>

          {errors.cart && <p className="checkout-inline-error">{errors.cart}</p>}
          {errors.submit && <p className="checkout-inline-error">{errors.submit}</p>}
          {errors.payment && <p className="checkout-inline-error">{errors.payment}</p>}

          {/* FLOATING FREE DELIVERY PROMOTIONAL PILL BADGE */}
          <div className="checkout-floating-delivery-badge" role="status" aria-live="polite">
            <span className="checkout-floating-badge-icon" aria-hidden="true">🛵</span>
            <span className="checkout-floating-badge-text">
              {items.length === 0 || subtotal === 0
                ? "Shop for at least ₹500 to get FREE delivery"
                : subtotal < 500
                  ? `Add ₹${500 - subtotal} more to get FREE delivery`
                  : "FREE delivery unlocked!"}
            </span>
          </div>

          <div className="checkout-button-container">
            <button
              type="button"
              className={`checkout-primary-button ${isProcessing ? "brewing" : ""} ${isBursting ? "bursting" : ""}`}
              disabled={isProcessing || items.length === 0}
              aria-label={isProcessing ? (paymentLoadingText || "Processing...") : (paymentMethod === "cashfree" ? "Proceed to secure payment" : "Place order")}
              onClick={handlePlaceOrder}
            >
              {isProcessing ? (
                <span className="checkout-brewing-content">
                  <span className="checkout-teapot-icon" aria-hidden="true">🫖</span>
                  {paymentLoadingText || "BREWING YOUR RITUAL..."}
                </span>
              ) : paymentMethod === "cashfree" ? (
                "PROCEED TO SECURE PAYMENT"
              ) : (
                "PLACE ORDER (COD)"
              )}
            </button>

            {/* LEAF BURST PARTICLES ANIMATION */}
            {isBursting && (
              <div className="checkout-leaf-burst" aria-hidden="true">
                {[...Array(8)].map((_, i) => (
                  <span key={i} className={`burst-leaf burst-leaf-${i + 1}`}>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                      <path d="M21 3C21 3 13.5 4.5 9 9C4.5 13.5 3 21 3 21C3 21 10.5 19.5 15 15C19.5 10.5 21 3 21 3Z" />
                      <path d="M3 21C6.5 17.5 10 14 14 10" stroke="rgba(255,255,255,0.4)" strokeWidth="1" fill="none" />
                    </svg>
                  </span>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>

      <Footer />
    </main>
  );
}
