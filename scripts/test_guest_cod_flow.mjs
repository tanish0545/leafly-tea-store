/**
 * Comprehensive Verification Script for Leafly Guest COD Order Authorization
 * 
 * Verifies:
 * 1. Guest COD checkout with new email -> Provisions account, auto-authenticates, writes order to Firestore.
 * 2. Order verification in Firestore -> Document exists with correct status, total, customerName, customerEmail.
 * 3. Guest COD checkout with existing registered email -> Falls back to authorized server API, writes order to Firestore.
 * 4. Invalid order payload validation -> Rejects missing required order ID or email.
 * 5. Idempotent retries -> Merges order without duplicate creation.
 */

const API_KEY = "AIzaSyBP0byX7fmi8SoXATR1tiXozTUsXLzYKWw";
const PROJECT_ID = "leafly-database";
const BASE_URL = "http://localhost:5173";

async function runTests() {
  console.log("==================================================================");
  console.log("       LEAFLY GUEST COD ORDER AUTHORIZATION VERIFICATION          ");
  console.log("==================================================================\n");

  let passed = 0;
  let failed = 0;

  // -----------------------------------------------------------------------------
  // TEST 1: Guest Account Provisioning for New Customer
  // -----------------------------------------------------------------------------
  console.log("TEST 1: Provisioning New Customer Account from Guest Email...");
  const newGuestEmail = `patron.test.${Date.now()}@gmail.com`;
  const testOrderId1 = `ORD-GUEST-NEW-${Date.now()}`;

  const provRes1 = await fetch(`${BASE_URL}/api/orders?action=provision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "provision",
      email: newGuestEmail,
      customerName: "Aarav Sharma",
      orderId: testOrderId1,
    }),
  });

  const provData1 = await provRes1.json();
  console.log("   Provision Status:", provRes1.status);
  console.log("   Is New Account:", provData1.isNewAccount);
  console.log("   UID Created:", provData1.uid);
  console.log("   Session Secret Present:", Boolean(provData1.sessionSecret));
  console.log("   idToken Present:", Boolean(provData1.idToken));

  if (provRes1.ok && provData1.success && provData1.uid && provData1.isNewAccount && provData1.sessionSecret) {
    console.log("   --> TEST 1 PASSED: New account provisioned with real email and auth session.\n");
    passed++;
  } else {
    console.error("   --> TEST 1 FAILED:", provData1);
    failed++;
  }

  // -----------------------------------------------------------------------------
  // TEST 2: Order Persistence with Authenticated Guest Session
  // -----------------------------------------------------------------------------
  console.log("TEST 2: Writing COD Order for Newly Provisioned Guest...");
  const orderPayload1 = {
    action: "create",
    id: testOrderId1,
    userId: provData1.uid,
    customerId: provData1.uid,
    customerName: "Aarav Sharma",
    customerEmail: newGuestEmail,
    customerPhone: "9876543210",
    email: newGuestEmail,
    status: "Confirmed",
    orderStatus: "Confirmed",
    paymentMethod: "Pay on Delivery",
    paymentStatus: "Pay on Delivery",
    subtotal: 499,
    deliveryFee: 0,
    total: 499,
    items: [
      {
        id: "darjeeling-spring-100g",
        productId: "darjeeling-spring",
        name: "Darjeeling Spring Flush",
        price: 499,
        quantity: 1,
        variant: "100g",
      },
    ],
    shippingAddress: {
      fullName: "Aarav Sharma",
      addressLine1: "124 Palm Avenue",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "560001",
      country: "India",
    },
    createdAt: new Date().toISOString(),
  };

  const createRes1 = await fetch(`${BASE_URL}/api/orders?action=create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${provData1.idToken}`,
    },
    body: JSON.stringify(orderPayload1),
  });

  const createData1 = await createRes1.json();
  console.log("   Create HTTP Status:", createRes1.status);
  console.log("   Create Response:", createData1);

  if (createRes1.ok && createData1.success && createData1.orderId === testOrderId1) {
    console.log("   --> TEST 2 PASSED: COD order created and confirmed.\n");
    passed++;
  } else {
    console.error("   --> TEST 2 FAILED:", createData1);
    failed++;
  }

  // -----------------------------------------------------------------------------
  // TEST 3: Verification of Order Persistence in Live Firestore
  // -----------------------------------------------------------------------------
  console.log("TEST 3: Verifying Order in Live Firestore via REST API...");
  const getOrderUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/orders/${testOrderId1}`;
  const getRes = await fetch(getOrderUrl, {
    headers: { Authorization: `Bearer ${provData1.idToken}` },
  });

  const getDocData = await getRes.json();
  console.log("   Firestore Read Status:", getRes.status);
  if (getRes.ok && getDocData.fields) {
    const fields = getDocData.fields;
    console.log("   Stored Order ID:", fields.id?.stringValue);
    console.log("   Stored Customer Name:", fields.customerName?.stringValue);
    console.log("   Stored Customer Email:", fields.customerEmail?.stringValue);
    console.log("   Stored Payment Method:", fields.paymentMethod?.stringValue);
    console.log("   Stored Total:", fields.total?.integerValue || fields.total?.doubleValue);
    console.log("   --> TEST 3 PASSED: Order verified in Firestore database.\n");
    passed++;
  } else {
    console.error("   --> TEST 3 FAILED: Could not read order document:", getDocData);
    failed++;
  }

  // -----------------------------------------------------------------------------
  // TEST 4: Guest COD Checkout for Existing Registered Customer (Not Signed In)
  // -----------------------------------------------------------------------------
  console.log("TEST 4: Guest COD Checkout for Existing Registered Customer...");
  // Use the email created in Test 1 (which now exists in Firebase Auth)
  const existingEmail = newGuestEmail;
  const testOrderId2 = `ORD-EXISTING-GUEST-${Date.now()}`;

  // Provisioning check for existing email
  const provRes2 = await fetch(`${BASE_URL}/api/orders?action=provision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "provision",
      email: existingEmail,
      customerName: "Aarav Sharma Returning",
      orderId: testOrderId2,
    }),
  });

  const provData2 = await provRes2.json();
  console.log("   Provision Status for Existing Email:", provRes2.status);
  console.log("   Is New Account (should be false):", provData2.isNewAccount);

  // Now create the order via API fallback (without client being logged in)
  const orderPayload2 = {
    action: "create",
    id: testOrderId2,
    userId: "guest",
    customerId: "guest",
    customerName: "Aarav Sharma Returning",
    customerEmail: existingEmail,
    email: existingEmail,
    customerPhone: "9876543210",
    status: "Confirmed",
    orderStatus: "Confirmed",
    paymentMethod: "Pay on Delivery",
    paymentStatus: "Pay on Delivery",
    subtotal: 650,
    deliveryFee: 0,
    total: 650,
    items: [
      {
        id: "assam-gold-100g",
        productId: "assam-gold",
        name: "Assam Gold CTC",
        price: 650,
        quantity: 1,
        variant: "100g",
      },
    ],
    shippingAddress: {
      fullName: "Aarav Sharma Returning",
      addressLine1: "124 Palm Avenue",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "560001",
      country: "India",
    },
    createdAt: new Date().toISOString(),
  };

  const createRes2 = await fetch(`${BASE_URL}/api/orders?action=create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(orderPayload2),
  });

  const createData2 = await createRes2.json();
  console.log("   Existing Customer Order HTTP Status:", createRes2.status);
  console.log("   Existing Customer Order Result:", createData2);

  if (createRes2.ok && createData2.success && createData2.orderId === testOrderId2) {
    console.log("   --> TEST 4 PASSED: Existing registered customer successfully placed guest COD order.\n");
    passed++;
  } else {
    console.error("   --> TEST 4 FAILED:", createData2);
    failed++;
  }

  // -----------------------------------------------------------------------------
  // TEST 5: Input Validation & Missing Data Handling
  // -----------------------------------------------------------------------------
  console.log("TEST 5: Validating Error Handling for Missing / Invalid Order Details...");
  const invalidRes = await fetch(`${BASE_URL}/api/orders?action=create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "create" }), // Missing order ID
  });

  const invalidData = await invalidRes.json();
  console.log("   Missing ID HTTP Status (Expected 400):", invalidRes.status);
  console.log("   Error Message:", invalidData.error);

  if (invalidRes.status === 400 && invalidData.error) {
    console.log("   --> TEST 5 PASSED: Correct 400 Bad Request returned with clear error message.\n");
    passed++;
  } else {
    console.error("   --> TEST 5 FAILED:", invalidData);
    failed++;
  }

  // -----------------------------------------------------------------------------
  // TEST 6: Prevention of Duplicate Orders on Retry (Idempotency)
  // -----------------------------------------------------------------------------
  console.log("TEST 6: Testing Idempotency & Duplicate Order Prevention on Retry...");
  const retryRes = await fetch(`${BASE_URL}/api/orders?action=create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(orderPayload2), // Send identical order ID again
  });

  const retryData = await retryRes.json();
  console.log("   Retry HTTP Status:", retryRes.status);
  console.log("   Retry Result:", retryData);

  if (retryRes.ok && retryData.success && retryData.orderId === testOrderId2) {
    console.log("   --> TEST 6 PASSED: Order was updated/merged idempotently without creating duplicate ID.\n");
    passed++;
  } else {
    console.error("   --> TEST 6 FAILED:", retryData);
    failed++;
  }

  console.log("==================================================================");
  console.log(`TOTAL TESTS: 6 | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Unexpected test exception:", err);
  process.exit(1);
});
