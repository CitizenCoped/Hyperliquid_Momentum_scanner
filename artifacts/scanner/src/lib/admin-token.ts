import { setAuthTokenGetter } from "@workspace/api-client-react";

const STORAGE_KEY = "scanner-admin-token";

export function getAdminToken(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(STORAGE_KEY) ?? "";
}

export function setAdminToken(token: string): void {
  if (typeof window === "undefined") return;
  const trimmed = token.trim();
  if (trimmed) {
    window.localStorage.setItem(STORAGE_KEY, trimmed);
  } else {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

export function isUnauthorizedError(err: unknown): boolean {
  if (!err || typeof err !== "object" || !("status" in err)) return false;
  const status = (err as { status?: unknown }).status;
  return status === 401 || status === 503;
}

setAuthTokenGetter(() => getAdminToken().trim() || null);
