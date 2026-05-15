import { setAuthTokenGetter } from "@workspace/api-client-react";

const STORAGE_KEY = "hyperliquid-scanner-admin-token";

function canUseSessionStorage(): boolean {
  if (typeof window === "undefined") return false;

  try {
    window.sessionStorage.getItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function getAdminToken(): string {
  if (!canUseSessionStorage()) return "";

  return window.sessionStorage.getItem(STORAGE_KEY) ?? "";
}

export function setAdminToken(token: string): void {
  if (!canUseSessionStorage()) return;

  const trimmed = token.trim();
  if (trimmed) {
    window.sessionStorage.setItem(STORAGE_KEY, trimmed);
  } else {
    window.sessionStorage.removeItem(STORAGE_KEY);
  }
}

export function isAdminAuthError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "status" in err &&
    ((err as { status?: unknown }).status === 401 ||
      (err as { status?: unknown }).status === 503)
  );
}

export function configureAdminTokenAuth(): void {
  setAuthTokenGetter(() => getAdminToken() || null);
}
