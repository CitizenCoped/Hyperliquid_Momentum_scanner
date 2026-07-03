export const SCANNER_WRITE_TOKEN_STORAGE_KEY = "scanner.writeToken";

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getScannerWriteToken(): string | null {
  if (!canUseLocalStorage()) return null;

  const token = window.localStorage
    .getItem(SCANNER_WRITE_TOKEN_STORAGE_KEY)
    ?.trim();

  return token || null;
}

export function setScannerWriteToken(token: string): void {
  if (!canUseLocalStorage()) return;

  const trimmed = token.trim();
  if (trimmed) {
    window.localStorage.setItem(SCANNER_WRITE_TOKEN_STORAGE_KEY, trimmed);
  } else {
    window.localStorage.removeItem(SCANNER_WRITE_TOKEN_STORAGE_KEY);
  }
}
