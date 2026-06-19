import { setAuthTokenGetter } from "@workspace/api-client-react";

const ADMIN_TOKEN_STORAGE_KEY = "scannerAdminToken";

export function getAdminToken(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) ?? "";
}

export function saveAdminToken(token: string): void {
  if (typeof window === "undefined") return;

  const trimmed = token.trim();
  if (trimmed) {
    window.localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, trimmed);
  } else {
    window.localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
  }
}

export function initializeAdminTokenAuth(): void {
  setAuthTokenGetter(() => {
    const token = getAdminToken();
    return token || null;
  });
}
