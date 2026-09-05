/**
 * LEAFLY — FRONTEND INTEGRATION CONTRACTS
 * 
 * Clean, decoupled data models and interfaces ready for connection
 * to Ketan's backend services.
 */

// ==========================================
// 1. AUTHENTICATION & USER PROFILE CONTRACTS
// ==========================================

export interface UserPreferences {
  favoriteTypes?: string;
  flavorNotes?: string;
  caffeinePreference?: string;
  brewingStyle?: string;
  timeOfDay?: string;
}

export interface AuthUser {
  uid: string;
  email: string | null;
  name?: string | null;
  fullName?: string | null;
  displayName: string | null;
  favoriteTea?: string | null;
  phone?: string | null;
  phoneNumber?: string | null;
  dob?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  preferences?: UserPreferences | null;
  photoURL?: string | null;
  profileImage?: string | null;
  profileImageUrl?: string | null;
  authProvider?: string | null;
  status?: string | null;
  isAdmin: boolean;
}

export interface SignupProfileData {
  name?: string;
  fullName?: string;
  phone?: string;
  favoriteTea?: string;
  [key: string]: unknown;
}

// ==========================================
// 2. PRODUCT & CATALOG CONTRACTS
// ==========================================

export type TeaCategory =
  | "Green"
  | "White"
  | "Black"
  | "Oolong"
  | "Herbal"
  | "Teaware";

export type ProductVariantKey = "50g" | "100g" | "250g" | "500g" | "1kg";

export interface ProductVariant {
  weight: string;
  price: number;
  oldPrice?: number;
}

export interface Product {
  id: number | string;
  name: string;
  category: TeaCategory | string;
  origin?: string;
  caffeine?: string;
  weight?: string;
  price: number;
  oldPrice?: number;
  badge?: string;
  image: string;
  stock?: number;
  inStock?: boolean;
  description?: string;
  variants?: Record<string, ProductVariant> | unknown[];
  rating?: number;
  reviewCount?: number;
}

// ==========================================
// 3. CART & WISHLIST CONTRACTS
// ==========================================

export interface CartItem {
  id: string;
  product: Product;
  variant?: ProductVariantKey | string;
  weight?: string;
  quantity: number;
  price: number;
}

export interface WishlistItem {
  product: Product;
  addedAt: string;
}

// ==========================================
// 4. CHECKOUT & SHIPPING CONTRACTS
// ==========================================

export interface ShippingAddress {
  fullName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface CheckoutPayload {
  items: {
    productId: number | string;
    variant: string;
    quantity: number;
    price: number;
  }[];
  shippingAddress: ShippingAddress;
  customerEmail: string;
  customerPhone: string;
  deliveryInstructions?: string;
  deliveryMethod: "Standard Delivery" | "Express Delivery" | string;
  paymentMethod: "Pay on Delivery" | "UPI" | "Card" | "NetBanking" | string;
  couponCode?: string;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
}

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  orderId?: string;
  method?: string;
  timestamp?: string;
  message?: string;
}

// ==========================================
// 5. ORDERS & INVOICE CONTRACTS
// ==========================================

export type OrderStatus =
  | "Pending"
  | "Confirmed"
  | "Processing"
  | "Shipping"
  | "Shipped"
  | "Transit"
  | "Out for Delivery"
  | "Delivered"
  | "Cancelled";

export interface OrderItem {
  id?: string;
  productId?: number | string;
  name: string;
  variant?: ProductVariantKey | string;
  weight?: string;
  image: string;
  price: number;
  quantity: number;
  category?: string;
}

export interface Order {
  id: string;
  userId?: string;
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  createdAt: string;
  updatedAt?: string;
  orderStatus?: OrderStatus;
  status?: OrderStatus | string;
  items: OrderItem[];
  subtotal: number;
  discount?: number;
  couponCode?: string | null;
  deliveryFee: number;
  total: number;
  deliveryMethod: string;
  deliveryInstructions?: string;
  paymentMethod: string;
  paymentStatus?: string;
  paymentId?: string | null;
  shippingAddress: ShippingAddress;
}

export interface ShipmentStatus {
  orderId: string;
  currentStatus: OrderStatus;
  trackingNumber?: string;
  carrier?: string;
  estimatedDelivery?: string;
  events?: {
    status: string;
    location: string;
    timestamp: string;
    description: string;
  }[];
}

export interface InvoiceData {
  invoiceNumber: string;
  orderId: string;
  date: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  billingAddress: ShippingAddress;
  shippingAddress: ShippingAddress;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
}

// ==========================================
// 6. COUPON & VOUCHER CONTRACTS
// ==========================================

export interface UserCoupon {
  id: string;
  code: string;
  title: string;
  discountType: "fixed" | "percentage";
  discountValue: number;
  minOrderValue: number;
  status: "available" | "used" | "expired";
  applicableCondition: string;
  expiryDate?: string;
  earnedAt?: string;
}

export interface CouponValidationResult {
  isValid: boolean;
  code: string;
  discountType: "fixed" | "percentage";
  discountValue: number;
  minOrderValue: number;
  message: string;
}

export interface AppliedCoupon {
  code: string;
  discountType: "fixed" | "percentage";
  discountValue: number;
  discountAmount: number;
  minOrderValue: number;
}
