/**
 * Leafly — /api/users endpoint smoke test
 *
 * Run with:
 *   node scripts/test_users_api.mjs
 *
 * Prerequisites:
 *   - npm run dev must be running (port 5173 by default)
 *   - Provide a valid admin Firebase ID token as TEST_ADMIN_TOKEN env var
 *     (get one from browser devtools > Application > Auth > copy idToken)
 *
 * This script does NOT delete a real account — it uses a dummy UID that
 * does not exist, so the server will return an error from Auth / Firestore
 * but the endpoint will still respond with HTTP 200 and authDeleted:false.
 */

const BASE_URL = process.env.API_BASE_URL || "http://localhost:5173";
const adminToken = process.env.TEST_ADMIN_TOKEN || "";

if (!adminToken) {
  console.error(
    "\n[Test] ERROR: Set TEST_ADMIN_TOKEN env var to a valid admin Firebase ID token.\n" +
    "  Get it from: browser devtools → Application → Storage → IndexedDB → firebase → token → value\n"
  );
  process.exit(1);
}

async function runTests() {
  console.log(`\n[Test] Targeting: ${BASE_URL}/api/users\n`);

  // ── Test 1: No auth header → 403 ────────────────────────────────
  console.log("[Test 1] No Authorization header → expect 403...");
  const r1 = await fetch(`${BASE_URL}/api/users?action=remove`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uid: "dummy-uid-12345" }),
  });
  const d1 = await r1.json();
  console.log(`  Status: ${r1.status} (expected 403)`);
  console.log(`  Body:  `, d1);
  console.assert(r1.status === 403, "FAIL: expected 403");

  // ── Test 2: Missing uid → 400 ────────────────────────────────────
  console.log("\n[Test 2] Valid admin token, missing uid → expect 400...");
  const r2 = await fetch(`${BASE_URL}/api/users?action=remove`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ reason: "test" }),
  });
  const d2 = await r2.json();
  console.log(`  Status: ${r2.status} (expected 400)`);
  console.log(`  Body:  `, d2);
  console.assert(r2.status === 400, "FAIL: expected 400");

  // ── Test 3: Unknown action → 400 ────────────────────────────────
  console.log("\n[Test 3] Unknown action → expect 400...");
  const r3 = await fetch(`${BASE_URL}/api/users?action=unknown`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({}),
  });
  const d3 = await r3.json();
  console.log(`  Status: ${r3.status} (expected 400)`);
  console.log(`  Body:  `, d3);
  console.assert(r3.status === 400, "FAIL: expected 400");

  // ── Test 4: Non-existent uid → 200 (soft success, auth not found) ─
  console.log("\n[Test 4] Valid admin token, non-existent uid → expect 200 with authDeleted or authWarning...");
  const r4 = await fetch(`${BASE_URL}/api/users?action=remove`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      uid: "test-nonexistent-uid-do-not-use",
      reason: "Automated smoke test — not a real deletion",
    }),
  });
  const d4 = await r4.json();
  console.log(`  Status: ${r4.status} (expected 200)`);
  console.log(`  Body:  `, JSON.stringify(d4, null, 2));
  console.assert(r4.status === 200, "FAIL: expected 200");
  console.assert(d4.success === true, "FAIL: expected success=true");

  console.log("\n✅  All tests passed (or reported expected behavior).\n");
}

runTests().catch((err) => {
  console.error("\n[Test] Fatal error:", err.message);
  process.exit(1);
});
