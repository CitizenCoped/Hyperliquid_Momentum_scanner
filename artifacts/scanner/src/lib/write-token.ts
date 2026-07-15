export const SCANNER_WRITE_TOKEN_STORAGE_KEY = "scannerWriteToken";

export function getScannerWriteToken(): string | null {
  const token = window.localStorage
    .getItem(SCANNER_WRITE_TOKEN_STORAGE_KEY)
    ?.trim();

  return token || null;
}

export function setScannerWriteToken(token: string): void {
  const trimmed = token.trim();

  if (trimmed) {
    window.localStorage.setItem(SCANNER_WRITE_TOKEN_STORAGE_KEY, trimmed);
    return;
  }

  window.localStorage.removeItem(SCANNER_WRITE_TOKEN_STORAGE_KEY);
}
