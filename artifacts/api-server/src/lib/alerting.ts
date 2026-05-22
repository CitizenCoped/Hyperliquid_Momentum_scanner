import type { AlertLevel } from "./scoring";

export const ALERT_LEVEL_RANK: Record<AlertLevel, number> = {
  IGNORE: 0,
  WATCH: 1,
  ACTIVE_SETUP: 2,
  A_PLUS_SETUP: 3,
};

export function alertRank(
  level: string | null | undefined,
  fallbackRank = ALERT_LEVEL_RANK.IGNORE,
): number {
  if (!level) return fallbackRank;
  return ALERT_LEVEL_RANK[level as AlertLevel] ?? fallbackRank;
}

export function shouldFireAlertForTransition(
  previousLevel: AlertLevel | null | undefined,
  nextLevel: AlertLevel,
): boolean {
  const nextRank = alertRank(nextLevel);
  if (nextRank < ALERT_LEVEL_RANK.WATCH) return false;
  return nextRank > alertRank(previousLevel);
}
