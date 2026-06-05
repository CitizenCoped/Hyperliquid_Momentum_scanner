export const ALERT_LEVEL_RANK: Record<string, number> = {
  IGNORE: 0,
  WATCH: 1,
  ACTIVE_SETUP: 2,
  A_PLUS_SETUP: 3,
};

export interface AlertCooldownEntry {
  alertLevel: string;
  createdAtMs: number;
}

export function alertLevelRank(alertLevel: string): number {
  return ALERT_LEVEL_RANK[alertLevel] ?? 0;
}

export function shouldSuppressForCooldown(
  currentAlertLevel: string,
  recent: AlertCooldownEntry | null | undefined,
  nowMs: number,
  cooldownMs: number,
): boolean {
  if (!recent) return false;
  if (!Number.isFinite(recent.createdAtMs)) return false;
  if (nowMs - recent.createdAtMs >= cooldownMs) return false;

  return alertLevelRank(recent.alertLevel) >= alertLevelRank(currentAlertLevel);
}

export function preferCooldownEntry(
  current: AlertCooldownEntry | null | undefined,
  candidate: AlertCooldownEntry,
): AlertCooldownEntry {
  if (!current) return candidate;

  const currentRank = alertLevelRank(current.alertLevel);
  const candidateRank = alertLevelRank(candidate.alertLevel);
  if (candidateRank > currentRank) return candidate;
  if (
    candidateRank === currentRank &&
    candidate.createdAtMs > current.createdAtMs
  ) {
    return candidate;
  }

  return current;
}
