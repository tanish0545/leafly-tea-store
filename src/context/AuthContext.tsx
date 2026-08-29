/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  type User as FirebaseUser,
  type UserCredential,
} from "firebase/auth";
import { auth, googleProvider, db } from "../lib/firebase";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import type { AuthUser, SignupProfileData } from "../types/contracts";

import { isValidGmailAddress, GMAIL_ERROR_MESSAGE } from "../lib/validation";

export type { AuthUser, SignupProfileData };
export { isValidGmailAddress, GMAIL_ERROR_MESSAGE };

export function formatAuthError(error: unknown): string {
  if (!error) return "An unexpected error occurred.";
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes(GMAIL_ERROR_MESSAGE)) {
    return GMAIL_ERROR_MESSAGE;
  }
  if (
    message.includes("user-not-found") ||
    message.includes("No account found") ||
    message.includes("auth/user-not-found") ||
    message.includes("auth/invalid-credential") ||
    message.includes("auth/wrong-password") ||
    message.includes("wrong-password") ||
    message.includes("INVALID_LOGIN_CREDENTIALS") ||
    message.includes("INVALID_PASSWORD") ||
    message.includes("EMAIL_NOT_FOUND")
  ) {
    return "Invalid email or password. Please check your credentials or create a new account.";
  }
  if (
    message.includes("already exists") ||
    message.includes("email-already-in-use") ||
    message.includes("auth/email-already-in-use") ||
    message.includes("EMAIL_EXISTS")
  ) {
    return "An account already exists with this email. Please log in.";
  }
  if (message.includes("weak-password") || message.includes("auth/weak-password") || message.includes("WEAK_PASSWORD")) {
    return "Password is too weak. Please use at least 6 characters.";
  }
  if (message.includes("invalid-email") || message.includes("auth/invalid-email") || message.includes("INVALID_EMAIL")) {
    return GMAIL_ERROR_MESSAGE;
  }
  if (message.includes("user-disabled") || message.includes("auth/user-disabled") || message.includes("USER_DISABLED")) {
    return "This account has been disabled. Please contact support.";
  }
  if (message.includes("too-many-requests") || message.includes("auth/too-many-requests") || message.includes("TOO_MANY_ATTEMPTS_TRY_LATER")) {
    return "Access to this account has been temporarily disabled due to many failed login attempts. Please reset your password or try again later.";
  }
  if (message.includes("network-request-failed") || message.includes("auth/network-request-failed")) {
    return "Network connection error. Please check your internet connection.";
  }
  if (message.includes("popup-closed-by-user") || message.includes("auth/popup-closed-by-user")) {
    return "Sign in popup was closed before completing.";
  }
  return message;
}

export type AuthContextType = {
  user: AuthUser | null;
  currentUser: AuthUser | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string, profileData?: SignupProfileData | string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, profileData?: SignupProfileData | string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  updateUserProfile?: (updates: Partial<AuthUser> & Record<string, unknown>) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || "leaflydatabase@gmail.com";

function mapFirebaseUserToAuthUser(
  fbUser: FirebaseUser | null,
  firestoreData?: Partial<AuthUser> | Record<string, unknown> | null
): AuthUser | null {
  if (!fbUser) return null;
  const isUserAdmin = fbUser.email?.toLowerCase() === adminEmail.toLowerCase();
  const rawDoc = firestoreData as Record<string, unknown> | null | undefined;
  const displayName =
    (rawDoc?.fullName as string) ||
    (rawDoc?.displayName as string) ||
    (rawDoc?.name as string) ||
    fbUser.displayName ||
    fbUser.email?.split("@")[0] ||
    "User";

  const resolvedPhone =
    (rawDoc?.phone as string) ||
    (rawDoc?.phoneNumber as string) ||
    (rawDoc?.mobile as string) ||
    (rawDoc?.mobileNumber as string) ||
    fbUser.phoneNumber ||
    null;

  const resolvedPhotoURL =
    (rawDoc?.photoURL as string) ||
    (rawDoc?.profileImageUrl as string) ||
    (rawDoc?.profileImage as string) ||
    fbUser.photoURL ||
    fbUser.providerData?.find((p) => p.photoURL)?.photoURL ||
    null;

  return {
    uid: fbUser.uid,
    email: fbUser.email,
    name: displayName,
    fullName: displayName,
    displayName: displayName,
    favoriteTea: (rawDoc?.favoriteTea as string) || null,
    phone: resolvedPhone,
    phoneNumber: resolvedPhone,
    dob: (rawDoc?.dob as string) || (rawDoc?.dateOfBirth as string) || null,
    dateOfBirth: (rawDoc?.dateOfBirth as string) || (rawDoc?.dob as string) || null,
    gender: (rawDoc?.gender as string) || null,
    preferences: (rawDoc?.preferences as AuthUser["preferences"]) || null,
    photoURL: resolvedPhotoURL,
    profileImage: resolvedPhotoURL,
    profileImageUrl: resolvedPhotoURL,
    authProvider: (rawDoc?.authProvider as string) || (fbUser.providerData[0]?.providerId === "google.com" ? "Google" : "Email/Password"),
    status: (rawDoc?.status as string) || "Active",
    isAdmin: isUserAdmin,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Process redirect result if customer was redirected from Google Auth
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          const currentFbUser = result.user;
          const displayName = currentFbUser.displayName || currentFbUser.email?.split("@")[0] || "Customer";
          const googleProfile: Record<string, unknown> = {
            uid: currentFbUser.uid,
            email: currentFbUser.email,
            displayName,
            fullName: displayName,
            name: displayName,
            photoURL: currentFbUser.photoURL || currentFbUser.providerData?.find((p) => p.photoURL)?.photoURL || null,
            authProvider: "Google",
            status: "Active",
            updatedAt: new Date().toISOString(),
          };
          await setDoc(doc(db, "users", currentFbUser.uid), googleProfile, { merge: true }).catch((e) => {
            console.warn("Redirect Google profile save notice:", e);
          });
          setFirebaseUser(currentFbUser);
        }
      })
      .catch((err) => {
        console.error("Redirect auth error:", err);
      });

    let unsubscribeDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentFbUser) => {
      setFirebaseUser(currentFbUser);

      if (unsubscribeDoc) {
        unsubscribeDoc();
        unsubscribeDoc = null;
      }

      if (currentFbUser) {
        unsubscribeDoc = onSnapshot(
          doc(db, "users", currentFbUser.uid),
          (docSnap) => {
            if (docSnap.exists()) {
              const firestoreData = docSnap.data();
              const activePhoto = currentFbUser.photoURL || currentFbUser.providerData?.find((p) => p.photoURL)?.photoURL;
              if (activePhoto && !firestoreData.photoURL) {
                setDoc(doc(db, "users", currentFbUser.uid), { photoURL: activePhoto }, { merge: true }).catch(() => {});
              }
              setUser(mapFirebaseUserToAuthUser(currentFbUser, firestoreData));
            } else {
              // Create initial profile record only if not present
              const providerId = currentFbUser.providerData[0]?.providerId === "google.com" ? "Google" : "Email/Password";
              const initProfile: Record<string, unknown> = {
                uid: currentFbUser.uid,
                email: currentFbUser.email,
                displayName: currentFbUser.displayName || currentFbUser.email?.split("@")[0] || "Customer",
                fullName: currentFbUser.displayName || currentFbUser.email?.split("@")[0] || "Customer",
                name: currentFbUser.displayName || currentFbUser.email?.split("@")[0] || "Customer",
                photoURL: currentFbUser.photoURL || currentFbUser.providerData?.find((p) => p.photoURL)?.photoURL || null,
                authProvider: providerId,
                status: "Active",
                createdAt: currentFbUser.metadata?.creationTime ? new Date(currentFbUser.metadata.creationTime).toISOString() : new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              if (currentFbUser.phoneNumber) {
                initProfile.phone = currentFbUser.phoneNumber;
                initProfile.phoneNumber = currentFbUser.phoneNumber;
              }
              setDoc(doc(db, "users", currentFbUser.uid), initProfile, { merge: true }).catch((e) => {
                console.warn("Initial user doc creation notice:", e);
              });
              setUser(mapFirebaseUserToAuthUser(currentFbUser, initProfile));
            }
            setLoading(false);
          },
          (error) => {
            console.error("Error listening to user document:", error);
            setUser(mapFirebaseUserToAuthUser(currentFbUser));
            setLoading(false);
          }
        );
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) {
        unsubscribeDoc();
      }
    };
  }, []);

  const login = async (email: string, pass: string) => {
    const cleanEmail = email.trim();
    if (!isValidGmailAddress(cleanEmail)) {
      throw new Error(GMAIL_ERROR_MESSAGE);
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, cleanEmail, pass);
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email: string, pass: string, profileData?: SignupProfileData | string) => {
    const cleanEmail = email.trim();
    if (!isValidGmailAddress(cleanEmail)) {
      throw new Error(GMAIL_ERROR_MESSAGE);
    }
    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
      const rawName = typeof profileData === "string" ? profileData : profileData?.name || profileData?.fullName;
      const displayName = rawName?.trim() || cleanEmail.split("@")[0];
      const favoriteTea = typeof profileData === "object" ? profileData.favoriteTea : undefined;

      if (result.user && displayName) {
        await updateProfile(result.user, { displayName });
      }

      const initialProfile: Record<string, unknown> = {
        uid: result.user.uid,
        email: result.user.email,
        displayName,
        fullName: displayName,
        name: displayName,
        favoriteTea: favoriteTea || null,
        authProvider: "Email/Password",
        status: "Active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      try {
        await setDoc(doc(db, "users", result.user.uid), initialProfile, { merge: true });
      } catch (e) {
        console.error("Error creating users/{uid} record:", e);
      }

      setFirebaseUser(result.user);
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      let userCred: UserCredential | null = null;
      try {
        userCred = await signInWithPopup(auth, googleProvider);
      } catch (popupError: unknown) {
        const msg = popupError instanceof Error ? popupError.message : String(popupError);
        if (msg.includes("popup-blocked") || msg.includes("auth/popup-blocked")) {
          await signInWithRedirect(auth, googleProvider);
          return;
        } else {
          throw popupError;
        }
      }

      if (userCred?.user) {
        const currentFbUser = userCred.user;
        const displayName = currentFbUser.displayName || currentFbUser.email?.split("@")[0] || "Customer";
        const googleProfile: Record<string, unknown> = {
          uid: currentFbUser.uid,
          email: currentFbUser.email,
          displayName,
          fullName: displayName,
          name: displayName,
          photoURL: currentFbUser.photoURL || null,
          authProvider: "Google",
          status: "Active",
          updatedAt: new Date().toISOString(),
        };
        await setDoc(doc(db, "users", currentFbUser.uid), googleProfile, { merge: true }).catch((e) => {
          console.warn("Google profile save notice:", e);
        });
        setFirebaseUser(currentFbUser);
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      setFirebaseUser(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const sendPasswordReset = async (email: string) => {
    const cleanEmail = email.trim();
    if (!isValidGmailAddress(cleanEmail)) {
      throw new Error(GMAIL_ERROR_MESSAGE);
    }
    await sendPasswordResetEmail(auth, cleanEmail);
  };

  const updateUserProfile = async (updates: Partial<AuthUser> & Record<string, unknown>) => {
    const targetUid = auth.currentUser?.uid || user?.uid;
    if (!targetUid) {
      throw new Error("No authenticated user found.");
    }

    if (auth.currentUser) {
      if (updates.displayName || updates.fullName || updates.name || updates.photoURL) {
        try {
          await updateProfile(auth.currentUser, {
            displayName: (updates.displayName as string) || (updates.fullName as string) || (updates.name as string) || undefined,
            photoURL: (updates.photoURL as string) || undefined,
          });
        } catch (e) {
          console.warn("Auth updateProfile warning:", e);
        }
      }
    }

    const firestoreData: Record<string, unknown> = {};
    Object.entries(updates).forEach(([key, val]) => {
      if (val !== undefined) {
        firestoreData[key] = val;
      }
    });

    if (updates.phone !== undefined || updates.phoneNumber !== undefined || updates.mobile !== undefined) {
      const phoneVal = updates.phone ?? updates.phoneNumber ?? updates.mobile ?? null;
      firestoreData.phone = phoneVal;
      firestoreData.phoneNumber = phoneVal;
      firestoreData.mobile = phoneVal;
    }

    firestoreData.updatedAt = new Date().toISOString();

    await setDoc(doc(db, "users", targetUid), firestoreData, { merge: true });
    setUser((prev) => (prev ? { ...prev, ...updates } : null));
  };


  const value: AuthContextType = {
    user,
    currentUser: user,
    firebaseUser,
    loading,
    isAuthenticated: Boolean(user),
    isAdmin: Boolean(user?.isAdmin),
    login,
    signup,
    loginWithGoogle,
    logout,
    signOut: logout,
    sendPasswordReset,
    signInWithEmail: login,
    signUpWithEmail: signup,
    signInWithGoogle: loginWithGoogle,
    updateUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
