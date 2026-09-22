/**
 * Leafly — Cashfree Server Configuration & Utilities
 * 
 * SECURITY:
 * - Credentials are read strictly from server process.env
 * - Never expose CASHFREE_CLIENT_SECRET to client
 * - Configurable API version (defaults to current supported Cashfree PG version)
 */

// Use currently supported Cashfree API version from official Cashfree SDK / current API reference (2026-01-01)
// Can be overridden via CASHFREE_API_VERSION in server environment
export const CASHFREE_API_VERSION = process.env.CASHFREE_API_VERSION || "2026-01-01";

export function getCashfreeBaseUrl(): string {
  if (process.env.CASHFREE_BASE_URL) {
    return process.env.CASHFREE_BASE_URL.replace(/\/+$/, "");
  }
  const isProduction = (process.env.CASHFREE_ENV || "").toLowerCase() === "production";
  return isProduction
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";
}

export function getCashfreeHeaders(): Record<string, string> {
  const clientId = process.env.CASHFREE_CLIENT_ID?.trim();
  const clientSecret = process.env.CASHFREE_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing Cashfree credentials. Please ensure CASHFREE_CLIENT_ID and CASHFREE_CLIENT_SECRET are set in server environment."
    );
  }

  return {
    "x-client-id": clientId,
    "x-client-secret": clientSecret,
    "x-api-version": CASHFREE_API_VERSION,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

export function sanitizePhoneForCashfree(phone?: string): string {
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

export function sanitizeCustomerId(id?: string): string {
  if (!id) return `cust_${Date.now()}`;
  const cleaned = id.replace(/[^a-zA-Z0-9_-]/g, "");
  return cleaned.slice(0, 50) || `cust_${Date.now()}`;
}
