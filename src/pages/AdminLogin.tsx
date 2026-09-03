import React, { useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import SEO from "../components/SEO";
import "./AdminLogin.css";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || "leaflydatabase@gmail.com";

  // If already logged in and it's the admin, redirect to admin dashboard
  if (user && user.email === adminEmail) {
    return <Navigate to="/admin" replace />;
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    
    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("Password reset email sent. Check your inbox.");
      setIsForgotPassword(false);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegistering) {
        // Only allow registering the admin email
        if (email !== adminEmail) {
          setError("Unauthorized email. You are not an admin.");
          setLoading(false);
          return;
        }
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        if (adminEmail && userCredential.user.email !== adminEmail) {
          throw new Error("Unauthorized email address.");
        }
      }
      
      navigate("/admin");
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "An error occurred during authentication.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-container">
      <SEO
        title="Admin Login | Leafly"
        description="Leafly Administrative Portal Sign In."
        noindex={true}
      />
      <div className="admin-login-box">
        <h2>
          {isForgotPassword 
            ? "Reset Password" 
            : isRegistering 
              ? "Create Admin Account" 
              : "Admin Login"}
        </h2>
        {error && <div className="admin-error">{error}</div>}
        {message && <div className="admin-message">{message}</div>}
        
        {isForgotPassword ? (
          <form onSubmit={handleResetPassword} className="admin-login-form">
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <button type="submit" className="admin-login-btn" disabled={loading}>
              {loading ? "Please wait..." : "Send Reset Email"}
            </button>
            <div className="admin-login-footer">
              <button
                type="button"
                className="toggle-register-btn"
                onClick={() => {
                  setIsForgotPassword(false);
                  setError(null);
                  setMessage(null);
                }}
              >
                Back to Login
              </button>
            </div>
          </form>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="admin-login-form">
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="admin-login-btn" disabled={loading}>
                {loading ? "Please wait..." : isRegistering ? "Register" : "Login"}
              </button>
            </form>
            <div className="admin-login-footer">
              <button
                type="button"
                className="toggle-register-btn"
                onClick={() => setIsRegistering(!isRegistering)}
                style={{ marginBottom: !isRegistering ? '10px' : '0' }}
              >
                {isRegistering
                  ? "Already have an account? Login here."
                  : "Need an account? Register here."}
              </button>
              {!isRegistering && (
                <>
                  <br />
                  <button
                    type="button"
                    className="toggle-register-btn"
                    onClick={() => {
                      setIsForgotPassword(true);
                      setError(null);
                      setMessage(null);
                    }}
                  >
                    Forgot Password?
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

