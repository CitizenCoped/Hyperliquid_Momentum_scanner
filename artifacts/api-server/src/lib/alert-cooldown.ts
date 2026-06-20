export const ALERT_LEVEL_RANK: Record<string, number> = {
  IGNORE: 0,
  WATCH: 1,
  ACTIVE_SETUP: 2,
  A_PLUS_SETUP: 3,
};

export interface AlertCooldownEntry {
  firedAtMs: number;
  rank: number;
}

export function alertRank(alertLevel: string): number {
  return ALERT_LEVEL_RANK[alertLevel] ?? ALERT_LEVEL_RANK.IGNORE;
}

export function shouldSuppressForCooldown(
  previous: AlertCooldownEntry | null | undefined,
  currentRank: number,
  nowMs: number,
  cooldownMs: number,
): boolean {
  if (!previous) return false;
  if (nowMs - previous.firedAtMs >= cooldownMs) return false;
  return previous.rank >= currentRank;
}
