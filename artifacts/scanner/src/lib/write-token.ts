import { setAuthTokenGetter } from "@workspace/api-client-react";

export const SCANNER_WRITE_TOKEN_STORAGE_KEY = "scanner.writeToken";

export function getScannerWriteToken(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(SCANNER_WRITE_TOKEN_STORAGE_KEY) ?? "";
}

export function saveScannerWriteToken(token: string): void {
  if (typeof window === "undefined") return;

  const trimmed = token.trim();
  if (trimmed) {
    window.localStorage.setItem(SCANNER_WRITE_TOKEN_STORAGE_KEY, trimmed);
    return;
  }

  window.localStorage.removeItem(SCANNER_WRITE_TOKEN_STORAGE_KEY);
}

export function configureScannerWriteTokenAuth(): void {
  setAuthTokenGetter(() => {
    const token = getScannerWriteToken().trim();
    return token || null;
  });
}
