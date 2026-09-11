import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, signInAnonymously } from "firebase/auth";

// Load environment variables from .env if present
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../.env");

if (fs.existsSync(envPath)) {
  if (typeof process.loadEnvFile === "function") {
    process.loadEnvFile(envPath);
  } else {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "leafly-database.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "leafly-database",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "leafly-database.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "342657266739",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:342657266739:web:4c32a53cd0339b9fd05f46",
};

if (!firebaseConfig.apiKey) {
  console.error("Error: Missing VITE_FIREBASE_API_KEY in environment or .env file.");
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function testAuthReview() {
  console.log("=== Testing Review Pipeline with Auth ===");
  // Try anonymous auth first or check auth methods
  try {
    const cred = await signInAnonymously(auth);
    console.log("Signed in anonymously as:", cred.user.uid);
    
    // Now try reading reviews
    try {
      const snap = await getDocs(collection(db, "reviews"));
      console.log("Auth read success! Reviews count:", snap.size);
    } catch (e) {
      console.log("Auth read failed:", e.code, e.message);
    }

    // Now try writing review
    try {
      const doc = await addDoc(collection(db, "reviews"), {
        productId: "1",
        rating: 5,
        feedback: "Auth test review",
        userId: cred.user.uid,
        status: "Approved",
        createdAt: new Date().toISOString(),
      });
      console.log("Auth write success! Doc id:", doc.id);
    } catch (e) {
      console.log("Auth write failed:", e.code, e.message);
    }
  } catch (err) {
    console.log("Anonymous auth failed:", err.code, err.message);
  }
}

testAuthReview();
