const ADMIN_TOKEN_STORAGE_KEY = "scanner-admin-token";

export function getStoredAdminToken(): string | null {
  return window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
}

export function isUnauthorizedError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { status?: unknown }).status === 401
  );
}

export function promptForAdminToken(): boolean {
  const token = window
    .prompt("Admin token required. Enter SCANNER_ADMIN_TOKEN or SESSION_SECRET:")
    ?.trim();
  if (!token) return false;

  window.localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
  return true;
}
