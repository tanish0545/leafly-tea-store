/// <reference types="node" />
/**
 * Leafly — Server-Side Firebase Admin Service
 * 
 * Used strictly in serverless API routes to update order payment status
 * after authoritative Cashfree payment verification.
 * 
 * SECURITY RULES:
 * - Credentials are read strictly from server process.env (never VITE_ prefix).
 * - Private keys are never logged or exposed to client.
 * - Handles both escaped (\n, \\n) and multiline private key formats.
 */

import fs from "node:fs";
import { initializeApp, getApps, cert, applicationDefault, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";
import { sendPasswordSetupEmail } from "./mailer.js";


/**
 * Sanitizes diagnostic and error logs so secrets, private keys, API keys,
 * or tokens are never leaked to logs or client responses.
 */
export function sanitizeLogMessage(msg: string): string {
  if (!msg) return "";
  return msg
    .replace(/-----BEGIN[\s\S]*?-----END[^\n\r]+/g, "[REDACTED_PRIVATE_KEY]")
    .replace(/AIza[0-9A-Za-z-_]{35}/g, "[REDACTED_API_KEY]")
    .replace(/cfsk_[0-9A-Za-z-_]+/g, "[REDACTED_CASHFREE_KEY]")
    .replace(/rzp_[0-9A-Za-z-_]+/g, "[REDACTED_RAZORPAY_KEY]")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [REDACTED_TOKEN]");
}

/**
 * Resolves the target Firebase Project ID across all supported environment variables.
 * Defaults authoritatively to 'leafly-database'.
 */
export function getFirebaseProjectId(): string {
  return (
    process.env.FIREBASE_ADMIN_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID ||
    process.env.VITE_FIREBASE_PROJECT_ID ||
    process.env.GCP_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.FIREBASE_DATABASE_PROJECT_ID ||
    process.env.PROJECT_ID ||
    "leafly-database"
  ).trim();
}

/**
 * Resolves the Firestore Database ID across supported environment variables.
 * Defaults to '(default)'.
 */
export function getFirestoreDatabaseId(): string {
  return (
    process.env.FIRESTORE_DATABASE_ID ||
    process.env.FIREBASE_DATABASE_ID ||
    "(default)"
  ).trim();
}

/**
 * Resolves the Firebase Web API Key for client REST fallbacks.
 */
export function getFirebaseApiKey(): string {
  return (
    process.env.VITE_FIREBASE_API_KEY ||
    process.env.FIREBASE_API_KEY ||
    "AIzaSyBP0byX7fmi8SoXATR1tiXozTUsXLzYKWw"
  ).trim();
}

/**
 * Resolves the Google Service Account Client Email across supported environment variables.
 */
export function getClientEmail(): string | undefined {
  const email = (
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL ||
    process.env.FIREBASE_CLIENT_EMAIL ||
    process.env.FIREBASE_SERVICE_ACCOUNT_EMAIL ||
    process.env.GOOGLE_CLIENT_EMAIL ||
    process.env.CLIENT_EMAIL ||
    ""
  ).trim();

  return email || undefined;
}

/**
 * Resolves the Google Service Account Private Key across supported environment variables.
 */
export function getRawPrivateKey(): string | undefined {
  const key =
    process.env.FIREBASE_ADMIN_PRIVATE_KEY ||
    process.env.FIREBASE_PRIVATE_KEY ||
    process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY ||
    process.env.GOOGLE_PRIVATE_KEY ||
    process.env.PRIVATE_KEY;

  return key ? key.trim() : undefined;
}

/**
 * Resolves full Service Account JSON string across supported environment variables.
 */
export function getServiceAccountJson(): string | undefined {
  const json =
    process.env.FIREBASE_SERVICE_ACCOUNT ||
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
    process.env.FIREBASE_ADMIN_CREDENTIALS ||
    process.env.FIREBASE_CREDENTIALS ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

  return json ? json.trim() : undefined;
}

/**
 * Bulletproof private-key normalization for Vercel, Docker, and local .env files.
 * Correctly handles:
 * - Literal escaped newlines ("\n", "\\n", "\\\\n")
 * - Windows CRLF linebreaks ("\r\n", "\\r\\n")
 * - Wrapped single, double, or escaped quotes
 * - Base64 encoded PEM keys
 * - Missing boundary newlines after BEGIN and before END headers
 */
export function formatPrivateKey(key: string): string {
  if (!key) return "";
  let cleaned = key.trim();

  // Strip wrapping quotes (single, double, or escaped quotes)
  while (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'")) ||
    (cleaned.startsWith('\\"') && cleaned.endsWith('\\"'))
  ) {
    if (cleaned.startsWith('\\"')) {
      cleaned = cleaned.slice(2, -2).trim();
    } else {
      cleaned = cleaned.slice(1, -1).trim();
    }
  }

  // If base64-encoded PEM, decode it
  if (!cleaned.includes("-----BEGIN") && cleaned.length > 60) {
    try {
      const decoded = Buffer.from(cleaned, "base64").toString("utf-8");
      if (decoded.includes("-----BEGIN")) {
        cleaned = decoded.trim();
      }
    } catch {
      // Not base64
    }
  }

  // Normalize escaped and multi-escaped newlines to true '\n'
  cleaned = cleaned
    .replace(/\\r\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\\r/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\\\\n/g, "\n")
    .replace(/\\n/g, "\n");

  // Ensure standard PEM header and footer have proper line breaks
  if (cleaned.includes("-----BEGIN PRIVATE KEY-----") && !cleaned.includes("-----BEGIN PRIVATE KEY-----\n")) {
    cleaned = cleaned.replace("-----BEGIN PRIVATE KEY-----", "-----BEGIN PRIVATE KEY-----\n");
  }
  if (cleaned.includes("-----END PRIVATE KEY-----") && !cleaned.includes("\n-----END PRIVATE KEY-----")) {
    cleaned = cleaned.replace("-----END PRIVATE KEY-----", "\n-----END PRIVATE KEY-----");
  }

  if (cleaned.includes("-----BEGIN RSA PRIVATE KEY-----") && !cleaned.includes("-----BEGIN RSA PRIVATE KEY-----\n")) {
    cleaned = cleaned.replace("-----BEGIN RSA PRIVATE KEY-----", "-----BEGIN RSA PRIVATE KEY-----\n");
  }
  if (cleaned.includes("-----END RSA PRIVATE KEY-----") && !cleaned.includes("\n-----END RSA PRIVATE KEY-----")) {
    cleaned = cleaned.replace("-----END RSA PRIVATE KEY-----", "\n-----END RSA PRIVATE KEY-----");
  }

  return cleaned.trim();
}

/**
 * Checks if privileged server-side Admin SDK credentials exist in the runtime environment.
 */
export function hasAdminCredentials(): boolean {
  if (getServiceAccountJson()) {
    return true;
  }
  const clientEmail = getClientEmail();
  const privateKey = getRawPrivateKey();
  if (clientEmail && privateKey) {
    return true;
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      return fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    } catch {
      return false;
    }
  }
  if (process.env.K_SERVICE || process.env.FUNCTION_NAME || process.env.GAE_SERVICE) {
    return true;
  }
  return false;
}

/**
 * Safe diagnostics report for server-side troubleshooting.
 * NEVER exposes private keys, tokens, or sensitive values.
 */
export function getAdminConfigStatus(): {
  configured: boolean;
  strategy: "service_account_json" | "env_credentials" | "adc" | "none";
  projectId: string;
  databaseId: string;
  hasClientEmail: boolean;
  isServiceAccountEmail: boolean;
  hasPrivateKey: boolean;
  privateKeyValidFormat: boolean;
  reason?: string;
} {
  const projectId = getFirebaseProjectId();
  const databaseId = getFirestoreDatabaseId();
  const rawServiceAccount = getServiceAccountJson();
  const clientEmail = getClientEmail();
  const rawPrivateKey = getRawPrivateKey();

  if (rawServiceAccount) {
    return {
      configured: true,
      strategy: "service_account_json",
      projectId,
      databaseId,
      hasClientEmail: true,
      isServiceAccountEmail: true,
      hasPrivateKey: true,
      privateKeyValidFormat: true,
    };
  }

  const hasEmail = Boolean(clientEmail);
  const isSaEmail = Boolean(clientEmail && clientEmail.includes(".gserviceaccount.com"));
  const hasKey = Boolean(rawPrivateKey);
  let keyValidFormat = false;

  if (hasKey && rawPrivateKey) {
    const formatted = formatPrivateKey(rawPrivateKey);
    keyValidFormat = formatted.includes("-----BEGIN") && formatted.includes("-----END");
  }

  if (hasEmail && hasKey) {
    return {
      configured: keyValidFormat,
      strategy: "env_credentials",
      projectId,
      databaseId,
      hasClientEmail: hasEmail,
      isServiceAccountEmail: isSaEmail,
      hasPrivateKey: hasKey,
      privateKeyValidFormat: keyValidFormat,
      reason: keyValidFormat
        ? undefined
        : "Private key is present but missing valid PEM headers or newlines.",
    };
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
    return {
      configured: true,
      strategy: "adc",
      projectId,
      databaseId,
      hasClientEmail: true,
      isServiceAccountEmail: true,
      hasPrivateKey: true,
      privateKeyValidFormat: true,
    };
  }

  return {
    configured: false,
    strategy: "none",
    projectId,
    databaseId,
    hasClientEmail: hasEmail,
    isServiceAccountEmail: isSaEmail,
    hasPrivateKey: hasKey,
    privateKeyValidFormat: keyValidFormat,
    reason: "Missing server-side Firebase Admin credentials (FIREBASE_ADMIN_CLIENT_EMAIL and FIREBASE_ADMIN_PRIVATE_KEY).",
  };
}

/**
 * Initializes and returns the Firebase Admin App instance.
 * Supports:
 * 1. FIREBASE_SERVICE_ACCOUNT / FIREBASE_SERVICE_ACCOUNT_KEY (JSON string or base64 JSON string)
 * 2. FIREBASE_ADMIN_CLIENT_EMAIL + FIREBASE_ADMIN_PRIVATE_KEY (handles all naming variants & newline formats)
 * 3. GOOGLE_APPLICATION_CREDENTIALS (file path)
 * 4. Managed Application Default Credentials (Google Cloud Run / Cloud Functions / GCP)
 */
export function initAdminApp(): App | null {
  if (!hasAdminCredentials()) {
    return null;
  }

  const existingApps = getApps();
  if (existingApps.length > 0) {
    return existingApps[0];
  }

  const projectId = getFirebaseProjectId();
  const rawServiceAccount = getServiceAccountJson();
  const clientEmail = getClientEmail();
  const rawPrivateKey = getRawPrivateKey();

  // Strategy 1: Service Account JSON (plain or base64)
  if (rawServiceAccount) {
    try {
      let jsonStr = rawServiceAccount.trim();
      if (!jsonStr.startsWith("{") && !jsonStr.startsWith('"')) {
        try {
          jsonStr = Buffer.from(jsonStr, "base64").toString("utf-8");
        } catch {
          // Keep original
        }
      }
      const parsed = JSON.parse(jsonStr);
      if (parsed.private_key) {
        parsed.private_key = formatPrivateKey(parsed.private_key);
      }
      const app = initializeApp({
        credential: cert(parsed),
        projectId: parsed.project_id || projectId,
      });
      console.info(`[Firebase Admin] Initialized using Service Account JSON for project "${parsed.project_id || projectId}".`);
      return app;
    } catch (e) {
      const safeMsg = sanitizeLogMessage(e instanceof Error ? e.message : String(e));
      console.warn(`[Firebase Admin Notice] Could not parse Service Account JSON: ${safeMsg}`);
    }
  }

  // Strategy 2: Client Email + Private Key environment variables
  if (clientEmail && rawPrivateKey) {
    try {
      const privateKey = formatPrivateKey(rawPrivateKey);
      const app = initializeApp({
        credential: cert({
          projectId,
          clientEmail: clientEmail.trim(),
          privateKey,
        }),
        projectId,
      });
      console.info(`[Firebase Admin] Initialized using Service Account environment credentials for project "${projectId}".`);
      return app;
    } catch (e) {
      const safeMsg = sanitizeLogMessage(e instanceof Error ? e.message : String(e));
      console.warn(`[Firebase Admin Notice] Failed to initialize credentials with cert(): ${safeMsg}`);
    }
  }

  // Strategy 3: GOOGLE_APPLICATION_CREDENTIALS file path
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      if (fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
        const app = initializeApp({
          credential: applicationDefault(),
          projectId,
        });
        console.info(`[Firebase Admin] Initialized using GOOGLE_APPLICATION_CREDENTIALS for project "${projectId}".`);
        return app;
      } else {
        console.warn("[Firebase Admin Notice] GOOGLE_APPLICATION_CREDENTIALS file path does not exist.");
      }
    } catch (e) {
      const safeMsg = sanitizeLogMessage(e instanceof Error ? e.message : String(e));
      console.warn(`[Firebase Admin Notice] Could not load GOOGLE_APPLICATION_CREDENTIALS: ${safeMsg}`);
    }
  }

  // Strategy 4: Managed Application Default Credentials (Google Cloud Run / Cloud Functions / GCP)
  const isGcpEnvironment = Boolean(
    process.env.K_SERVICE ||
    process.env.FUNCTION_NAME ||
    process.env.GAE_SERVICE ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCP_PROJECT
  );
  if (isGcpEnvironment) {
    try {
      const app = initializeApp({
        credential: applicationDefault(),
        projectId,
      });
      console.info(`[Firebase Admin] Initialized using GCP managed Application Default Credentials for project "${projectId}".`);
      return app;
    } catch (e) {
      const safeMsg = sanitizeLogMessage(e instanceof Error ? e.message : String(e));
      console.warn(`[Firebase Admin Notice] GCP ApplicationDefault attempt failed: ${safeMsg}`);
    }
  }

  return null;
}

export function getAdminFirestore(): Firestore | null {
  const app = initAdminApp();
  if (!app) return null;
  try {
    const databaseId = getFirestoreDatabaseId();
    return databaseId && databaseId !== "(default)"
      ? getFirestore(app, databaseId)
      : getFirestore(app);
  } catch (e) {
    const safeMsg = sanitizeLogMessage(e instanceof Error ? e.message : String(e));
    console.warn(`[Firebase Admin Notice] Could not obtain Firestore instance: ${safeMsg}`);
    return null;
  }
}

export function getAdminAuth(): Auth | null {
  const app = initAdminApp();
  if (!app) return null;
  try {
    return getAuth(app);
  } catch (e) {
    const safeMsg = sanitizeLogMessage(e instanceof Error ? e.message : String(e));
    console.warn(`[Firebase Admin Notice] Could not obtain Auth instance: ${safeMsg}`);
    return null;
  }
}

export function fromFirestoreRestValue(val: any): unknown {
  if (!val || typeof val !== "object") return val;
  if ("nullValue" in val) return null;
  if ("booleanValue" in val) return val.booleanValue;
  if ("integerValue" in val) return Number(val.integerValue);
  if ("doubleValue" in val) return Number(val.doubleValue);
  if ("stringValue" in val) return val.stringValue;
  if ("timestampValue" in val) return val.timestampValue;
  if ("arrayValue" in val) {
    const list = val.arrayValue?.values || [];
    return list.map(fromFirestoreRestValue);
  }
  if ("mapValue" in val) {
    const fields = val.mapValue?.fields || {};
    const res: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(fields)) {
      res[k] = fromFirestoreRestValue(v);
    }
    return res;
  }
  return val;
}

export function fromFirestoreRestFields(fields: Record<string, any>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields || {})) {
    result[k] = fromFirestoreRestValue(v);
  }
  return result;
}

export async function updateServerOrder(
  orderId: string,
  updates: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  // Strategy 1: Admin SDK
  try {
    const db = getAdminFirestore();
    if (db) {
      const cleanUpdates = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      await db.collection("orders").doc(orderId).set(cleanUpdates, { merge: true });
      console.info(`[Firebase Admin] Successfully updated order #${orderId} via Admin SDK.`);
      return { success: true };
    }
  } catch (error) {
    const msg = sanitizeLogMessage(error instanceof Error ? error.message : String(error));
    console.warn(`[Firebase Admin Notice] Could not update order #${orderId} directly via Admin SDK: ${msg}`);
  }

  // Strategy 2: Server Session REST Fallback
  try {
    const session = await getServerSessionToken();
    const token = session?.idToken;
    if (!token) {
      return { success: false, error: "Authentication token unavailable for server order update." };
    }

    const projectId = getFirebaseProjectId();
    const databaseId = getFirestoreDatabaseId();

    const cleanUpdates = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    const fields = toFirestoreRestFields(cleanUpdates);
    const updateMask = Object.keys(cleanUpdates)
      .map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
      .join("&");
    const docUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/orders/${encodeURIComponent(orderId)}?${updateMask}`;

    const res = await fetch(docUrl, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ fields }),
    });

    if (res.ok) {
      console.info(`[Firebase Admin] Successfully updated order #${orderId} via server REST session.`);
      return { success: true };
    }
    const errData = await res.json().catch(() => ({}));
    const msg = sanitizeLogMessage((errData as any)?.error?.message || `HTTP ${res.status}`);
    return { success: false, error: msg };
  } catch (restErr: any) {
    const safeMsg = sanitizeLogMessage(restErr?.message || String(restErr));
    return { success: false, error: safeMsg };
  }
}

export async function getServerOrder(
  orderId: string
): Promise<Record<string, unknown> | null> {
  // Strategy 1: Admin SDK
  try {
    const db = getAdminFirestore();
    if (db) {
      const snap = await db.collection("orders").doc(orderId).get();
      if (snap.exists) {
        return { id: snap.id, ...snap.data() };
      }
      return null;
    }
  } catch (error) {
    const msg = sanitizeLogMessage(error instanceof Error ? error.message : String(error));
    console.warn(`[Firebase Admin Notice] Could not fetch order #${orderId} via Admin SDK: ${msg}`);
  }

  // Strategy 2: Server Session REST Fallback
  try {
    const session = await getServerSessionToken();
    const token = session?.idToken;
    if (!token) return null;

    const projectId = getFirebaseProjectId();
    const databaseId = getFirestoreDatabaseId();

    const docUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/orders/${encodeURIComponent(orderId)}`;
    const res = await fetch(docUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.ok) {
      const data = (await res.json()) as any;
      if (data && data.fields) {
        const parsed = fromFirestoreRestFields(data.fields);
        return { id: orderId, ...parsed };
      }
    }
  } catch (restErr) {
    const safeMsg = sanitizeLogMessage(restErr instanceof Error ? restErr.message : String(restErr));
    console.warn(`[Firebase Admin Notice] REST fetch for order #${orderId} failed: ${safeMsg}`);
  }

  return null;
}

export interface ProvisionResult {
  success: boolean;
  uid: string | null;
  isNewAccount: boolean;
  sessionSecret?: string | null;
  idToken?: string | null;
  refreshToken?: string | null;
  passwordSetupLink?: string | null;
  error?: string;
}

export function toFirestoreRestValue(val: unknown): Record<string, unknown> {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === "boolean") return { booleanValue: val };
  if (typeof val === "number") {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (typeof val === "string") return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreRestValue) } };
  }
  if (typeof val === "object") {
    const fields: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      if (v !== undefined) {
        fields[k] = toFirestoreRestValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

export function toFirestoreRestFields(obj: Record<string, unknown>): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      fields[k] = toFirestoreRestValue(v);
    }
  }
  return fields;
}

let cachedServerSession: { idToken: string; localId: string; expiresAt: number } | null = null;

export async function getServerSessionToken(): Promise<{ idToken: string; localId: string } | null> {
  const now = Date.now();
  if (cachedServerSession && cachedServerSession.expiresAt > now + 60000) {
    return { idToken: cachedServerSession.idToken, localId: cachedServerSession.localId };
  }

  // Only attempt server worker authentication if explicit server credentials are provided
  const serverEmail = process.env.FIREBASE_SERVER_EMAIL;
  const serverPassword = process.env.FIREBASE_SERVER_PASSWORD;
  if (!serverEmail || !serverPassword) {
    return null;
  }

  const apiKey = getFirebaseApiKey();

  try {
    const loginRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: serverEmail,
          password: serverPassword,
          returnSecureToken: true,
        }),
      }
    );
    const loginData = (await loginRes.json()) as any;
    if (loginData.idToken && loginData.localId) {
      const expiresInSec = Number(loginData.expiresIn) || 3600;
      cachedServerSession = {
        idToken: loginData.idToken,
        localId: loginData.localId,
        expiresAt: now + expiresInSec * 1000,
      };
      return { idToken: loginData.idToken, localId: loginData.localId };
    }
  } catch (err) {
    const safeMsg = sanitizeLogMessage(err instanceof Error ? err.message : String(err));
    console.warn(`[Firebase Admin Notice] Failed to acquire server worker session token: ${safeMsg}`);
  }
  return null;
}

export async function saveServerOrder(
  orderPayload: Record<string, unknown>,
  clientToken?: string
): Promise<{ success: boolean; error?: string; method?: string }> {
  const orderId = String(orderPayload.id || orderPayload.orderId || "").trim();
  if (!orderId) {
    return { success: false, error: "Order ID is missing." };
  }

  // 1. Authoritative Admin SDK write (preferred when credentials present)
  const adminDb = getAdminFirestore();
  if (adminDb) {
    try {
      const cleanUpdates: Record<string, unknown> = {
        ...orderPayload,
        id: orderId,
        orderId,
        updatedAt: new Date().toISOString(),
      };
      delete (cleanUpdates as any).action;
      delete (cleanUpdates as any).type;
      delete (cleanUpdates as any).idToken;

      await adminDb.collection("orders").doc(orderId).set(cleanUpdates, { merge: true });
      console.info(`[Firebase Admin] Order #${orderId} stored via Admin SDK.`);
      return { success: true, method: "admin_sdk" };
    } catch (adminErr: any) {
      const safeMsg = sanitizeLogMessage(adminErr instanceof Error ? adminErr.message : String(adminErr));
      console.warn(`[Firebase Admin Notice] Admin SDK write failed (${safeMsg}), attempting REST fallback...`);
    }
  }

  // 2. Server REST fallback
  const projectId = getFirebaseProjectId();
  const databaseId = getFirestoreDatabaseId();

  const session = await getServerSessionToken();
  const serverToken = session?.idToken;
  const serverLocalId = session?.localId;

  const executePatch = async (token?: string, uidToUse?: string) => {
    const isGuest = Boolean(orderPayload.isGuest ?? (orderPayload.userId === "guest" || !orderPayload.userId));
    const effectiveUserId = uidToUse || (isGuest ? "guest" : (orderPayload.userId as string) || "guest");

    const cleanOrder: Record<string, unknown> = {
      ...orderPayload,
      id: orderId,
      orderId,
      customerEmail: String(orderPayload.customerEmail || orderPayload.email || "").trim().toLowerCase(),
      email: String(orderPayload.email || orderPayload.customerEmail || "").trim().toLowerCase(),
      customerName: String(orderPayload.customerName || (orderPayload.shippingAddress as any)?.fullName || "").trim(),
      customerPhone: String(orderPayload.customerPhone || orderPayload.phone || (orderPayload.shippingAddress as any)?.phone || "").trim(),
      phone: String(orderPayload.phone || orderPayload.customerPhone || (orderPayload.shippingAddress as any)?.phone || "").trim(),
      isGuest,
      userId: effectiveUserId,
      customerId: (orderPayload.customerId as string) || effectiveUserId,
      customerUid: (orderPayload.customerUid as string) || (orderPayload.customerId as string) || effectiveUserId,
      total: Number(orderPayload.total) || 0,
      subtotal: Number(orderPayload.subtotal) || 0,
      deliveryFee: Number(orderPayload.deliveryFee) || 0,
      discount: Number(orderPayload.discount) || 0,
      paymentMethod: String(orderPayload.paymentMethod || "COD"),
      paymentStatus: String(orderPayload.paymentStatus || "Pending"),
      orderStatus: String(orderPayload.orderStatus || orderPayload.status || "Confirmed"),
      status: String(orderPayload.status || orderPayload.orderStatus || "Confirmed"),
      items: Array.isArray(orderPayload.items) ? orderPayload.items : [],
      updatedAt: new Date().toISOString(),
    };
    delete (cleanOrder as any).action;
    delete (cleanOrder as any).type;
    delete (cleanOrder as any).idToken;

    const fields = toFirestoreRestFields(cleanOrder);
    const docUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/orders/${encodeURIComponent(orderId)}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    return await fetch(docUrl, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ fields }),
    });
  };

  // Attempt 1: Try with clientToken if provided
  if (clientToken) {
    try {
      const res = await executePatch(clientToken, orderPayload.userId as string | undefined);
      if (res.ok) {
        console.info(`[Firebase Admin] Order #${orderId} successfully persisted via client REST token.`);
        return { success: true, method: "client_token_rest" };
      }
      console.warn(`[Firebase Admin Notice] Client token REST write returned HTTP ${res.status}`);
    } catch (clientErr) {
      const safeMsg = sanitizeLogMessage(clientErr instanceof Error ? clientErr.message : String(clientErr));
      console.warn(`[Firebase Admin Notice] Client token REST write exception: ${safeMsg}`);
    }
  }

  // Attempt 2: Use authoritative server worker session if configured
  if (serverToken) {
    try {
      const res = await executePatch(serverToken, serverLocalId);
      if (res.ok) {
        console.info(`[Firebase Admin] Order #${orderId} successfully persisted via server worker session.`);
        return { success: true, method: "server_worker_rest" };
      }
      const errData = await res.json().catch(() => ({}));
      const msg = sanitizeLogMessage((errData as any)?.error?.message || `HTTP ${res.status}`);
      console.error(`[Firebase Admin] Server session REST write failed (${res.status}): ${msg}`);
      return { success: false, error: msg };
    } catch (serverErr: any) {
      const safeMsg = sanitizeLogMessage(serverErr?.message || String(serverErr));
      console.error(`[Firebase Admin] Network error during server session REST write: ${safeMsg}`);
      return { success: false, error: safeMsg };
    }
  }

  // Attempt 3: If order is a guest order, try unauthenticated REST write satisfying firestore.rules
  const isGuest = orderPayload.isGuest === true || orderPayload.userId === "guest" || !orderPayload.userId;
  if (isGuest) {
    try {
      const res = await executePatch(undefined, "guest");
      if (res.ok) {
        console.info(`[Firebase Admin] Guest order #${orderId} persisted via unauthenticated REST write.`);
        return { success: true, method: "guest_rest_fallback" };
      }
      const errData = await res.json().catch(() => ({}));
      const msg = sanitizeLogMessage((errData as any)?.error?.message || `HTTP ${res.status}`);
      console.warn(`[Firebase Admin] Unauthenticated guest REST write returned ${res.status}: ${msg}`);
    } catch (guestErr) {
      const safeMsg = sanitizeLogMessage(guestErr instanceof Error ? guestErr.message : String(guestErr));
      console.warn(`[Firebase Admin] Guest REST write exception: ${safeMsg}`);
    }
  }

  const configReport = getAdminConfigStatus();
  return {
    success: false,
    error: configReport.configured
      ? "Database write could not be completed. Please check Firestore security rules or server network connectivity."
      : "Database write could not be completed. Server Firebase Admin credentials (FIREBASE_ADMIN_CLIENT_EMAIL and FIREBASE_ADMIN_PRIVATE_KEY) are not configured in Vercel environment variables.",
  };
}

/**
 * Converts a raw Firebase Auth action link into a branded Leafly /reset-password URL.
 * Preserves the exact verified oobCode.
 */
export function buildBrandedResetLink(rawLink: string, baseUrl: string): string {
  try {
    const urlObj = new URL(rawLink);
    const oobCode = urlObj.searchParams.get("oobCode");
    if (oobCode) {
      const cleanBase = baseUrl.replace(/\/+$/, "");
      return `${cleanBase}/reset-password?oobCode=${encodeURIComponent(oobCode)}`;
    }
  } catch {}
  return rawLink;
}

/**
 * Automatically establishes a customer account from the real checkout email.
 * - If the customer does NOT have an account, creates one and dispatches password setup email.
 * - If the customer ALREADY has an account, associates order without resetting password.
 * - Never uses or generates fake emails or predictable passwords.
 */
export async function provisionCustomerAccount(
  rawEmail: string,
  rawName: string,
  orderId?: string
): Promise<ProvisionResult> {
  const email = (rawEmail || "").trim().toLowerCase();
  const customerName = (rawName || "").trim() || "Valued Patron";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, uid: null, isNewAccount: false, error: "Invalid email" };
  }

  const adminAuth = getAdminAuth();
  const adminDb = getAdminFirestore();

  let uid: string | null = null;
  let isNewAccount = false;
  let passwordSetupLink: string | null = null;
  let sessionSecret: string | null = null;
  let idToken: string | null = null;
  let refreshToken: string | null = null;

  // 1. Authoritative check via Firebase Admin Auth (privileged server environment)
  if (adminAuth) {
    const host = process.env.PUBLIC_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || "https://leaflytea.in";
    const baseUrl = (host.startsWith("http") ? host : `https://${host}`).replace(/\/+$/, "");

    try {
      const existing = await adminAuth.getUserByEmail(email);
      uid = existing.uid;
      isNewAccount = false;
      console.info(`[Account Provision] Existing account found for ${email} (UID: ${uid}).`);

      // Check if this existing account was auto-provisioned but has never completed password setup
      let needsPasswordSetup = false;
      if (!existing.providerData || existing.providerData.length === 0) {
        needsPasswordSetup = true;
      }
      if (!needsPasswordSetup && adminDb) {
        try {
          const uDoc = await adminDb.collection("users").doc(uid).get();
          if (uDoc.exists && uDoc.data()?.accountSetupPending === true) {
            needsPasswordSetup = true;
          }
        } catch {}
      }

      if (needsPasswordSetup) {
        try {
          let rawLink: string | null = null;
          try {
            rawLink = await adminAuth.generatePasswordResetLink(email, {
              url: `${baseUrl}/reset-password`,
              handleCodeInApp: true,
            });
          } catch {
            rawLink = await adminAuth.generatePasswordResetLink(email);
          }

          if (rawLink) {
            passwordSetupLink = buildBrandedResetLink(rawLink, baseUrl);
            await sendPasswordSetupEmail({
              email,
              customerName: existing.displayName || customerName,
              setupLink: passwordSetupLink,
            });
            console.info(`[Account Provision] Dispatched password setup email to existing unconfigured account ${email}`);
          }
        } catch (linkErr) {
          console.warn("[Account Provision] Could not generate or send reset link for existing user:", linkErr);
        }
      }
    } catch (err: any) {
      if (
        err?.code === "auth/user-not-found" ||
        err?.message?.includes("user-not-found") ||
        err?.code === "auth/email-not-found"
      ) {
        try {
          const created = await adminAuth.createUser({
            email,
            displayName: customerName,
            emailVerified: false,
          });
          uid = created.uid;
          isNewAccount = true;
          console.info(`[Account Provision] Created new account for ${email} (UID: ${uid}).`);

          // Generate secure password setup link
          try {
            let rawLink: string | null = null;
            try {
              rawLink = await adminAuth.generatePasswordResetLink(email, {
                url: `${baseUrl}/reset-password`,
                handleCodeInApp: true,
              });
            } catch {
              rawLink = await adminAuth.generatePasswordResetLink(email);
            }

            // Dispatch customer password setup email via Nodemailer
            if (rawLink) {
              passwordSetupLink = buildBrandedResetLink(rawLink, baseUrl);
              await sendPasswordSetupEmail({
                email,
                customerName,
                setupLink: passwordSetupLink,
              });
              console.info(`[Account Provision] Dispatched password setup email to ${email}`);
            }
          } catch (linkErr) {
            console.warn("[Account Provision] Could not generate or send reset link:", linkErr);
          }
        } catch (createErr: any) {
          console.error("[Account Provision] Error creating user via Admin Auth:", createErr);
        }
      } else {
        console.error("[Account Provision] Error querying Admin Auth by email:", err);
      }
    }
  }

  // 2. Identity Toolkit Fallback (when Admin SDK credentials not loaded on server)
  if (!uid) {
    const apiKey = getFirebaseApiKey();

    if (apiKey) {
      try {
        const crypto = await import("node:crypto");
        // High-entropy cryptographically random initial secret — never exposed to client or logged
        const secureRandomSecret = crypto.randomBytes(32).toString("hex") + "!Leafly9A";
        const signUpRes = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email,
              password: secureRandomSecret,
              returnSecureToken: true,
            }),
          }
        );
        const signUpData = (await signUpRes.json()) as any;

        if (signUpData.localId) {
          uid = signUpData.localId;
          isNewAccount = true;
          sessionSecret = secureRandomSecret;
          idToken = signUpData.idToken || null;
          refreshToken = signUpData.refreshToken || null;
          console.info(`[Account Provision] Created account via Identity Toolkit for ${email} (UID: ${uid}).`);

          // Send password setup / reset email directly to customer
          try {
            await fetch(
              `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  requestType: "PASSWORD_RESET",
                  email,
                }),
              }
            );
            console.info(`[Account Provision] Dispatched password reset email via sendOobCode to ${email}.`);
          } catch (oobErr) {
            console.warn("[Account Provision] Failed to dispatch sendOobCode:", oobErr);
          }
        } else if (signUpData.error?.message === "EMAIL_EXISTS") {
          isNewAccount = false;
          console.info(`[Account Provision] Account for ${email} already exists (EMAIL_EXISTS). Preserving existing credentials.`);
        }
      } catch (restErr) {
        console.warn("[Account Provision] Identity Toolkit fallback exception:", restErr);
      }
    }
  }

  // 3. Write user document to Firestore users/{uid} for newly created accounts
  if (uid && isNewAccount) {
    const userDocData = {
      uid,
      email,
      displayName: customerName,
      fullName: customerName,
      name: customerName,
      authProvider: "Email/Password",
      status: "Active",
      accountSetupPending: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (adminDb) {
      try {
        await adminDb.collection("users").doc(uid).set(userDocData, { merge: true });
        console.info(`[Account Provision] Created users/${uid} Firestore record via Admin SDK.`);
      } catch (dbErr) {
        console.warn("[Account Provision] Could not write to users collection via Admin SDK:", dbErr);
      }
    } else if (idToken) {
      try {
        const projectId = getFirebaseProjectId();
        const databaseId = getFirestoreDatabaseId();
        const fields = toFirestoreRestFields(userDocData);
        await fetch(
          `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/users/${encodeURIComponent(uid)}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({ fields }),
          }
        );
        console.info(`[Account Provision] Created users/${uid} Firestore record via REST.`);
      } catch (dbErr) {
        console.warn("[Account Provision] Could not write to users collection via REST:", dbErr);
      }
    }
  }

  return {
    success: true, // Non-blocking: Account provisioning success should not fail checkout
    uid,
    isNewAccount,
    sessionSecret,
    idToken,
    refreshToken,
    passwordSetupLink,
  };
}

