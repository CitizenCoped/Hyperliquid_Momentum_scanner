import type { AlertLevel } from "./scoring";

export const ALERT_LEVEL_RANK: Record<AlertLevel, number> = {
  IGNORE: 0,
  WATCH: 1,
  ACTIVE_SETUP: 2,
  A_PLUS_SETUP: 3,
};

export function alertLevelRank(alertLevel: string | null | undefined): number {
  return ALERT_LEVEL_RANK[alertLevel as AlertLevel] ?? ALERT_LEVEL_RANK.IGNORE;
}

export function shouldCreateActivationAlert({
  currentRank,
  previousRank,
  minRank,
}: {
  currentRank: number;
  previousRank: number | undefined;
  minRank: number;
}): boolean {
  if (previousRank === undefined) return false;
  return currentRank >= minRank && currentRank > previousRank;
}
