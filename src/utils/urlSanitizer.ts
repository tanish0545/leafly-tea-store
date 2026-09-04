/**
 * Leafly — URL Sanitizer
 * Strips sensitive auth tokens, credentials, or Firebase API key query parameters
 * that may appear during OAuth redirects, ensuring the customer URL remains pristine.
 */
export function sanitizeAuthUrl(): void {
  if (typeof window === "undefined") return;

  const sensitiveKeys = [
    "apikey",
    "api_key",
    "key",
    "authtype",
    "appname",
    "providerid",
    "token",
    "access_token",
    "id_token",
    "code",
    "state",
    "authuser",
    "prompt",
    "session_state",
    "oauth_token",
    "oauth_verifier",
  ];
  let changed = false;

  try {
    const url = new URL(window.location.href);

    // 1. Clean query search params
    for (const key of sensitiveKeys) {
      if (url.searchParams.has(key)) {
        url.searchParams.delete(key);
        changed = true;
      }
    }

    // 2. Clean hash if it contains sensitive keys
    let cleanHash = url.hash;
    if (cleanHash && sensitiveKeys.some((k) => cleanHash.toLowerCase().includes(k))) {
      const hashContent = cleanHash.startsWith("#") ? cleanHash.slice(1) : cleanHash;
      if (hashContent.includes("=")) {
        const hashParams = new URLSearchParams(hashContent);
        let hashChanged = false;
        for (const key of sensitiveKeys) {
          if (hashParams.has(key)) {
            hashParams.delete(key);
            hashChanged = true;
          }
        }
        if (hashChanged) {
          const newHash = hashParams.toString();
          cleanHash = newHash ? `#${newHash}` : "";
          changed = true;
        }
      }
    }

    if (changed) {
      const cleanSearch = url.searchParams.toString();
      const cleanUrl = url.pathname + (cleanSearch ? `?${cleanSearch}` : "") + cleanHash;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  } catch {
    // Ignore URL parse errors
  }
}
