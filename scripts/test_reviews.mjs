import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore";

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

async function testReviewPipeline() {
  console.log("=== Testing Review Pipeline ===");
  
  // 1. Try reading reviews
  try {
    const snap = await getDocs(collection(db, "reviews"));
    console.log("SUCCESS read reviews. Count:", snap.size);
    snap.docs.forEach((d) => {
      console.log("Review doc ID:", d.id, "Data:", JSON.stringify(d.data()));
    });
  } catch (err) {
    console.error("FAILED reading reviews:", err.code, err.message);
  }

  // 2. Try writing a test review
  try {
    const docRef = await addDoc(collection(db, "reviews"), {
      productId: "1",
      productName: "Natural Green Tea",
      rating: 5,
      feedback: "Automated test review verifying Firestore write pipeline.",
      customerName: "Patron Test",
      customerEmail: "patron.test@leafly.com",
      userId: "test-uid-123",
      status: "Approved",
      createdAt: new Date().toISOString(),
      timestamp: serverTimestamp(),
    });
    console.log("SUCCESS written review with ID:", docRef.id);
  } catch (err) {
    console.error("FAILED writing review:", err.code, err.message);
  }
}

testReviewPipeline();
