export interface ScannerRuntimeStatus {
  lastUpdated: Date | null;
  lastError: string | null;
  scanIntervalSeconds: number;
}

const MIN_STALE_AFTER_MS = 30 * 1000;
const STALE_AFTER_INTERVALS = 2;

export type ScannerHealthStatus = "ok" | "degraded";

export function isScannerStale(
  status: ScannerRuntimeStatus,
  nowMs = Date.now(),
): boolean {
  if (!status.lastUpdated) return true;

  const staleAfterMs = Math.max(
    status.scanIntervalSeconds * 1000 * STALE_AFTER_INTERVALS,
    MIN_STALE_AFTER_MS,
  );

  return nowMs - status.lastUpdated.getTime() > staleAfterMs;
}

export function scannerHealthStatus(
  status: ScannerRuntimeStatus,
  nowMs = Date.now(),
): ScannerHealthStatus {
  if (status.lastError) return "degraded";
  return isScannerStale(status, nowMs) ? "degraded" : "ok";
}
