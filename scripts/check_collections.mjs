import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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
