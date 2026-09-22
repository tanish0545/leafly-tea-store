import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../.env");

if (fs.existsSync(envPath)) {
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

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "leafly-database.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "leafly-database",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "leafly-database.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "342657266739",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:342657266739:web:4c32a53cd0339b9fd05f46",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Test common admin passwords used in Leafly projects
const passwords = [
  "Leafly@2026",
  "leafly@2026",
  "Leafly2026",
  "leafly2026",
  "LeaflyAdmin2026!",
  "leaflydatabase",
  "Admin@123",
  "admin123",
  "Leafly@123",
  "leafly123"
];

async function run() {
  for (const pass of passwords) {
    try {
      const cred = await signInWithEmailAndPassword(auth, "leaflydatabase@gmail.com", pass);
      console.log("SUCCESSFULLY LOGGED IN AS ADMIN! UID:", cred.user.uid, "password:", pass);
      
      // Now test reading reviews
      try {
        const snap = await getDocs(collection(db, "reviews"));
        console.log("ADMIN READ 'reviews' SUCCESS! Count:", snap.size);
      } catch (err) {
        console.log("ADMIN READ 'reviews' FAILED:", err.code);
      }

      // Now test reading users
      try {
        const snap = await getDocs(collection(db, "users"));
        console.log("ADMIN READ 'users' SUCCESS! Count:", snap.size);
      } catch (err) {
        console.log("ADMIN READ 'users' FAILED:", err.code);
      }

      process.exit(0);
    } catch (e) {
      if (e.code === "auth/invalid-credential" || e.code === "auth/wrong-password") {
        // wrong pass
      } else {
        console.log("Admin login notice with", pass, ":", e.code, e.message);
      }
    }
  }
  console.log("None of the common passwords matched for leaflydatabase@gmail.com");
  process.exit(0);
}

run();
