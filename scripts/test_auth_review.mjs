import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, signInAnonymously } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBP0byX7fmi8SoXATR1tiXozTUsXLzYKWw",
  authDomain: "leafly-database.firebaseapp.com",
  projectId: "leafly-database",
  storageBucket: "leafly-database.firebasestorage.app",
  messagingSenderId: "342657266739",
  appId: "1:342657266739:web:4c32a53cd0339b9fd05f46",
};

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
