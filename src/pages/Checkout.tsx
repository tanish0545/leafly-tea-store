/* eslint-disable react-hooks/set-state-in-effect */
import { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useCoupons } from "../context/CouponContext";
import {
  useOrderContext,
  type Order,
  type ShippingAddress,
} from "../context/OrderContext";
import DeliveryAnimation from "../components/DeliveryAnimation";
import PhoneInput from "../components/PhoneInput";
import { calculateDiscount, type AppliedCoupon } from "../utils/coupon";
import { useAuth, isValidGmailAddress, GMAIL_ERROR_MESSAGE } from "../context/AuthContext";
import { validatePhoneNumber, isFirstOrderCouponCode } from "../lib/validation";
import { COUNTRIES_LIST, INDIAN_STATES_AND_CITIES } from "../data/indianLocations";
import { auth, db } from "../lib/firebase";
import { doc, setDoc, updateDoc, increment } from "firebase/firestore";
import { NotificationService } from "../lib/notifications";
import Footer from "../components/Footer";
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
  const { items, subtotal, clearCart } = useCart();
  const { addOrder } = useOrderContext();
  const { currentUser, loading: authLoading, isAuthenticated } = useAuth();
  const { validateUserCoupon, markCouponUsed, isFirstOrder } = useCoupons();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login", { replace: true, state: { from: { pathname: "/checkout" } } });
    }
  }, [authLoading, isAuthenticated, navigate]);

  const [email, setEmail] = useState(() => currentUser?.email || "");
  const [phone, setPhone] = useState(() => currentUser?.phone || currentUser?.phoneNumber || "");

  const [deliveryMethod, setDeliveryMethod] = useState<"standard" | "express">("standard");
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "card" | "cod">("cod");
  const [saveAddress, setSaveAddress] = useState(true);
  const [deliveryInstructions, setDeliveryInstructions] = useState("");

  // Coupon state
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponFeedback, setCouponFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Order submission feedback state
  const [isProcessing, setIsProcessing] = useState(false);
  const [isBursting, setIsBursting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [deliveryPhase, setDeliveryPhase] = useState<"idle" | "delivery">("idle");

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

  useEffect(() => {
    if (!isFirstOrder && appliedCoupon && isFirstOrderCouponCode(appliedCoupon.code)) {
      setAppliedCoupon(null);
      setCouponFeedback({
        type: "error",
        message: "This coupon is only valid on your first order.",
      });
    }
  }, [isFirstOrder, appliedCoupon]);

  // Synchronize with authenticated profile when logged in, or clear when logging out
  useEffect(() => {
    const prevUid = prevUidRef.current;
    prevUidRef.current = currentUser?.uid;

    if (currentUser?.uid) {
      setEmail(currentUser.email || "");
      setPhone(currentUser.phone || currentUser.phoneNumber || "");
      setDeliveryInstructions("");
      const savedAddresses = readSavedAddresses(currentUser.uid);
      if (savedAddresses.length > 0) {
        const lastSaved = savedAddresses[0];
        setShippingAddress({
          fullName: lastSaved.fullName || currentUser.displayName || currentUser.name || "",
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
          fullName: currentUser.displayName || currentUser.name || "",
        });
      }
    } else if (prevUid) {
      // User explicitly logged out: reset fields for safety
      setEmail("");
      setPhone("");
      setDeliveryInstructions("");
      setShippingAddress({ ...defaultAddress });
      setAppliedCoupon(null);
      setCouponFeedback(null);
      setCouponInput("");
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
  };

  const deliveryFee = useMemo(() => {
    if (items.length === 0) return 0;
    return deliveryMethod === "express" ? 99 : 0;
  }, [deliveryMethod, items.length]);

  const discountAmount = useMemo(() => {
    if (!appliedCoupon) return 0;
    return calculateDiscount(
      subtotal,
      appliedCoupon.discountType,
      appliedCoupon.discountValue,
      appliedCoupon.minOrderValue
    );
  }, [appliedCoupon, subtotal]);

  const total = useMemo(
    () => Math.max(0, subtotal - discountAmount + deliveryFee),
    [deliveryFee, discountAmount, subtotal]
  );

  const handleApplyCoupon = (event?: React.FormEvent | React.MouseEvent) => {
    if (event) event.preventDefault();

    const result = validateUserCoupon(couponInput, subtotal);

    if (result.isValid) {
      const discount = calculateDiscount(
        subtotal,
        result.discountType,
        result.discountValue,
        result.minOrderValue
      );
      setAppliedCoupon({
        code: result.code,
        discountType: result.discountType,
        discountValue: result.discountValue,
        discountAmount: discount,
        minOrderValue: result.minOrderValue,
      });
      setCouponFeedback({
        type: "success",
        message: result.message,
      });
      setCouponInput("");
    } else {
      setCouponFeedback({
        type: "error",
        message: result.message,
      });
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponFeedback(null);
    setCouponInput("");
  };

  const updateAddressField = (field: keyof AddressForm, value: string) => {
    setShippingAddress((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const validateCheckout = () => {
    const nextErrors: FormErrors = {};
    if (!email.trim()) {
      nextErrors.email = "Email is required.";
    } else if (!isValidGmailAddress(email)) {
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

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const finishOrder = async (
    orderId: string,
    orderTotal: number,
    orderSubtotal: number,
    orderDiscount: number,
    orderDeliveryFee: number,
    razorpayPaymentId?: string
  ) => {
    const resolvedPaymentMethod =
      paymentMethod === "card"
        ? "Debit / Credit Card / NetBanking"
        : paymentMethod === "upi"
          ? "UPI"
          : "Pay on Delivery";

    const isPaidOnline = Boolean(razorpayPaymentId) || resolvedPaymentMethod !== "Pay on Delivery";

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
      customerEmail: email.trim().toLowerCase(),
      customerPhone: phone.trim() || currentUser?.phone || undefined,
      createdAt: new Date().toISOString(),
      status: resolvedPaymentMethod === "Pay on Delivery" ? "Confirmed" : "Processing",
      orderStatus: resolvedPaymentMethod === "Pay on Delivery" ? "Confirmed" : "Processing",
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
      discount: orderDiscount,
      couponCode: appliedCoupon?.code,
      deliveryFee: orderDeliveryFee,
      total: orderTotal,
      deliveryMethod:
        deliveryMethod === "express" ? "Express Delivery" : "Standard Delivery",
      deliveryInstructions: deliveryInstructions.trim() || undefined,
      paymentMethod: resolvedPaymentMethod,
      paymentStatus: resolvedPaymentMethod === "Pay on Delivery" ? "Pay on Delivery" : isPaidOnline ? "Paid" : "Pending",
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

    // Persist order to Firestore and decrement stock in real-time
    try {
      const cleanOrder = cleanFirestoreObject(order as unknown as Record<string, unknown>);
      await setDoc(doc(db, "orders", order.id), cleanOrder);
      for (const item of order.items) {
        if (item.productId) {
          try {
            await updateDoc(doc(db, "products", String(item.productId)), {
              stock: increment(-item.quantity),
            });
          } catch (stockError) {
            console.error(`Failed to update stock for product ${item.productId}:`, stockError);
          }
        }
      }

      // Add to context (which handles saving to Firestore)
      await addOrder(order);

      // Mark coupon as used if applied
      if (appliedCoupon?.code) {
        await markCouponUsed(appliedCoupon.code);
      }

      // Clear the local cart
      clearCart();

      // Trigger Notifications (Fire and Forget)
      NotificationService.sendOrderConfirmationEmail({
        id: order.id,
        customerName: order.shippingAddress.fullName,
        email: order.customerEmail,
        phone: order.customerPhone || "",
        total: order.total
      });

      NotificationService.sendOrderConfirmationSMS({
        id: order.id,
        customerName: order.shippingAddress.fullName,
        email: order.customerEmail,
        phone: order.customerPhone || "",
        total: order.total
      });

      // Navigate after burst animation
      setTimeout(() => {
        setIsProcessing(false);
        setIsBursting(false);
        setDeliveryPhase("delivery");
      }, 450);

    } catch (error) {
      console.error("Error saving order to Firestore:", error);
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

    if (appliedCoupon && isFirstOrderCouponCode(appliedCoupon.code) && !isFirstOrder) {
      setAppliedCoupon(null);
      setCouponFeedback({
        type: "error",
        message: "This coupon is only valid on your first order.",
      });
      setErrors((prev) => ({
        ...prev,
        submit: "The applied coupon is only valid on your first order. Please remove it to continue.",
      }));
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

    const orderId = generateOrderId();

    const finalizeOrder = async (razorpayPaymentId?: string) => {
      await finishOrder(
        orderId,
        total,
        subtotal,
        discountAmount,
        deliveryFee,
        razorpayPaymentId
      );
    };

    // Pay on Delivery (Cash / UPI) active flow
    setErrors((prev) => {
      const next = { ...prev };
      delete next.payment;
      return next;
    });
    setIsBursting(true);
    setIsProcessing(true);
    await finalizeOrder();
  };

  if (items.length === 0 && deliveryPhase === "idle" && !isProcessing) {
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

  // Delivery animation -> Order Success
  if (deliveryPhase === "delivery") {
    return (
      <DeliveryAnimation
        onComplete={() => {
          navigate("/order-success");
        }}
      />
    );
  }

  return (
    <main className="checkout-page">
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
              {currentUser && <span style={{ fontSize: "11px", color: "#a87d22", fontWeight: 600 }}>✦ Verified Account</span>}
            </div>

            <div className="checkout-field-grid two-up">
              <label className="checkout-field">
                <span>Email {currentUser ? "(Tied to your authenticated account)" : ""}</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  readOnly={Boolean(currentUser?.email)}
                  style={currentUser?.email ? { backgroundColor: "#f3efe6", cursor: "not-allowed" } : undefined}
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
            <div className="checkout-card-header">
              <p>DELIVERY ADDRESS</p>
            </div>

            <div className="checkout-field-grid">
              <label className="checkout-field full-width">
                <span>Full Name</span>
                <input
                  type="text"
                  value={shippingAddress.fullName}
                  onChange={(event) => updateAddressField("fullName", event.target.value)}
                  aria-invalid={Boolean(errors.fullName)}
                />
                {errors.fullName && <small>{errors.fullName}</small>}
              </label>

              <label className="checkout-field full-width">
                <span>Address Line 1</span>
                <input
                  type="text"
                  value={shippingAddress.addressLine1}
                  onChange={(event) => updateAddressField("addressLine1", event.target.value)}
                  aria-invalid={Boolean(errors.addressLine1)}
                />
                {errors.addressLine1 && <small>{errors.addressLine1}</small>}
              </label>

              <label className="checkout-field full-width">
                <span>Address Line 2</span>
                <input
                  type="text"
                  value={shippingAddress.addressLine2}
                  onChange={(event) => updateAddressField("addressLine2", event.target.value)}
                />
              </label>

              <label className="checkout-field">
                <span>Country</span>
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
                <span>State / Province</span>
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
                  />
                )}
                {errors.state && <small>{errors.state}</small>}
              </label>

              <label className="checkout-field">
                <span>City</span>
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
                <span>Postal Code</span>
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
              <p>DELIVERY METHOD</p>
            </div>

            <div className="checkout-option-list">
              <label className={`checkout-option ${deliveryMethod === "standard" ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="deliveryMethod"
                  checked={deliveryMethod === "standard"}
                  onChange={() => setDeliveryMethod("standard")}
                />
                <span className="checkout-delivery-option-row">
                  <strong>STANDARD DELIVERY</strong>
                  <small>Free</small>
                </span>
              </label>

              <label className={`checkout-option ${deliveryMethod === "express" ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="deliveryMethod"
                  checked={deliveryMethod === "express"}
                  onChange={() => setDeliveryMethod("express")}
                />
                <span className="checkout-delivery-option-row">
                  <strong>EXPRESS DELIVERY</strong>
                  <small>₹99</small>
                </span>
              </label>
            </div>
          </div>

          <div className="checkout-card">
            <div className="checkout-card-header">
              <p>PAYMENT METHOD</p>
            </div>

            <div className="checkout-option-list payment-options" role="radiogroup" aria-label="Payment Method Selection">
              {/* 1. UPI Option - Disabled & Coming Soon */}
              <div className="checkout-option disabled" aria-disabled="true" title="UPI payments are coming soon.">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="upi"
                  checked={false}
                  disabled
                  tabIndex={-1}
                  aria-hidden="true"
                />
                <div className="checkout-option-content">
                  <div className="checkout-option-header-row">
                    <strong className="checkout-option-title">UPI</strong>
                    <span className="payment-coming-soon-badge">COMING SOON</span>
                  </div>
                  <p className="checkout-option-desc">
                    Pay using UPI apps like Google Pay, PhonePe, Paytm, BHIM, etc.
                  </p>
                </div>
              </div>

              {/* 2. Card / Netbanking Option - Disabled & Coming Soon */}
              <div className="checkout-option disabled" aria-disabled="true" title="Card and Netbanking payments are coming soon.">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="card"
                  checked={false}
                  disabled
                  tabIndex={-1}
                  aria-hidden="true"
                />
                <div className="checkout-option-content">
                  <div className="checkout-option-header-row">
                    <strong className="checkout-option-title">DEBIT CARD / CREDIT CARD / NETBANKING</strong>
                    <span className="payment-coming-soon-badge">COMING SOON</span>
                  </div>
                  <p className="checkout-option-desc">
                    Pay securely using your card or net banking
                  </p>
                </div>
              </div>

              {/* 3. Pay on Delivery (Cash / UPI) - Active & Selectable */}
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

          <div className="checkout-total-box">
            <div className="checkout-coupon-section" style={{ paddingBottom: "1.5rem", marginBottom: "1.5rem", borderBottom: "1px dashed rgba(11,43,30,0.2)" }}>
              <div className="checkout-coupon-input-wrap" style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  placeholder="Gift card or discount code"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  disabled={Boolean(appliedCoupon)}
                  style={{ flex: 1, padding: "0.5rem", border: "1px solid #ccc", borderRadius: "4px" }}
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={Boolean(appliedCoupon) || !couponInput.trim()}
                  style={{ padding: "0.5rem 1rem", background: "var(--leafly-forest)", color: "#fff", border: "none", borderRadius: "4px", cursor: Boolean(appliedCoupon) || !couponInput.trim() ? "not-allowed" : "pointer", opacity: Boolean(appliedCoupon) || !couponInput.trim() ? 0.5 : 1 }}
                >
                  Apply
                </button>
              </div>
              {appliedCoupon && (
                <div className="checkout-coupon-applied" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f0ede6", padding: "0.5rem", borderRadius: "4px", marginTop: "8px" }}>
                  <span style={{ fontWeight: 600, color: "var(--leafly-forest)" }}>🏷️ {appliedCoupon.code}</span>
                  <button type="button" onClick={handleRemoveCoupon} style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "#e53e3e" }}>×</button>
                </div>
              )}
              {couponFeedback && (
                <small className={`checkout-coupon-message ${couponFeedback.type}`} style={{ display: "block", marginTop: "8px", color: couponFeedback.type === "error" ? "#e53e3e" : "#38a169" }}>
                  {couponFeedback.message}
                </small>
              )}
            </div>

            <div>
              <span>Subtotal</span>
              <strong>{currencyFormatter.format(subtotal)}</strong>
            </div>
            {appliedCoupon && (
              <div style={{ color: "#38a169" }}>
                <span>Discount ({appliedCoupon.code})</span>
                <strong>-{currencyFormatter.format(appliedCoupon.discountAmount)}</strong>
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

          <div className="checkout-button-container">
            <button
              type="button"
              className={`checkout-primary-button ${isProcessing ? "brewing" : ""} ${isBursting ? "bursting" : ""}`}
              disabled={isProcessing || items.length === 0}
              aria-label={isProcessing ? "Brewing ritual..." : "Place order"}
              onClick={handlePlaceOrder}
            >
              {isProcessing ? (
                <span className="checkout-brewing-content">
                  <span className="checkout-teapot-icon" aria-hidden="true">🫖</span>
                  BREWING YOUR RITUAL...
                </span>
              ) : (
                "PLACE ORDER"
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
