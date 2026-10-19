/// <reference types="node" />
/**
 * Leafly — Razorpay Server Configuration & Security Utilities
 * 
 * SECURITY RULES:
 * - Credentials are read strictly from server process.env (never exposed via VITE_ prefix to client)
 * - Razorpay Key Secret is NEVER sent to the client, logged, or stored in client-accessible state
 * - Environment integrity is strictly enforced: Test keys and Live keys are never mixed
 * - Signatures are verified using cryptographically secure timingSafeEqual (HMAC-SHA256)
 * - Safe diagnostic reporting: Never logs complete secrets, authorization headers, or private keys
 */

import crypto from "node:crypto";

export const RAZORPAY_API_BASE_URL = "https://api.razorpay.com/v1";

/**
 * Diagnostic tracking of environment variable resolution.
 */
export interface EnvResolution {
  value: string;
  source: string;
  rawLength: number;
  hadWhitespace: boolean;
  hadWrappingQuotes: boolean;
}

/**
 * Safely cleans an environment variable value:
 * - Strips leading/trailing whitespace, newlines (\n), and carriage returns (\r)
 * - Strips wrapping quotes (' " \") commonly introduced during copy-paste in Vercel dashboard
 */
export function cleanCredential(val?: string | null): {
  cleaned: string;
  hadWhitespace: boolean;
  hadWrappingQuotes: boolean;
} {
  if (!val) return { cleaned: "", hadWhitespace: false, hadWrappingQuotes: false };
  const original = String(val);
  let cleaned = original.trim();
  const hadWhitespace = original !== cleaned;
  let hadWrappingQuotes = false;

  while (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'")) ||
    (cleaned.startsWith('\\"') && cleaned.endsWith('\\"'))
  ) {
    hadWrappingQuotes = true;
    if (cleaned.startsWith('\\"')) {
      cleaned = cleaned.slice(2, -2).trim();
    } else {
      cleaned = cleaned.slice(1, -1).trim();
    }
  }

  return {
    cleaned: cleaned.trim(),
    hadWhitespace: hadWhitespace || cleaned !== original.trim(),
    hadWrappingQuotes,
  };
}

/**
 * Resolves the Razorpay Key ID across supported canonical names and aliases.
 * Priority:
 * 1. Any candidate with a Live Key (starts with "rzp_live_") is prioritized over Test Keys.
 *    This ensures that setting a Live Key in Vercel or .env is NEVER masked by a stale test alias.
 * 2. If no Live Key exists, evaluates canonical order:
 *    - RAZORPAY_KEY_ID
 *    - VITE_RAZORPAY_KEY_ID
 *    - RAZORPAY_API_KEY
 *    - RAZORPAY_KEY
 */
export function resolveRazorpayKeyId(): EnvResolution & {
  conflictingModesDetected: boolean;
  duplicateKeysFound: string[];
} {
  const candidates: Array<{ key: string; val: string | undefined }> = [
    { key: "RAZORPAY_KEY_ID", val: process.env.RAZORPAY_KEY_ID },
    { key: "VITE_RAZORPAY_KEY_ID", val: process.env.VITE_RAZORPAY_KEY_ID },
    { key: "RAZORPAY_API_KEY", val: process.env.RAZORPAY_API_KEY },
    { key: "RAZORPAY_KEY", val: process.env.RAZORPAY_KEY },
  ];

  const validCandidates: Array<{
    key: string;
    cleaned: string;
    rawLength: number;
    hadWhitespace: boolean;
    hadWrappingQuotes: boolean;
    isLive: boolean;
    isTest: boolean;
  }> = [];

  for (const c of candidates) {
    if (c.val && c.val.trim().length > 0) {
      const { cleaned, hadWhitespace, hadWrappingQuotes } = cleanCredential(c.val);
      if (cleaned.length > 0) {
        validCandidates.push({
          key: c.key,
          cleaned,
          rawLength: c.val.length,
          hadWhitespace,
          hadWrappingQuotes,
          isLive: cleaned.startsWith("rzp_live_"),
          isTest: cleaned.startsWith("rzp_test_"),
        });
      }
    }
  }

  const hasLive = validCandidates.some((c) => c.isLive);
  const hasTest = validCandidates.some((c) => c.isTest);
  const conflictingModesDetected = hasLive && hasTest;
  const duplicateKeysFound = validCandidates.map((c) => c.key);

  if (validCandidates.length === 0) {
    return {
      value: "",
      source: "",
      rawLength: 0,
      hadWhitespace: false,
      hadWrappingQuotes: false,
      conflictingModesDetected: false,
      duplicateKeysFound: [],
    };
  }

  // If ANY candidate has a Live Key, prefer the first Live Key candidate!
  // This explicitly prevents a stale RAZORPAY_KEY_ID=rzp_test_ from overriding a newly configured VITE_RAZORPAY_KEY_ID=rzp_live_
  const chosen = (hasLive ? validCandidates.find((c) => c.isLive) : validCandidates[0])!;

  return {
    value: chosen.cleaned,
    source: chosen.key,
    rawLength: chosen.rawLength,
    hadWhitespace: chosen.hadWhitespace,
    hadWrappingQuotes: chosen.hadWrappingQuotes,
    conflictingModesDetected,
    duplicateKeysFound,
  };
}

/**
 * Resolves the Razorpay Key Secret across supported canonical names and aliases.
 * Priority:
 * 1. Any candidate with a genuine (non-placeholder) secret is prioritized over placeholders.
 *    This ensures that setting a real Live secret is NEVER masked by a stale placeholder alias.
 * 2. If all are placeholders, returns the placeholder for strict validation error reporting.
 * Canonical order:
 * - RAZORPAY_KEY_SECRET
 * - RAZORPAY_SECRET
 * - RAZORPAY_SECRET_KEY
 * - RAZORPAY_API_SECRET
 * 
 * NEVER expose this value to client code.
 */
export function resolveRazorpayKeySecret(): EnvResolution & {
  duplicateSecretsFound: string[];
} {
  const candidates: Array<{ key: string; val: string | undefined }> = [
    { key: "RAZORPAY_KEY_SECRET", val: process.env.RAZORPAY_KEY_SECRET },
    { key: "RAZORPAY_SECRET", val: process.env.RAZORPAY_SECRET },
    { key: "RAZORPAY_SECRET_KEY", val: process.env.RAZORPAY_SECRET_KEY },
    { key: "RAZORPAY_API_SECRET", val: process.env.RAZORPAY_API_SECRET },
  ];

  const validCandidates: Array<{
    key: string;
    cleaned: string;
    rawLength: number;
    hadWhitespace: boolean;
    hadWrappingQuotes: boolean;
    isPlaceholder: boolean;
  }> = [];

  for (const c of candidates) {
    if (c.val && c.val.trim().length > 0) {
      const { cleaned, hadWhitespace, hadWrappingQuotes } = cleanCredential(c.val);
      if (cleaned.length > 0) {
        validCandidates.push({
          key: c.key,
          cleaned,
          rawLength: c.val.length,
          hadWhitespace,
          hadWrappingQuotes,
          isPlaceholder: isPlaceholderSecret(cleaned),
        });
      }
    }
  }

  const duplicateSecretsFound = validCandidates.map((c) => c.key);

  if (validCandidates.length === 0) {
    return {
      value: "",
      source: "",
      rawLength: 0,
      hadWhitespace: false,
      hadWrappingQuotes: false,
      duplicateSecretsFound: [],
    };
  }

  // Prefer the first candidate that is NOT a placeholder
  const nonPlaceholder = validCandidates.find((c) => !c.isPlaceholder);
  const chosen = nonPlaceholder || validCandidates[0];

  return {
    value: chosen.cleaned,
    source: chosen.key,
    rawLength: chosen.rawLength,
    hadWhitespace: chosen.hadWhitespace,
    hadWrappingQuotes: chosen.hadWrappingQuotes,
    duplicateSecretsFound,
  };
}

/**
 * Resolves the Razorpay Webhook Secret across supported canonical names and aliases.
 */
export function resolveRazorpayWebhookSecret(): EnvResolution {
  const candidates: Array<{ key: string; val: string | undefined }> = [
    { key: "RAZORPAY_WEBHOOK_SECRET", val: process.env.RAZORPAY_WEBHOOK_SECRET },
    { key: "RAZORPAY_WEBHOOK_KEY", val: process.env.RAZORPAY_WEBHOOK_KEY },
  ];

  for (const c of candidates) {
    if (c.val && c.val.trim().length > 0) {
      const { cleaned, hadWhitespace, hadWrappingQuotes } = cleanCredential(c.val);
      if (cleaned.length > 0) {
        return {
          value: cleaned,
          source: c.key,
          rawLength: c.val.length,
          hadWhitespace,
          hadWrappingQuotes,
        };
      }
    }
  }

  // Fallback to resolved key secret if dedicated webhook secret is omitted
  const secretRes = resolveRazorpayKeySecret();
  if (secretRes.value) {
    return {
      value: secretRes.value,
      source: `${secretRes.source} (fallback)`,
      rawLength: secretRes.rawLength,
      hadWhitespace: secretRes.hadWhitespace,
      hadWrappingQuotes: secretRes.hadWrappingQuotes,
    };
  }

  return {
    value: "",
    source: "",
    rawLength: 0,
    hadWhitespace: false,
    hadWrappingQuotes: false,
  };
}

/**
 * Resolves the cleaned Razorpay Key ID string.
 */
export function getRazorpayKeyId(): string {
  return resolveRazorpayKeyId().value;
}

/**
 * Resolves the cleaned Razorpay Key Secret string (Server-Only).
 */
export function getRazorpayKeySecret(): string {
  return resolveRazorpayKeySecret().value;
}

/**
 * Resolves the cleaned Razorpay Webhook Secret string (Server-Only).
 */
export function getRazorpayWebhookSecret(): string {
  return resolveRazorpayWebhookSecret().value;
}

/**
 * Detects whether a key secret is an unauthenticated mock or template placeholder.
 */
export function isPlaceholderSecret(secret: string): boolean {
  if (!secret) return false;
  const s = secret.toLowerCase().trim();
  if (s === "test_secret" || s === "test_secret_leafly" || s === "test_secret_here") {
    return true;
  }
  const knownPlaceholders = [
    "test_secret_leafly",
    "placeholder",
    "your_secret",
    "your_key_secret",
    "your_secret_here",
    "yourtestkeyhere",
    "dummy_secret",
    "replace_with",
  ];
  return knownPlaceholders.some((ph) => s.includes(ph));
}

/**
 * Detects whether the current configuration is in Test Mode, Live Mode, or unconfigured.
 */
export function getRazorpayMode(): "test" | "live" | "invalid" | "unconfigured" {
  const keyId = getRazorpayKeyId();
  if (!keyId) return "unconfigured";
  if (keyId.startsWith("rzp_live_")) return "live";
  if (keyId.startsWith("rzp_test_")) return "test";
  return "invalid";
}

/**
 * Detects whether Live Mode is strictly required.
 * True when running on Vercel Production, NODE_ENV=production, or RAZORPAY_ENV=live/production.
 * By default for Leafly, Live Mode is required unless RAZORPAY_ALLOW_TEST_MODE=true in local development.
 */
export function isLiveModeRequired(): boolean {
  const vercelEnv = (process.env.VERCEL_ENV || "").toLowerCase();
  const nodeEnv = (process.env.NODE_ENV || "").toLowerCase();
  const razorpayEnv = (process.env.RAZORPAY_ENV || process.env.RAZORPAY_MODE || "").toLowerCase();

  if (vercelEnv === "production" || nodeEnv === "production" || razorpayEnv === "live" || razorpayEnv === "production") {
    return true;
  }

  // Enforce Live Mode by default unless explicitly opted into test mode for local non-production development
  return process.env.RAZORPAY_ALLOW_TEST_MODE !== "true";
}

/**
 * Safe diagnostic summary for Razorpay configuration.
 * Contains ZERO secrets, full credentials, or Authorization headers.
 */
export interface SafeRazorpayDiagnostics {
  mode: "test" | "live" | "invalid" | "unconfigured";
  liveEnforced: boolean;
  keyIdPresent: boolean;
  keyIdSource: string;
  keyIdPrefix: string;
  keyIdLength: number;
  keySecretPresent: boolean;
  keySecretSource: string;
  keySecretLength: number;
  keySecretMissing: boolean;
  isPlaceholderSecret: boolean;
  hasWhitespaceIssue: boolean;
  hasWrappingQuotesIssue: boolean;
  webhookSecretPresent: boolean;
  webhookSecretSource: string;
  conflictingModesDetected: boolean;
  duplicateKeySourcesFound: string[];
  duplicateSecretSourcesFound: string[];
}

/**
 * Generates safe diagnostics without exposing secrets.
 */
export function getSafeRazorpayDiagnostics(): SafeRazorpayDiagnostics {
  const keyIdRes = resolveRazorpayKeyId();
  const keySecretRes = resolveRazorpayKeySecret();
  const webhookRes = resolveRazorpayWebhookSecret();

  let mode: "test" | "live" | "invalid" | "unconfigured" = "unconfigured";
  if (keyIdRes.value) {
    if (keyIdRes.value.startsWith("rzp_live_")) {
      mode = "live";
    } else if (keyIdRes.value.startsWith("rzp_test_")) {
      mode = "test";
    } else {
      mode = "invalid";
    }
  }

  return {
    mode,
    liveEnforced: isLiveModeRequired(),
    keyIdPresent: Boolean(keyIdRes.value),
    keyIdSource: keyIdRes.source,
    keyIdPrefix: keyIdRes.value ? keyIdRes.value.slice(0, 9) : "",
    keyIdLength: keyIdRes.value.length,
    keySecretPresent: Boolean(keySecretRes.value),
    keySecretSource: keySecretRes.source,
    keySecretLength: keySecretRes.value.length,
    keySecretMissing: !keySecretRes.value,
    isPlaceholderSecret: isPlaceholderSecret(keySecretRes.value),
    hasWhitespaceIssue: keyIdRes.hadWhitespace || keySecretRes.hadWhitespace,
    hasWrappingQuotesIssue: keyIdRes.hadWrappingQuotes || keySecretRes.hadWrappingQuotes,
    webhookSecretPresent: Boolean(webhookRes.value),
    webhookSecretSource: webhookRes.source,
    conflictingModesDetected: keyIdRes.conflictingModesDetected,
    duplicateKeySourcesFound: keyIdRes.duplicateKeysFound,
    duplicateSecretSourcesFound: keySecretRes.duplicateSecretsFound,
  };
}

/**
 * Validates Razorpay credentials, catches placeholders, and strictly enforces Live Mode in production.
 */
export function validateRazorpayConfig(): {
  valid: boolean;
  mode: "test" | "live" | "invalid" | "unconfigured";
  keyId: string;
  error?: string;
  diagnosticDetails?: SafeRazorpayDiagnostics;
} {
  const diag = getSafeRazorpayDiagnostics();
  const keyId = getRazorpayKeyId();
  const keySecret = getRazorpayKeySecret();
  const liveRequired = isLiveModeRequired();

  if (!keyId) {
    return {
      valid: false,
      mode: "unconfigured",
      keyId: "",
      error: "Missing RAZORPAY_KEY_ID in server environment. Please set RAZORPAY_KEY_ID in Vercel.",
      diagnosticDetails: diag,
    };
  }

  // Strict Live Mode enforcement in Production
  if (liveRequired) {
    if (diag.mode === "test") {
      return {
        valid: false,
        mode: "test",
        keyId,
        error: "Test Mode credentials (rzp_test_...) are strictly prohibited in Production. Leafly requires active Live Mode credentials (rzp_live_...). Please configure RAZORPAY_KEY_ID with the Live Key ID in Vercel Project Settings.",
        diagnosticDetails: diag,
      };
    }

    if (!keyId.startsWith("rzp_live_")) {
      return {
        valid: false,
        mode: diag.mode,
        keyId,
        error: `Invalid Live Key ID prefix ("${diag.keyIdPrefix}..."). Leafly Production requires a Key ID beginning with "rzp_live_".`,
        diagnosticDetails: diag,
      };
    }
  }

  if (diag.mode === "invalid") {
    return {
      valid: false,
      mode: "invalid",
      keyId,
      error: `Invalid Razorpay Key ID prefix ("${diag.keyIdPrefix}..."). Key ID must start with "rzp_live_".`,
      diagnosticDetails: diag,
    };
  }

  if (!keySecret) {
    return {
      valid: false,
      mode: diag.mode,
      keyId,
      error: "Missing Razorpay Live Key Secret in server environment. Please configure RAZORPAY_KEY_SECRET with the matching Live Secret in Vercel.",
      diagnosticDetails: diag,
    };
  }

  if (diag.isPlaceholderSecret) {
    return {
      valid: false,
      mode: diag.mode,
      keyId,
      error: `RAZORPAY_KEY_SECRET is configured with a placeholder/mock value in "${diag.keySecretSource}". The real matching Live Key Secret from Razorpay Dashboard must be set in Vercel.`,
      diagnosticDetails: diag,
    };
  }

  // Safety check: Prevent accidental key/secret mismatch between test and live
  if (diag.mode === "live" && (keySecret.startsWith("test_") || keySecret.toLowerCase().includes("test"))) {
    return {
      valid: false,
      mode: diag.mode,
      keyId,
      error: "Mismatched Razorpay credentials: Live Key ID (rzp_live_) detected with Test Secret. Rejecting execution.",
      diagnosticDetails: diag,
    };
  }

  if (diag.mode === "test" && (keySecret.startsWith("live_") || keySecret.toLowerCase().includes("live"))) {
    return {
      valid: false,
      mode: diag.mode,
      keyId,
      error: "Mismatched Razorpay credentials: Test Key ID (rzp_test_) detected with Live Secret. Rejecting execution.",
      diagnosticDetails: diag,
    };
  }

  return {
    valid: true,
    mode: diag.mode,
    keyId,
    diagnosticDetails: diag,
  };
}

/**
 * Builds HTTP Basic Authentication header for Razorpay REST APIs.
 * Format: Authorization: Basic base64(key_id:key_secret)
 * Verified against official Razorpay Orders API specification.
 */
export function getRazorpayAuthHeaders(): Record<string, string> {
  const validation = validateRazorpayConfig();
  if (!validation.valid) {
    throw new Error(validation.error || "Invalid Razorpay configuration.");
  }

  const keyId = validation.keyId;
  const keySecret = getRazorpayKeySecret();
  // Standard Basic Auth: username:password base64-encoded
  const credentials = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  return {
    Authorization: `Basic ${credentials}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

/**
 * Verifies Razorpay HMAC-SHA256 payment signature.
 * Formula: HMAC-SHA256(order_id + "|" + payment_id, secret) === signature
 * 
 * Uses crypto.timingSafeEqual to prevent timing attacks.
 */
export function verifyRazorpayPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  if (!orderId || !paymentId || !signature) {
    return false;
  }

  const keySecret = getRazorpayKeySecret();
  if (!keySecret) {
    console.error("[Razorpay Security Alert] Cannot verify signature: RAZORPAY_KEY_SECRET is not configured.");
    return false;
  }

  try {
    const payload = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(payload)
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature, "utf-8");
    const providedBuffer = Buffer.from(signature, "utf-8");

    if (expectedBuffer.length !== providedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
  } catch (err) {
    console.error("[Razorpay Signature Error]:", err);
    return false;
  }
}

/**
 * Verifies Razorpay Webhook HMAC-SHA256 signature.
 * Formula: HMAC-SHA256(rawBody, webhookSecret) === x-razorpay-signature
 */
export function verifyRazorpayWebhookSignature(
  rawBody: string,
  signature: string
): boolean {
  if (!rawBody || !signature) {
    return false;
  }

  const webhookSecret = getRazorpayWebhookSecret();
  if (!webhookSecret) {
    console.error("[Razorpay Webhook Error] Webhook secret is not configured.");
    return false;
  }

  try {
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature, "utf-8");
    const providedBuffer = Buffer.from(signature, "utf-8");

    if (expectedBuffer.length !== providedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
  } catch (err) {
    console.error("[Razorpay Webhook Signature Error]:", err);
    return false;
  }
}

/**
 * Fetches authoritative payment details from the Razorpay API.
 */
export async function fetchRazorpayPayment(paymentId: string): Promise<Record<string, any> | null> {
  if (!paymentId) return null;

  try {
    const headers = getRazorpayAuthHeaders();
    const res = await fetch(`${RAZORPAY_API_BASE_URL}/payments/${encodeURIComponent(paymentId)}`, {
      method: "GET",
      headers,
    });

    if (!res.ok) {
      console.warn(`[Razorpay] Payment lookup for ${paymentId} returned status ${res.status}`);
      return null;
    }

    const data = await res.json();
    return data as Record<string, any>;
  } catch (err) {
    console.warn(`[Razorpay] Failed to fetch payment details for ${paymentId}:`, err);
    return null;
  }
}

/**
 * Sanitizes an Indian phone number for Razorpay checkout prefill.
 */
export function sanitizePhoneForRazorpay(phone?: string): string {
  if (!phone) return "9999999999";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length > 10 && digits.startsWith("91")) {
    return digits.slice(-10);
  }
  if (digits.length > 10) {
    return digits.slice(-10);
  }
  return digits.padEnd(10, "0");
}
