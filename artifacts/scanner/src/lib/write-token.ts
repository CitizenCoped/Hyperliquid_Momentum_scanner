export const SCANNER_WRITE_TOKEN_STORAGE_KEY = "scanner-write-token";

export function getScannerWriteToken(): string | null {
  if (typeof window === "undefined") return null;

  const token = window.localStorage
    .getItem(SCANNER_WRITE_TOKEN_STORAGE_KEY)
    ?.trim();

  return token ? token : null;
}

export function setScannerWriteToken(token: string): void {
  if (typeof window === "undefined") return;

  const normalized = token.trim();
  if (normalized) {
    window.localStorage.setItem(SCANNER_WRITE_TOKEN_STORAGE_KEY, normalized);
  } else {
    window.localStorage.removeItem(SCANNER_WRITE_TOKEN_STORAGE_KEY);
  }
}
