import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useProducts } from "../context/ProductContext";
import { useTeaware } from "../context/TeawareContext";
import { useGifting } from "../context/GiftingContext";
import { useCoupons, type UserCoupon } from "../context/CouponContext";
import { type Product, type TeaCategory } from "../data/products";
import { type TeawareItem, type TeawareCategory } from "../data/teaware";
import { type GiftHamper } from "../data/gifting";
import { useAuth } from "../context/AuthContext";
import { db } from "../lib/firebase";
import { collection, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy } from "firebase/firestore";
import type { Order, OrderStatus } from "../types/contracts";
import "./AdminDashboard.css";

export type AccountUser = {
  id: string;
  uid: string;
  name: string;
  email: string;
  phone?: string;
  createdAt?: string | null;
  status: string;
  authProvider: string;
  favoriteTea?: string | null;
  preferences?: Record<string, unknown> | null;
};

type TabType = "dashboard" | "products" | "teaware" | "hampers" | "orders" | "accounts" | "coupons";

export default function AdminDashboard() {
  const { products, updateProduct, addProduct, loading: productsLoading } = useProducts();
  const { teaware, updateTeaware, addTeaware, deleteTeaware, loading: teawareLoading } = useTeaware();
  const { hampers, updateHamper, addHamper, deleteHamper, loading: hampersLoading } = useGifting();
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const { globalCoupons, createGlobalCoupon, updateGlobalCoupon, deleteGlobalCoupon } = useCoupons();

  // Navigation & UI States
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Editing States
  const [isEditing, setIsEditing] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product>>({});
  const [isEditingTeaware, setIsEditingTeaware] = useState(false);
  const [currentTeaware, setCurrentTeaware] = useState<Partial<TeawareItem>>({});
  const [isEditingHamper, setIsEditingHamper] = useState(false);
  const [currentHamper, setCurrentHamper] = useState<Partial<GiftHamper>>({});
  const [isEditingCoupon, setIsEditingCoupon] = useState(false);
  const [currentCoupon, setCurrentCoupon] = useState<Partial<UserCoupon>>({});

  // Filter & Search States
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [orderFilterStatus, setOrderFilterStatus] = useState("all");
  const [orderFilterPayment, setOrderFilterPayment] = useState("all");

  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [productFilterCategory, setProductFilterCategory] = useState("all");

  const [teawareSearchQuery, setTeawareSearchQuery] = useState("");
  const [teawareFilterCategory, setTeawareFilterCategory] = useState("all");

  const [hamperSearchQuery, setHamperSearchQuery] = useState("");
  const [couponSearchQuery, setCouponSearchQuery] = useState("");

  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Accounts State
  const [accounts, setAccounts] = useState<AccountUser[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountSearchQuery, setAccountSearchQuery] = useState("");
  const [accountFilterProvider, setAccountFilterProvider] = useState("all");
  const [selectedAccount, setSelectedAccount] = useState<AccountUser | null>(null);

  // Real-time Firestore orders synchronization
  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedOrders = snapshot.docs.map((docSnap) => ({
          ...docSnap.data(),
          id: docSnap.id,
        }) as Order);
        setOrders(fetchedOrders);
        setOrdersLoading(false);
      },
      (error) => {
        console.error("Error fetching orders:", error);
        setOrdersLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Real-time Firestore customer accounts synchronization
  useEffect(() => {
    const usersCol = collection(db, "users");
    const unsubscribe = onSnapshot(
      usersCol,
      (snapshot) => {
        const fetchedAccounts: AccountUser[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          const resolvedName = d.fullName || d.displayName || d.name || "Customer";
          const resolvedEmail = d.email || "No Email Provided";
          const resolvedPhone = d.phone || d.phoneNumber || d.mobile || d.mobileNumber || "—";
          const resolvedCreatedAt = d.createdAt || d.joinedAt || d.registeredAt || null;
          const resolvedProvider = d.authProvider || d.provider || (d.email ? "Email/Password" : "Direct");
          const resolvedStatus = d.status || "Active";

          return {
            id: docSnap.id,
            uid: d.uid || docSnap.id,
            name: resolvedName,
            email: resolvedEmail,
            phone: resolvedPhone,
            createdAt: resolvedCreatedAt,
            status: resolvedStatus,
            authProvider: resolvedProvider,
            favoriteTea: d.favoriteTea || null,
            preferences: d.preferences || null,
          };
        });

        // Sort descending by registration date if available
        fetchedAccounts.sort((a, b) => {
          if (!a.createdAt) return 1;
          if (!b.createdAt) return -1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        setAccounts(fetchedAccounts);
        setAccountsLoading(false);
      },
      (error) => {
        console.error("Error listening to accounts in Firestore:", error);
        setAccountsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Close modals & mobile menu on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedOrder(null);
        setSelectedAccount(null);
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Tab switcher with auto mobile drawer close
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Product Actions
  const handleEditClick = (product: Product) => {
    setCurrentProduct(product);
    setIsEditing(true);
  };

  const handleAddNewClick = () => {
    setCurrentProduct({
      name: "",
      category: "Green",
      origin: "",
      caffeine: "Medium",
      weight: "100g",
      price: 0,
      badge: "Popular",
      image: "/leafly-green-tea.webp",
      stock: 10,
      customTag: { text: "", color: "#38a169" },
      variants: {
        "100g": { weight: "100g", price: 0 },
        "250g": { weight: "250g", price: 0 }
      }
    });
    setIsEditing(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clean up undefined values for Firestore
    const cleanProduct = { ...currentProduct } as Product;
    if (cleanProduct.oldPrice === undefined) cleanProduct.oldPrice = null as unknown as number;
    if (cleanProduct.badge === undefined) cleanProduct.badge = null as unknown as "Popular";

    // Preserve manually entered variants
    const newVariants: Record<string, { weight: string; price: number; oldPrice?: number }> = {};
    if (cleanProduct.variants) {
      for (const [vKey, vData] of Object.entries(cleanProduct.variants)) {
        if (vData) {
          newVariants[vKey] = {
            weight: vData.weight,
            price: vData.price,
            oldPrice: vData.oldPrice || undefined
          };
        }
      }
    }
    // Ensure at least 100g is selected if none
    if (Object.keys(newVariants).length === 0) {
      newVariants["100g"] = { weight: "100g", price: cleanProduct.price, oldPrice: cleanProduct.oldPrice || undefined };
    }

    if (currentProduct.id) {
      const updated = { ...cleanProduct, variants: newVariants as Product["variants"] };
      await updateProduct(updated);
    } else {
      const newProduct = { ...cleanProduct, variants: newVariants as Product["variants"] };
      newProduct.id = Date.now();
      await addProduct(newProduct);
    }
    setIsEditing(false);
  };

  // Teaware Actions
  const handleEditTeawareClick = (item: TeawareItem) => {
    setCurrentTeaware(item);
    setIsEditingTeaware(true);
  };

  const handleAddNewTeawareClick = () => {
    setCurrentTeaware({
      name: "",
      category: "Teapots",
      material: "",
      capacity: "",
      price: 0,
      badge: "Popular",
      image: "",
      description: "",
      features: [""],
      rating: 5.0,
      reviewCount: 0
    });
    setIsEditingTeaware(true);
  };

  const handleSaveTeaware = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanItem = { ...currentTeaware } as TeawareItem;
    if (cleanItem.oldPrice === undefined) cleanItem.oldPrice = null as unknown as number;
    if (cleanItem.capacity === undefined) cleanItem.capacity = "";

    if (currentTeaware.id) {
      await updateTeaware(cleanItem);
    } else {
      cleanItem.id = Date.now();
      await addTeaware(cleanItem);
    }
    setIsEditingTeaware(false);
  };

  const handleDeleteTeaware = async (id: number | string) => {
    if (window.confirm("Are you sure you want to delete this teaware item?")) {
      await deleteTeaware(id);
    }
  };

  // Hamper Actions
  const handleEditHamperClick = (hamper: GiftHamper) => {
    setCurrentHamper(hamper);
    setIsEditingHamper(true);
  };

  const handleAddNewHamperClick = () => {
    setCurrentHamper({
      name: "",
      subtitle: "",
      price: 0,
      image: "",
      includes: [""],
      badge: ""
    });
    setIsEditingHamper(true);
  };

  const handleSaveHamper = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanHamper = { ...currentHamper } as GiftHamper;
    if (cleanHamper.badge === undefined) cleanHamper.badge = "";

    if (currentHamper.id) {
      await updateHamper(cleanHamper);
    } else {
      cleanHamper.id = Date.now();
      await addHamper(cleanHamper);
    }
    setIsEditingHamper(false);
  };

  const handleDeleteHamper = async (id: number | string) => {
    if (window.confirm("Are you sure you want to delete this hamper?")) {
      await deleteHamper(id);
    }
  };

  // Order Actions
  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "orders", orderId), {
        status: newStatus,
        orderStatus: newStatus,
      });
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) => prev ? { ...prev, status: newStatus, orderStatus: newStatus as OrderStatus } : null);
      }
    } catch (error) {
      console.error("Error updating order status:", error);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (window.confirm("Are you really sure you want to delete this order?")) {
      try {
        await deleteDoc(doc(db, "orders", orderId));
        if (selectedOrder?.id === orderId) {
          setSelectedOrder(null);
        }
      } catch (error) {
        console.error("Error deleting order:", error);
      }
    }
  };

  // Coupon Actions
  const handleEditCoupon = (coupon: UserCoupon) => {
    setCurrentCoupon(coupon);
    setIsEditingCoupon(true);
  };

  const handleAddNewCoupon = () => {
    setCurrentCoupon({
      code: "",
      title: "",
      discountType: "percentage",
      discountValue: 10,
      minOrderValue: 0,
      status: "available",
      applicableCondition: "",
      expiryDate: "",
    });
    setIsEditingCoupon(true);
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentCoupon.id) {
      await updateGlobalCoupon(currentCoupon as UserCoupon);
    } else {
      await createGlobalCoupon(currentCoupon as UserCoupon);
    }
    setIsEditingCoupon(false);
  };

  const handleDeleteCoupon = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this coupon?")) {
      await deleteGlobalCoupon(id);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/admin/login");
  };

  // Analytics Computation from Real Data
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const currentMonthOrders = useMemo(() => orders.filter(o => {
    const d = new Date(o.createdAt);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }), [orders, currentMonth, currentYear]);

  const currentMonthTotal = useMemo(() => currentMonthOrders.reduce((acc, o) => acc + (o.total || 0), 0), [currentMonthOrders]);

  const previousMonthOrders = useMemo(() => orders.filter(o => {
    const d = new Date(o.createdAt);
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
  }), [orders, currentMonth, currentYear]);

  const previousMonthTotal = useMemo(() => previousMonthOrders.reduce((acc, o) => acc + (o.total || 0), 0), [previousMonthOrders]);

  const percentageIncrease = previousMonthTotal === 0
    ? (currentMonthTotal > 0 ? 100 : 0)
    : Math.round(((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100);

  // Generate last 6 months sales data dynamically
  const lastSixMonthsData = useMemo(() => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthLabel = d.toLocaleString('default', { month: 'short' });

      const sales = orders.filter(o => {
        const od = new Date(o.createdAt);
        return od.getMonth() === d.getMonth() && od.getFullYear() === d.getFullYear();
      }).reduce((acc, o) => acc + (o.total || 0), 0);

      data.push({ month: monthLabel, sales });
    }
    return data;
  }, [orders]);

  const maxSales = Math.max(1, ...lastSixMonthsData.map(d => d.sales));

  // Pending & Low Stock counts
  const pendingOrdersCount = useMemo(() => {
    return orders.filter(o => (o.orderStatus || o.status || "Processing").toLowerCase() === "processing").length;
  }, [orders]);

  const lowStockCount = useMemo(() => {
    return products.filter(p => (p.stock ?? 10) <= 3).length;
  }, [products]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const queryLower = orderSearchQuery.toLowerCase().trim();
      const matchesSearch =
        !queryLower ||
        order.id.toLowerCase().includes(queryLower) ||
        (order.shippingAddress?.fullName || order.customerName || "").toLowerCase().includes(queryLower) ||
        (order.customerEmail || "").toLowerCase().includes(queryLower) ||
        (order.shippingAddress?.city || "").toLowerCase().includes(queryLower);

      const status = (order.orderStatus || order.status || "Processing").toLowerCase();
      const matchesStatus =
        orderFilterStatus === "all" || status === orderFilterStatus.toLowerCase();

      const isCOD = order.paymentMethod === "Pay on Delivery" || order.paymentMethod === "Cash on Delivery";
      const matchesPayment =
        orderFilterPayment === "all" ||
        (orderFilterPayment === "cod" && isCOD) ||
        (orderFilterPayment === "prepaid" && !isCOD);

      return matchesSearch && matchesStatus && matchesPayment;
    });
  }, [orders, orderSearchQuery, orderFilterStatus, orderFilterPayment]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const queryLower = productSearchQuery.toLowerCase().trim();
      const matchesSearch =
        !queryLower ||
        p.name.toLowerCase().includes(queryLower) ||
        p.origin.toLowerCase().includes(queryLower);

      const matchesCat =
        productFilterCategory === "all" ||
        p.category.toLowerCase() === productFilterCategory.toLowerCase();

      return matchesSearch && matchesCat;
    });
  }, [products, productSearchQuery, productFilterCategory]);

  // Filtered Teaware
  const filteredTeaware = useMemo(() => {
    return teaware.filter(item => {
      const queryLower = teawareSearchQuery.toLowerCase().trim();
      const matchesSearch =
        !queryLower ||
        item.name.toLowerCase().includes(queryLower) ||
        (item.material || "").toLowerCase().includes(queryLower);

      const matchesCat =
        teawareFilterCategory === "all" ||
        item.category.toLowerCase() === teawareFilterCategory.toLowerCase();

      return matchesSearch && matchesCat;
    });
  }, [teaware, teawareSearchQuery, teawareFilterCategory]);

  // Filtered Hampers
  const filteredHampers = useMemo(() => {
    return hampers.filter(h => {
      const queryLower = hamperSearchQuery.toLowerCase().trim();
      return (
        !queryLower ||
        h.name.toLowerCase().includes(queryLower) ||
        h.subtitle.toLowerCase().includes(queryLower)
      );
    });
  }, [hampers, hamperSearchQuery]);

  // Filtered Accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      const queryLower = accountSearchQuery.toLowerCase().trim();
      const matchesSearch =
        !queryLower ||
        acc.name.toLowerCase().includes(queryLower) ||
        acc.email.toLowerCase().includes(queryLower) ||
        (acc.phone && acc.phone.toLowerCase().includes(queryLower)) ||
        acc.uid.toLowerCase().includes(queryLower);

      const matchesProvider =
        accountFilterProvider === "all" ||
        acc.authProvider.toLowerCase().includes(accountFilterProvider.toLowerCase());

      return matchesSearch && matchesProvider;
    });
  }, [accounts, accountSearchQuery, accountFilterProvider]);

  // Filtered Coupons
  const filteredCoupons = useMemo(() => {
    return globalCoupons.filter(c => {
      const queryLower = couponSearchQuery.toLowerCase().trim();
      return (
        !queryLower ||
        c.code.toLowerCase().includes(queryLower) ||
        c.title.toLowerCase().includes(queryLower)
      );
    });
  }, [globalCoupons, couponSearchQuery]);

  const pageTitleMap: Record<TabType, string> = {
    dashboard: "Dashboard Overview",
    products: "Tea Catalog Management",
    teaware: "Teaware Collection",
    hampers: "Gift Hampers",
    orders: "Order Fulfillment",
    accounts: "Customer Accounts",
    coupons: "Promotions & Coupons",
  };

  const isInitialLoading = productsLoading || ordersLoading || teawareLoading || hampersLoading;

  if (isInitialLoading) {
    return (
      <div className="admin-layout">
        <div className="admin-loading-screen">
          <div className="admin-loading-spinner" />
          <p className="admin-loading-text">Connecting to Leafly Sanctuary Systems...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      {/* MOBILE DRAWER OVERLAY */}
      {isMobileMenuOpen && (
        <div
          className="admin-sidebar-overlay"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* SIDEBAR */}
      <aside className={`admin-sidebar ${isMobileMenuOpen ? "open" : ""}`}>
        <div className="admin-brand">
          <div className="admin-brand-logo">
            <span className="admin-brand-icon">🍃</span>
            <div className="admin-brand-text">
              <h2>LEAFLY</h2>
              <span>ADMINISTRATIVE PORTAL</span>
            </div>
          </div>
          <button
            type="button"
            className="admin-mobile-close"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Close Sidebar"
          >
            ✕
          </button>
        </div>

        <nav className="admin-nav" aria-label="Admin Navigation">
          <button
            type="button"
            className={`admin-nav-item ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => handleTabChange("dashboard")}
          >
            <svg className="admin-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
            <span className="admin-nav-label">Dashboard</span>
          </button>

          <button
            type="button"
            className={`admin-nav-item ${activeTab === "orders" ? "active" : ""}`}
            onClick={() => handleTabChange("orders")}
          >
            <svg className="admin-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            <span className="admin-nav-label">Orders</span>
            {pendingOrdersCount > 0 && (
              <span className="admin-nav-badge warning">{pendingOrdersCount}</span>
            )}
          </button>

          <button
            type="button"
            className={`admin-nav-item ${activeTab === "products" ? "active" : ""}`}
            onClick={() => handleTabChange("products")}
          >
            <svg className="admin-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            <span className="admin-nav-label">Tea Products</span>
            <span className="admin-nav-badge neutral">{products.length}</span>
          </button>

          <button
            type="button"
            className={`admin-nav-item ${activeTab === "teaware" ? "active" : ""}`}
            onClick={() => handleTabChange("teaware")}
          >
            <svg className="admin-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
            <span className="admin-nav-label">Teaware</span>
            <span className="admin-nav-badge neutral">{teaware.length}</span>
          </button>

          <button
            type="button"
            className={`admin-nav-item ${activeTab === "hampers" ? "active" : ""}`}
            onClick={() => handleTabChange("hampers")}
          >
            <svg className="admin-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
            <span className="admin-nav-label">Gift Hampers</span>
            <span className="admin-nav-badge neutral">{hampers.length}</span>
          </button>

          <button
            type="button"
            className={`admin-nav-item ${activeTab === "accounts" ? "active" : ""}`}
            onClick={() => handleTabChange("accounts")}
          >
            <svg className="admin-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <span className="admin-nav-label">Accounts</span>
            <span className="admin-nav-badge live">{accounts.length}</span>
          </button>

          <button
            type="button"
            className={`admin-nav-item ${activeTab === "coupons" ? "active" : ""}`}
            onClick={() => handleTabChange("coupons")}
          >
            <svg className="admin-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
            <span className="admin-nav-label">Coupons</span>
            <span className="admin-nav-badge neutral">{globalCoupons.length}</span>
          </button>
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-user-card">
            <div className="admin-user-avatar">
              {user?.email?.charAt(0).toUpperCase() || "A"}
            </div>
            <div className="admin-user-details">
              <span className="admin-user-role">Administrator</span>
              <span className="admin-user-email">{user?.email || "leaflydatabase@gmail.com"}</span>
            </div>
          </div>

          <div className="admin-sidebar-actions">
            <Link to="/" className="admin-store-link" title="Open Storefront">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              <span>Storefront</span>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="admin-logout-btn"
              title="Sign Out"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="admin-wrapper">
        {/* TOP HEADER */}
        <header className="admin-header">
          <div className="admin-header-left">
            <button
              type="button"
              className="admin-hamburger"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open Navigation Drawer"
            >
              <span />
              <span />
              <span />
            </button>
            <div className="admin-header-title-box">
              <div className="admin-breadcrumb">
                <span>Sanctuary Admin</span>
                <span className="breadcrumb-sep">/</span>
                <span className="breadcrumb-curr">{activeTab.toUpperCase()}</span>
              </div>
              <h1 className="admin-page-title">{pageTitleMap[activeTab]}</h1>
            </div>
          </div>

          <div className="admin-header-right">
            <div className="admin-live-indicator" title="Connected to Firebase Firestore">
              <span className="live-dot" />
              <span className="live-text">Live Sync</span>
            </div>

            <div className="admin-header-quick-stats">
              <div className="header-stat-pill">
                <span className="stat-pill-label">Orders</span>
                <span className="stat-pill-val">{orders.length}</span>
              </div>
              <div className="header-stat-pill">
                <span className="stat-pill-label">Products</span>
                <span className="stat-pill-val">{products.length}</span>
              </div>
            </div>
          </div>
        </header>

        {/* MAIN BODY CONTENT */}
        <main className="admin-main">
          {/* =========================================================
              TAB 1: DASHBOARD OVERVIEW
             ========================================================= */}
          {activeTab === "dashboard" && (
            <div className="admin-dashboard-view">
              {/* 6 KPI STATS CARDS */}
              <div className="admin-stats-grid">
                <div className="admin-kpi-card gold-border">
                  <div className="kpi-icon-wrap gold">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  </div>
                  <div className="kpi-data">
                    <span className="kpi-label">Month Revenue</span>
                    <h2 className="kpi-value">₹{currentMonthTotal.toLocaleString()}</h2>
                    <div className="kpi-footer">
                      <span className={`kpi-badge ${percentageIncrease >= 0 ? "positive" : "negative"}`}>
                        {percentageIncrease >= 0 ? "+" : ""}{percentageIncrease}% vs last month
                      </span>
                    </div>
                  </div>
                </div>

                <div className="admin-kpi-card">
                  <div className="kpi-icon-wrap forest">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                  </div>
                  <div className="kpi-data">
                    <span className="kpi-label">Month Orders</span>
                    <h2 className="kpi-value">{currentMonthOrders.length}</h2>
                    <div className="kpi-footer">
                      <span className="kpi-subtext">{orders.length} total all-time</span>
                    </div>
                  </div>
                </div>

                <div className="admin-kpi-card">
                  <div className="kpi-icon-wrap gold">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  </div>
                  <div className="kpi-data">
                    <span className="kpi-label">Pending Orders</span>
                    <h2 className="kpi-value">{pendingOrdersCount}</h2>
                    <div className="kpi-footer">
                      <span className={`kpi-badge ${pendingOrdersCount > 0 ? "warning" : "positive"}`}>
                        {pendingOrdersCount > 0 ? "Awaiting Dispatch" : "All Clear"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="admin-kpi-card">
                  <div className="kpi-icon-wrap emerald">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  </div>
                  <div className="kpi-data">
                    <span className="kpi-label">Live Customers</span>
                    <h2 className="kpi-value">{accounts.length}</h2>
                    <div className="kpi-footer">
                      <span className="kpi-badge positive">Registered Profiles</span>
                    </div>
                  </div>
                </div>

                <div className="admin-kpi-card">
                  <div className="kpi-icon-wrap forest">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                  </div>
                  <div className="kpi-data">
                    <span className="kpi-label">Total Catalog</span>
                    <h2 className="kpi-value">{products.length + teaware.length + hampers.length}</h2>
                    <div className="kpi-footer">
                      <span className="kpi-subtext">{products.length} Teas · {teaware.length} Ware</span>
                    </div>
                  </div>
                </div>

                <div className="admin-kpi-card">
                  <div className="kpi-icon-wrap red">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  </div>
                  <div className="kpi-data">
                    <span className="kpi-label">Low Stock Teas</span>
                    <h2 className="kpi-value">{lowStockCount}</h2>
                    <div className="kpi-footer">
                      <span className={`kpi-badge ${lowStockCount > 0 ? "negative" : "positive"}`}>
                        {lowStockCount > 0 ? "Items Need Reorder" : "Healthy Stock"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ANALYTICS & RECENT ORDERS SPLIT */}
              <div className="admin-dashboard-split">
                {/* SALES CHART */}
                <div className="admin-surface-card">
                  <div className="card-header-row">
                    <div>
                      <h2 className="card-title">Revenue Trajectory</h2>
                      <p className="card-subtitle">Aggregated monthly sales volume (Last 6 Months)</p>
                    </div>
                    <span className="card-badge gold">Dynamic Analytics</span>
                  </div>

                  <div className="admin-chart-container">
                    <div className="admin-chart-bars">
                      {lastSixMonthsData.map((data) => {
                        const heightPercent = Math.max(6, (data.sales / maxSales) * 100);
                        return (
                          <div className="chart-column" key={data.month}>
                            <div className="chart-tooltip">₹{data.sales.toLocaleString()}</div>
                            <div className="chart-bar-bg">
                              <div
                                className="chart-bar-fill"
                                style={{ height: `${heightPercent}%` }}
                              />
                            </div>
                            <span className="chart-month-label">{data.month}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* RECENT ORDERS OVERVIEW */}
                <div className="admin-surface-card">
                  <div className="card-header-row">
                    <div>
                      <h2 className="card-title">Recent Orders</h2>
                      <p className="card-subtitle">Latest order activity requiring fulfillment</p>
                    </div>
                    <button
                      type="button"
                      className="admin-link-btn"
                      onClick={() => handleTabChange("orders")}
                    >
                      View All ({orders.length}) →
                    </button>
                  </div>

                  {orders.length === 0 ? (
                    <div className="admin-empty-state-card">
                      <span className="empty-icon">📦</span>
                      <p>No orders placed yet.</p>
                    </div>
                  ) : (
                    <>
                      {/* Desktop Table View */}
                      <div className="admin-table-container desktop-only">
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>Order</th>
                              <th>Customer</th>
                              <th>Total</th>
                              <th>Payment</th>
                              <th>Status</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {orders.slice(0, 5).map((order) => {
                              const isCOD = order.paymentMethod === "Pay on Delivery" || order.paymentMethod === "Cash on Delivery";
                              const statusLower = (order.orderStatus || order.status || "processing").toLowerCase();
                              return (
                                <tr key={order.id}>
                                  <td>
                                    <strong className="order-id-highlight">{order.id}</strong>
                                    <span className="cell-subtext">{new Date(order.createdAt).toLocaleDateString()}</span>
                                  </td>
                                  <td>
                                    <span className="cell-main-text">{order.shippingAddress?.fullName || order.customerName || "Valued Patron"}</span>
                                    <span className="cell-subtext">{order.shippingAddress?.city || "Direct"}</span>
                                  </td>
                                  <td><strong className="gold-text">₹{order.total?.toLocaleString() || 0}</strong></td>
                                  <td>
                                    <span className={`payment-pill ${isCOD ? "cod" : "prepaid"}`}>
                                      {isCOD ? "COD" : "PREPAID"}
                                    </span>
                                  </td>
                                  <td>
                                    <span className={`status-pill ${statusLower}`}>
                                      {order.orderStatus || order.status || "Processing"}
                                    </span>
                                  </td>
                                  <td>
                                    <button
                                      type="button"
                                      className="admin-btn-action"
                                      onClick={() => setSelectedOrder(order)}
                                    >
                                      View
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile Card List View */}
                      <div className="admin-mobile-card-list mobile-only">
                        {orders.slice(0, 4).map((order) => {
                          const isCOD = order.paymentMethod === "Pay on Delivery" || order.paymentMethod === "Cash on Delivery";
                          const statusLower = (order.orderStatus || order.status || "processing").toLowerCase();
                          return (
                            <div className="admin-mobile-card" key={order.id}>
                              <div className="mobile-card-header">
                                <div>
                                  <strong className="order-id-highlight">{order.id}</strong>
                                  <span className="mobile-card-date">{new Date(order.createdAt).toLocaleDateString()}</span>
                                </div>
                                <span className={`status-pill ${statusLower}`}>
                                  {order.orderStatus || order.status || "Processing"}
                                </span>
                              </div>
                              <div className="mobile-card-body">
                                <div className="mobile-card-info-row">
                                  <span>Customer:</span>
                                  <strong>{order.shippingAddress?.fullName || order.customerName || "Patron"}</strong>
                                </div>
                                <div className="mobile-card-info-row">
                                  <span>Total:</span>
                                  <strong className="gold-text">₹{order.total?.toLocaleString() || 0}</strong>
                                </div>
                                <div className="mobile-card-info-row">
                                  <span>Payment:</span>
                                  <span className={`payment-pill ${isCOD ? "cod" : "prepaid"}`}>
                                    {isCOD ? "COD" : "PREPAID"}
                                  </span>
                                </div>
                              </div>
                              <div className="mobile-card-actions">
                                <button
                                  type="button"
                                  className="admin-btn-primary full-width"
                                  onClick={() => setSelectedOrder(order)}
                                >
                                  View Details
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              TAB 2: ORDERS MANAGEMENT
             ========================================================= */}
          {activeTab === "orders" && (
            <div className="admin-section-view">
              <div className="admin-section-header">
                <div>
                  <h2 className="section-title">Order Fulfillment Center</h2>
                  <p className="section-subtitle">Real-time order statuses, shipping destinations, and dispatch management</p>
                </div>
                <div className="header-badge-wrap">
                  <span className="admin-stat-badge positive">{orders.length} Total Orders</span>
                </div>
              </div>

              {/* SEARCH & FILTERS TOOLBAR */}
              <div className="admin-toolbar">
                <div className="toolbar-search">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input
                    type="text"
                    placeholder="Search by Order ID, customer, city, email..."
                    value={orderSearchQuery}
                    onChange={(e) => setOrderSearchQuery(e.target.value)}
                  />
                  {orderSearchQuery && (
                    <button type="button" className="toolbar-clear" onClick={() => setOrderSearchQuery("")}>✕</button>
                  )}
                </div>

                <div className="toolbar-filters">
                  <select
                    value={orderFilterStatus}
                    onChange={(e) => setOrderFilterStatus(e.target.value)}
                    className="toolbar-select"
                  >
                    <option value="all">All Statuses</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>

                  <select
                    value={orderFilterPayment}
                    onChange={(e) => setOrderFilterPayment(e.target.value)}
                    className="toolbar-select"
                  >
                    <option value="all">All Payment Types</option>
                    <option value="prepaid">Prepaid (Online)</option>
                    <option value="cod">Cash on Delivery</option>
                  </select>
                </div>
              </div>

              {/* ORDERS LISTING */}
              {filteredOrders.length === 0 ? (
                <div className="admin-empty-state-card">
                  <span className="empty-icon">🔍</span>
                  <h3>No Orders Found</h3>
                  <p>{orderSearchQuery ? "Try refining your search query or reset the filters." : "No customer orders in the system yet."}</p>
                  {(orderSearchQuery || orderFilterStatus !== "all" || orderFilterPayment !== "all") && (
                    <button
                      type="button"
                      className="admin-btn-secondary"
                      onClick={() => { setOrderSearchQuery(""); setOrderFilterStatus("all"); setOrderFilterPayment("all"); }}
                    >
                      Reset Filters
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="admin-table-container desktop-only">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Order ID</th>
                          <th>Placed At</th>
                          <th>Customer Details</th>
                          <th>Amount</th>
                          <th>Payment</th>
                          <th>Order Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOrders.map((order) => {
                          const isCOD = order.paymentMethod === "Pay on Delivery" || order.paymentMethod === "Cash on Delivery";
                          const status = order.orderStatus || order.status || "Processing";
                          const statusLower = status.toLowerCase();
                          return (
                            <tr key={order.id}>
                              <td>
                                <strong className="order-id-highlight">{order.id}</strong>
                              </td>
                              <td>
                                <span className="cell-main-text">{new Date(order.createdAt).toLocaleDateString()}</span>
                                <span className="cell-subtext">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </td>
                              <td>
                                <strong className="cell-main-text">{order.shippingAddress?.fullName || order.customerName || "Patron"}</strong>
                                <span className="cell-subtext">
                                  {order.shippingAddress?.city ? `${order.shippingAddress.city}, ${order.shippingAddress.state}` : "Direct Order"}
                                </span>
                              </td>
                              <td>
                                <strong className="gold-text large">₹{order.total?.toLocaleString() || 0}</strong>
                              </td>
                              <td>
                                <span className={`payment-pill ${isCOD ? "cod" : "prepaid"}`}>
                                  {isCOD ? "COD" : "PREPAID"}
                                </span>
                              </td>
                              <td>
                                <select
                                  className={`status-dropdown ${statusLower}`}
                                  value={status}
                                  onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                                >
                                  <option value="Processing">Processing</option>
                                  <option value="Shipped">Shipped</option>
                                  <option value="Delivered">Delivered</option>
                                  <option value="Cancelled">Cancelled</option>
                                </select>
                              </td>
                              <td>
                                <div className="table-actions-group">
                                  <button
                                    type="button"
                                    className="admin-btn-action"
                                    onClick={() => setSelectedOrder(order)}
                                  >
                                    Details
                                  </button>
                                  <button
                                    type="button"
                                    className="admin-btn-danger"
                                    onClick={() => handleDeleteOrder(order.id)}
                                    title="Delete Order"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards View */}
                  <div className="admin-mobile-card-list mobile-only">
                    {filteredOrders.map((order) => {
                      const isCOD = order.paymentMethod === "Pay on Delivery" || order.paymentMethod === "Cash on Delivery";
                      const status = order.orderStatus || order.status || "Processing";
                      const statusLower = status.toLowerCase();
                      return (
                        <div className="admin-mobile-card" key={order.id}>
                          <div className="mobile-card-header">
                            <div>
                              <strong className="order-id-highlight">{order.id}</strong>
                              <span className="mobile-card-date">{new Date(order.createdAt).toLocaleString()}</span>
                            </div>
                            <span className={`payment-pill ${isCOD ? "cod" : "prepaid"}`}>
                              {isCOD ? "COD" : "PREPAID"}
                            </span>
                          </div>

                          <div className="mobile-card-body">
                            <div className="mobile-card-info-row">
                              <span>Customer:</span>
                              <strong>{order.shippingAddress?.fullName || order.customerName || "Patron"}</strong>
                            </div>
                            <div className="mobile-card-info-row">
                              <span>Destination:</span>
                              <span>{order.shippingAddress?.city ? `${order.shippingAddress.city}, ${order.shippingAddress.state}` : "Direct"}</span>
                            </div>
                            <div className="mobile-card-info-row">
                              <span>Total Amount:</span>
                              <strong className="gold-text">₹{order.total?.toLocaleString() || 0}</strong>
                            </div>
                            <div className="mobile-card-info-row status-row">
                              <span>Status:</span>
                              <select
                                className={`status-dropdown ${statusLower}`}
                                value={status}
                                onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                              >
                                <option value="Processing">Processing</option>
                                <option value="Shipped">Shipped</option>
                                <option value="Delivered">Delivered</option>
                                <option value="Cancelled">Cancelled</option>
                              </select>
                            </div>
                          </div>

                          <div className="mobile-card-actions">
                            <button
                              type="button"
                              className="admin-btn-primary flex-1"
                              onClick={() => setSelectedOrder(order)}
                            >
                              View Details
                            </button>
                            <button
                              type="button"
                              className="admin-btn-danger"
                              onClick={() => handleDeleteOrder(order.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* =========================================================
              TAB 3: PRODUCTS MANAGEMENT
             ========================================================= */}
          {activeTab === "products" && !isEditing && (
            <div className="admin-section-view">
              <div className="admin-section-header">
                <div>
                  <h2 className="section-title">Tea Catalog</h2>
                  <p className="section-subtitle">Manage single-estate harvest teas, variant pricing, inventory stock & custom badges</p>
                </div>
                <button
                  type="button"
                  className="admin-btn-gold"
                  onClick={handleAddNewClick}
                >
                  <span>+ Add New Tea</span>
                </button>
              </div>

              {/* SEARCH & FILTERS */}
              <div className="admin-toolbar">
                <div className="toolbar-search">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input
                    type="text"
                    placeholder="Search by tea name or origin..."
                    value={productSearchQuery}
                    onChange={(e) => setProductSearchQuery(e.target.value)}
                  />
                  {productSearchQuery && (
                    <button type="button" className="toolbar-clear" onClick={() => setProductSearchQuery("")}>✕</button>
                  )}
                </div>

                <div className="toolbar-filters">
                  <select
                    value={productFilterCategory}
                    onChange={(e) => setProductFilterCategory(e.target.value)}
                    className="toolbar-select"
                  >
                    <option value="all">All Tea Types</option>
                    <option value="Green">Green Tea</option>
                    <option value="White">White Tea</option>
                    <option value="Black">Black Tea</option>
                    <option value="Oolong">Oolong Tea</option>
                  </select>
                </div>
              </div>

              {/* PRODUCTS LISTING */}
              {filteredProducts.length === 0 ? (
                <div className="admin-empty-state-card">
                  <span className="empty-icon">🍵</span>
                  <h3>No Teas Found</h3>
                  <p>No products match the selected criteria.</p>
                  <button type="button" className="admin-btn-gold" onClick={handleAddNewClick}>+ Add Your First Tea</button>
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="admin-table-container desktop-only">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Thumbnail</th>
                          <th>Tea Name & Attributes</th>
                          <th>Category</th>
                          <th>Price</th>
                          <th>Stock Level</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProducts.map((product) => {
                          const stock = product.stock ?? 10;
                          const isLowStock = stock <= 3;
                          const isOutOfStock = stock <= 0;
                          return (
                            <tr key={product.id}>
                              <td style={{ width: "70px" }}>
                                <img src={product.image} alt={product.name} className="product-thumb" />
                              </td>
                              <td>
                                <strong className="cell-main-text">{product.name}</strong>
                                <div className="product-tag-row">
                                  <span className="cell-subtext">{product.origin}</span>
                                  {product.badge && (
                                    <span className="product-badge-pill">{product.badge}</span>
                                  )}
                                  {product.customTag?.text && (
                                    <span className="product-custom-badge" style={{ backgroundColor: product.customTag.color || "#38a169" }}>
                                      {product.customTag.text}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td>
                                <span className="category-pill">{product.category}</span>
                              </td>
                              <td>
                                <strong className="gold-text">₹{product.price.toLocaleString()}</strong>
                                {product.oldPrice ? (
                                  <span className="old-price-strike">₹{product.oldPrice}</span>
                                ) : null}
                              </td>
                              <td>
                                <span className={`stock-pill ${isOutOfStock ? "out" : isLowStock ? "low" : "in"}`}>
                                  {isOutOfStock ? "Out of Stock" : `Stock: ${stock}`}
                                </span>
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="admin-btn-action"
                                  onClick={() => handleEditClick(product)}
                                >
                                  Edit
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Grid Cards View */}
                  <div className="admin-mobile-catalog-grid mobile-only">
                    {filteredProducts.map((product) => {
                      const stock = product.stock ?? 10;
                      const isLowStock = stock <= 3;
                      const isOutOfStock = stock <= 0;
                      return (
                        <div className="admin-catalog-card" key={product.id}>
                          <div className="catalog-card-media">
                            <img src={product.image} alt={product.name} />
                            <span className="category-pill float">{product.category}</span>
                          </div>
                          <div className="catalog-card-content">
                            <h4>{product.name}</h4>
                            <span className="cell-subtext">{product.origin}</span>
                            <div className="catalog-card-meta">
                              <span className="gold-text large">₹{product.price.toLocaleString()}</span>
                              <span className={`stock-pill ${isOutOfStock ? "out" : isLowStock ? "low" : "in"}`}>
                                {isOutOfStock ? "Out" : `${stock} left`}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="admin-btn-primary full-width"
                            onClick={() => handleEditClick(product)}
                          >
                            Edit Tea
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* PRODUCT EDIT / CREATE FORM */}
          {activeTab === "products" && isEditing && (
            <div className="admin-form-view">
              <div className="admin-section-header">
                <div>
                  <h2 className="section-title">{currentProduct.id ? "Edit Tea Formulation" : "Add New Tea"}</h2>
                  <p className="section-subtitle">Configure pricing, estates, caffeine notes, and harvest packaging weights</p>
                </div>
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={() => setIsEditing(false)}
                >
                  ← Back to Catalog
                </button>
              </div>

              <form className="admin-form-card" onSubmit={handleSaveProduct}>
                <div className="form-group">
                  <label>Tea Name *</label>
                  <input
                    type="text"
                    required
                    value={currentProduct.name || ""}
                    onChange={e => setCurrentProduct({ ...currentProduct, name: e.target.value })}
                    placeholder="e.g. Darjeeling Spring Blossom"
                  />
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Category</label>
                    <select
                      value={currentProduct.category || "Green"}
                      onChange={e => setCurrentProduct({ ...currentProduct, category: e.target.value as TeaCategory })}
                    >
                      <option value="Green">Green Tea</option>
                      <option value="White">White Tea</option>
                      <option value="Black">Black Tea</option>
                      <option value="Oolong">Oolong Tea</option>
                      <option value="Teaware">Teaware</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Estate Origin *</label>
                    <input
                      type="text"
                      required
                      value={currentProduct.origin || ""}
                      onChange={e => setCurrentProduct({ ...currentProduct, origin: e.target.value })}
                      placeholder="e.g. Makaibari Estate, Darjeeling"
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Base Price (₹) *</label>
                    <input
                      type="number"
                      required
                      value={currentProduct.price || ""}
                      onChange={e => setCurrentProduct({ ...currentProduct, price: Number(e.target.value) })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Old Price (₹) - For Discounts</label>
                    <input
                      type="number"
                      value={currentProduct.oldPrice || ""}
                      onChange={e => setCurrentProduct({ ...currentProduct, oldPrice: Number(e.target.value) || undefined })}
                      placeholder="Leave empty if regular price"
                    />
                  </div>
                </div>

                <div className="form-grid-3">
                  <div className="form-group">
                    <label>Badge</label>
                    <select
                      value={currentProduct.badge || "None"}
                      onChange={e => setCurrentProduct({ ...currentProduct, badge: e.target.value === "None" ? undefined : e.target.value as "Premium" | "Popular" | "Bestseller" })}
                    >
                      <option value="None">None</option>
                      <option value="Premium">Premium</option>
                      <option value="Popular">Popular</option>
                      <option value="Bestseller">Bestseller</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Caffeine Level</label>
                    <select
                      value={currentProduct.caffeine || "Medium"}
                      onChange={e => setCurrentProduct({ ...currentProduct, caffeine: e.target.value as "Low" | "Medium" | "High" })}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Stock Inventory *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={currentProduct.stock ?? 10}
                      onChange={e => setCurrentProduct({ ...currentProduct, stock: parseInt(e.target.value, 10) || 0 })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Custom Tag (Optional)</label>
                  <div className="color-tag-flex">
                    <input
                      type="text"
                      placeholder="e.g. First Flush 2026"
                      value={currentProduct.customTag?.text || ""}
                      onChange={e => setCurrentProduct({ ...currentProduct, customTag: { text: e.target.value, color: currentProduct.customTag?.color || "#38a169" } })}
                      style={{ flex: 1 }}
                    />
                    <input
                      type="color"
                      title="Tag Color"
                      value={currentProduct.customTag?.color || "#38a169"}
                      onChange={e => setCurrentProduct({ ...currentProduct, customTag: { text: currentProduct.customTag?.text || "", color: e.target.value } })}
                      className="color-picker-input"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Available Weight Packaging & Pricing</label>
                  <p className="form-help-text">Select which package weights are offered and configure custom pricing per variant:</p>

                  <div className="variants-container">
                    {(["100g", "250g", "500g", "1kg"] as const).map(vKey => {
                      const isSelected = !!currentProduct.variants?.[vKey];
                      const variantData = currentProduct.variants?.[vKey] || { weight: vKey, price: 0 };
                      return (
                        <div key={vKey} className={`variant-box ${isSelected ? "selected" : ""}`}>
                          <label className="variant-check-label">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                const newVars = { ...currentProduct.variants };
                                if (e.target.checked) {
                                  newVars[vKey] = { weight: vKey, price: currentProduct.price || 0, oldPrice: currentProduct.oldPrice || undefined };
                                } else {
                                  delete newVars[vKey];
                                }
                                setCurrentProduct({ ...currentProduct, variants: newVars as unknown as Product["variants"] });
                              }}
                            />
                            <strong>{vKey}</strong>
                          </label>

                          {isSelected && (
                            <div className="variant-inputs-row">
                              <div className="variant-input-item">
                                <span>Price (₹):</span>
                                <input
                                  type="number"
                                  value={variantData.price}
                                  onChange={(e) => {
                                    const newVars = { ...currentProduct.variants };
                                    newVars[vKey] = { ...variantData, price: Number(e.target.value) };
                                    setCurrentProduct({ ...currentProduct, variants: newVars as unknown as Product["variants"] });
                                  }}
                                  required
                                />
                              </div>
                              <div className="variant-input-item">
                                <span>Old Price (₹):</span>
                                <input
                                  type="number"
                                  value={variantData.oldPrice || ""}
                                  placeholder="Optional"
                                  onChange={(e) => {
                                    const newVars = { ...currentProduct.variants };
                                    const val = Number(e.target.value);
                                    newVars[vKey] = { ...variantData, oldPrice: val || undefined };
                                    if (!val) delete newVars[vKey].oldPrice;
                                    setCurrentProduct({ ...currentProduct, variants: newVars as unknown as Product["variants"] });
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="form-actions-footer">
                  <button type="button" className="admin-btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
                  <button type="submit" className="admin-btn-gold">Save Product</button>
                </div>
              </form>
            </div>
          )}

          {/* =========================================================
              TAB 4: TEAWARE MANAGEMENT
             ========================================================= */}
          {activeTab === "teaware" && !isEditingTeaware && (
            <div className="admin-section-view">
              <div className="admin-section-header">
                <div>
                  <h2 className="section-title">Teaware Collection</h2>
                  <p className="section-subtitle">Teapots, brewing glassware, infusers, ceramic cups & ceremonial trays</p>
                </div>
                <button
                  type="button"
                  className="admin-btn-gold"
                  onClick={handleAddNewTeawareClick}
                >
                  <span>+ Add New Teaware</span>
                </button>
              </div>

              {/* SEARCH & FILTERS */}
              <div className="admin-toolbar">
                <div className="toolbar-search">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input
                    type="text"
                    placeholder="Search by teaware name, material..."
                    value={teawareSearchQuery}
                    onChange={(e) => setTeawareSearchQuery(e.target.value)}
                  />
                  {teawareSearchQuery && (
                    <button type="button" className="toolbar-clear" onClick={() => setTeawareSearchQuery("")}>✕</button>
                  )}
                </div>

                <div className="toolbar-filters">
                  <select
                    value={teawareFilterCategory}
                    onChange={(e) => setTeawareFilterCategory(e.target.value)}
                    className="toolbar-select"
                  >
                    <option value="all">All Categories</option>
                    <option value="Teapots">Teapots</option>
                    <option value="Tea Cups">Tea Cups</option>
                    <option value="Serving & Trays">Serving & Trays</option>
                    <option value="Storage & Accessories">Storage & Accessories</option>
                  </select>
                </div>
              </div>

              {/* TEAWARE LISTING */}
              {filteredTeaware.length === 0 ? (
                <div className="admin-empty-state-card">
                  <span className="empty-icon">🫖</span>
                  <h3>No Teaware Items Found</h3>
                  <p>No equipment matches the search criteria.</p>
                  <button type="button" className="admin-btn-gold" onClick={handleAddNewTeawareClick}>+ Add Teaware Item</button>
                </div>
              ) : (
                <>
                  <div className="admin-table-container desktop-only">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Thumbnail</th>
                          <th>Item Name & Material</th>
                          <th>Category</th>
                          <th>Capacity</th>
                          <th>Price</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTeaware.map((item) => (
                          <tr key={item.id}>
                            <td style={{ width: "70px" }}>
                              <img src={item.image} alt={item.name} className="product-thumb" />
                            </td>
                            <td>
                              <strong className="cell-main-text">{item.name}</strong>
                              <span className="cell-subtext">{item.material}</span>
                            </td>
                            <td>
                              <span className="category-pill">{item.category}</span>
                            </td>
                            <td>
                              <span className="cell-subtext">{item.capacity || "—"}</span>
                            </td>
                            <td>
                              <strong className="gold-text">₹{item.price.toLocaleString()}</strong>
                              {item.oldPrice ? <span className="old-price-strike">₹{item.oldPrice}</span> : null}
                            </td>
                            <td>
                              <div className="table-actions-group">
                                <button
                                  type="button"
                                  className="admin-btn-action"
                                  onClick={() => handleEditTeawareClick(item)}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="admin-btn-danger"
                                  onClick={() => handleDeleteTeaware(item.id)}
                                >
                                  ✕
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile View */}
                  <div className="admin-mobile-catalog-grid mobile-only">
                    {filteredTeaware.map((item) => (
                      <div className="admin-catalog-card" key={item.id}>
                        <div className="catalog-card-media">
                          <img src={item.image} alt={item.name} />
                          <span className="category-pill float">{item.category}</span>
                        </div>
                        <div className="catalog-card-content">
                          <h4>{item.name}</h4>
                          <span className="cell-subtext">{item.material} · {item.capacity}</span>
                          <div className="catalog-card-meta">
                            <span className="gold-text large">₹{item.price.toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="mobile-card-actions">
                          <button
                            type="button"
                            className="admin-btn-primary flex-1"
                            onClick={() => handleEditTeawareClick(item)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="admin-btn-danger"
                            onClick={() => handleDeleteTeaware(item.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* TEAWARE EDIT / CREATE FORM */}
          {activeTab === "teaware" && isEditingTeaware && (
            <div className="admin-form-view">
              <div className="admin-section-header">
                <div>
                  <h2 className="section-title">{currentTeaware.id ? "Edit Teaware Item" : "Add New Teaware"}</h2>
                  <p className="section-subtitle">Configure materials, volumetric capacity, and craftsmanship specifications</p>
                </div>
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={() => setIsEditingTeaware(false)}
                >
                  ← Back to Teaware
                </button>
              </div>

              <form className="admin-form-card" onSubmit={handleSaveTeaware}>
                <div className="form-group">
                  <label>Item Name *</label>
                  <input
                    type="text"
                    required
                    value={currentTeaware.name || ""}
                    onChange={e => setCurrentTeaware({ ...currentTeaware, name: e.target.value })}
                  />
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Category</label>
                    <select
                      value={currentTeaware.category || "Teapots"}
                      onChange={e => setCurrentTeaware({ ...currentTeaware, category: e.target.value as TeawareCategory })}
                    >
                      <option value="Teapots">Teapots</option>
                      <option value="Tea Cups">Tea Cups</option>
                      <option value="Serving & Trays">Serving & Trays</option>
                      <option value="Storage & Accessories">Storage & Accessories</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Material *</label>
                    <input
                      type="text"
                      required
                      value={currentTeaware.material || ""}
                      onChange={e => setCurrentTeaware({ ...currentTeaware, material: e.target.value })}
                      placeholder="e.g. Borosilicate Glass & Ceramic"
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Price (₹) *</label>
                    <input
                      type="number"
                      required
                      value={currentTeaware.price || ""}
                      onChange={e => setCurrentTeaware({ ...currentTeaware, price: Number(e.target.value) })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Old Price (₹)</label>
                    <input
                      type="number"
                      value={currentTeaware.oldPrice || ""}
                      onChange={e => setCurrentTeaware({ ...currentTeaware, oldPrice: Number(e.target.value) || undefined })}
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Capacity / Volume</label>
                    <input
                      type="text"
                      value={currentTeaware.capacity || ""}
                      onChange={e => setCurrentTeaware({ ...currentTeaware, capacity: e.target.value })}
                      placeholder="e.g. 600ml / 2-3 Cups"
                    />
                  </div>

                  <div className="form-group">
                    <label>Image URL *</label>
                    <input
                      type="text"
                      required
                      value={currentTeaware.image || ""}
                      onChange={e => setCurrentTeaware({ ...currentTeaware, image: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Description *</label>
                  <textarea
                    required
                    rows={3}
                    value={currentTeaware.description || ""}
                    onChange={e => setCurrentTeaware({ ...currentTeaware, description: e.target.value })}
                  />
                </div>

                <div className="form-actions-footer">
                  <button type="button" className="admin-btn-secondary" onClick={() => setIsEditingTeaware(false)}>Cancel</button>
                  <button type="submit" className="admin-btn-gold">Save Teaware</button>
                </div>
              </form>
            </div>
          )}

          {/* =========================================================
              TAB 5: HAMPERS MANAGEMENT
             ========================================================= */}
          {activeTab === "hampers" && !isEditingHamper && (
            <div className="admin-section-view">
              <div className="admin-section-header">
                <div>
                  <h2 className="section-title">Gift Hampers Collection</h2>
                  <p className="section-subtitle">Curated festive boxes, tasting journals, and ceremonial gift selections</p>
                </div>
                <button
                  type="button"
                  className="admin-btn-gold"
                  onClick={handleAddNewHamperClick}
                >
                  <span>+ Add New Hamper</span>
                </button>
              </div>

              {/* SEARCH */}
              <div className="admin-toolbar">
                <div className="toolbar-search">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input
                    type="text"
                    placeholder="Search by hamper name, subtitle..."
                    value={hamperSearchQuery}
                    onChange={(e) => setHamperSearchQuery(e.target.value)}
                  />
                  {hamperSearchQuery && (
                    <button type="button" className="toolbar-clear" onClick={() => setHamperSearchQuery("")}>✕</button>
                  )}
                </div>
              </div>

              {/* HAMPERS LIST */}
              {filteredHampers.length === 0 ? (
                <div className="admin-empty-state-card">
                  <span className="empty-icon">🎁</span>
                  <h3>No Hampers Found</h3>
                  <p>No gift hampers match your criteria.</p>
                  <button type="button" className="admin-btn-gold" onClick={handleAddNewHamperClick}>+ Add New Hamper</button>
                </div>
              ) : (
                <>
                  <div className="admin-table-container desktop-only">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Thumbnail</th>
                          <th>Hamper Details</th>
                          <th>Included Items</th>
                          <th>Price</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredHampers.map((hamper) => (
                          <tr key={hamper.id}>
                            <td style={{ width: "70px" }}>
                              <img src={hamper.image} alt={hamper.name} className="product-thumb" />
                            </td>
                            <td>
                              <strong className="cell-main-text">{hamper.name}</strong>
                              <span className="cell-subtext">{hamper.subtitle}</span>
                              {hamper.badge && <span className="product-badge-pill gold">{hamper.badge}</span>}
                            </td>
                            <td>
                              <span className="cell-subtext">{(hamper.includes || []).join(" · ")}</span>
                            </td>
                            <td>
                              <strong className="gold-text">₹{hamper.price.toLocaleString()}</strong>
                            </td>
                            <td>
                              <div className="table-actions-group">
                                <button
                                  type="button"
                                  className="admin-btn-action"
                                  onClick={() => handleEditHamperClick(hamper)}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="admin-btn-danger"
                                  onClick={() => handleDeleteHamper(hamper.id)}
                                >
                                  ✕
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile View */}
                  <div className="admin-mobile-catalog-grid mobile-only">
                    {filteredHampers.map((hamper) => (
                      <div className="admin-catalog-card" key={hamper.id}>
                        <div className="catalog-card-media">
                          <img src={hamper.image} alt={hamper.name} />
                          {hamper.badge && <span className="product-badge-pill gold float">{hamper.badge}</span>}
                        </div>
                        <div className="catalog-card-content">
                          <h4>{hamper.name}</h4>
                          <span className="cell-subtext">{hamper.subtitle}</span>
                          <div className="catalog-card-meta">
                            <span className="gold-text large">₹{hamper.price.toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="mobile-card-actions">
                          <button
                            type="button"
                            className="admin-btn-primary flex-1"
                            onClick={() => handleEditHamperClick(hamper)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="admin-btn-danger"
                            onClick={() => handleDeleteHamper(hamper.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* HAMPER EDIT / CREATE FORM */}
          {activeTab === "hampers" && isEditingHamper && (
            <div className="admin-form-view">
              <div className="admin-section-header">
                <div>
                  <h2 className="section-title">{currentHamper.id ? "Edit Gift Hamper" : "Add New Hamper"}</h2>
                  <p className="section-subtitle">Curate botanical bundles, tasting journals, and bespoke unboxing experiences</p>
                </div>
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={() => setIsEditingHamper(false)}
                >
                  ← Back to Hampers
                </button>
              </div>

              <form className="admin-form-card" onSubmit={handleSaveHamper}>
                <div className="form-group">
                  <label>Hamper Name *</label>
                  <input
                    type="text"
                    required
                    value={currentHamper.name || ""}
                    onChange={e => setCurrentHamper({ ...currentHamper, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Subtitle *</label>
                  <input
                    type="text"
                    required
                    value={currentHamper.subtitle || ""}
                    onChange={e => setCurrentHamper({ ...currentHamper, subtitle: e.target.value })}
                  />
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Price (₹) *</label>
                    <input
                      type="number"
                      required
                      value={currentHamper.price || ""}
                      onChange={e => setCurrentHamper({ ...currentHamper, price: Number(e.target.value) })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Badge Tag</label>
                    <input
                      type="text"
                      value={currentHamper.badge || ""}
                      onChange={e => setCurrentHamper({ ...currentHamper, badge: e.target.value })}
                      placeholder="e.g. FESTIVE EDITION"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Image URL *</label>
                  <input
                    type="text"
                    required
                    value={currentHamper.image || ""}
                    onChange={e => setCurrentHamper({ ...currentHamper, image: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Includes (Comma Separated) *</label>
                  <textarea
                    required
                    rows={3}
                    value={(currentHamper.includes || []).join(", ")}
                    onChange={e => setCurrentHamper({ ...currentHamper, includes: e.target.value.split(",").map(i => i.trim()) })}
                    placeholder="e.g. 1x Assam Orthodox, 1x Brass Infuser, 1x Tasting Journal"
                  />
                </div>

                <div className="form-actions-footer">
                  <button type="button" className="admin-btn-secondary" onClick={() => setIsEditingHamper(false)}>Cancel</button>
                  <button type="submit" className="admin-btn-gold">Save Hamper</button>
                </div>
              </form>
            </div>
          )}

          {/* =========================================================
              TAB 6: ACCOUNTS MANAGEMENT
             ========================================================= */}
          {activeTab === "accounts" && (
            <div className="admin-section-view">
              <div className="admin-section-header">
                <div>
                  <h2 className="section-title">Live Customer Accounts</h2>
                  <p className="section-subtitle">Real-time synchronized profiles, taste preferences & registration history</p>
                </div>
                <div className="header-badge-wrap">
                  <span className="admin-stat-badge positive">{accounts.length} Total Customers</span>
                </div>
              </div>

              {/* SEARCH & FILTERS */}
              <div className="admin-toolbar">
                <div className="toolbar-search">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input
                    type="text"
                    placeholder="Search customer name, email, mobile, UID..."
                    value={accountSearchQuery}
                    onChange={(e) => setAccountSearchQuery(e.target.value)}
                  />
                  {accountSearchQuery && (
                    <button type="button" className="toolbar-clear" onClick={() => setAccountSearchQuery("")}>✕</button>
                  )}
                </div>

                <div className="toolbar-filters">
                  <select
                    value={accountFilterProvider}
                    onChange={(e) => setAccountFilterProvider(e.target.value)}
                    className="toolbar-select"
                  >
                    <option value="all">All Auth Methods</option>
                    <option value="google">Google OAuth</option>
                    <option value="email">Email / Password</option>
                  </select>
                </div>
              </div>

              {accountsLoading ? (
                <div className="admin-loading-screen inner">
                  <div className="admin-loading-spinner" />
                  <p className="admin-loading-text">Fetching live customer profiles from Firestore...</p>
                </div>
              ) : filteredAccounts.length === 0 ? (
                <div className="admin-empty-state-card">
                  <span className="empty-icon">👥</span>
                  <h3>No Customer Accounts Found</h3>
                  <p>{accountSearchQuery ? "No customer accounts match your search." : "No registered customers in the database yet."}</p>
                </div>
              ) : (
                <>
                  <div className="admin-table-container desktop-only">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Patron Profile</th>
                          <th>Email Address</th>
                          <th>Mobile</th>
                          <th>Joined</th>
                          <th>Method</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAccounts.map((acc) => {
                          const initial = acc.name?.charAt(0)?.toUpperCase() || "P";
                          const isGoogle = acc.authProvider.toLowerCase().includes("google");
                          return (
                            <tr key={acc.id}>
                              <td>
                                <div className="account-cell-flex">
                                  <div className="account-avatar-circle">{initial}</div>
                                  <div>
                                    <strong className="cell-main-text">{acc.name}</strong>
                                    <span className="account-uid-code">UID: {acc.uid.slice(0, 8)}...</span>
                                  </div>
                                </div>
                              </td>
                              <td><span className="cell-main-text">{acc.email}</span></td>
                              <td>
                                {acc.phone && acc.phone !== "—" && acc.phone !== "Not Provided" ? (
                                  <strong className="phone-text">{acc.phone}</strong>
                                ) : (
                                  <span className="cell-subtext">Not Provided</span>
                                )}
                              </td>
                              <td>
                                <span className="cell-subtext">
                                  {acc.createdAt ? new Date(acc.createdAt).toLocaleDateString() : "Recent"}
                                </span>
                              </td>
                              <td>
                                <span className={`auth-badge ${isGoogle ? "google" : "email"}`}>
                                  {isGoogle ? "Google" : "Email"}
                                </span>
                              </td>
                              <td>
                                <span className="status-pill delivered">{acc.status || "Active"}</span>
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="admin-btn-action"
                                  onClick={() => setSelectedAccount(acc)}
                                >
                                  Profile
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Account Cards */}
                  <div className="admin-mobile-card-list mobile-only">
                    {filteredAccounts.map((acc) => {
                      const initial = acc.name?.charAt(0)?.toUpperCase() || "P";
                      const isGoogle = acc.authProvider.toLowerCase().includes("google");
                      return (
                        <div className="admin-mobile-card" key={acc.id}>
                          <div className="mobile-card-header">
                            <div className="account-cell-flex">
                              <div className="account-avatar-circle">{initial}</div>
                              <div>
                                <strong>{acc.name}</strong>
                                <span className="mobile-card-date">{acc.email}</span>
                              </div>
                            </div>
                            <span className={`auth-badge ${isGoogle ? "google" : "email"}`}>
                              {isGoogle ? "Google" : "Email"}
                            </span>
                          </div>
                          <div className="mobile-card-body">
                            <div className="mobile-card-info-row">
                              <span>Mobile:</span>
                              <strong>{acc.phone || "—"}</strong>
                            </div>
                            <div className="mobile-card-info-row">
                              <span>Joined:</span>
                              <span>{acc.createdAt ? new Date(acc.createdAt).toLocaleDateString() : "Recent"}</span>
                            </div>
                          </div>
                          <div className="mobile-card-actions">
                            <button
                              type="button"
                              className="admin-btn-primary full-width"
                              onClick={() => setSelectedAccount(acc)}
                            >
                              View Full Profile
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* =========================================================
              TAB 7: COUPONS MANAGEMENT
             ========================================================= */}
          {activeTab === "coupons" && !isEditingCoupon && (
            <div className="admin-section-view">
              <div className="admin-section-header">
                <div>
                  <h2 className="section-title">Promotions & Discount Codes</h2>
                  <p className="section-subtitle">Manage global coupon codes, cart threshold requirements, and promotional rules</p>
                </div>
                <button
                  type="button"
                  className="admin-btn-gold"
                  onClick={handleAddNewCoupon}
                >
                  <span>+ Add New Coupon</span>
                </button>
              </div>

              {/* SEARCH */}
              <div className="admin-toolbar">
                <div className="toolbar-search">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input
                    type="text"
                    placeholder="Search coupon code or description..."
                    value={couponSearchQuery}
                    onChange={(e) => setCouponSearchQuery(e.target.value)}
                  />
                  {couponSearchQuery && (
                    <button type="button" className="toolbar-clear" onClick={() => setCouponSearchQuery("")}>✕</button>
                  )}
                </div>
              </div>

              {/* COUPONS LIST */}
              {filteredCoupons.length === 0 ? (
                <div className="admin-empty-state-card">
                  <span className="empty-icon">🏷️</span>
                  <h3>No Coupons Found</h3>
                  <p>No discount coupons match your criteria.</p>
                  <button type="button" className="admin-btn-gold" onClick={handleAddNewCoupon}>+ Add New Coupon</button>
                </div>
              ) : (
                <>
                  <div className="admin-table-container desktop-only">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Coupon Code</th>
                          <th>Description</th>
                          <th>Discount</th>
                          <th>Min Order</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCoupons.map((coupon) => (
                          <tr key={coupon.id}>
                            <td>
                              <strong className="coupon-code-pill">{coupon.code}</strong>
                            </td>
                            <td>
                              <span className="cell-main-text">{coupon.title}</span>
                            </td>
                            <td>
                              <strong className="gold-text">
                                {coupon.discountValue}{coupon.discountType === "percentage" ? "%" : "₹"}
                              </strong>
                            </td>
                            <td>
                              <span className="cell-subtext">₹{coupon.minOrderValue}</span>
                            </td>
                            <td>
                              <span className={`status-pill ${coupon.status === "available" ? "delivered" : "cancelled"}`}>
                                {coupon.status}
                              </span>
                            </td>
                            <td>
                              <div className="table-actions-group">
                                <button
                                  type="button"
                                  className="admin-btn-action"
                                  onClick={() => handleEditCoupon(coupon)}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="admin-btn-danger"
                                  onClick={() => handleDeleteCoupon(coupon.id)}
                                >
                                  ✕
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="admin-mobile-card-list mobile-only">
                    {filteredCoupons.map((coupon) => (
                      <div className="admin-mobile-card" key={coupon.id}>
                        <div className="mobile-card-header">
                          <strong className="coupon-code-pill">{coupon.code}</strong>
                          <span className={`status-pill ${coupon.status === "available" ? "delivered" : "cancelled"}`}>
                            {coupon.status}
                          </span>
                        </div>
                        <div className="mobile-card-body">
                          <div className="mobile-card-info-row">
                            <span>Title:</span>
                            <strong>{coupon.title}</strong>
                          </div>
                          <div className="mobile-card-info-row">
                            <span>Discount:</span>
                            <strong className="gold-text">{coupon.discountValue}{coupon.discountType === "percentage" ? "%" : "₹"}</strong>
                          </div>
                          <div className="mobile-card-info-row">
                            <span>Min Order:</span>
                            <span>₹{coupon.minOrderValue}</span>
                          </div>
                        </div>
                        <div className="mobile-card-actions">
                          <button
                            type="button"
                            className="admin-btn-primary flex-1"
                            onClick={() => handleEditCoupon(coupon)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="admin-btn-danger"
                            onClick={() => handleDeleteCoupon(coupon.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* COUPON EDIT / CREATE FORM */}
          {activeTab === "coupons" && isEditingCoupon && (
            <div className="admin-form-view">
              <div className="admin-section-header">
                <div>
                  <h2 className="section-title">{currentCoupon.id ? "Edit Promotion" : "Create New Coupon"}</h2>
                  <p className="section-subtitle">Set code strings, percentage or flat discounts, and qualifying rules</p>
                </div>
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={() => setIsEditingCoupon(false)}
                >
                  ← Back to Coupons
                </button>
              </div>

              <form className="admin-form-card" onSubmit={handleSaveCoupon}>
                <div className="form-group">
                  <label>Coupon Code (Uppercase) *</label>
                  <input
                    type="text"
                    required
                    value={currentCoupon.code || ""}
                    onChange={e => setCurrentCoupon({ ...currentCoupon, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. FIRSTHARVEST15"
                  />
                </div>

                <div className="form-group">
                  <label>Title / Description *</label>
                  <input
                    type="text"
                    required
                    value={currentCoupon.title || ""}
                    onChange={e => setCurrentCoupon({ ...currentCoupon, title: e.target.value })}
                    placeholder="e.g. 15% off on your initial ritual order"
                  />
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Discount Type</label>
                    <select
                      value={currentCoupon.discountType || "percentage"}
                      onChange={e => setCurrentCoupon({ ...currentCoupon, discountType: e.target.value as "percentage" | "fixed" })}
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount (₹)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Discount Value *</label>
                    <input
                      type="number"
                      required
                      value={currentCoupon.discountValue || 0}
                      onChange={e => setCurrentCoupon({ ...currentCoupon, discountValue: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Minimum Order Value (₹)</label>
                    <input
                      type="number"
                      required
                      value={currentCoupon.minOrderValue || 0}
                      onChange={e => setCurrentCoupon({ ...currentCoupon, minOrderValue: Number(e.target.value) })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Status</label>
                    <select
                      value={currentCoupon.status || "available"}
                      onChange={e => setCurrentCoupon({ ...currentCoupon, status: e.target.value as "available" | "expired" | "used" })}
                    >
                      <option value="available">Available (Active)</option>
                      <option value="expired">Expired</option>
                      <option value="used">Disabled</option>
                    </select>
                  </div>
                </div>

                <div className="form-actions-footer">
                  <button type="button" className="admin-btn-secondary" onClick={() => setIsEditingCoupon(false)}>Cancel</button>
                  <button type="submit" className="admin-btn-gold">Save Coupon</button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>

      {/* =========================================================
          MODAL 1: ORDER DETAILS
         ========================================================= */}
      {selectedOrder && (
        <div className="admin-modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="admin-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-luxury">
              <div>
                <span className="modal-eyebrow">ORDER FULFILLMENT DOSSIER</span>
                <h3 className="modal-title">{selectedOrder.id}</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedOrder(null)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="modal-body-scroll">
              <div className="modal-grid-cards">
                <div className="modal-info-card">
                  <h4>Customer Information</h4>
                  <div className="modal-info-line">
                    <span>Name:</span>
                    <strong>{selectedOrder.shippingAddress?.fullName || selectedOrder.customerName || "Patron"}</strong>
                  </div>
                  <div className="modal-info-line">
                    <span>Email:</span>
                    <strong>{selectedOrder.customerEmail || "Not Provided"}</strong>
                  </div>
                  <div className="modal-info-line">
                    <span>Date:</span>
                    <span>{new Date(selectedOrder.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                <div className="modal-info-card">
                  <h4>Delivery Address</h4>
                  <p className="modal-address-text">
                    {selectedOrder.shippingAddress?.addressLine1 || "N/A"}
                    {selectedOrder.shippingAddress?.addressLine2 && <br />}
                    {selectedOrder.shippingAddress?.addressLine2}
                    <br />
                    {selectedOrder.shippingAddress?.city ? `${selectedOrder.shippingAddress.city}, ${selectedOrder.shippingAddress.state} ${selectedOrder.shippingAddress.postalCode}` : ""}
                    <br />
                    {selectedOrder.shippingAddress?.country || "India"}
                  </p>
                </div>

                <div className="modal-info-card">
                  <h4>Payment Breakdown</h4>
                  <div className="modal-info-line">
                    <span>Method:</span>
                    <strong>{selectedOrder.paymentMethod || "Prepaid"}</strong>
                  </div>
                  <div className="modal-info-line">
                    <span>Subtotal:</span>
                    <span>₹{selectedOrder.subtotal || 0}</span>
                  </div>
                  <div className="modal-info-line">
                    <span>Discount:</span>
                    <span>-₹{selectedOrder.discount || 0}</span>
                  </div>
                  <div className="modal-info-line">
                    <span>Delivery:</span>
                    <span>₹{selectedOrder.deliveryFee || 0}</span>
                  </div>
                  <div className="modal-info-line grand-total">
                    <span>Total:</span>
                    <strong className="gold-text">₹{selectedOrder.total || 0}</strong>
                  </div>
                </div>

                <div className="modal-info-card">
                  <h4>Order Status & Action</h4>
                  <div className="modal-status-selector">
                    <select
                      className={`status-dropdown ${(selectedOrder.orderStatus || selectedOrder.status || "processing").toLowerCase()}`}
                      value={selectedOrder.orderStatus || selectedOrder.status || "Processing"}
                      onChange={(e) => handleUpdateOrderStatus(selectedOrder.id, e.target.value)}
                    >
                      <option value="Processing">Processing</option>
                      <option value="Shipped">Shipped</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                  <span className="modal-help-text">Updating status immediately syncs across customer tracking pages.</span>
                </div>
              </div>

              <div className="modal-items-section">
                <h4 className="modal-section-heading">Harvest Items Ordered ({(selectedOrder.items || []).length})</h4>
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Variant</th>
                        <th>Price</th>
                        <th>Qty</th>
                        <th>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedOrder.items || []).map((item, idx) => (
                        <tr key={idx}>
                          <td><strong>{item.name}</strong></td>
                          <td><span className="category-pill">{item.variant || item.weight || "100g"}</span></td>
                          <td>₹{item.price}</td>
                          <td>{item.quantity}</td>
                          <td><strong className="gold-text">₹{(item.price || 0) * (item.quantity || 1)}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="modal-footer-luxury">
              <button
                type="button"
                className="admin-btn-secondary"
                onClick={() => setSelectedOrder(null)}
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL 2: CUSTOMER ACCOUNT PROFILE
         ========================================================= */}
      {selectedAccount && (
        <div className="admin-modal-overlay" onClick={() => setSelectedAccount(null)}>
          <div className="admin-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-luxury">
              <div>
                <span className="modal-eyebrow">PATRON ACCOUNT PROFILE</span>
                <h3 className="modal-title">{selectedAccount.name}</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedAccount(null)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="modal-body-scroll">
              <div className="modal-grid-cards">
                <div className="modal-info-card">
                  <h4>Profile Essentials</h4>
                  <div className="modal-info-line">
                    <span>Full Name:</span>
                    <strong>{selectedAccount.name}</strong>
                  </div>
                  <div className="modal-info-line">
                    <span>Email Address:</span>
                    <strong className="gold-text">{selectedAccount.email}</strong>
                  </div>
                  <div className="modal-info-line">
                    <span>Mobile Number:</span>
                    <strong>{selectedAccount.phone || "Not Provided"}</strong>
                  </div>
                  <div className="modal-info-line">
                    <span>Account Status:</span>
                    <span className="status-pill delivered">{selectedAccount.status || "Active"}</span>
                  </div>
                </div>

                <div className="modal-info-card">
                  <h4>Security & Auth Metadata</h4>
                  <div className="modal-info-line">
                    <span>Provider:</span>
                    <span className={`auth-badge ${selectedAccount.authProvider.toLowerCase().includes("google") ? "google" : "email"}`}>
                      {selectedAccount.authProvider}
                    </span>
                  </div>
                  <div className="modal-info-line">
                    <span>Registered Date:</span>
                    <span>{selectedAccount.createdAt ? new Date(selectedAccount.createdAt).toLocaleString() : "Recent"}</span>
                  </div>
                  <div className="modal-info-line">
                    <span>Firestore UID:</span>
                    <code className="account-uid-code">{selectedAccount.uid}</code>
                  </div>
                </div>
              </div>

              {(selectedAccount.favoriteTea || selectedAccount.preferences) && (
                <div className="modal-items-section">
                  <h4 className="modal-section-heading">Curated Palate & Taste Preferences</h4>
                  {selectedAccount.favoriteTea && (
                    <div className="preference-favorite-box">
                      <span>Favorite Harvest:</span>
                      <strong>{selectedAccount.favoriteTea}</strong>
                    </div>
                  )}
                  {selectedAccount.preferences && typeof selectedAccount.preferences === "object" && (
                    <div className="preference-tags-grid">
                      {Object.entries(selectedAccount.preferences).map(([key, val]) => (
                        <div key={key} className="preference-tag-card">
                          <small>{key}</small>
                          <strong>{Array.isArray(val) ? val.join(", ") : String(val)}</strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer-luxury">
              <button
                type="button"
                className="admin-btn-secondary"
                onClick={() => setSelectedAccount(null)}
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
