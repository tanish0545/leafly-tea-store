import { useState, useEffect, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { verifyPasswordResetCode, confirmPasswordReset } from "firebase/auth";
import { auth } from "../lib/firebase";
import logo from "../assets/leafly-logo.webp";
import teaPlantationImg from "../assets/tea-plantation-hero.jpg";
import Footer from "../components/Footer";
import SEO from "../components/SEO";
import "./ResetPassword.css";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const oobCode = searchParams.get("oobCode") || searchParams.get("code") || "";

  const [verifying, setVerifying] = useState(Boolean(oobCode));
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(
    !oobCode ? "No reset code was provided. Please request a new password reset link from the login page." : null
  );

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Verify the reset code upon mount
  useEffect(() => {
    if (!oobCode) {
      return;
    }

    let isMounted = true;
    verifyPasswordResetCode(auth, oobCode)
      .then((email) => {
        if (isMounted) {
          setAccountEmail(email);
          setVerifying(false);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          console.error("verifyPasswordResetCode error:", err);
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes("expired") || msg.includes("invalid-action-code")) {
            setCodeError("This password reset link is invalid or has expired. Please request a new link.");
          } else {
            setCodeError("Unable to verify this password reset link. Please request a new link.");
          }
          setVerifying(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [oobCode]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newPassword || newPassword.length < 6) {
      setFormError("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setFormError("Passwords do not match. Please re-enter your password.");
      return;
    }

    setIsSubmitting(true);
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setIsSuccess(true);
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 3500);
    } catch (err: unknown) {
      console.error("confirmPasswordReset error:", err);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("weak-password")) {
        setFormError("Password is too weak. Please use at least 6 characters.");
      } else if (msg.includes("expired") || msg.includes("invalid-action-code")) {
        setFormError("This password reset link has expired. Please request a new reset email.");
      } else {
        setFormError("Failed to update password. Please try again or request a new link.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="leafly-auth-page reset-password-page">
      <SEO
        title="Reset Password | Leafly"
        description="Reset your Leafly account password."
        noindex={true}
      />
      <div className="leafly-auth-ambient-glow" aria-hidden="true" />

      <main className="leafly-auth-main-editorial">
        <div className="leafly-auth-editorial-container">
          {/* Left Column: Visual */}
          <section className="leafly-auth-hero-col">
            <div className="leafly-auth-hero-bg-wrap" aria-hidden="true">
              <img
                src={teaPlantationImg}
                alt="Leafly Tea Heritage"
                className="leafly-auth-hero-bg-img"
              />
              <div className="leafly-auth-hero-overlay" />
            </div>

            <div className="leafly-auth-hero-content">
              <Link to="/" className="leafly-auth-brand-lockup">
                <img src={logo} alt="Leafly" className="leafly-auth-brand-logo" />
                <span className="leafly-auth-brand-tag">Single-Origin Teas</span>
              </Link>

              <div className="leafly-auth-quote-wrap">
                <span className="leafly-auth-quote-leaf" aria-hidden="true">🍃</span>
                <blockquote className="leafly-auth-quote-text">
                  “Security and peace of mind in every ritual.”
                </blockquote>
              </div>
            </div>
          </section>

          {/* Right Column: Reset Form */}
          <section className="leafly-auth-form-col">
            <div className="leafly-auth-form-card">
              <div className="leafly-auth-card-header">
                <span className="leafly-auth-eyebrow">ACCOUNT RECOVERY</span>
                <h2 className="leafly-auth-heading">Create New Password</h2>
                <p className="leafly-auth-subtext">
                  {accountEmail
                    ? `Resetting password for ${accountEmail}`
                    : "Enter and confirm your new Leafly account password."}
                </p>
              </div>

              {verifying && (
                <div className="reset-loading-state" role="status">
                  <span className="reset-spinner" />
                  <p>Verifying your secure password reset link...</p>
                </div>
              )}

              {codeError && (
                <div className="leafly-auth-alert error" role="alert">
                  <p>{codeError}</p>
                  <div style={{ marginTop: "16px" }}>
                    <Link to="/login" className="reset-back-btn">
                      ← Return to Sign In
                    </Link>
                  </div>
                </div>
              )}

              {isSuccess && (
                <div className="leafly-auth-alert success" role="status">
                  <strong style={{ display: "block", marginBottom: "4px", fontSize: "16px" }}>✓ Password Updated Successfully</strong>
                  <p>Your password has been changed. Redirecting to login in a few seconds...</p>
                  <div style={{ marginTop: "16px" }}>
                    <Link to="/login" className="leafly-auth-submit-btn" style={{ textAlign: "center", display: "block" }}>
                      LOG IN NOW
                    </Link>
                  </div>
                </div>
              )}

              {!verifying && !codeError && !isSuccess && (
                <form onSubmit={handleSubmit} className="leafly-auth-form">
                  {formError && (
                    <div className="leafly-auth-alert error" role="alert">
                      {formError}
                    </div>
                  )}

                  {/* New Password */}
                  <div className="leafly-auth-field-group">
                    <label htmlFor="new-password">New Password</label>
                    <div className="leafly-auth-input-wrap">
                      <input
                        id="new-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="At least 6 characters"
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          if (formError) setFormError(null);
                        }}
                        disabled={isSubmitting}
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        className="leafly-auth-password-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>

                  {/* Confirm New Password */}
                  <div className="leafly-auth-field-group">
                    <label htmlFor="confirm-new-password">Confirm New Password</label>
                    <div className="leafly-auth-input-wrap">
                      <input
                        id="confirm-new-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Re-enter your new password"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (formError) setFormError(null);
                        }}
                        disabled={isSubmitting}
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="leafly-auth-submit-btn"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "UPDATING PASSWORD..." : "UPDATE PASSWORD"}
                  </button>

                  <div className="leafly-auth-footer-links" style={{ textAlign: "center", marginTop: "20px" }}>
                    <Link to="/login" className="leafly-auth-text-link">
                      ← Cancel and Back to Login
                    </Link>
                  </div>
                </form>
              )}
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
