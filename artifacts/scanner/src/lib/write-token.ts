export const SCANNER_WRITE_TOKEN_STORAGE_KEY = "scannerWriteToken";

export function getStoredScannerWriteToken(): string | null {
  if (typeof window === "undefined") return null;

  const token = window.localStorage
    .getItem(SCANNER_WRITE_TOKEN_STORAGE_KEY)
    ?.trim();

  return token || null;
}
