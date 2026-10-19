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
import { createPrivateKey } from "node:crypto";
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
 * Strips surrounding double, single, or escaped quotes from string values,
 * which commonly occur when variables are copy-pasted into Vercel or Docker envs.
 */
export function stripWrappingQuotes(val: string): string {
  if (!val) return "";
  let cleaned = val.trim();
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
  return cleaned;
}

/**
 * Resolves the target Firebase Project ID across all supported environment variables.
 * Defaults authoritatively to 'leafly-database'.
 */
export function getFirebaseProjectId(): string {
  const explicit = stripWrappingQuotes(
    process.env.FIREBASE_ADMIN_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID ||
    process.env.VITE_FIREBASE_PROJECT_ID ||
    process.env.GCP_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.FIREBASE_DATABASE_PROJECT_ID ||
    process.env.PROJECT_ID ||
    ""
  );
  if (explicit) return explicit;

  // Derive from client email if available (e.g. firebase-adminsdk-xxx@leafly-database.iam.gserviceaccount.com)
  const clientEmail = getClientEmail();
  if (clientEmail && clientEmail.includes("@") && clientEmail.includes(".iam.gserviceaccount.com")) {
    const domainPart = clientEmail.split("@")[1];
    const derived = domainPart.replace(".iam.gserviceaccount.com", "").trim();
    if (derived) return derived;
  }

  return "leafly-database";
}

/**
 * Verifies consistency between the resolved Firebase project ID and the service-account client email.
 */
export function checkProjectConsistency(): { consistent: boolean; warning?: string } {
  const projectId = getFirebaseProjectId();
  const clientEmail = getClientEmail();
  if (clientEmail && clientEmail.includes("@") && clientEmail.includes(".iam.gserviceaccount.com")) {
    const domainPart = clientEmail.split("@")[1];
    const emailProject = domainPart.replace(".iam.gserviceaccount.com", "").trim();
    if (emailProject && projectId && emailProject.toLowerCase() !== projectId.toLowerCase()) {
      return {
        consistent: false,
        warning: `Project ID mismatch: resolved projectId "${projectId}" differs from client email service account project "${emailProject}".`,
      };
    }
  }
  return { consistent: true };
}

/**
 * Resolves the Firestore Database ID across supported environment variables.
 * Defaults to '(default)'.
 */
export function getFirestoreDatabaseId(): string {
  return stripWrappingQuotes(
    process.env.FIRESTORE_DATABASE_ID ||
    process.env.FIREBASE_DATABASE_ID ||
    "(default)"
  );
}

/**
 * Resolves the Firebase Web API Key for client REST fallbacks.
 */
export function getFirebaseApiKey(): string {
  return stripWrappingQuotes(
    process.env.VITE_FIREBASE_API_KEY ||
    process.env.FIREBASE_API_KEY ||
    "AIzaSyBP0byX7fmi8SoXATR1tiXozTUsXLzYKWw"
  );
}

/**
 * Resolves the Google Service Account Client Email across supported environment variables.
 */
export function getClientEmail(): string | undefined {
  const email = stripWrappingQuotes(
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL ||
    process.env.FIREBASE_CLIENT_EMAIL ||
    process.env.FIREBASE_SERVICE_ACCOUNT_EMAIL ||
    process.env.GOOGLE_CLIENT_EMAIL ||
    process.env.CLIENT_EMAIL ||
    ""
  );

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

  if (!key) return undefined;
  const stripped = stripWrappingQuotes(key);
  return stripped || undefined;
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

  if (!json) return undefined;
  const stripped = stripWrappingQuotes(json);
  return stripped || undefined;
}

/**
 * Safely validates whether a string is a valid, parseable private key in PEM format.
 * Uses Node's native crypto module without ever logging, printing, or exposing key data.
 */
export function validatePrivateKeyPem(key?: string): { valid: boolean; error?: string } {
  if (!key || typeof key !== "string" || key.trim().length === 0) {
    return { valid: false, error: "Private key is missing or empty." };
  }
  try {
    createPrivateKey(key);
    return { valid: true };
  } catch (err) {
    const safeMsg = sanitizeLogMessage(err instanceof Error ? err.message : String(err));
    return { valid: false, error: safeMsg };
  }
}

/**
 * Bulletproof private-key normalization for Vercel, Docker, and local .env files.
 * Correctly handles:
 * - Literal escaped newlines ("\n", "\\n", "\\\n", "\\\\n")
 * - Windows CRLF linebreaks ("\r\n", "\\r\\n")
 * - Wrapped single, double, or escaped quotes
 * - Accidental pasting of full Service Account JSON into the private key env var
 * - Base64 encoded PEM keys
 * - Missing boundary newlines after BEGIN and before END headers
 * - Accidental whitespace padding and trailing backslashes on individual lines
 * - Reconstructing PEM boundaries for raw base64 key bodies
 * - Automatic PKCS#8 vs PKCS#1 header swap verification with Node crypto
 */
export function formatPrivateKey(key: string): string {
  if (!key) return "";
  let cleaned = stripWrappingQuotes(key);

  // If entire Service Account JSON was pasted into the private key env var
  if (cleaned.startsWith("{") && cleaned.includes("private_key")) {
    try {
      const obj = JSON.parse(cleaned);
      if (obj.private_key) {
        cleaned = stripWrappingQuotes(String(obj.private_key));
      }
    } catch {
      // Not JSON or parse failed; continue
    }
  }

  // If base64-encoded PEM, decode it
  if (!cleaned.includes("-----BEGIN") && cleaned.length > 60) {
    try {
      const decoded = Buffer.from(cleaned, "base64").toString("utf-8");
      if (decoded.includes("-----BEGIN")) {
        cleaned = stripWrappingQuotes(decoded);
      }
    } catch {
      // Not base64
    }
  }

  // Handle literal escaped newlines with any number of backslashes (e.g. \n, \\n, \\\n, \\\\n)
  cleaned = cleaned
    .replace(/\\+r\\+n/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\\+n/g, "\n")
    .replace(/\\+r/g, "\n")
    .replace(/\r/g, "\n");

  // Strip wrapping quotes again in case unescaping exposed them
  cleaned = stripWrappingQuotes(cleaned);

  // If the key has no PEM headers at all (raw base64 body), reconstruct PKCS#8 PEM
  if (!cleaned.includes("-----BEGIN")) {
    const rawBody = cleaned.replace(/[\s\\]+/g, "");
    cleaned = `-----BEGIN PRIVATE KEY-----\n${rawBody}\n-----END PRIVATE KEY-----`;
  } else {
    // Ensure standard PEM header and footer have clean line breaks
    cleaned = cleaned
      .replace(/-----BEGIN (?:RSA )?PRIVATE KEY-----\s*/g, (match) => match.trim() + "\n")
      .replace(/\s*-----END (?:RSA )?PRIVATE KEY-----/g, (match) => "\n" + match.trim());
  }

  // Clean each line, stripping any accidental surrounding whitespace and trailing backslashes, and remove blank lines
  const lines = cleaned
    .split("\n")
    .map((line) => line.trim().replace(/\\+$/, "").trim())
    .filter(Boolean);

  let normalized = lines.join("\n");

  // Verify whether native createPrivateKey accepts it; if not and it's RSA PKCS#1 vs PKCS#8, try switching header
  try {
    createPrivateKey(normalized);
    return normalized;
  } catch {
    if (normalized.includes("BEGIN PRIVATE KEY")) {
      const alt = normalized
        .replace("BEGIN PRIVATE KEY", "BEGIN RSA PRIVATE KEY")
        .replace("END PRIVATE KEY", "END RSA PRIVATE KEY");
      try {
        createPrivateKey(alt);
        return alt;
      } catch {
        // Fall through
      }
    } else if (normalized.includes("BEGIN RSA PRIVATE KEY")) {
      const alt = normalized
        .replace("BEGIN RSA PRIVATE KEY", "BEGIN PRIVATE KEY")
        .replace("END RSA PRIVATE KEY", "END PRIVATE KEY");
      try {
        createPrivateKey(alt);
        return alt;
      } catch {
        // Fall through
      }
    }
  }

  return normalized;
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

let lastAdminInitError: string | null = null;

export function getLastAdminInitError(): string | null {
  return lastAdminInitError;
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
  projectConsistent?: boolean;
  reason?: string;
  lastError?: string;
} {
  const projectId = getFirebaseProjectId();
  const databaseId = getFirestoreDatabaseId();
  const rawServiceAccount = getServiceAccountJson();
  const clientEmail = getClientEmail();
  const rawPrivateKey = getRawPrivateKey();
  const consistency = checkProjectConsistency();

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
      projectConsistent: consistency.consistent,
      lastError: lastAdminInitError || undefined,
    };
  }

  const hasEmail = Boolean(clientEmail);
  const isSaEmail = Boolean(clientEmail && clientEmail.includes(".gserviceaccount.com"));
  const hasKey = Boolean(rawPrivateKey);
  let keyValidFormat = false;
  let keyValidationError: string | undefined;

  if (hasKey && rawPrivateKey) {
    const formatted = formatPrivateKey(rawPrivateKey);
    const validation = validatePrivateKeyPem(formatted);
    keyValidFormat = validation.valid;
    keyValidationError = validation.error;
  }

  if (hasEmail && hasKey) {
    let reasonText: string | undefined;
    if (!keyValidFormat) {
      reasonText = `Private key is present but invalid (${keyValidationError || "cannot be parsed by crypto"}).`;
    } else if (!consistency.consistent) {
      reasonText = consistency.warning;
    }

    return {
      configured: keyValidFormat,
      strategy: "env_credentials",
      projectId,
      databaseId,
      hasClientEmail: hasEmail,
      isServiceAccountEmail: isSaEmail,
      hasPrivateKey: hasKey,
      privateKeyValidFormat: keyValidFormat,
      projectConsistent: consistency.consistent,
      reason: reasonText,
      lastError: lastAdminInitError || undefined,
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
      projectConsistent: true,
      lastError: lastAdminInitError || undefined,
    };
  }

  const missing: string[] = [];
  if (!hasEmail) missing.push("FIREBASE_ADMIN_CLIENT_EMAIL");
  if (!hasKey) missing.push("FIREBASE_ADMIN_PRIVATE_KEY");

  return {
    configured: false,
    strategy: "none",
    projectId,
    databaseId,
    hasClientEmail: hasEmail,
    isServiceAccountEmail: isSaEmail,
    hasPrivateKey: hasKey,
    privateKeyValidFormat: keyValidFormat,
    projectConsistent: consistency.consistent,
    reason: `Missing server-side Firebase Admin credentials (${missing.join(", ")}).`,
    lastError: lastAdminInitError || undefined,
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
  const existingApps = getApps();
  if (existingApps.length > 0) {
    return existingApps[0];
  }

  if (!hasAdminCredentials()) {
    return null;
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
      lastAdminInitError = null;
      return app;
    } catch (e) {
      const safeMsg = sanitizeLogMessage(e instanceof Error ? e.message : String(e));
      lastAdminInitError = `JSON initialization error: ${safeMsg}`;
      console.error(`[Firebase Admin Error] Could not parse or initialize Service Account JSON: ${safeMsg}`);
      const appsAfter = getApps();
      if (appsAfter.length > 0) return appsAfter[0];
    }
  }

  // Strategy 2: Client Email + Private Key environment variables
  if (clientEmail && rawPrivateKey) {
    const consistency = checkProjectConsistency();
    if (!consistency.consistent && consistency.warning) {
      console.warn(`[Firebase Admin Warning] ${consistency.warning}`);
    }

    const privateKey = formatPrivateKey(rawPrivateKey);
    const keyValidation = validatePrivateKeyPem(privateKey);
    if (!keyValidation.valid) {
      const err = `Private key validation failed: ${keyValidation.error || "unparseable PEM key"}`;
      lastAdminInitError = err;
      console.error(`[Firebase Admin Error] ${err}`);
      return null;
    }

    try {
      const app = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        projectId,
      });
      console.info(`[Firebase Admin] Initialized using Service Account environment credentials for project "${projectId}".`);
      lastAdminInitError = null;
      return app;
    } catch (e) {
      const safeMsg = sanitizeLogMessage(e instanceof Error ? e.message : String(e));
      lastAdminInitError = `Cert credentials error: ${safeMsg}`;
      console.error(`[Firebase Admin Error] Failed to initialize credentials with cert(): ${safeMsg}`);
      const appsAfter = getApps();
      if (appsAfter.length > 0) return appsAfter[0];
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
        lastAdminInitError = null;
        return app;
      } else {
        console.warn("[Firebase Admin Notice] GOOGLE_APPLICATION_CREDENTIALS file path does not exist.");
      }
    } catch (e) {
      const safeMsg = sanitizeLogMessage(e instanceof Error ? e.message : String(e));
      lastAdminInitError = `ADC file error: ${safeMsg}`;
      console.error(`[Firebase Admin Error] Could not load GOOGLE_APPLICATION_CREDENTIALS: ${safeMsg}`);
      const appsAfter = getApps();
      if (appsAfter.length > 0) return appsAfter[0];
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
      lastAdminInitError = null;
      return app;
    } catch (e) {
      const safeMsg = sanitizeLogMessage(e instanceof Error ? e.message : String(e));
      lastAdminInitError = `GCP ADC error: ${safeMsg}`;
      console.error(`[Firebase Admin Error] GCP ApplicationDefault attempt failed: ${safeMsg}`);
      const appsAfter = getApps();
      if (appsAfter.length > 0) return appsAfter[0];
    }
  }

  return null;
}

let mockFirestoreInstance: any = null;

export function setMockFirestoreForTesting(mock: any) {
  mockFirestoreInstance = mock;
}

export function getAdminFirestore(): Firestore | null {
  if (mockFirestoreInstance) {
    return mockFirestoreInstance;
  }
  const app = initAdminApp();
  if (!app) return null;
  try {
    const databaseId = getFirestoreDatabaseId();
    return databaseId && databaseId !== "(default)"
      ? getFirestore(app, databaseId)
      : getFirestore(app);
  } catch (e) {
    const safeMsg = sanitizeLogMessage(e instanceof Error ? e.message : String(e));
    lastAdminInitError = `Firestore instance error: ${safeMsg}`;
    console.error(`[Firebase Admin Error] Could not obtain Firestore instance: ${safeMsg}`);
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
    lastAdminInitError = `Auth instance error: ${safeMsg}`;
    console.error(`[Firebase Admin Error] Could not obtain Auth instance: ${safeMsg}`);
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
  let adminWriteError: string | null = null;
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
      adminWriteError = safeMsg;
      console.error(`[Firebase Admin Error] Admin SDK write failed for order #${orderId}: ${safeMsg}`);
      console.warn(`[Firebase Admin Notice] Attempting fallback order persistence mechanisms for #${orderId}...`);
    }
  } else {
    const configReport = getAdminConfigStatus();
    console.warn(
      `[Firebase Admin Notice] Admin SDK Firestore unavailable for order #${orderId}. Reason: ${
        configReport.reason || configReport.lastError || "Uninitialized"
      }`
    );
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

  // Note: Unauthenticated guest REST writes are strictly prohibited to maintain database integrity
  // and honor Firestore security rules. Server order persistence requires authoritative Admin SDK privileges.

  const configReport = getAdminConfigStatus();

  // Safe, structured server-side diagnostic logging (Credentials and private keys are NEVER logged)
  console.error(
    `[Firebase Admin Checkout Error] Failed to persist order #${orderId}. ` +
    `ConfigStatus: configured=${configReport.configured}, strategy=${configReport.strategy}, ` +
    `hasEmail=${configReport.hasClientEmail}, hasKey=${configReport.hasPrivateKey}, ` +
    `keyFormatValid=${configReport.privateKeyValidFormat}. ` +
    (configReport.reason ? `Reason: "${configReport.reason}". ` : "") +
    (configReport.lastError ? `LastInitError: "${configReport.lastError}". ` : "") +
    (adminWriteError ? `AdminWriteError: "${adminWriteError}". ` : "") +
    (!configReport.configured
      ? "Note: If environment variables were recently added/updated in Vercel, a new Production deployment is required to inject them into the serverless runtime."
      : "")
  );

  return {
    success: false,
    error: "Database write could not be completed. Server Firebase Admin credentials are not properly configured.",
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

