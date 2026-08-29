/* eslint-disable react-hooks/set-state-in-effect */
import { useMemo, useState, useEffect, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useOrderContext } from "../context/OrderContext";
import { useAuth, isValidGmailAddress, GMAIL_ERROR_MESSAGE } from "../context/AuthContext";
import { validatePhoneNumber } from "../lib/validation";
import mainImage from "../assets/main.webp";
import image2 from "../assets/image2.webp";
import image3 from "../assets/image3.webp";
import image5 from "../assets/image5.webp";
import Footer from "../components/Footer";
import PhoneInput from "../components/PhoneInput";
import "./Profile.css";

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

type RecommendationItem = {
  id: number;
  name: string;
  category: string;
  price: string;
  image: string;
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
    label: "Security",
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

const recommendationItems: RecommendationItem[] = [
  {
    id: 1,
    name: "Himalayan Green Tea",
    category: "Green Tea",
    price: "₹699",
    image: image2,
  },
  {
    id: 2,
    name: "Silver Tips White Tea",
    category: "White Tea",
    price: "₹899",
    image: image3,
  },
  {
    id: 3,
    name: "Artisan Oolong",
    category: "Oolong",
    price: "₹999",
    image: image5,
  },
];

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

export default function Profile() {
  const navigate = useNavigate();
  const { user, loading, isAuthenticated, logout, updateUserProfile } = useAuth();
  const { orders } = useOrderContext();

  // Protected route enforcement
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/login", { replace: true, state: { from: { pathname: "/profile" } } });
    }
  }, [loading, isAuthenticated, navigate]);

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
          label: "Security",
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
      setNotice("Account authentication & session security overview.");
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
      const phoneRes = validatePhoneNumber(cleanPhone, cleanPhone.startsWith("+1") ? "US" : cleanPhone.startsWith("+44") ? "GB" : "India");
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

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch {
      navigate("/login", { replace: true });
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
    return null;
  }

  return (
    <main className="profile-page">
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
            onClick={() => setShowLogoutConfirm(true)}
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
              </div>

              <div className="profile-coming-soon-card">
                <span className="profile-coming-soon-icon" aria-hidden="true">✦</span>
                <span className="profile-coming-soon-badge">COMING SOON</span>
                <h3>Exclusive Member Privileges</h3>
                <p>
                  Our bespoke tea reward and harvest voucher experience is currently being crafted.
                  Soon, you’ll unlock ceremonial benefits, birthday gifts, and tiered single-estate privileges with every order.
                </p>
                <div className="profile-coming-soon-perks">
                  <span>✦ First Harvest Access</span>
                  <span>✦ Seasonal Vouchers</span>
                  <span>✦ Sommelier Tastings</span>
                </div>
              </div>
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

          {/* VIEW: SECURITY */}
          {selectedSidebar === "security" && (
            <section className="profile-card profile-security-view">
              <div className="profile-card-header">
                <div>
                  <p className="profile-card-kicker">AUTHENTICATION & PRIVACY</p>
                  <h2>ACCOUNT SECURITY</h2>
                </div>
                <span className="profile-security-badge">FIREBASE AUTH</span>
              </div>
              <p className="profile-subtitle">
                Your account is protected by Firebase Authentication. All data is securely stored in Firestore.
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
              {recommendationItems.map((item) => {
                return (
                  <article key={item.id} className="profile-recommendation-item">
                    <img src={item.image} alt={item.name} loading="lazy" />
                    <div className="profile-recommendation-meta">
                      <p>{item.name}</p>
                      <span>{item.category}</span>
                      <div className="profile-recommendation-row">
                        <strong>{item.price}</strong>
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

      {showLogoutConfirm && (
        <div className="profile-logout-overlay" role="dialog" aria-modal="true" aria-label="Log out confirmation">
          <div className="profile-logout-modal">
            <p className="profile-card-kicker">ACCOUNT</p>
            <h3>Are you sure you want to log out?</h3>
            <div className="profile-logout-actions">
              <button type="button" className="profile-secondary-button" onClick={() => setShowLogoutConfirm(false)}>
                CANCEL
              </button>
              <button type="button" className="profile-primary-button" onClick={handleLogout}>
                LOG OUT
              </button>
            </div>
          </div>
        </div>
      )}

      <button type="button" className="profile-back-to-top" onClick={handleBackToTop} aria-label="Back to top">
        ↑
      </button>

      <Footer />
    </main>
  );
}
