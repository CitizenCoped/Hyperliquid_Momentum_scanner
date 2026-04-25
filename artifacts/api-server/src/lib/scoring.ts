export interface MarketMetricsInput {
  symbol: string;
  markPrice: number;
  dayChangePct: number;
  change15mPct: number;
  change1hPct: number;
  dailyRvol: number;
  intradayRvol: number;
  openInterestUsd: number;
  fundingRate: number;
  spreadBps: number;
  depth1pctUsd: number;
  liquidationUsd1h: number;
  hasNews: boolean;
}

export interface ScoreBreakdown {
  dayChange: number;
  rvol: number;
  acceleration: number;
  squeezeStructure: number;
  catalyst: number;
}

export type AlertLevel = "WATCH" | "ACTIVE_SETUP" | "A_PLUS_SETUP" | "IGNORE";

export interface ScoreThresholds {
  watch: number;
  active: number;
  aPlus: number;
}

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(v, hi));

export function scoreDayChange(dayChangePct: number): number {
  if (dayChangePct < 2) return 0;
  if (dayChangePct >= 10) return 20;
  return clamp((dayChangePct / 10) * 20);
}

export function scoreRvol(dailyRvol: number, intradayRvol: number): number {
  const dailyScore = Math.min(dailyRvol / 5, 1) * 12.5;
  const intradayScore = Math.min(intradayRvol / 5, 1) * 12.5;
  return dailyScore + intradayScore;
}

export function scoreAcceleration(
  change15mPct: number,
  change1hPct: number,
): number {
  if (change15mPct <= 0) return 0;
  let score = 0;
  if (change15mPct >= 1) score += 5;
  if (change15mPct >= 2) score += 5;
  if (change1hPct >= 4) score += 5;
  if (change15mPct > change1hPct / 2) score += 5;
  return clamp(score, 0, 20);
}

export function scoreSqueezeStructure(
  openInterestUsd: number,
  spreadBps: number,
  depth1pctUsd: number,
): number {
  let score = 20;
  if (openInterestUsd > 500_000_000) score -= 8;
  else if (openInterestUsd > 200_000_000) score -= 4;

  if (spreadBps > 20) score -= 8;
  else if (spreadBps > 10) score -= 4;

  if (depth1pctUsd < 100_000) score -= 8;
  else if (depth1pctUsd < 500_000) score += 3;

  return clamp(score, 0, 20);
}

export function scoreCatalyst(
  hasNews: boolean,
  liquidationUsd1h: number,
  fundingRate: number,
): number {
  let score = 0;
  if (hasNews) score += 8;
  if (liquidationUsd1h > 1_000_000) score += 4;
  if (Math.abs(fundingRate) > 0.0005) score += 3;
  return clamp(score, 0, 15);
}

export function alertLevelFor(
  total: number,
  thresholds: ScoreThresholds,
): AlertLevel {
  if (total >= thresholds.aPlus) return "A_PLUS_SETUP";
  if (total >= thresholds.active) return "ACTIVE_SETUP";
  if (total >= thresholds.watch) return "WATCH";
  return "IGNORE";
}

export function totalSetupScore(
  m: MarketMetricsInput,
  thresholds: ScoreThresholds,
): { setupScore: number; alertLevel: AlertLevel; breakdown: ScoreBreakdown } {
  const dayChange = scoreDayChange(m.dayChangePct);
  const rvol = scoreRvol(m.dailyRvol, m.intradayRvol);
  const acceleration = scoreAcceleration(m.change15mPct, m.change1hPct);
  const squeezeStructure = scoreSqueezeStructure(
    m.openInterestUsd,
    m.spreadBps,
    m.depth1pctUsd,
  );
  const catalyst = scoreCatalyst(
    m.hasNews,
    m.liquidationUsd1h,
    m.fundingRate,
  );
  const setupScore =
    dayChange + rvol + acceleration + squeezeStructure + catalyst;
  return {
    setupScore: Math.round(setupScore * 100) / 100,
    alertLevel: alertLevelFor(setupScore, thresholds),
    breakdown: {
      dayChange: Math.round(dayChange * 100) / 100,
      rvol: Math.round(rvol * 100) / 100,
      acceleration: Math.round(acceleration * 100) / 100,
      squeezeStructure: Math.round(squeezeStructure * 100) / 100,
      catalyst: Math.round(catalyst * 100) / 100,
    },
  };
}
