import { useMemo, useState, useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  deleteUser,
  reauthenticateWithPopup,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, googleProvider, db } from "../lib/firebase";
import { useProducts } from "../context/ProductContext";
import { useOrderContext } from "../context/OrderContext";
import { useAuth, isValidGmailAddress, GMAIL_ERROR_MESSAGE } from "../context/AuthContext";
import { useCoupons } from "../context/CouponContext";
import { validatePhoneNumber } from "../lib/validation";
import type { Order } from "../types/contracts";
import { ApiService } from "../lib/apiClient";
import mainImage from "../assets/main.webp";
import image2 from "../assets/image2.webp";
import image3 from "../assets/image3.webp";
import image5 from "../assets/image5.webp";
import logo from "../assets/leafly-logo.webp";
import Footer from "../components/Footer";
import PhoneInput from "../components/PhoneInput";
import SEO from "../components/SEO";
import "./Profile.css";
import "./Orders.css";

type SidebarItemId =
  | "overview"
  | "details"
  | "orders"
  | "coupons"
  | "notifications"
  | "security";

type DetailsState = {
  fullName: string;
  email: string;
  phone: string;
};

type NotificationPreferences = {
  orderUpdates: boolean;
  ritualTips: boolean;
  newHarvestAlerts: boolean;
  exclusiveVouchers: boolean;
};

type SidebarItem = {
  id: SidebarItemId;
  label: string;
  icon: ReactNode;
};

const sidebarItems: SidebarItem[] = [
  {
    id: "overview",
    label: "Overview",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 10.5 12 3l9 7.5v9.5a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-9.5Z" />
      </svg>
    ),
  },
  {
    id: "details",
    label: "Personal Details",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="8" r="4" />
        <path d="M5 20c.8-3.5 3.2-5.5 7-5.5s6.2 2 7 5.5" />
      </svg>
    ),
  },
  {
    id: "orders",
    label: "Orders",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 4h10l2 4v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8l2-4Zm0 6h10M9 2h6v2H9V2Z" />
      </svg>
    ),
  },
  {
    id: "coupons",
    label: "Coupons & Rewards",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 8a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v2a2 2 0 0 0 0 4v2a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-2a2 2 0 0 0 0-4V8Zm6 4h6" />
      </svg>
    ),
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9Zm-4.27 13a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
  {
    id: "security",
    label: "Account Settings",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3 5 6v5c0 4.3 2.7 8.1 7 10 4.3-1.9 7-5.7 7-10V6l-7-3Zm0 5.5 3.2 3.2-1.2 1.2-2 2-2-2-1.2-1.2L12 8.5Z" />
      </svg>
    ),
  },
];

const initialDetails: DetailsState = {
  fullName: "",
  email: "",
  phone: "",
};

const initialNotifications: NotificationPreferences = {
  orderUpdates: true,
  ritualTips: true,
  newHarvestAlerts: true,
  exclusiveVouchers: false,
};

const promiseItems = [
  {
    title: "Whole leaf tea",
    text: "Real leaves. Real taste.",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2c3 4.5 5 7.5 5 10a5 5 0 1 1-10 0c0-2.5 2-5.5 5-10Zm0 7.2c1.6 2 2.5 3.4 2.5 4.8A2.5 2.5 0 1 1 9.5 14c0-1.4.9-2.8 2.5-4.8Z" />
      </svg>
    ),
  },
  {
    title: "Carefully sourced",
    text: "From the best gardens around the world.",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2.5a9.5 9.5 0 0 1 9.5 9.5c0 5.3-4.2 9.5-9.5 9.5S2.5 17.3 2.5 12 7.7 2.5 12 2.5Zm0 3A6.5 6.5 0 0 0 5.5 12c0 3.6 2.9 6.5 6.5 6.5S18.5 15.6 18.5 12A6.5 6.5 0 0 0 12 5.5Zm-1 2h2v4h3v2h-5V7.5Z" />
      </svg>
    ),
  },
  {
    title: "Fresh & pure",
    text: "Packed with care to preserve freshness.",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3.5c1.6 0 2.8 1.2 2.8 2.8v1.1h1.4a2.3 2.3 0 0 1 2.3 2.3V13c0 1.8-1.4 3.2-3.2 3.2H8.7a3.2 3.2 0 0 1-3.2-3.2v-3.3a2.3 2.3 0 0 1 2.3-2.3h1.4V6.3C9.2 4.7 10.4 3.5 12 3.5Zm0 2.1a.8.8 0 0 0-.8.8v1.1h1.6V6.4a.8.8 0 0 0-.8-.8ZM10 12.5h4v2h-4v-2Z" />
      </svg>
    ),
  },
  {
    title: "Made for you",
    text: "Because every cup should feel personal.",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3a4 4 0 0 1 4 4v1.2A3.8 3.8 0 0 1 18.8 12v.8A4.2 4.2 0 0 1 14.6 17H9.4A4.2 4.2 0 0 1 5.2 12.8V12A3.8 3.8 0 0 1 8 8.2V7a4 4 0 0 1 4-4Zm0 2a2 2 0 0 0-2 2v1.2h4V7a2 2 0 0 0-2-2Zm-4 8.2v.6a2.2 2.2 0 0 0 2.2 2.2h5.6a2.2 2.2 0 0 0 2.2-2.2v-.6H8Z" />
      </svg>
    ),
  },
];

const NOTIF_STORAGE_KEY = "leafly_profile_notifs_v1";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export default function Profile() {
  const navigate = useNavigate();
  const { user, loading, isAuthenticated, logout, updateUserProfile, sendPasswordReset } = useAuth();
  const { orders, latestOrder } = useOrderContext();
  const { products } = useProducts();

  // Guest order management state
  const [sessionOrder, setSessionOrder] = useState<Order | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem("leafly_last_order");
        if (stored) return JSON.parse(stored) as Order;
      } catch {
        // ignore
      }
    }
    return null;
  });

  useEffect(() => {
    if (latestOrder) {
      setSessionOrder(latestOrder);
    }
  }, [latestOrder]);

  const [lookupOrderId, setLookupOrderId] = useState("");
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupOrder, setLookupOrder] = useState<Order | null>(null);
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<Order | null>(null);

  const [resendLoading, setResendLoading] = useState(false);
  const [resendNotice, setResendNotice] = useState<string | null>(null);

  const provisionedInfo = useMemo(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem("leafly_account_provisioned");
        if (stored) return JSON.parse(stored) as { email: string; uid: string; isNewAccount: boolean; passwordSetupLink?: string };
      } catch {
        // ignore
      }
    }
    return null;
  }, []);

  const activeCustomerEmail = useMemo(() => {
    return (
      sessionOrder?.customerEmail ||
      sessionOrder?.email ||
      latestOrder?.customerEmail ||
      latestOrder?.email ||
      provisionedInfo?.email ||
      ""
    );
  }, [sessionOrder, latestOrder, provisionedInfo]);

  const handleResendSetupEmail = async () => {
    if (!activeCustomerEmail) return;
    setResendLoading(true);
    setResendNotice(null);
    try {
      await sendPasswordReset(activeCustomerEmail);
      setResendNotice(`A password setup / reset email has been dispatched to ${activeCustomerEmail}. Please check your inbox.`);
    } catch (err: unknown) {
      console.warn("Resend setup notice:", err);
      try {
        await ApiService.provisionAccount({
          email: activeCustomerEmail,
          customerName: sessionOrder?.shippingAddress?.fullName || sessionOrder?.customerName || "Customer",
        });
        setResendNotice(`A password setup / reset email has been dispatched to ${activeCustomerEmail}. Please check your inbox.`);
      } catch {
        setResendNotice(`Unable to dispatch setup link right now. You can also request one on the Sign In page.`);
      }
    } finally {
      setResendLoading(false);
    }
  };

  useEffect(() => {
    if (selectedInvoiceOrder) {
      document.body.classList.add("invoice-open");
      const prevBody = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.classList.remove("invoice-open");
        document.body.style.overflow = prevBody;
      };
    }
  }, [selectedInvoiceOrder]);

  const handleLookupOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = lookupOrderId.trim();
    const cleanEmail = lookupEmail.trim().toLowerCase();

    if (!cleanId) {
      setLookupError("Please enter your Order ID.");
      return;
    }
    if (!cleanEmail) {
      setLookupError("Please enter the email address used during checkout.");
      return;
    }

    setLookupLoading(true);
    setLookupError(null);
    setLookupOrder(null);

    try {
      const snap = await getDoc(doc(db, "orders", cleanId));
      if (!snap.exists()) {
        setLookupError(`No order found with ID #${cleanId}. Please check your order confirmation email.`);
        return;
      }
      const orderData = { id: snap.id, ...snap.data() } as Order;
      const orderEmail = (orderData.customerEmail || orderData.email || "").trim().toLowerCase();

      if (orderEmail !== cleanEmail) {
        setLookupError(`The email address provided does not match the order records for #${cleanId}.`);
        return;
      }

      setLookupOrder(orderData);
    } catch (err: unknown) {
      console.warn("Guest order lookup notice:", err);
      setLookupError("Unable to retrieve order. Please check your network connection and try again.");
    } finally {
      setLookupLoading(false);
    }
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState("");
  const [reauthPassword, setReauthPassword] = useState("");
  const [needsPasswordReauth, setNeedsPasswordReauth] = useState(false);

  const dynamicRecommendations = useMemo(() => {
    const targetIds = [1, 2, 3];
    return targetIds.map((tid) => {
      const match = products.find((p) => String(p.id) === String(tid));
      if (match) {
        return {
          id: match.id,
          name: match.name,
          category: match.category,
          price: `₹${match.price}`,
          oldPrice: match.oldPrice ? `₹${match.oldPrice}` : undefined,
          image: match.image || (tid === 1 ? image2 : tid === 2 ? image3 : image5),
        };
      }
      return {
        id: tid,
        name: tid === 1 ? "Natural Green Tea" : tid === 2 ? "Golden Dusk Black Tea + Chamomile" : "Premium Oolong Black Tea",
        category: tid === 1 ? "Green Tea" : tid === 2 ? "Black Tea" : "Oolong Tea",
        price: tid === 1 ? "₹699" : tid === 2 ? "₹899" : "₹999",
        image: tid === 1 ? image2 : tid === 2 ? image3 : image5,
      };
    });
  }, [products]);

  useEffect(() => {
    if (!showDeleteConfirm) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isDeletingAccount) {
        setShowDeleteConfirm(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showDeleteConfirm, isDeletingAccount]);

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim() !== "DELETE MY LEAFLY ACCOUNT") {
      setDeleteAccountError("Please type DELETE MY LEAFLY ACCOUNT exactly to confirm.");
      return;
    }

    setIsDeletingAccount(true);
    setDeleteAccountError("");

    try {
      const currentFbUser = auth.currentUser;
      if (!currentFbUser || !user || currentFbUser.uid !== user.uid) {
        throw new Error("No active authenticated user session found.");
      }

      const isGoogle =
        currentFbUser.providerData.some((p) => p.providerId === "google.com") ||
        user.authProvider === "Google";

      // If previous attempt required password re-auth, verify credentials first
      if (needsPasswordReauth && reauthPassword.trim() && currentFbUser.email) {
        try {
          const credential = EmailAuthProvider.credential(currentFbUser.email, reauthPassword.trim());
          await reauthenticateWithCredential(currentFbUser, credential);
        } catch (reauthErr: unknown) {
          const rErr = reauthErr as { code?: string; message?: string };
          setDeleteAccountError(
            rErr?.code === "auth/wrong-password" || rErr?.code === "auth/invalid-credential"
              ? "Invalid account password. Please enter your correct password to confirm deletion."
              : rErr?.message || "Re-authentication failed. Please try again."
          );
          setIsDeletingAccount(false);
          return;
        }
      }

      // 1. Snapshot and preserve customer account audit record for Admin inspection
      const resolvedName =
        user.displayName || user.name || user.fullName || currentFbUser.displayName || "Customer";
      const resolvedEmail = currentFbUser.email || user.email || "";
      const resolvedPhone = user.phone || user.phoneNumber || currentFbUser.phoneNumber || null;
      const resolvedProvider = user.authProvider || (isGoogle ? "Google" : "Email/Password");
      const resolvedCreatedAt = currentFbUser.metadata?.creationTime
        ? new Date(currentFbUser.metadata.creationTime).toISOString()
        : null;
      const deletedAt = new Date().toISOString();

      const deletedRecord: Record<string, unknown> = {
        uid: currentFbUser.uid,
        id: currentFbUser.uid,
        name: resolvedName,
        fullName: resolvedName,
        displayName: resolvedName,
        email: resolvedEmail,
        phone: resolvedPhone,
        authProvider: resolvedProvider,
        status: "Deleted",
        isDeleted: true,
        deletedAt,
        createdAt: resolvedCreatedAt,
        favoriteTea: user.favoriteTea || null,
        preferences: user.preferences || null,
        updatedAt: deletedAt,
      };

      // Store in users collection marked as Deleted
      try {
        await setDoc(doc(db, "users", currentFbUser.uid), deletedRecord, { merge: true });
      } catch (docErr) {
        console.warn("Notice updating user document to Deleted status:", docErr);
      }

      // Also store in deleted_accounts dedicated audit collection
      try {
        await setDoc(doc(db, "deleted_accounts", currentFbUser.uid), deletedRecord, { merge: true });
      } catch (delColErr) {
        console.warn("Notice persisting to deleted_accounts collection:", delColErr);
      }

      // 2. Delete user account from Firebase Auth with re-auth handling
      try {
        await deleteUser(currentFbUser);
      } catch (authErr: unknown) {
        const fbErr = authErr as { code?: string; message?: string };
        if (fbErr?.code === "auth/requires-recent-login") {
          if (isGoogle) {
            try {
              await reauthenticateWithPopup(currentFbUser, googleProvider);
              await deleteUser(currentFbUser);
            } catch (popupErr: unknown) {
              setDeleteAccountError("Google re-authentication required. Please sign in again and retry.");
              setIsDeletingAccount(false);
              return;
            }
          } else {
            setNeedsPasswordReauth(true);
            setDeleteAccountError(
              "For security reasons, deleting your account requires recent authentication. Please enter your password above to confirm deletion."
            );
            setIsDeletingAccount(false);
            return;
          }
        } else {
          throw authErr;
        }
      }

      // 3. Clear customer session, cart and cached tokens
      try {
        localStorage.removeItem("leafly-cart-v2");
        localStorage.removeItem(NOTIF_STORAGE_KEY);
      } catch {}

      try {
        await logout();
      } catch {}

      // 4. Close modal and redirect to /login with Leafly-themed success banner
      document.body.style.overflow = "";
      setShowDeleteConfirm(false);
      navigate("/login", {
        replace: true,
        state: { message: "Your Leafly account has been permanently deleted." },
      });
    } catch (err: unknown) {
      console.error("Account deletion error:", err);
      const fbErr = err as { code?: string; message?: string };
      setDeleteAccountError(fbErr?.message || "Failed to delete account. Please try again.");
    } finally {
      setIsDeletingAccount(false);
    }
  };

  // Unauthenticated visitors remain on Profile to view their provisioned account setup status,
  // recent order details, and order lookup tool without premature redirection.

  const orderSummary = useMemo(() => {
    const delivered = orders.filter((order) => order.status === "Delivered").length;
    const processing = orders.filter((order) => order.status === "Processing").length;
    const shipped = orders.filter((order) => order.status === "Shipped").length;
    const cancelled = orders.filter((order) => order.status === "Cancelled").length;

    return {
      totalOrders: orders.length,
      delivered,
      processing,
      shipped,
      cancelled,
    };
  }, [orders]);

  const isUserAdmin = Boolean(user?.isAdmin || user?.email === "leaflydatabase@gmail.com");

  const displayedSidebarItems = useMemo(() => {
    if (isUserAdmin) {
      return [
        {
          id: "overview" as SidebarItemId,
          label: "Overview",
          icon: (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 10.5 12 3l9 7.5v9.5a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-9.5Z" />
            </svg>
          ),
        },
        {
          id: "details" as SidebarItemId,
          label: "Personal Details",
          icon: (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="8" r="4" />
              <path d="M5 20c.8-3.5 3.2-5.5 7-5.5s6.2 2 7 5.5" />
            </svg>
          ),
        },
        {
          id: "orders" as SidebarItemId,
          label: "Order Management",
          icon: (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 3h12l2 5v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8l2-5Zm0 5h12M9 12h6" />
            </svg>
          ),
        },
        {
          id: "security" as SidebarItemId,
          label: "Account Settings",
          icon: (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3 5 6v5c0 4.3 2.7 8.1 7 10 4.3-1.9 7-5.7 7-10V6l-7-3Zm0 5.5 3.2 3.2-1.2 1.2-2 2-2-2-1.2-1.2L12 8.5Z" />
            </svg>
          ),
        },
      ];
    }
    return sidebarItems;
  }, [isUserAdmin]);

  const [selectedSidebar, setSelectedSidebar] = useState<SidebarItemId>("overview");
  const [details, setDetails] = useState<DetailsState>(() => ({
    fullName: user?.displayName || user?.name || user?.fullName || initialDetails.fullName,
    email: user?.email || initialDetails.email,
    phone: user?.phone || user?.phoneNumber || initialDetails.phone,
  }));
  const [notifications, setNotifications] = useState<NotificationPreferences>(() => {
    try {
      const saved = localStorage.getItem(NOTIF_STORAGE_KEY);
      return saved ? JSON.parse(saved) : initialNotifications;
    } catch {
      return initialNotifications;
    }
  });

  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [notice, setNotice] = useState("Welcome back. Your account is ready.");
  const [detailsSaved, setDetailsSaved] = useState(false);
  const [notifSaved, setNotifSaved] = useState(false);

  const { coupons, globalCoupons } = useCoupons();
  const [copiedCouponCode, setCopiedCouponCode] = useState<string | null>(null);

  const allDisplayCoupons = useMemo(() => {
    const list = [...coupons];
    for (const gc of globalCoupons) {
      if (!list.some((c) => c.code.toUpperCase() === gc.code.toUpperCase())) {
        list.push(gc);
      }
    }
    return list;
  }, [coupons, globalCoupons]);

  const handleCopyCoupon = (code: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
    }
    setCopiedCouponCode(code);
    setTimeout(() => setCopiedCouponCode(null), 2000);
  };
  // Synchronize live user profile updates from Firestore / AuthContext
  useEffect(() => {
    if (user) {
      setDetails({
        fullName: user.displayName || user.name || user.fullName || "",
        email: user.email || "",
        phone: user.phone || user.phoneNumber || "",
      });
    } else {
      setDetails({
        fullName: "",
        email: "",
        phone: "",
      });
    }
  }, [user]);

  const activeUserName = useMemo(() => details.fullName || user?.displayName || user?.name || "Valued Member", [details.fullName, user]);

  const userInitials = useMemo(() => {
    const raw = (details.fullName || user?.displayName || user?.name || user?.email || "Valued Customer").trim();
    const parts = raw.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (raw.slice(0, 2) || "LU").toUpperCase();
  }, [details.fullName, user?.displayName, user?.name, user?.email]);

  const userPhoto = user?.photoURL || user?.profileImageUrl || user?.profileImage || null;
  const [prevUserPhoto, setPrevUserPhoto] = useState(userPhoto);
  const [avatarError, setAvatarError] = useState(false);

  if (prevUserPhoto !== userPhoto) {
    setPrevUserPhoto(userPhoto);
    setAvatarError(false);
  }

  const handleSidebarClick = (item: SidebarItem) => {
    setSelectedSidebar(item.id);

    if (item.id === "orders") {
      navigate("/orders");
      return;
    }

    if (item.id === "overview") {
      setNotice("Welcome back. Your account is ready.");
      return;
    }

    if (item.id === "coupons") {
      setNotice("Explore member privileges and harvest vouchers.");
      return;
    }

    if (item.id === "notifications") {
      setNotice("Manage your email & SMS ritual notifications.");
      return;
    }

    if (item.id === "security") {
      setNotice("Manage your account security, authentication & settings.");
      return;
    }
  };

  const [detailsError, setDetailsError] = useState<string | null>(null);

  const handleEditDetails = () => {
    setIsEditingDetails(true);
    setDetailsSaved(false);
    setDetailsError(null);
  };

  const handleSaveDetails = async () => {
    setDetailsError(null);
    const trimmedName = details.fullName.trim();
    if (trimmedName.length < 2) {
      setDetailsError("Please enter your full name (at least 2 characters).");
      return;
    }
    if (/^(abc|123|test|xyz)$/i.test(trimmedName)) {
      setDetailsError("Please provide a legitimate full name.");
      return;
    }

    if (!isValidGmailAddress(details.email)) {
      setDetailsError(GMAIL_ERROR_MESSAGE);
      return;
    }

    const cleanPhone = details.phone ? details.phone.trim() : "";
    let normalizedPhone: string | null = null;
    if (cleanPhone) {
      let countryToPass = "India";
      if (cleanPhone.startsWith("+")) {
        const spaceIdx = cleanPhone.indexOf(" ");
        if (spaceIdx > 0) {
          countryToPass = cleanPhone.substring(0, spaceIdx);
        } else {
          // Fallback if no space
          countryToPass = cleanPhone.substring(0, 3); 
        }
      }
      
      const phoneRes = validatePhoneNumber(cleanPhone, countryToPass);
      if (!phoneRes.isValid) {
        setDetailsError(phoneRes.error || "Please enter a valid mobile number.");
        return;
      }
      normalizedPhone = phoneRes.formatted;
    }

    try {
      if (updateUserProfile) {
        await updateUserProfile({
          name: trimmedName,
          fullName: trimmedName,
          displayName: trimmedName,
          email: details.email.trim(),
          phone: normalizedPhone,
          phoneNumber: normalizedPhone,
          mobile: normalizedPhone,
        });
      }
      setIsEditingDetails(false);
      setDetailsSaved(true);
      setNotice("Your personal details have been updated and saved to your profile.");
      window.setTimeout(() => setDetailsSaved(false), 3000);
    } catch (err: unknown) {
      console.error("Error saving details:", err);
      const msg = err instanceof Error ? err.message : "Failed to save personal details. Please try again.";
      setDetailsError(msg);
    }
  };

  const handleCancelDetails = () => {
    setIsEditingDetails(false);
    setDetailsSaved(false);
    setDetailsError(null);
    setNotice("Changes were discarded.");
  };

  const handleToggleNotification = (key: keyof NotificationPreferences) => {
    setNotifications((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
    setNotifSaved(true);
    setNotice("Notification preferences updated.");
    window.setTimeout(() => setNotifSaved(false), 3000);
  };

  const handleBackToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleExploreRecommendations = () => {
    navigate("/shop");
  };

  const handleOpenLogoutConfirm = () => {
    setShowLogoutConfirm(true);
  };

  const handleCancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  useEffect(() => {
    if (!showLogoutConfirm) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowLogoutConfirm(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showLogoutConfirm]);

  const handleLogout = async () => {
    document.body.style.overflow = "";
    setShowLogoutConfirm(false);
    try {
      await logout();
      navigate("/login", { replace: true });
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    } catch {
      navigate("/login", { replace: true });
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  };

  if (loading) {
    return (
      <main className="profile-page" style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: "#c9a24b" }}>
          <div
            style={{
              margin: "0 auto 16px",
              width: "36px",
              height: "36px",
              border: "3px solid rgba(201, 162, 75, 0.2)",
              borderTopColor: "#c9a24b",
              borderRadius: "50%",
              animation: "leafly-spin 700ms linear infinite",
            }}
          />
          <p style={{ fontFamily: "Georgia, serif", fontSize: "18px", letterSpacing: "1px", color: "#f7f3ec" }}>
            Preparing Your Leafly Sanctuary...
          </p>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    const activeOrderForInvoice = selectedInvoiceOrder;
    return (
      <main className="profile-page">
        <SEO
          title="Guest Order Status | Leafly"
          description="View your guest orders, download tax invoices, and track delivery status."
          noindex={true}
        />
        <div className="profile-page-shell" style={{ display: "block", maxWidth: "960px", margin: "0 auto", padding: "2rem 1.5rem 5rem" }}>
          {/* GUEST HERO HEADER */}
          <div style={{
            background: "linear-gradient(145deg, #0b2b1e 0%, #133e2c 100%)",
            color: "#f7f3ec",
            borderRadius: "16px",
            padding: "2.5rem 2rem",
            marginBottom: "2rem",
            boxShadow: "0 10px 30px rgba(11, 43, 30, 0.15)",
            position: "relative",
            overflow: "hidden"
          }}>
            <div style={{
              position: "absolute",
              right: "-20px",
              bottom: "-30px",
              width: "220px",
              height: "220px",
              background: "radial-gradient(circle, rgba(201, 162, 75, 0.15) 0%, transparent 70%)",
              borderRadius: "50%",
              pointerEvents: "none"
            }} />
            <p style={{
              fontSize: "12px",
              letterSpacing: "2.5px",
              color: "#c9a24b",
              fontWeight: 700,
              textTransform: "uppercase",
              margin: "0 0 8px 0"
            }}>
              ✦ ORDER MANAGEMENT · ACCOUNT SANCTUARY
            </p>
            <h1 style={{
              fontSize: "clamp(24px, 4vw, 34px)",
              fontFamily: "Georgia, serif",
              margin: "0 0 12px 0",
              fontWeight: 500,
              letterSpacing: "0.5px"
            }}>
              Order &amp; Account Sanctuary
            </h1>
            <p style={{
              fontSize: "15px",
              color: "#d0dbd4",
              maxWidth: "640px",
              lineHeight: 1.6,
              margin: 0
            }}>
              {activeCustomerEmail
                ? `Your Leafly customer account has been established for ${activeCustomerEmail}. Inspect your harvest order below, download your official GST invoice, or set your password to log in and access all your orders anytime.`
                : "Inspect your active order below, download your official GST invoice, or securely look up any past order using your Order ID and checkout email."}
            </p>
          </div>

          {/* CUSTOMER ACCOUNT ESTABLISHED / SETUP PENDING CARD */}
          {activeCustomerEmail && (
            <div style={{
              background: "#ffffff",
              border: "1px solid #bbf7d0",
              borderLeft: "5px solid #166534",
              borderRadius: "14px",
              padding: "1.75rem",
              marginBottom: "2rem",
              boxShadow: "0 4px 20px rgba(0,0,0,0.04)"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "0.75rem" }}>
                <div>
                  <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "1.2px", color: "#166534", textTransform: "uppercase" }}>
                    ✦ CUSTOMER ACCOUNT ESTABLISHED
                  </span>
                  <h2 style={{ fontSize: "20px", fontFamily: "Georgia, serif", color: "#0b2b1e", margin: "4px 0" }}>
                    Account Login: {activeCustomerEmail}
                  </h2>
                </div>
                <span style={{
                  padding: "4px 12px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: 600,
                  background: provisionedInfo?.isNewAccount === false ? "rgba(16, 185, 129, 0.15)" : "rgba(201, 162, 75, 0.18)",
                  color: provisionedInfo?.isNewAccount === false ? "#065f46" : "#855a12",
                  border: "1px solid " + (provisionedInfo?.isNewAccount === false ? "rgba(16, 185, 129, 0.3)" : "rgba(201, 162, 75, 0.4)")
                }}>
                  {provisionedInfo?.isNewAccount === false ? "Linked to Existing Account" : "Password Setup Pending"}
                </span>
              </div>
              <p style={{ fontSize: "13.5px", color: "#4a5550", margin: "0 0 1.25rem 0", lineHeight: 1.6 }}>
                Every guest checkout automatically establishes a customer account using your real email address (<strong>{activeCustomerEmail}</strong>). To sign in and access your permanent tea sanctuary, set your private password using the link sent to your inbox or click below.
              </p>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() => navigate("/login", { state: { email: activeCustomerEmail } })}
                  style={{
                    background: "#0b2b1e",
                    color: "#ffffff",
                    padding: "9px 20px",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                    border: "none"
                  }}
                >
                  SIGN IN / SET PASSWORD →
                </button>
                <button
                  type="button"
                  disabled={resendLoading}
                  onClick={handleResendSetupEmail}
                  style={{
                    background: "rgba(201, 162, 75, 0.12)",
                    color: "#855a12",
                    border: "1px solid rgba(201, 162, 75, 0.4)",
                    padding: "9px 18px",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: resendLoading ? "wait" : "pointer"
                  }}
                >
                  {resendLoading ? "DISPATCHING..." : "RESEND PASSWORD SETUP EMAIL"}
                </button>
                {resendNotice && (
                  <span style={{ fontSize: "13px", color: "#166534", fontWeight: 600 }}>
                    ✓ {resendNotice}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* SECTION 1: RECENT SESSION ORDER (IF AVAILABLE) */}
          {(sessionOrder || latestOrder) && (
            <div style={{
              background: "#ffffff",
              border: "1px solid rgba(11, 43, 30, 0.1)",
              borderRadius: "14px",
              padding: "1.75rem",
              marginBottom: "2rem",
              boxShadow: "0 4px 20px rgba(0,0,0,0.04)"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "1rem", borderBottom: "1px solid #f0eae1", paddingBottom: "1rem" }}>
                <div>
                  <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "1px", color: "#8c6823", textTransform: "uppercase" }}>RECENT SESSION ORDER</span>
                  <h2 style={{ fontSize: "20px", fontFamily: "Georgia, serif", color: "#0b2b1e", margin: "4px 0" }}>
                    Order #{sessionOrder?.id || latestOrder?.id}
                  </h2>
                  <p style={{ fontSize: "12.5px", color: "#6a7b72", margin: 0 }}>
                    Placed on {new Date(sessionOrder?.createdAt || latestOrder?.createdAt || Date.now()).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{
                    padding: "4px 12px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: 600,
                    background: "rgba(16, 185, 129, 0.12)",
                    color: "#065f46",
                    border: "1px solid rgba(16, 185, 129, 0.3)"
                  }}>
                    {sessionOrder?.orderStatus || sessionOrder?.status || latestOrder?.orderStatus || latestOrder?.status || "Confirmed"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedInvoiceOrder(sessionOrder || latestOrder)}
                    style={{
                      background: "rgba(201, 162, 75, 0.15)",
                      border: "1px solid rgba(201, 162, 75, 0.4)",
                      color: "#855a12",
                      padding: "6px 14px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                  >
                    📄 View / Print Tax Invoice
                  </button>
                </div>
              </div>

              {/* Order summary info */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", fontSize: "13px", color: "#4a5550", marginBottom: "1.25rem" }}>
                <div>
                  <strong style={{ display: "block", color: "#0b2b1e", marginBottom: "3px" }}>Delivery Recipient:</strong>
                  <span>{sessionOrder?.shippingAddress?.fullName || sessionOrder?.customerName || latestOrder?.shippingAddress?.fullName || "Valued Customer"}</span>
                </div>
                <div>
                  <strong style={{ display: "block", color: "#0b2b1e", marginBottom: "3px" }}>Recipient Email:</strong>
                  <span style={{ color: "#0b2b1e", fontWeight: 600 }}>{sessionOrder?.customerEmail || sessionOrder?.email || latestOrder?.customerEmail || "Entered at checkout"}</span>
                </div>
                <div>
                  <strong style={{ display: "block", color: "#0b2b1e", marginBottom: "3px" }}>Payment Method:</strong>
                  <span>{sessionOrder?.paymentMethod === "cod" ? "Pay on Delivery (COD)" : sessionOrder?.paymentMethod || latestOrder?.paymentMethod || "Pay on Delivery"}</span>
                </div>
                <div>
                  <strong style={{ display: "block", color: "#0b2b1e", marginBottom: "3px" }}>Total Amount:</strong>
                  <strong style={{ color: "#0b2b1e", fontSize: "15px" }}>{currencyFormatter.format(sessionOrder?.total || latestOrder?.total || 0)}</strong>
                </div>
              </div>

              {/* Items Preview */}
              <div style={{ background: "#fcfbfa", borderRadius: "8px", padding: "12px 16px", border: "1px solid #f0eae1" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "1px", color: "#6a7b72", textTransform: "uppercase" }}>ITEMS IN THIS HARVEST:</span>
                <ul style={{ margin: "8px 0 0 0", paddingLeft: "18px", fontSize: "13px", color: "#22382f" }}>
                  {(sessionOrder?.items || latestOrder?.items || []).map((item, idx) => (
                    <li key={idx} style={{ marginBottom: "4px" }}>
                      <strong>{item.name}</strong> {item.variant ? `(${item.variant})` : ""} × {item.quantity} — {currencyFormatter.format(item.price * item.quantity)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* SECTION 2: TRACK ANY GUEST ORDER (LOOKUP) */}
          <div style={{
            background: "#ffffff",
            border: "1px solid rgba(11, 43, 30, 0.1)",
            borderRadius: "14px",
            padding: "1.75rem",
            marginBottom: "2rem",
            boxShadow: "0 4px 20px rgba(0,0,0,0.04)"
          }}>
            <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "1.5px", color: "#8c6823", textTransform: "uppercase" }}>
              ✦ ORDER RETRIEVAL
            </span>
            <h2 style={{ fontSize: "20px", fontFamily: "Georgia, serif", color: "#0b2b1e", margin: "6px 0 8px 0" }}>
              Track Past Guest Order
            </h2>
            <p style={{ fontSize: "13.5px", color: "#5d6d64", margin: "0 0 1.25rem 0", lineHeight: 1.5 }}>
              Enter your Order ID (e.g. ORD-...) and the real email address you entered during checkout to securely look up your order details and invoice.
            </p>

            <form onSubmit={handleLookupOrder} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "12px", alignItems: "flex-end" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", fontWeight: 600, color: "#0b2b1e" }}>
                <span>Order ID *</span>
                <input
                  type="text"
                  placeholder="e.g. ORD-20261009-4821"
                  value={lookupOrderId}
                  onChange={(e) => {
                    setLookupOrderId(e.target.value);
                    setLookupError(null);
                  }}
                  style={{
                    padding: "10px 12px",
                    border: "1px solid #dcd3c4",
                    borderRadius: "6px",
                    fontSize: "13px",
                    outline: "none"
                  }}
                  required
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", fontWeight: 600, color: "#0b2b1e" }}>
                <span>Checkout Email Address *</span>
                <input
                  type="email"
                  placeholder="e.g. name@example.com"
                  value={lookupEmail}
                  onChange={(e) => {
                    setLookupEmail(e.target.value);
                    setLookupError(null);
                  }}
                  style={{
                    padding: "10px 12px",
                    border: "1px solid #dcd3c4",
                    borderRadius: "6px",
                    fontSize: "13px",
                    outline: "none"
                  }}
                  required
                />
              </label>

              <button
                type="submit"
                disabled={lookupLoading}
                style={{
                  background: "#0b2b1e",
                  color: "#ffffff",
                  padding: "11px 20px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: 700,
                  letterSpacing: "1px",
                  cursor: lookupLoading ? "wait" : "pointer",
                  height: "42px"
                }}
              >
                {lookupLoading ? "SEARCHING..." : "LOOKUP ORDER"}
              </button>
            </form>

            {lookupError && (
              <div style={{ marginTop: "12px", padding: "10px 14px", background: "rgba(220, 38, 38, 0.08)", color: "#b91c1c", borderRadius: "6px", fontSize: "12.5px" }}>
                ⚠️ {lookupError}
              </div>
            )}

            {lookupOrder && (
              <div style={{
                marginTop: "1.5rem",
                padding: "1.25rem",
                background: "#f9f8f5",
                borderRadius: "10px",
                border: "1px solid #e8e0d4"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "10px" }}>
                  <h3 style={{ margin: 0, fontSize: "17px", color: "#0b2b1e", fontFamily: "Georgia, serif" }}>
                    Found: Order #{lookupOrder.id}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setSelectedInvoiceOrder(lookupOrder)}
                    style={{
                      background: "#c9a24b",
                      color: "#0b2b1e",
                      border: "none",
                      padding: "6px 14px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                  >
                    📄 View / Print Tax Invoice
                  </button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", fontSize: "12.5px", color: "#3e4d45", marginBottom: "10px" }}>
                  <div><strong>Status:</strong> {lookupOrder.orderStatus || lookupOrder.status || "Confirmed"}</div>
                  <div><strong>Date:</strong> {new Date(lookupOrder.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}</div>
                  <div><strong>Recipient:</strong> {lookupOrder.shippingAddress?.fullName || lookupOrder.customerName}</div>
                  <div><strong>Recipient Email:</strong> {lookupOrder.customerEmail || lookupOrder.email}</div>
                  <div><strong>Total:</strong> {currencyFormatter.format(lookupOrder.total)}</div>
                </div>
                <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12.5px", color: "#4a5550" }}>
                  {lookupOrder.items.map((i, idx) => (
                    <li key={idx}>
                      {i.name} {i.variant ? `(${i.variant})` : ""} × {i.quantity}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* SECTION 3: INVITATION TO SIGN IN / SET PASSWORD */}
          <div style={{
            background: "linear-gradient(135deg, rgba(201, 162, 75, 0.12) 0%, rgba(201, 162, 75, 0.04) 100%)",
            border: "1px solid rgba(201, 162, 75, 0.35)",
            borderRadius: "14px",
            padding: "1.75rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1.25rem"
          }}>
            <div>
              <h3 style={{ fontFamily: "Georgia, serif", fontSize: "18px", color: "#0b2b1e", margin: "0 0 4px 0" }}>
                Ready to access your permanent customer account?
              </h3>
              <p style={{ fontSize: "13.5px", color: "#6a7b72", margin: 0, maxWidth: "560px" }}>
                Sign in using your checkout email {activeCustomerEmail ? `(${activeCustomerEmail})` : ""} after completing password setup to view your lifetime orders, save delivery addresses, and enjoy member vouchers.
              </p>
            </div>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => navigate("/login", { state: activeCustomerEmail ? { email: activeCustomerEmail } : undefined })}
                style={{
                  background: "#0b2b1e",
                  color: "#ffffff",
                  padding: "10px 20px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                SIGN IN WITH EMAIL →
              </button>
            </div>
          </div>
        </div>

        {/* PRINTABLE INVOICE MODAL FOR GUESTS */}
        {activeOrderForInvoice && (
          <div
            className="invoice-modal-backdrop"
            onClick={() => setSelectedInvoiceOrder(null)}
            role="dialog"
            aria-modal="true"
            aria-label={`Tax Invoice for Order ${activeOrderForInvoice.id}`}
          >
            <div
              className="invoice-modal-dialog"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="invoice-action-bar no-print">
                <button
                  type="button"
                  className="invoice-print-btn"
                  onClick={() => window.print()}
                >
                  🖨️ Print / Save PDF
                </button>
                <button
                  type="button"
                  className="invoice-close-btn"
                  onClick={() => setSelectedInvoiceOrder(null)}
                >
                  ✕ Close
                </button>
              </div>

              {/* PRINTABLE INVOICE SHEET */}
              <div className="invoice-sheet" id="printable-invoice">
                <header className="invoice-header">
                  <div className="invoice-brand-col">
                    <div className="invoice-logo-row">
                      <img src={logo} alt="Leafly" className="invoice-logo-img" />
                      <div>
                        <h2 className="invoice-brand-name">LEAFLY</h2>
                        <p className="invoice-brand-sub">TEA SANCTUARY & BOTANICALS</p>
                      </div>
                    </div>
                  </div>
                  <div className="invoice-meta-top">
                    <h3>TAX INVOICE / RECEIPT</h3>
                    <p><strong>Invoice #:</strong> INV-{activeOrderForInvoice.id}</p>
                    <p><strong>Order Date:</strong> {new Date(activeOrderForInvoice.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                    <p>
                      <strong>Order Status:</strong>{" "}
                      <span className="invoice-status-pill">
                        {activeOrderForInvoice.orderStatus || activeOrderForInvoice.status || "Confirmed"}
                      </span>
                    </p>
                  </div>
                </header>

                <div className="invoice-parties-grid">
                  <div className="invoice-party-col">
                    <h4>SOLD BY:</h4>
                    <strong>Leafly</strong>
                    <p>Near Balaji Symphony,</p>
                    <p>Panvel - 410206,</p>
                    <p>Maharashtra, India</p>
                    <p>myleaflytea@gmail.com</p>
                  </div>
                  <div className="invoice-party-col">
                    <h4>BILLED TO / DELIVERED TO:</h4>
                    <strong>{activeOrderForInvoice.shippingAddress?.fullName || activeOrderForInvoice.customerName || "Valued Customer"}</strong>
                    <p>{activeOrderForInvoice.shippingAddress?.addressLine1}</p>
                    {activeOrderForInvoice.shippingAddress?.addressLine2 ? <p>{activeOrderForInvoice.shippingAddress.addressLine2}</p> : null}
                    <p>{activeOrderForInvoice.shippingAddress?.city}, {activeOrderForInvoice.shippingAddress?.state} {activeOrderForInvoice.shippingAddress?.postalCode}</p>
                    <p>{activeOrderForInvoice.shippingAddress?.country || "India"}</p>
                    <p style={{ marginTop: "4px" }}><strong>Email:</strong> {activeOrderForInvoice.customerEmail || activeOrderForInvoice.email || "N/A"}</p>
                    {activeOrderForInvoice.customerPhone ? <p><strong>Phone:</strong> {activeOrderForInvoice.customerPhone}</p> : null}
                  </div>
                </div>

                {activeOrderForInvoice.deliveryInstructions ? (
                  <div className="invoice-instructions-callout">
                    <strong>Delivery Instructions:</strong> {activeOrderForInvoice.deliveryInstructions}
                  </div>
                ) : null}

                {/* ITEMS TABLE */}
                <table className="invoice-table">
                  <thead>
                    <tr>
                      <th style={{ width: "32px" }}>#</th>
                      <th>Item Description</th>
                      <th>Weight / Variant</th>
                      <th style={{ textAlign: "center", width: "45px" }}>Qty</th>
                      <th style={{ textAlign: "right", width: "90px" }}>Unit Price</th>
                      <th style={{ textAlign: "right", width: "95px" }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeOrderForInvoice.items.map((item, idx) => (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td>
                          <strong className="invoice-item-name">{item.name}</strong>
                          {item.category && <small className="invoice-item-cat">{item.category} Selection</small>}
                        </td>
                        <td>{item.variant || item.weight || "100g"}</td>
                        <td style={{ textAlign: "center" }}>{item.quantity}</td>
                        <td style={{ textAlign: "right" }}>{currencyFormatter.format(item.price)}</td>
                        <td style={{ textAlign: "right" }}>{currencyFormatter.format(item.price * item.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* FINANCIAL SUMMARY TABLE */}
                <div className="invoice-totals-section">
                  <div className="invoice-payment-info">
                    <h4>PAYMENT & DISPATCH SUMMARY</h4>
                    <p><strong>Payment Method:</strong> {activeOrderForInvoice.paymentMethod ? (activeOrderForInvoice.paymentMethod === "cod" ? "PAY ON DELIVERY" : activeOrderForInvoice.paymentMethod.toUpperCase()) : "PAY ON DELIVERY"}</p>
                    <p><strong>Payment Status:</strong> {activeOrderForInvoice.paymentStatus || "Confirmed"}</p>
                    <p><strong>Delivery Method:</strong> {activeOrderForInvoice.deliveryMethod || "Standard Delivery"}</p>
                  </div>

                  <div className="invoice-totals-box">
                    <div className="invoice-totals-row">
                      <span>Subtotal:</span>
                      <span>{currencyFormatter.format(activeOrderForInvoice.subtotal || activeOrderForInvoice.total)}</span>
                    </div>
                    {activeOrderForInvoice.discount ? (
                      <div className="invoice-totals-row invoice-discount-row">
                        <span>Discount {activeOrderForInvoice.couponCode ? `(${activeOrderForInvoice.couponCode})` : ""}:</span>
                        <span>- {currencyFormatter.format(activeOrderForInvoice.discount)}</span>
                      </div>
                    ) : null}
                    <div className="invoice-totals-row">
                      <span>Delivery Fee:</span>
                      <span>{activeOrderForInvoice.deliveryFee ? currencyFormatter.format(activeOrderForInvoice.deliveryFee) : "FREE"}</span>
                    </div>
                    <div className="invoice-totals-row invoice-grand-total">
                      <span>Final Amount:</span>
                      <span>{currencyFormatter.format(activeOrderForInvoice.total)}</span>
                    </div>
                  </div>
                </div>

                <footer className="invoice-footer">
                  <p>Thank you for steepening your ritual with Leafly. Steep pure, savor quietness.</p>
                  <small>This is an authentic computer-generated tax invoice and requires no physical signature.</small>
                </footer>
              </div>
            </div>
          </div>
        )}
        <Footer />
      </main>
    );
  }

  return (
    <main className="profile-page">
      <SEO
        title="Your Account | Leafly"
        description="Manage your Leafly account and preferences."
        noindex={true}
      />
      <div className="profile-page-shell">
        <aside className="profile-sidebar" aria-label="Profile navigation">
          <div className="profile-sidebar-brand">
            <span>LEAFLY</span>
            <small>ACCOUNT</small>
          </div>

          <nav className="profile-sidebar-nav">
            {displayedSidebarItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`profile-sidebar-item ${selectedSidebar === item.id ? "active" : ""}`}
                onClick={() => handleSidebarClick(item)}
                aria-current={selectedSidebar === item.id ? "page" : undefined}
              >
                <span className="profile-sidebar-icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          {isUserAdmin && (
            <>
              <div className="profile-sidebar-divider" />
              <button
                type="button"
                className="profile-sidebar-item profile-sidebar-admin-link"
                onClick={() => navigate("/admin")}
                aria-label="Open Admin Dashboard"
              >
                <span className="profile-sidebar-icon">
                  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                  </svg>
                </span>
                <span>Admin Dashboard</span>
              </button>
            </>
          )}

          <div className="profile-sidebar-divider" />

          <button
            type="button"
            className="profile-sidebar-logout"
            onClick={handleOpenLogoutConfirm}
            aria-label="Log out from account"
          >
            <span className="profile-sidebar-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 7V5a3 3 0 0 1 3-3h5a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3h-5a3 3 0 0 1-3-3v-2h2v2a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-5a1 1 0 0 0-1 1v2H9Zm-2.2 5.5L12 12l-5.2-.5-1.3 1.5L8 15l.9.9 1.3 1.5L9.8 19l-1.3-1.5L6 15.7l2.5-2.2Z" />
              </svg>
            </span>
            <span>Logout</span>
          </button>
        </aside>

        <section className="profile-main-content">
          <header className="profile-hero">
            <div className="profile-avatar-wrap">
              <div className="profile-avatar" aria-label="Profile avatar">
                {userPhoto && !avatarError ? (
                  <img
                    src={userPhoto}
                    alt={activeUserName}
                    className="profile-avatar-custom-img"
                    referrerPolicy="no-referrer"
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <div className="profile-avatar-initials" aria-label={`Avatar initials: ${userInitials}`}>
                    <span>{userInitials}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="profile-hero-copy">
              <p className="profile-eyebrow">
                {user?.isAdmin || user?.email === "leaflydatabase@gmail.com" ? "ADMINISTRATIVE SANCTUARY" : "WELCOME BACK,"}
              </p>
              <h1>
                {user?.isAdmin || user?.email === "leaflydatabase@gmail.com"
                  ? (activeUserName === "Valued Member" ? "Leafly Administrator" : activeUserName)
                  : activeUserName}
              </h1>
              <p className="profile-quote">
                {user?.isAdmin || user?.email === "leaflydatabase@gmail.com"
                  ? "“Guiding sacred harvests with precision & craftsmanship.”"
                  : "“Tea is a quiet companion in a noisy world.”"}
              </p>

              <div className="profile-meta-row">
                <div>
                  <span className="profile-meta-label">Email</span>
                  <strong>{user?.email || details.email || "Not provided"}</strong>
                </div>
                <div>
                  <span className="profile-meta-label">Mobile Number</span>
                  <strong>{user?.phone || user?.phoneNumber || details.phone || "Not provided"}</strong>
                </div>
                <div>
                  <span className="profile-meta-label">Status</span>
                  <strong>Active Account</strong>
                </div>
              </div>
            </div>

            <div className="profile-hero-image-wrap">
              <img src={mainImage} alt="Tea ritual at home with warm natural lighting" loading="eager" fetchPriority="high" />
            </div>
          </header>

          {notice && (
            <div className="profile-notice" role="status" aria-live="polite">
              {notice}
            </div>
          )}

          {/* VIEW: OVERVIEW */}
          {selectedSidebar === "overview" && (
            <>
              <section className="profile-summary-grid" aria-label="Account summary">
                <article className="profile-summary-card">
                  <div className="profile-summary-header">
                    <p className="profile-summary-label">My orders</p>
                    <span className="profile-summary-total">{orderSummary.totalOrders}</span>
                  </div>

                  <div className="profile-summary-body">
                    <div className="profile-summary-line">
                      <span>Delivered</span>
                      <strong>{orderSummary.delivered}</strong>
                    </div>
                    <div className="profile-summary-line">
                      <span>Processing</span>
                      <strong>{orderSummary.processing}</strong>
                    </div>
                    <div className="profile-summary-line">
                      <span>Shipped</span>
                      <strong>{orderSummary.shipped}</strong>
                    </div>
                    <div className="profile-summary-line">
                      <span>Cancelled</span>
                      <strong>{orderSummary.cancelled}</strong>
                    </div>
                  </div>

                  <button type="button" className="profile-summary-button" onClick={() => navigate("/orders")}>
                    VIEW ORDERS
                  </button>
                </article>

                <article className="profile-summary-card">
                  <div className="profile-summary-header">
                    <p className="profile-summary-label">Personal details</p>
                    <span className="profile-summary-total">Active</span>
                  </div>

                  <div className="profile-summary-body">
                    <div className="profile-summary-line">
                      <span>Name</span>
                      <strong>{user?.displayName || user?.name || user?.fullName || details.fullName}</strong>
                    </div>
                    <div className="profile-summary-line">
                      <span>Email</span>
                      <strong>{user?.email || details.email || "Not provided"}</strong>
                    </div>
                    <div className="profile-summary-line">
                      <span>Mobile</span>
                      <strong>{user?.phone || user?.phoneNumber || details.phone || "Not provided"}</strong>
                    </div>
                  </div>

                  <button type="button" className="profile-summary-button" onClick={() => setSelectedSidebar("details")}>
                    MANAGE DETAILS
                  </button>
                </article>
              </section>
            </>
          )}

          {/* VIEW: PERSONAL DETAILS */}
          {selectedSidebar === "details" && (
            <section className="profile-detail-grid">
              <article className="profile-card profile-details-card">
                <div className="profile-card-header">
                  <div>
                    <p className="profile-card-kicker">SANCTUARY PROFILE</p>
                    <h2>PERSONAL DETAILS</h2>
                  </div>

                  {!isEditingDetails ? (
                    <button type="button" className="profile-edit-button" onClick={handleEditDetails}>
                      EDIT DETAILS
                    </button>
                  ) : null}
                </div>

                {detailsError && (
                  <div className="profile-form-error-alert" style={{ margin: "0.75rem 0", padding: "0.75rem 1rem", background: "rgba(220, 38, 38, 0.1)", color: "#b91c1c", borderRadius: "8px", border: "1px solid rgba(220, 38, 38, 0.2)", fontSize: "0.88rem" }}>
                    {detailsError}
                  </div>
                )}

                {!isEditingDetails ? (
                  <div className="profile-details-list">
                    {[
                      { label: "Full Name", value: user?.displayName || user?.name || user?.fullName || details.fullName || "Not provided" },
                      { label: "Email Address", value: user?.email || details.email || "Not provided" },
                      { label: "Phone Number", value: details.phone || user?.phone || user?.phoneNumber || "Not provided" },
                    ].map((field) => (
                      <div key={field.label} className="profile-detail-row">
                        <span>{field.label}</span>
                        <strong>{field.value}</strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="profile-edit-form">
                    <label className="profile-form-field">
                      <span>Full Name</span>
                      <input
                        type="text"
                        value={details.fullName}
                        onChange={(event) => {
                          setDetails((current) => ({ ...current, fullName: event.target.value }));
                          if (detailsError) setDetailsError(null);
                        }}
                        placeholder="Your full name"
                      />
                    </label>

                    <label className="profile-form-field">
                      <span>Email Address</span>
                      <input
                        type="email"
                        value={details.email}
                        onChange={(event) => {
                          setDetails((current) => ({ ...current, email: event.target.value }));
                          if (detailsError) setDetailsError(null);
                        }}
                        placeholder="name@leafly.in"
                      />
                    </label>

                    <PhoneInput
                      id="profile-phone"
                      label="Phone Number"
                      value={details.phone}
                      onChange={(value) => {
                        setDetails((current) => ({ ...current, phone: value }));
                        if (detailsError) setDetailsError(null);
                      }}
                    />

                    <div className="profile-edit-actions">
                      <button type="button" className="profile-secondary-button" onClick={handleCancelDetails}>
                        CANCEL
                      </button>
                      <button type="button" className="profile-primary-button" onClick={handleSaveDetails}>
                        SAVE CHANGES
                      </button>
                    </div>
                  </div>
                )}

                {detailsSaved && !isEditingDetails && (
                  <p className="profile-success-text">Your details have been updated and securely saved.</p>
                )}

                <div style={{ marginTop: "24px", paddingTop: "18px", borderTop: "1px solid var(--leafly-border, #e6decb)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                  <span style={{ fontSize: "13px", color: "rgba(11, 43, 30, 0.7)" }}>
                    Looking to manage security credentials, authentication, or delete your account?
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSidebarClick({ id: "security", label: "Account Settings", icon: null })}
                    style={{ background: "transparent", border: "none", color: "#0b2b1e", fontWeight: 700, fontSize: "13px", textDecoration: "underline", cursor: "pointer", padding: 0 }}
                  >
                    Go to Account Settings →
                  </button>
                </div>
              </article>
            </section>
          )}

          {/* VIEW: COUPONS */}
          {selectedSidebar === "coupons" && (
            <section className="profile-card profile-coupons-view">
              <div className="profile-card-header">
                <div>
                  <p className="profile-card-kicker">REWARDS & PRIVILEGES</p>
                  <h2>COUPONS & REWARDS</h2>
                </div>
                <span className="profile-coupons-count-badge">
                  {allDisplayCoupons.length} {allDisplayCoupons.length === 1 ? "Voucher" : "Vouchers"}
                </span>
              </div>

              {allDisplayCoupons.length === 0 ? (
                <div className="profile-coming-soon-card">
                  <span className="profile-coming-soon-icon" aria-hidden="true">✦</span>
                  <h3>No Active Vouchers</h3>
                  <p>
                    You currently have no active promo vouchers. Check back during seasonal harvest releases for exclusive tasting privileges.
                  </p>
                </div>
              ) : (
                <div className="profile-coupons-grid">
                  {allDisplayCoupons.map((coupon) => (
                    <article
                      key={coupon.code}
                      className={`profile-coupon-card ${coupon.status === "used" ? "used" : ""}`}
                    >
                      <div className="profile-coupon-card-top">
                        <span className="profile-coupon-tag">{coupon.title || "Harvest Privilege"}</span>
                        <span className={`profile-coupon-status ${coupon.status || "available"}`}>
                          {(coupon.status || "available").toUpperCase()}
                        </span>
                      </div>

                      <div className="profile-coupon-discount">
                        <strong>
                          {coupon.discountValue}
                          {coupon.discountType === "percentage" ? "% OFF" : "₹ OFF"}
                        </strong>
                      </div>

                      <p className="profile-coupon-condition">
                        {coupon.applicableCondition ||
                          (coupon.minOrderValue && coupon.minOrderValue > 0
                            ? `Valid on orders above ₹${coupon.minOrderValue.toLocaleString("en-IN")}`
                            : "Valid on all eligible harvests")}
                      </p>

                      {coupon.expiryDate && (
                        <p className="profile-coupon-expiry">
                          Expires: {coupon.expiryDate}
                        </p>
                      )}

                      <div className="profile-coupon-bottom">
                        <div className="profile-coupon-code-box">
                          <span>VOUCHER CODE</span>
                          <strong>{coupon.code}</strong>
                        </div>

                        <button
                          type="button"
                          className="profile-coupon-copy-btn"
                          onClick={() => handleCopyCoupon(coupon.code)}
                          disabled={coupon.status === "used"}
                          aria-label={`Copy voucher code ${coupon.code}`}
                        >
                          {copiedCouponCode === coupon.code ? "COPIED ✓" : "COPY CODE"}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* VIEW: NOTIFICATIONS */}
          {selectedSidebar === "notifications" && (
            <section className="profile-card profile-notifications-view">
              <div className="profile-card-header">
                <div>
                  <p className="profile-card-kicker">UPDATES</p>
                  <h2>NOTIFICATION PREFERENCES</h2>
                </div>
              </div>
              <p className="profile-subtitle">
                Choose which ritual updates, dispatch alerts, and tasting stories you want to receive.
              </p>

              <div className="profile-notif-list">
                {[
                  {
                    key: "orderUpdates" as const,
                    title: "Order & Delivery Status",
                    description: "Real-time shipping notifications, transit updates, and delivery confirmations.",
                  },
                  {
                    key: "ritualTips" as const,
                    title: "Artisan Brewing Rituals & Notes",
                    description: "Curated brewing advice, water temperature guides, and steeping methods.",
                  },
                  {
                    key: "newHarvestAlerts" as const,
                    title: "New Single-Origin Harvests",
                    description: "Be the first to hear when small-batch Darjeeling, Assam, or Nilgiri flushes arrive.",
                  },
                  {
                    key: "exclusiveVouchers" as const,
                    title: "Member Exclusive Vouchers",
                    description: "Seasonal discount vouchers, celebration gifts, and loyalty rewards.",
                  },
                ].map((item) => (
                  <div key={item.key} className="profile-notif-row">
                    <div className="profile-notif-info">
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                    </div>
                    <label className="profile-switch">
                      <input
                        type="checkbox"
                        checked={notifications[item.key]}
                        onChange={() => handleToggleNotification(item.key)}
                      />
                      <span className="profile-switch-slider" />
                    </label>
                  </div>
                ))}
              </div>
              {notifSaved && <p className="profile-success-text">Notification settings updated.</p>}
            </section>
          )}

          {/* VIEW: ACCOUNT SETTINGS / SECURITY */}
          {selectedSidebar === "security" && (
            <section className="profile-card profile-security-view">
              <div className="profile-card-header">
                <div>
                  <p className="profile-card-kicker">AUTHENTICATION & PRIVACY</p>
                  <h2>ACCOUNT SETTINGS</h2>
                </div>
                <span className="profile-security-badge">FIREBASE AUTH</span>
              </div>
              <p className="profile-subtitle">
                Manage your account authentication, data privacy, and security settings.
              </p>

              <div className="profile-security-grid">
                <div className="profile-security-item">
                  <div className="profile-security-icon">🔒</div>
                  <div>
                    <h3>Authentication Provider</h3>
                    <p>{user?.authProvider === "Google" ? "Google OAuth 2.0 — Your Google account secures this session." : "Email & Password — Secured by Firebase Authentication."}</p>
                  </div>
                </div>

                <div className="profile-security-item">
                  <div className="profile-security-icon">🛡️</div>
                  <div>
                    <h3>Account Isolation</h3>
                    <p>Your profile, orders, and mobile number are private to your UID. Other users cannot access your data.</p>
                  </div>
                </div>

                <div className="profile-security-item">
                  <div className="profile-security-icon">📱</div>
                  <div>
                    <h3>Authenticated Account</h3>
                    <p>{user?.email || "Authenticated user"} · Firebase UID verified</p>
                  </div>
                </div>

                <div className="profile-security-item">
                  <div className="profile-security-icon">✦</div>
                  <div>
                    <h3>Data Privacy</h3>
                    <p>Passwords are never stored in Firestore. Only your profile details, phone number, and orders are persisted.</p>
                  </div>
                </div>
              </div>

              {/* DANGER ZONE: DELETE ACCOUNT */}
              <div
                style={{
                  marginTop: "28px",
                  padding: "22px 24px",
                  background: "rgba(220, 53, 69, 0.04)",
                  border: "1px solid rgba(220, 53, 69, 0.25)",
                  borderRadius: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "16px",
                }}
              >
                <div style={{ maxWidth: "480px" }}>
                  <h3 style={{ margin: "0 0 4px", color: "#b02a37", fontSize: "16px", fontWeight: 700 }}>
                    Delete Account
                  </h3>
                  <p style={{ margin: 0, fontSize: "13px", color: "rgba(11, 43, 30, 0.75)", lineHeight: 1.45 }}>
                    Permanently delete your Leafly account. Your order history may be retained for business records, but your account will no longer remain active.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteConfirmText("");
                    setDeleteAccountError("");
                    setNeedsPasswordReauth(false);
                    setReauthPassword("");
                    setShowDeleteConfirm(true);
                  }}
                  style={{
                    background: "transparent",
                    border: "1.5px solid #dc3545",
                    color: "#dc3545",
                    padding: "10px 22px",
                    borderRadius: "8px",
                    fontWeight: 700,
                    fontSize: "12px",
                    letterSpacing: "1px",
                    cursor: "pointer",
                    transition: "all 180ms ease",
                    textTransform: "uppercase",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#dc3545";
                    e.currentTarget.style.color = "#ffffff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#dc3545";
                  }}
                >
                  DELETE ACCOUNT
                </button>
              </div>
            </section>
          )}

          {/* RECOMMENDATIONS */}
          <section className="profile-recommendations-card">
            <div className="profile-recommendations-image">
              <img src={image2} alt="Tea leaves and quiet morning ritual" loading="lazy" />
            </div>

            <div className="profile-recommendations-copy">
              <p className="profile-card-kicker">FOR YOU</p>
              <h2>Discover teas you&apos;ll love</h2>
              <p>
                Based on your preferences, we&apos;ll help you find teas that match your taste and mood.
              </p>
              <button type="button" className="profile-primary-button" onClick={handleExploreRecommendations}>
                EXPLORE RECOMMENDATIONS
              </button>
            </div>

            <div className="profile-recommendations-list">
              {dynamicRecommendations.map((item) => {
                return (
                  <article key={item.id} className="profile-recommendation-item">
                    <img src={item.image} alt={item.name} loading="lazy" />
                    <div className="profile-recommendation-meta">
                      <p>{item.name}</p>
                      <span>{item.category}</span>
                      <div className="profile-recommendation-row">
                        <strong>{item.price}</strong>
                        {item.oldPrice && (
                          <span
                            style={{
                              textDecoration: "line-through",
                              opacity: 0.55,
                              marginLeft: "6px",
                              fontSize: "0.85em",
                            }}
                          >
                            {item.oldPrice}
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          {/* PROMISES */}
          <section className="profile-promises" aria-label="Leafly promises">
            {promiseItems.map((promise) => (
              <article key={promise.title} className="profile-promise-item">
                <span className="profile-promise-icon">{promise.icon}</span>
                <div>
                  <h3>{promise.title}</h3>
                  <p>{promise.text}</p>
                </div>
              </article>
            ))}
          </section>
        </section>
      </div>

      {showLogoutConfirm &&
        createPortal(
          <div
            className="profile-logout-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Log out confirmation"
            onClick={handleCancelLogout}
          >
            <div
              className="profile-logout-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="profile-modal-close-btn"
                onClick={handleCancelLogout}
                aria-label="Close dialog"
              >
                ✕
              </button>
              <p className="profile-card-kicker">ACCOUNT SECURITY</p>
              <h3>Are you sure you want to log out?</h3>
              <p style={{ margin: 0, fontSize: "14px", color: "rgba(11,43,30,0.65)" }}>
                You can always log back in to review your tea journal, orders, and rewards.
              </p>
              <div className="profile-logout-actions">
                <button
                  type="button"
                  className="profile-secondary-button"
                  onClick={handleCancelLogout}
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  className="profile-primary-button"
                  onClick={handleLogout}
                >
                  LOG OUT
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {showDeleteConfirm &&
        createPortal(
          <div
            className="profile-logout-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Delete account confirmation"
            onClick={() => !isDeletingAccount && setShowDeleteConfirm(false)}
          >
            <div
              className="profile-delete-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="profile-modal-close-btn"
                onClick={() => !isDeletingAccount && setShowDeleteConfirm(false)}
                disabled={isDeletingAccount}
                aria-label="Close dialog"
              >
                ✕
              </button>
              <p className="profile-card-kicker" style={{ color: "#dc3545" }}>ACCOUNT TERMINATION</p>
              <h3>Delete your Leafly account?</h3>
              <p className="profile-delete-message">
                This action will permanently remove your Leafly account. Your order history may be retained for business records, but your account will no longer remain active.
              </p>
              <p className="profile-delete-prompt">
                To confirm, type <strong>DELETE MY LEAFLY ACCOUNT</strong> below.
              </p>
              <input
                type="text"
                className="profile-delete-input"
                placeholder="DELETE MY LEAFLY ACCOUNT"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                disabled={isDeletingAccount}
                autoFocus
                autoComplete="off"
                spellCheck="false"
              />

              {needsPasswordReauth && (
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#0b2b1e", marginBottom: "6px" }}>
                    Confirm your current password to continue:
                  </label>
                  <input
                    type="password"
                    className="profile-delete-input"
                    placeholder="Enter account password"
                    value={reauthPassword}
                    onChange={(e) => setReauthPassword(e.target.value)}
                    disabled={isDeletingAccount}
                    style={{ marginBottom: 0 }}
                  />
                </div>
              )}

              {deleteAccountError && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: "8px",
                    background: "rgba(220, 53, 69, 0.1)",
                    border: "1px solid rgba(220, 53, 69, 0.3)",
                    color: "#b02a37",
                    fontSize: "13px",
                    textAlign: "left",
                    lineHeight: 1.4,
                    marginBottom: "1rem",
                  }}
                >
                  {deleteAccountError}
                </div>
              )}

              <div className="profile-logout-actions" style={{ marginTop: "10px" }}>
                <button
                  type="button"
                  className="profile-secondary-button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeletingAccount}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="profile-primary-button profile-btn-destructive"
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== "DELETE MY LEAFLY ACCOUNT" || isDeletingAccount || (needsPasswordReauth && !reauthPassword.trim())}
                >
                  {isDeletingAccount ? "Deleting..." : "Delete Account"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      <button type="button" className="profile-back-to-top" onClick={handleBackToTop} aria-label="Back to top">
        ↑
      </button>

      <Footer />
    </main>
  );
}
