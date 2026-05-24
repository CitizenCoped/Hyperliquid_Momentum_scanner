export const ADMIN_TOKEN_STORAGE_KEY = "hyperliquidScannerAdminToken";

export function getStoredAdminToken(): string {
  return window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) ?? "";
}

export function storeAdminToken(token: string): void {
  const trimmed = token.trim();
  if (trimmed) {
    window.localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, trimmed);
  } else {
    window.localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
  }
}
