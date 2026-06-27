import { setAuthTokenGetter } from "@workspace/api-client-react";

const ADMIN_TOKEN_STORAGE_KEY = "hyperliquid-scanner-admin-token";

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

export function getStoredAdminToken(): string {
  if (!hasWindow()) return "";
  return window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) ?? "";
}

export function saveStoredAdminToken(token: string): void {
  if (!hasWindow()) return;
  const trimmed = token.trim();
  if (trimmed) {
    window.localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, trimmed);
  } else {
    window.localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
  }
}

export function configureAdminTokenAuth(): void {
  setAuthTokenGetter(() => {
    const token = getStoredAdminToken().trim();
    return token || null;
  });
}
