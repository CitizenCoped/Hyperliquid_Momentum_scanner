import type { AlertLevel } from "./scoring";

export const ALERT_LEVEL_RANK: Record<AlertLevel | "IGNORE", number> = {
  IGNORE: 0,
  WATCH: 1,
  ACTIVE_SETUP: 2,
  A_PLUS_SETUP: 3,
};

export interface AlertPolicyAsset {
  symbol: string;
  alertLevel: AlertLevel;
}

export function alertRank(alertLevel: string): number {
  return ALERT_LEVEL_RANK[alertLevel as AlertLevel] ?? ALERT_LEVEL_RANK.IGNORE;
}

export function currentAlertRanks<T extends AlertPolicyAsset>(
  assets: Iterable<T>,
): Map<string, number> {
  const ranks = new Map<string, number>();
  for (const asset of assets) {
    ranks.set(asset.symbol, alertRank(asset.alertLevel));
  }
  return ranks;
}

export function selectTransitionAlertCandidates<T extends AlertPolicyAsset>({
  assets,
  previousRanks,
  lastAlertAt,
  now,
  cooldownMs,
}: {
  assets: Iterable<T>;
  previousRanks: ReadonlyMap<string, number>;
  lastAlertAt: ReadonlyMap<string, number>;
  now: number;
  cooldownMs: number;
}): T[] {
  const candidates: T[] = [];

  for (const asset of assets) {
    const rank = alertRank(asset.alertLevel);
    if (rank < ALERT_LEVEL_RANK.WATCH) continue;

    const previousRank = previousRanks.get(asset.symbol);
    // The first observation after process start is only a baseline; alerts
    // should represent new crossings or tier upgrades, not all existing setups.
    if (previousRank === undefined || rank <= previousRank) continue;

    const lastInMem = lastAlertAt.get(asset.symbol) ?? 0;
    if (now - lastInMem < cooldownMs) continue;

    candidates.push(asset);
  }

  return candidates;
}
