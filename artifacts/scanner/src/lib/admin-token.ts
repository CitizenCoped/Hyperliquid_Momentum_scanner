import { setAuthTokenGetter } from "@workspace/api-client-react";

const STORAGE_KEY = "hyperliquid-scanner-admin-token";

export function getAdminToken(): string {
  return window.sessionStorage.getItem(STORAGE_KEY) ?? "";
}

export function setAdminToken(token: string): void {
  const trimmed = token.trim();
  if (trimmed) {
    window.sessionStorage.setItem(STORAGE_KEY, trimmed);
  } else {
    window.sessionStorage.removeItem(STORAGE_KEY);
  }
}

export function clearAdminToken(): void {
  window.sessionStorage.removeItem(STORAGE_KEY);
}

export function isUnauthorizedError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "status" in err &&
    (err as { status?: unknown }).status === 401
  );
}

export function configureAdminTokenAuth(): void {
  setAuthTokenGetter(() =>
    typeof window === "undefined" ? null : window.sessionStorage.getItem(STORAGE_KEY),
  );
}
