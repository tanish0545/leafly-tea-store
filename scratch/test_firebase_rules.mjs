import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";

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
  console.log("--- 1. Testing Unauthenticated Operations ---");
  try {
    const snap = await getDocs(collection(db, "reviews"));
    console.log("Unauthenticated read 'reviews': SUCCESS, count =", snap.size);
  } catch (err) {
    console.log("Unauthenticated read 'reviews': FAILED -", err.code, err.message);
  }

  try {
    const docRef = await addDoc(collection(db, "reviews"), {
      productId: "1",
      productName: "Moonlight Spring Reserve",
      rating: 5,
      feedback: "Unauth test review",
      customerName: "Anonymous Tester",
      customerEmail: "tester@leaflytea.com",
      status: "Approved",
      createdAt: new Date().toISOString(),
    });
    console.log("Unauthenticated write 'reviews': SUCCESS, id =", docRef.id);
  } catch (err) {
    console.log("Unauthenticated write 'reviews': FAILED -", err.code, err.message);
  }

  console.log("\n--- 2. Testing Authenticated Operations (Customer) ---");
  const testEmail = "leafly_test_patron@gmail.com";
  const testPass = "LeaflyPatron2026!";
  let userCred = null;
  try {
    userCred = await signInWithEmailAndPassword(auth, testEmail, testPass);
    console.log("Signed in existing customer:", userCred.user.uid);
  } catch (e) {
    try {
      userCred = await createUserWithEmailAndPassword(auth, testEmail, testPass);
      console.log("Created & signed in new test customer:", userCred.user.uid);
    } catch (e2) {
      console.log("Could not sign in or create test customer:", e2.code, e2.message);
    }
  }

  if (userCred) {
    try {
      const snap = await getDocs(collection(db, "reviews"));
      console.log("Authenticated read 'reviews': SUCCESS, count =", snap.size);
      snap.docs.forEach((d) => {
        console.log(" - doc:", d.id, JSON.stringify(d.data()));
      });
    } catch (err) {
      console.log("Authenticated read 'reviews': FAILED -", err.code, err.message);
    }

    let createdDocId = null;
    try {
      const docRef = await addDoc(collection(db, "reviews"), {
        productId: "1",
        productName: "Moonlight Spring Reserve",
        rating: 5,
        feedback: "Customer test review with auth",
        customerName: "Test Patron",
        customerEmail: testEmail,
        userId: userCred.user.uid,
        status: "Approved",
        createdAt: new Date().toISOString(),
      });
      createdDocId = docRef.id;
      console.log("Authenticated write 'reviews': SUCCESS, id =", createdDocId);
    } catch (err) {
      console.log("Authenticated write 'reviews': FAILED -", err.code, err.message);
    }

    if (createdDocId) {
      try {
        await updateDoc(doc(db, "reviews", createdDocId), { status: "Hidden" });
        console.log("Authenticated update 'reviews': SUCCESS");
      } catch (err) {
        console.log("Authenticated update 'reviews': FAILED -", err.code, err.message);
      }

      try {
        await deleteDoc(doc(db, "reviews", createdDocId));
        console.log("Authenticated delete 'reviews': SUCCESS");
      } catch (err) {
        console.log("Authenticated delete 'reviews': FAILED -", err.code, err.message);
      }
    }
  }

  process.exit(0);
}

run().catch((e) => {
  console.error("Unhandled error:", e);
  process.exit(1);
});
