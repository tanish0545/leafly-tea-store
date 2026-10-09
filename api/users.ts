import type { IncomingMessage, ServerResponse } from "node:http";
import { getAdminFirestore, getAdminAuth } from "./_lib/firebaseAdmin.js";

/** ------------------------------------------------------------------
 *  Leafly — Admin User Management API
 *  POST /api/users?action=remove
 *
 *  Security model:
 *  - Every request must include a valid Firebase ID token in the
 *    Authorization header.  The token is verified server-side.
 *  - If Firebase Admin SDK credentials are configured, tokens are
 *    verified via adminAuth.verifyIdToken() (most secure).
 *  - If Admin SDK is unavailable (local dev without service account),
 *    tokens are verified via the Identity Toolkit REST API using the
 *    project's public API key — same pattern used throughout this
 *    codebase for provisioning and order persistence.
 *  - Only tokens belonging to a known admin account are accepted.
 *  - Admin UID / email is never exposed beyond the audit document.
 *  - Orders, invoices and all transaction records are NEVER deleted.
 *    Only the user's Auth account + personal profile doc are removed.
 * ------------------------------------------------------------------ */

const ADMIN_EMAILS = new Set([
  "leaflydatabase@gmail.com",
  "admin@leafly.com",
  "admin@leaflytea.com",
]);

/** ----------------------------------------------------------------
 *  Verify the provided Bearer token.
 *
 *  Strategy:
 *  1. Use Firebase Admin SDK verifyIdToken() if credentials exist.
 *  2. Fall back to Identity Toolkit accounts:lookup REST endpoint
 *     (same API key already used in firebaseAdmin.ts provisioning).
 * ---------------------------------------------------------------- */
async function verifyAdminToken(
  authHeader: string | undefined
): Promise<{ uid: string; email: string } | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  if (!token) return null;

  // ── Strategy 1: Admin SDK (preferred when credentials present) ──
  const adminAuth = getAdminAuth();
  if (adminAuth) {
    try {
      const decoded = await adminAuth.verifyIdToken(token);
      const email = (decoded.email || "").toLowerCase();
      const isAdminByEmail = ADMIN_EMAILS.has(email);
      const isAdminByClaim =
        decoded["admin"] === true || decoded["isAdmin"] === true;

      if (!isAdminByEmail && !isAdminByClaim) {
        console.warn(`[Users API] Caller is not an admin: ${email}`);
        return null;
      }
      return { uid: decoded.uid, email };
    } catch (err) {
      console.warn("[Users API] Admin SDK token verification failed:", err);
      // Fall through to REST fallback
    }
  }

  // ── Strategy 2: Identity Toolkit REST (local dev / no service account) ──
  const apiKey =
    process.env.VITE_FIREBASE_API_KEY ||
    process.env.FIREBASE_API_KEY ||
    "AIzaSyBP0byX7fmi8SoXATR1tiXozTUsXLzYKWw";

  try {
    const lookupRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: token }),
      }
    );
    if (!lookupRes.ok) {
      console.warn(`[Users API] Identity Toolkit lookup returned HTTP ${lookupRes.status}`);
      return null;
    }
    const data = (await lookupRes.json()) as {
      users?: Array<{ localId: string; email?: string; customAttributes?: string }>;
    };
    const userRecord = data.users?.[0];
    if (!userRecord) {
      console.warn("[Users API] Identity Toolkit: no user record in response");
      return null;
    }

    const email = (userRecord.email || "").toLowerCase();
    const uid = userRecord.localId;

    // Check admin custom claims if present
    let isAdminByClaim = false;
    if (userRecord.customAttributes) {
      try {
        const claims = JSON.parse(userRecord.customAttributes) as Record<string, unknown>;
        isAdminByClaim = claims["admin"] === true || claims["isAdmin"] === true;
      } catch {
        // ignore parse errors
      }
    }

    const isAdminByEmail = ADMIN_EMAILS.has(email);
    if (!isAdminByEmail && !isAdminByClaim) {
      console.warn(`[Users API] REST verification: caller is not an admin: ${email}`);
      return null;
    }

    return { uid, email };
  } catch (err) {
    console.warn("[Users API] Identity Toolkit REST verification error:", err);
    return null;
  }
}

interface RequestBody {
  action?: string;
  uid?: string;
  reason?: string;
}

export default async function handler(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse
) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Accept, Authorization"
  );

  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Method not allowed. Use POST." }));
    return;
  }

  // ── Parse body ───────────────────────────────────────────────────
  let rawBody = req.body;
  if (typeof rawBody === "string") {
    try { rawBody = JSON.parse(rawBody); } catch { /* keep */ }
  } else if (!rawBody) {
    const buffers: Buffer[] = [];
    for await (const chunk of req) {
      buffers.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    }
    const raw = Buffer.concat(buffers).toString("utf-8");
    try { rawBody = raw ? JSON.parse(raw) : {}; } catch { rawBody = {}; }
  }

  const body = (
    typeof rawBody === "object" && rawBody !== null ? rawBody : {}
  ) as RequestBody;

  // ── Resolve action ───────────────────────────────────────────────
  const urlObj = new URL(req.url || "", "http://localhost");
  const queryAction = urlObj.searchParams.get("action") || "";
  const action = (queryAction || body.action || "").trim().toLowerCase();

  // ── Admin Authorization ──────────────────────────────────────────
  // HTTP header names are lowercased by Node.js IncomingMessage
  const authHeader =
    (req.headers?.["authorization"] as string | undefined) ||
    (req.headers?.["Authorization"] as string | undefined);

  const caller = await verifyAdminToken(authHeader);

  if (!caller) {
    res.statusCode = 403;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        error:
          "Forbidden. A valid admin session is required to perform this action.",
      })
    );
    return;
  }

  try {
    // ================================================================
    // ACTION: REMOVE USER
    // Deletes the Firebase Auth account and soft-deletes the Firestore
    // profile. Orders, invoices, and all financial records are PRESERVED.
    // ================================================================
    if (action === "remove" || action === "delete") {
      const targetUid = (body.uid || "").trim();
      const reason = (body.reason || "Removed by administrator").trim();

      if (!targetUid) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "uid is required." }));
        return;
      }

      // ── Guard 1: Prevent deletion of the currently signed-in administrator ──
      if (targetUid === caller.uid) {
        res.statusCode = 403;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            error: "Forbidden. You cannot remove your own administrator account.",
          })
        );
        return;
      }

      const db = getAdminFirestore();
      const adminAuth = getAdminAuth();
      let profileData: Record<string, unknown> = {};

      // ── Guard 2: Prevent deletion of ANY administrator in Firebase Auth ──
      if (adminAuth) {
        try {
          const targetUser = await adminAuth.getUser(targetUid);
          const targetEmail = (targetUser.email || "").toLowerCase();
          const targetClaims = (targetUser.customClaims || {}) as Record<string, unknown>;
          const isTargetAdmin =
            ADMIN_EMAILS.has(targetEmail) ||
            targetClaims["admin"] === true ||
            targetClaims["isAdmin"] === true;

          if (isTargetAdmin) {
            res.statusCode = 403;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                error: "Forbidden. Cannot remove an administrator account. The system preserves active administrators.",
              })
            );
            return;
          }
        } catch (lookupErr: unknown) {
          const msg =
            lookupErr instanceof Error ? lookupErr.message : String(lookupErr);
          // If user-not-found, the Auth record is already absent — proceed to Firestore check
          if (!msg.includes("user-not-found") && !msg.includes("USER_NOT_FOUND")) {
            console.warn("[Users API] Target user Auth lookup warning:", msg);
          }
        }
      }

      const now = new Date().toISOString();

      // ── 1. Fetch existing Firestore profile ──────────────────────
      if (db) {
        try {
          const profileSnap = await db.collection("users").doc(targetUid).get();
          if (profileSnap.exists) {
            profileData = profileSnap.data() as Record<string, unknown>;
          }
        } catch (fetchErr) {
          console.warn("[Users API] Could not fetch profile before removal:", fetchErr);
        }
      }

      // ── Guard 3: Prevent deletion of administrator accounts in Firestore ──
      const storedEmail = ((profileData.email as string) || "").toLowerCase();
      const isStoredAdmin =
        (storedEmail && ADMIN_EMAILS.has(storedEmail)) ||
        profileData.isAdmin === true ||
        profileData.role === "admin";

      if (isStoredAdmin) {
        res.statusCode = 403;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            error: "Forbidden. Cannot remove an administrator account. The system preserves active administrators.",
          })
        );
        return;
      }

      // ── 2. Write audit record to deleted_accounts collection ─────
      // Historical orders and invoices are NEVER modified or deleted.
      const auditRecord = {
        ...profileData,
        uid: targetUid,
        status: "Deleted",
        deletedAt: now,
        deletedBy: caller.uid,
        deletedByEmail: caller.email,
        deletionReason: reason,
        createdAt: profileData.createdAt || null,
        financialRecordsPreserved: true,
      };

      let firestoreUpdated = false;

      if (db) {
        try {
          await db
            .collection("deleted_accounts")
            .doc(targetUid)
            .set(auditRecord, { merge: true });
          firestoreUpdated = true;
          console.info(
            `[Users API] Audit record written: deleted_accounts/${targetUid}`
          );
        } catch (auditErr) {
          console.error("[Users API] Failed to write audit record:", auditErr);
        }
      }

      // ── 3. Soft-delete users/{uid} document ─────────────────────
      // Marks status: "Deleted" while preserving existing document reference
      // so historical order associations remain valid.
      if (db) {
        try {
          await db.collection("users").doc(targetUid).set(
            {
              status: "Deleted",
              deletedAt: now,
              deletedBy: caller.uid,
              deletedByEmail: caller.email,
              deletionReason: reason,
              updatedAt: now,
            },
            { merge: true }
          );
          firestoreUpdated = true;
          console.info(`[Users API] users/${targetUid} soft-deleted.`);
        } catch (softDeleteErr) {
          console.warn("[Users API] Soft-delete of Firestore profile failed:", softDeleteErr);
        }
      }

      // ── 4. Delete Firebase Auth account ─────────────────────────
      let authDeleted = false;
      let authError: string | undefined;

      if (adminAuth) {
        try {
          await adminAuth.deleteUser(targetUid);
          authDeleted = true;
          console.info(
            `[Users API] Firebase Auth account deleted: ${targetUid} (by ${caller.email})`
          );
        } catch (authErr: unknown) {
          const msg =
            authErr instanceof Error ? authErr.message : String(authErr);
          if (msg.includes("user-not-found") || msg.includes("USER_NOT_FOUND")) {
            // Already absent from Firebase Authentication — treat as safely resolved
            authDeleted = true;
            console.info(
              `[Users API] Auth account ${targetUid} was already absent from Firebase Auth.`
            );
          } else {
            authError = msg;
            console.error("[Users API] Firebase Auth deletion failed:", authErr);
          }
        }
      } else {
        // No Admin SDK service-account credentials configured
        authError =
          "Firebase Admin service-account credentials (FIREBASE_ADMIN_CLIENT_EMAIL and FIREBASE_ADMIN_PRIVATE_KEY) are not configured on this server environment.";
        console.warn("[Users API]", authError);
      }

      // ── 5. Respond with accurate status (Never falsely claim complete success) ──
      if (authDeleted) {
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            success: true,
            status: "completed",
            authDeleted: true,
            firestoreUpdated,
            authWarning: null,
            message: "Customer account and authentication record removed successfully.",
          })
        );
        return;
      }

      // Partial failure: Firestore was updated but Firebase Auth could not be deleted
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          success: false,
          status: "partial_failure",
          authDeleted: false,
          firestoreUpdated,
          authWarning: authError,
          error: `Firebase Authentication account could not be deleted: ${authError}`,
          message:
            "Customer profile was archived in database, but Firebase Authentication account deletion could not be completed because server service-account credentials are not configured.",
        })
      );
      return;
    }

    // ── Unknown action ────────────────────────────────────────────
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        error: `Unknown action "${action}". Supported: remove.`,
      })
    );
  } catch (err) {
    console.error("[Users API] Unhandled error:", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        success: false,
        error: "Internal server error while processing user management request.",
      })
    );
  }
}
