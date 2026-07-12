import { setAuthTokenGetter } from "@workspace/api-client-react";

const SCANNER_WRITE_TOKEN_STORAGE_KEY = "scanner-write-token";

export function getScannerWriteToken(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(SCANNER_WRITE_TOKEN_STORAGE_KEY) ?? "";
}

export function setScannerWriteToken(token: string): void {
  window.localStorage.setItem(SCANNER_WRITE_TOKEN_STORAGE_KEY, token.trim());
}

export function configureScannerWriteTokenAuth(): void {
  setAuthTokenGetter(() => {
    const token = getScannerWriteToken().trim();
    return token === "" ? null : token;
  });
}
