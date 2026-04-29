import { setAuthTokenGetter } from "@workspace/api-client-react";

export const ADMIN_TOKEN_STORAGE_KEY = "scannerAdminToken";

export function getAdminToken(): string {
  return typeof localStorage === "undefined"
    ? ""
    : localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) ?? "";
}

export function setAdminToken(token: string): void {
  const trimmed = token.trim();
  if (trimmed) {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, trimmed);
    }
    setAuthTokenGetter(() => trimmed);
  } else {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
    }
    setAuthTokenGetter(null);
  }
}

setAdminToken(getAdminToken());
