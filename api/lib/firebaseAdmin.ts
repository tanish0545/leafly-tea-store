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
import { initializeApp, getApps, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

export function formatPrivateKey(key: string): string {
  if (!key) return "";
  let cleaned = key.trim();
  // Remove wrapping double or single quotes if present
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1);
  }
  // Convert escaped literal newlines to actual newlines
  return cleaned.replace(/\\n/g, "\n");
}

export function hasAdminCredentials(): boolean {
  if (process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    return true;
  }
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;
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
  return false;
}

export function getAdminFirestore(): Firestore | null {
  const existingApps = getApps();
  if (existingApps.length === 0) {
    const projectId =
      process.env.FIREBASE_ADMIN_PROJECT_ID ||
      process.env.FIREBASE_PROJECT_ID ||
      process.env.VITE_FIREBASE_PROJECT_ID ||
      "leafly-database";

    const rawServiceAccount =
      process.env.FIREBASE_SERVICE_ACCOUNT ||
      process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    const clientEmail =
      process.env.FIREBASE_ADMIN_CLIENT_EMAIL ||
      process.env.FIREBASE_CLIENT_EMAIL;

    const rawPrivateKey =
      process.env.FIREBASE_ADMIN_PRIVATE_KEY ||
      process.env.FIREBASE_PRIVATE_KEY;

    if (rawServiceAccount) {
      try {
        let jsonStr = rawServiceAccount.trim();
        // Support base64 encoded JSON (common in Vercel environment variables)
        if (!jsonStr.startsWith("{") && !jsonStr.startsWith('"')) {
          try {
            jsonStr = Buffer.from(jsonStr, "base64").toString("utf-8");
          } catch {
            // Keep original string if not valid base64
          }
        }
        const parsed = JSON.parse(jsonStr);
        initializeApp({
          credential: cert(parsed),
          projectId: parsed.project_id || projectId,
        });
        console.info("[Firebase Admin] Initialized using Service Account JSON.");
      } catch (e) {
        console.warn("[Firebase Admin Notice] Could not parse FIREBASE_SERVICE_ACCOUNT JSON:", e instanceof Error ? e.message : String(e));
      }
    } else if (clientEmail && rawPrivateKey) {
      try {
        const privateKey = formatPrivateKey(rawPrivateKey);
        initializeApp({
          credential: cert({
            projectId,
            clientEmail: clientEmail.trim(),
            privateKey,
          }),
          projectId,
        });
        console.info("[Firebase Admin] Initialized using Service Account environment credentials.");
      } catch (e) {
        console.warn("[Firebase Admin Notice] Failed to initialize credentials with cert():", e instanceof Error ? e.message : String(e));
      }
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      try {
        if (fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
          initializeApp({
            credential: applicationDefault(),
            projectId,
          });
          console.info("[Firebase Admin] Initialized using GOOGLE_APPLICATION_CREDENTIALS file.");
        } else {
          console.warn("[Firebase Admin Notice] GOOGLE_APPLICATION_CREDENTIALS file path does not exist.");
        }
      } catch (e) {
        console.warn("[Firebase Admin Notice] Could not load applicationDefault():", e instanceof Error ? e.message : String(e));
      }
    } else {
      // No server credentials present.
      // Do NOT initialize without credentials in local dev / serverless, as unauthenticated
      // @google-cloud/firestore attempts to contact metadata server and causes uncaught exceptions.
      console.warn(
        "[Firebase Admin Notice] No server credentials found (FIREBASE_ADMIN_CLIENT_EMAIL & FIREBASE_ADMIN_PRIVATE_KEY or FIREBASE_SERVICE_ACCOUNT). Direct Admin Firestore updates will be unavailable until configured."
      );
      return null;
    }
  }

  const apps = getApps();
  if (apps.length === 0) {
    return null;
  }
  try {
    return getFirestore(apps[0]);
  } catch (e) {
    console.warn("[Firebase Admin Notice] Could not obtain Firestore instance:", e instanceof Error ? e.message : String(e));
    return null;
  }
}

export async function updateServerOrder(
  orderId: string,
  updates: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getAdminFirestore();
    if (!db) {
      const msg = "Firebase Admin credentials not configured on server (set FIREBASE_ADMIN_CLIENT_EMAIL and FIREBASE_ADMIN_PRIVATE_KEY).";
      console.warn(`[Firebase Admin Notice] Could not update order #${orderId}: ${msg}`);
      return { success: false, error: msg };
    }
    const cleanUpdates = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await db.collection("orders").doc(orderId).set(cleanUpdates, { merge: true });
    console.info(`[Firebase Admin] Successfully updated order #${orderId} in Firestore.`);
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`[Firebase Admin Notice] Could not update order #${orderId} directly via Admin SDK: ${msg}`);
    return { success: false, error: msg };
  }
}

export async function getServerOrder(
  orderId: string
): Promise<Record<string, unknown> | null> {
  try {
    const db = getAdminFirestore();
    if (!db) return null;
    const snap = await db.collection("orders").doc(orderId).get();
    if (snap.exists) {
      return { id: snap.id, ...snap.data() };
    }
    return null;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`[Firebase Admin Notice] Could not fetch order #${orderId} via Admin SDK: ${msg}`);
    return null;
  }
}
