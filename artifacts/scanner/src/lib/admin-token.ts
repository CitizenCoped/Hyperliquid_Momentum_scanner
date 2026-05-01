import { setAuthTokenGetter } from "@workspace/api-client-react";

export const ADMIN_TOKEN_STORAGE_KEY = "scanner-admin-token";

export function getStoredAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY)?.trim();
  return token || null;
}

export function setStoredAdminToken(token: string): void {
  window.localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token.trim());
}

export function clearStoredAdminToken(): void {
  window.localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
}

export function installAdminTokenAuth(): void {
  setAuthTokenGetter(getStoredAdminToken);
}
