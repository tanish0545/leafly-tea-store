import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
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

async function run() {
  const cred = await signInWithEmailAndPassword(auth, "leafly_test_patron@gmail.com", "LeaflyPatron2026!");
  console.log("Authenticated as UID:", cred.user.uid);

  // 1. Test orders
  try {
    const orderRef = await addDoc(collection(db, "orders"), {
      userId: cred.user.uid,
      customerEmail: "leafly_test_patron@gmail.com",
      status: "Processing",
      total: 100,
      createdAt: new Date().toISOString(),
    });
    console.log("[AUTH WRITE ALLOWED] orders -> doc id:", orderRef.id);
  } catch (e) {
    console.log("[AUTH WRITE DENIED]  orders ->", e.code);
  }

  // 2. Test products
  try {
    const pRef = await addDoc(collection(db, "products"), {
      name: "Test",
      price: 100,
      createdAt: new Date().toISOString(),
    });
    console.log("[AUTH WRITE ALLOWED] products -> doc id:", pRef.id);
  } catch (e) {
    console.log("[AUTH WRITE DENIED]  products ->", e.code);
  }

  // 3. Test coupons
  try {
    const cRef = await addDoc(collection(db, "coupons"), {
      code: "TEST100",
      discountValue: 10,
    });
    console.log("[AUTH WRITE ALLOWED] coupons -> doc id:", cRef.id);
  } catch (e) {
    console.log("[AUTH WRITE DENIED]  coupons ->", e.code);
  }

  // 4. Test reviews
  try {
    const rRef = await addDoc(collection(db, "reviews"), {
      productId: "1",
      userId: cred.user.uid,
      rating: 5,
      customerName: "Patron",
      feedback: "Great tea",
      status: "Approved",
      createdAt: new Date().toISOString(),
    });
    console.log("[AUTH WRITE ALLOWED] reviews -> doc id:", rRef.id);
  } catch (e) {
    console.log("[AUTH WRITE DENIED]  reviews ->", e.code);
  }

  process.exit(0);
}

run();
