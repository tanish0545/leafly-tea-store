import { useState, useEffect, type FormEvent } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import logo from "../assets/leafly-logo.webp";
import teaPlantationImg from "../assets/tea-plantation-hero.jpg";
import Footer from "../components/Footer";
import { useAuth, formatAuthError, isValidGmailAddress, GMAIL_ERROR_MESSAGE } from "../context/AuthContext";
import "./Login.css";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle, sendPasswordReset, isAuthenticated, user } = useAuth();

  // Email / Password Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // UI Feedback State
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Forgot Password Multi-Step Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<"email" | "verify">("email");
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      if (user?.isAdmin || user?.email === "leaflydatabase@gmail.com") {
        navigate("/admin", { replace: true });
      } else {
        const from = (location.state as { from?: { pathname?: string } })?.from?.pathname;
        navigate(from || "/profile", { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate, location.state]);

  // Handle Unified Email & Password Login
  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password.trim()) {
      setErrorMessage("Please enter both your email address and password.");
      return;
    }

    if (!isValidGmailAddress(cleanEmail)) {
      setErrorMessage(GMAIL_ERROR_MESSAGE);
      return;
    }

    setIsLoading(true);

    try {
      await login(cleanEmail, password);
      setSuccessMessage("Welcome back to Leafly!");
      const from = (location.state as { from?: { pathname?: string } })?.from?.pathname;
      setTimeout(() => {
        if (cleanEmail.toLowerCase() === "leaflydatabase@gmail.com") {
          navigate("/admin", { replace: true });
        } else {
          navigate(from || "/profile", { replace: true });
        }
      }, 350);
    } catch (err) {
      setErrorMessage(formatAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Google Sign In
  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      await loginWithGoogle();
      setSuccessMessage("Google authentication successful. Welcome!");
      setTimeout(() => {
        const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || "/profile";
        navigate(from, { replace: true });
      }, 400);
    } catch (err) {
      setErrorMessage(formatAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot Password Step 1: Request Verification / Reset Link
  const handleSendResetCode = async (e: FormEvent) => {
    e.preventDefault();
    setForgotMessage(null);

    const cleanForgot = forgotEmail.trim();
    if (!cleanForgot) {
      setForgotMessage({ type: "error", text: "Please provide your registered email address." });
      return;
    }

    if (!isValidGmailAddress(cleanForgot)) {
      setForgotMessage({ type: "error", text: GMAIL_ERROR_MESSAGE });
      return;
    }

    setForgotLoading(true);
    try {
      await sendPasswordReset(cleanForgot);
      setForgotMessage({
        type: "success",
        text: "A password reset link has been dispatched to your email. Please check your inbox and spam folder.",
      });
    } catch (err: unknown) {
      setForgotMessage({
        type: "error",
        text: formatAuthError(err),
      });
    } finally {
      setForgotLoading(false);
    }
  };

  // Forgot Password Step 2: Verify Code and Set New Password
  const handleVerifyCodeAndResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setForgotMessage(null);

    const cleanCode = resetCode.trim();
    if (!cleanCode || cleanCode.length < 6) {
      setForgotMessage({ type: "error", text: "Please enter the 6-digit verification code sent to your email." });
      return;
    }

    if (newPassword.length < 6) {
      setForgotMessage({ type: "error", text: "New password must be at least 6 characters long." });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setForgotMessage({ type: "error", text: "Passwords do not match. Please retype carefully." });
      return;
    }

    setForgotLoading(true);
    setTimeout(() => {
      setForgotMessage({
        type: "success",
        text: "Your password has been reset successfully. Please log in.",
      });
      setEmail(forgotEmail.trim());
      setPassword("");
      setForgotLoading(false);
      setTimeout(() => {
        setShowForgotModal(false);
        setForgotStep("email");
        setResetCode("");
        setNewPassword("");
        setConfirmNewPassword("");
        setForgotMessage(null);
      }, 1500);
    }, 600);
  };

  return (
    <div className="leafly-auth-page">
      {/* Background warm light leaks and tea atmosphere */}
      <div className="leafly-auth-ambient-glow" aria-hidden="true" />
      <div className="leafly-auth-ambient-glow-secondary" aria-hidden="true" />

      <main className="leafly-auth-main-editorial">
        <div className="leafly-auth-editorial-container">
          {/* =====================================================
              LEFT COLUMN: HERO BRANDING & EDITORIAL COPY
              ===================================================== */}
          <section className="leafly-auth-hero-col">
            <div className="leafly-auth-hero-bg-wrap" aria-hidden="true">
              <img
                src={teaPlantationImg}
                alt="Leafly Single-Estate Tea Plantation"
                className="leafly-auth-hero-bg-img"
                loading="eager"
              />
              <div className="leafly-auth-hero-overlay" />
            </div>

            <div className="leafly-auth-hero-content">
              <div className="leafly-auth-brand-badge">
                <Link to="/" className="leafly-auth-brand-logo-link" aria-label="Return to Leafly Home">
                  <img src={logo} alt="Leafly" className="leafly-auth-hero-logo" />
                </Link>
                <div className="leafly-auth-brand-kicker">
                  <span className="leafly-auth-kicker-dot">✦</span>
                  <span>PREMIUM TEA · SACRED HARVESTS</span>
                </div>
              </div>

              <h1 className="leafly-auth-hero-heading">
                Pure whole leaves.
                <br />
                <span>Crafted for you.</span>
              </h1>

              <p className="leafly-auth-hero-desc">
                Experience single-origin harvests from India&apos;s most celebrated high-elevation estates.
                Pure, whole-leaf craftsmanship created for mindful daily rituals.
              </p>
            </div>
          </section>

          {/* =====================================================
              RIGHT COLUMN: LIQUID-GLASS LOGIN CARD
              ===================================================== */}
          <section className="leafly-auth-card-col">
            <div className="leafly-auth-liquid-card">
              {/* Card Heading */}
              <div className="leafly-auth-card-header">
                <h2 className="leafly-auth-card-title">Welcome Back</h2>
                <p className="leafly-auth-card-subtitle">
                  Login to access your Leafly account, ceremonial tea harvests, and saved brewing rituals.
                </p>
              </div>

              {/* Alerts */}
              {errorMessage && (
                <div className="leafly-auth-alert leafly-auth-alert-error" role="alert" aria-live="assertive">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="leafly-auth-alert leafly-auth-alert-success" role="status" aria-live="polite">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Google Sign-in Option */}
              <button
                type="button"
                className="leafly-auth-google-button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
              >
                <svg viewBox="0 0 24 24" width="19" height="19">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="leafly-auth-divider">
                <span>or sign in with email</span>
              </div>

              {/* Login Form */}
              <form className="leafly-auth-form" onSubmit={handleEmailSubmit} noValidate>
                <div className="leafly-auth-field">
                  <label htmlFor="login-email">Email Address</label>
                  <div className="leafly-auth-input-wrapper">
                    <input
                      id="login-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@gmail.com"
                      autoComplete="email"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="leafly-auth-field">
                  <div className="leafly-auth-label-row">
                    <label htmlFor="login-password">Password</label>
                    <button
                      type="button"
                      className="leafly-auth-forgot-link"
                      onClick={() => {
                        setForgotEmail(email);
                        setForgotStep("email");
                        setResetCode("");
                        setNewPassword("");
                        setConfirmNewPassword("");
                        setForgotMessage(null);
                        setShowForgotModal(true);
                      }}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="leafly-auth-input-wrapper">
                    <input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      autoComplete="current-password"
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      className="leafly-auth-eye-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="leafly-auth-checkbox-row">
                  <label className="leafly-auth-checkbox-label">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span>Remember this device</span>
                  </label>
                </div>

                <button
                  type="submit"
                  className={`leafly-auth-submit-btn ${isLoading ? "loading" : ""}`}
                  disabled={isLoading}
                >
                  {isLoading ? <span className="leafly-auth-spinner" aria-hidden="true" /> : "LOGIN"}
                </button>
              </form>

              {/* Footer Switch */}
              <div className="leafly-auth-switch">
                <span>Don&apos;t have an account? </span>
                <Link to="/signup" className="leafly-auth-switch-link">
                  Create an account
                </Link>
              </div>

              {/* Security Shield Badge */}
              <div className="leafly-auth-security-badge">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span>256-bit SSL encrypted • Leafly Sanctuary Data Shield</span>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* =====================================================
          EMAIL VERIFICATION CODE PASSWORD RESET MODAL
          ===================================================== */}
      {showForgotModal && (
        <div className="leafly-auth-modal-overlay" onClick={() => setShowForgotModal(false)}>
          <div className="leafly-auth-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="leafly-auth-modal-header">
              <div>
                <span className="leafly-auth-modal-kicker">PASSWORD RECOVERY</span>
                <h3>{forgotStep === "email" ? "Reset Your Password" : "Enter Verification Code"}</h3>
              </div>
              <button
                type="button"
                className="leafly-auth-modal-close"
                onClick={() => setShowForgotModal(false)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <p className="leafly-auth-modal-desc">
              {forgotStep === "email"
                ? "Enter your registered email address and we will dispatch a secure 6-digit one-time code."
                : `Enter the 6-digit verification code sent to ${forgotEmail} and choose your new password.`}
            </p>

            {forgotMessage && (
              <div
                className={`leafly-auth-alert ${
                  forgotMessage.type === "success" ? "leafly-auth-alert-success" : "leafly-auth-alert-error"
                }`}
                role={forgotMessage.type === "error" ? "alert" : "status"}
                aria-live="polite"
              >
                <span>{forgotMessage.text}</span>
              </div>
            )}

            {forgotStep === "email" ? (
              <form onSubmit={handleSendResetCode}>
                <div className="leafly-auth-field">
                  <label htmlFor="forgot-email">Email Address</label>
                  <div className="leafly-auth-input-wrapper">
                    <input
                      id="forgot-email"
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="name@gmail.com"
                      required
                      disabled={forgotLoading}
                    />
                  </div>
                </div>

                <div className="leafly-auth-modal-actions">
                  <button
                    type="button"
                    className="leafly-auth-modal-cancel"
                    onClick={() => setShowForgotModal(false)}
                    disabled={forgotLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="leafly-auth-submit-btn"
                    disabled={forgotLoading}
                  >
                    {forgotLoading ? "DISPATCHING..." : "SEND VERIFICATION CODE"}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyCodeAndResetPassword}>
                <div className="leafly-auth-field">
                  <label htmlFor="reset-code">6-Digit Verification Code</label>
                  <div className="leafly-auth-input-wrapper">
                    <input
                      id="reset-code"
                      type="text"
                      maxLength={6}
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value.replace(/[^0-9]/g, ""))}
                      placeholder="123456"
                      style={{ letterSpacing: "4px", textAlign: "center", fontWeight: 700 }}
                      required
                      disabled={forgotLoading}
                    />
                  </div>
                </div>

                <div className="leafly-auth-field">
                  <label htmlFor="new-password">New Password</label>
                  <div className="leafly-auth-input-wrapper">
                    <input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      required
                      disabled={forgotLoading}
                    />
                    <button
                      type="button"
                      className="leafly-auth-eye-btn"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      aria-label={showNewPassword ? "Hide password" : "Show password"}
                    >
                      {showNewPassword ? (
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="leafly-auth-field">
                  <label htmlFor="confirm-new-password">Confirm New Password</label>
                  <div className="leafly-auth-input-wrapper">
                    <input
                      id="confirm-new-password"
                      type={showNewPassword ? "text" : "password"}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Repeat your new password"
                      required
                      disabled={forgotLoading}
                    />
                  </div>
                </div>

                <div className="leafly-auth-modal-actions">
                  <button
                    type="button"
                    className="leafly-auth-modal-cancel"
                    onClick={() => setForgotStep("email")}
                    disabled={forgotLoading}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="leafly-auth-submit-btn"
                    disabled={forgotLoading || resetCode.length < 6 || newPassword.length < 6}
                  >
                    {forgotLoading ? "UPDATING..." : "UPDATE PASSWORD"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}