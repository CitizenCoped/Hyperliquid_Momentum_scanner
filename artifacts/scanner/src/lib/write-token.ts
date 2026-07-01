import { setAuthTokenGetter } from "@workspace/api-client-react";

const SCANNER_WRITE_TOKEN_STORAGE_KEY = "scanner.writeToken";

export function getScannerWriteToken(): string | null {
  if (typeof window === "undefined") return null;

  const token = window.localStorage
    .getItem(SCANNER_WRITE_TOKEN_STORAGE_KEY)
    ?.trim();

  return token || null;
}

export function setScannerWriteToken(token: string): void {
  if (typeof window === "undefined") return;

  const trimmed = token.trim();
  if (trimmed) {
    window.localStorage.setItem(SCANNER_WRITE_TOKEN_STORAGE_KEY, trimmed);
  } else {
    window.localStorage.removeItem(SCANNER_WRITE_TOKEN_STORAGE_KEY);
  }
}

export function configureScannerWriteTokenAuth(): void {
  setAuthTokenGetter(() => getScannerWriteToken());
}
