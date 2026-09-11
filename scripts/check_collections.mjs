import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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

const collections = [
  "products",
  "teaware",
  "hampers",
  "coupons",
  "orders",
  "users",
  "reviews",
  "subscribers",
  "system"
];

async function checkAll() {
  for (const colName of collections) {
    try {
      const snap = await getDocs(collection(db, colName));
      console.log(`[ALLOWED] Collection '${colName}': ${snap.size} docs`);
    } catch (e) {
      console.log(`[DENIED] Collection '${colName}': ${e.code} (${e.message})`);
    }
  }
}

checkAll();
