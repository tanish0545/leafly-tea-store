import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore";

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
