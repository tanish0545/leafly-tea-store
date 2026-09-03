import { useState, useEffect, type FormEvent } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import logo from "../assets/leafly-logo.webp";
import teapotImg from "../assets/glass-infuser-teapot.webp";
import Footer from "../components/Footer";
import SEO from "../components/SEO";
import { useAuth, formatAuthError, isValidGmailAddress, GMAIL_ERROR_MESSAGE } from "../context/AuthContext";
import "./Signup.css";

const TEA_OPTIONS = [
  "Green Tea",
  "White Tea",
  "Black Tea",
  "Oolong Tea",
  "Herbal / Botanical",
];

export default function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signup, loginWithGoogle, isAuthenticated } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [favoriteTea, setFavoriteTea] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // If already authenticated, redirect to profile or intended location
  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || "/profile";
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location.state]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedName = fullName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setErrorMessage("Please enter your full name (at least 2 characters).");
      return;
    }

    if (/^(abc|123|test|xyz|asdf|qwerty|none|null|admin)$/i.test(trimmedName)) {
      setErrorMessage("Please enter a valid, legitimate name.");
      return;
    }

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage("Please enter your email address.");
      return;
    }

    if (!isValidGmailAddress(cleanEmail)) {
      setErrorMessage(GMAIL_ERROR_MESSAGE);
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must contain at least 6 characters.");
      return;
    }

    if (!favoriteTea.trim()) {
      setErrorMessage("Please select your favorite tea for your sanctuary security question.");
      return;
    }

    setIsLoading(true);

    try {
      await signup(cleanEmail, password, {
        name: trimmedName,
        fullName: trimmedName,
        favoriteTea: favoriteTea.trim(),
      });
      setSuccessMessage("Your Leafly sanctuary account has been created! Preparing your profile...");
      const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || "/profile";
      setTimeout(() => {
        navigate(from, { replace: true });
      }, 400);
    } catch (err) {
      setErrorMessage(formatAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      await loginWithGoogle();
      setSuccessMessage("Google registration successful. Welcome to Leafly!");
      const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || "/profile";
      setTimeout(() => {
        navigate(from, { replace: true });
      }, 400);
    } catch (err) {
      setErrorMessage(formatAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="leafly-auth-page">
      <SEO
        title="Create an Account | Leafly"
        description="Join Leafly to unlock member rewards, order tracking, and bespoke tea rituals."
        noindex={true}
      />
      {/* Background warm light leaks and tea atmosphere */}
      <div className="leafly-auth-ambient-glow" aria-hidden="true" />
      <div className="leafly-auth-ambient-glow-secondary" aria-hidden="true" />

      <main className="leafly-auth-main-editorial">
        <div className="leafly-auth-editorial-container">
          {/* =====================================================
              LEFT COLUMN: HERO BRANDING & EDITORIAL COPY
              ===================================================== */}
          <section className="leafly-auth-hero-col">
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

            <div className="leafly-auth-teapot-showcase">
              <div className="leafly-auth-teapot-halo" />
              <img
                src={teapotImg}
                alt="Leafly Artisan Glass Teapot"
                className="leafly-auth-teapot-img"
              />
              <div className="leafly-auth-teapot-caption">
                <strong>100% Single-Estate Harvests</strong>
                <span>Darjeeling · Assam · Nilgiri · Kangra</span>
              </div>
            </div>
          </section>

          {/* =====================================================
              RIGHT COLUMN: LIQUID-GLASS SIGNUP CARD
              ===================================================== */}
          <section className="leafly-auth-card-col">
            <div className="leafly-auth-liquid-card">
              {/* Card Heading */}
              <div className="leafly-auth-card-header">
                <span className="leafly-auth-card-eyebrow">SANCTUARY ACCESS</span>
                <h2 className="leafly-auth-card-title">Begin Your Ritual</h2>
                <p className="leafly-auth-card-subtitle">
                  Create an account to discover limited micro-lot harvests, customized brewing guides, and welcome rewards.
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

              {/* Google Sign-up Option */}
              <button
                type="button"
                className="leafly-auth-google-button"
                onClick={handleGoogleSignUp}
                disabled={isLoading}
              >
                <svg viewBox="0 0 24 24" width="19" height="19">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Sign up with Google</span>
              </button>

              <div className="leafly-auth-divider">
                <span>or create with email</span>
              </div>

              {/* Registration Form */}
              <form className="leafly-auth-form" onSubmit={handleSubmit} noValidate>
                <div className="leafly-auth-field">
                  <label htmlFor="signup-name">Full Name</label>
                  <div className="leafly-auth-input-wrapper">
                    <input
                      id="signup-name"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your full name"
                      autoComplete="name"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="leafly-auth-field">
                  <label htmlFor="signup-email">Email Address</label>
                  <div className="leafly-auth-input-wrapper">
                    <input
                      id="signup-email"
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
                  <label htmlFor="signup-password">Password</label>
                  <div className="leafly-auth-input-wrapper">
                    <input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      autoComplete="new-password"
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

                <div className="leafly-auth-field">
                  <label htmlFor="signup-security-tea">Security Question</label>
                  <div className="leafly-auth-input-wrapper">
                    <select
                      id="signup-security-tea"
                      className="leafly-auth-select"
                      value={favoriteTea}
                      onChange={(e) => setFavoriteTea(e.target.value)}
                      disabled={isLoading}
                      required
                    >
                      <option value="" disabled>
                        Select your favorite tea
                      </option>
                      {TEA_OPTIONS.map((tea) => (
                        <option key={tea} value={tea}>
                          {tea}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className={`leafly-auth-submit-btn ${isLoading ? "loading" : ""}`}
                  disabled={isLoading}
                >
                  {isLoading ? <span className="leafly-auth-spinner" aria-hidden="true" /> : "CREATE ACCOUNT"}
                </button>
              </form>

              {/* Footer Switch */}
              <div className="leafly-auth-switch">
                <span>Already have an account? </span>
                <Link to="/login" className="leafly-auth-switch-link">
                  Log in
                </Link>
              </div>

              {/* Security Shield Badge */}
              <div className="leafly-auth-security-badge">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span>256-bit SSL encrypted · Leafly Sanctuary Data Shield</span>
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}