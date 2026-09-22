import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";

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

const testCollections = [
  "subscribers",
  "contact_messages",
  "gifting_requests",
  "orders",
  "products",
  "coupons",
  "reviews",
];

async function run() {
  for (const col of testCollections) {
    try {
      const ref = await addDoc(collection(db, col), {
        test: true,
        createdAt: new Date().toISOString(),
      });
      console.log(`[WRITE ALLOWED] ${col} -> doc id: ${ref.id}`);
    } catch (e) {
      console.log(`[WRITE DENIED]  ${col} -> ${e.code}`);
    }
  }
  process.exit(0);
}

run();
