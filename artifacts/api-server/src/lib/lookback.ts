/** Snapshots older than the target lookback plus this slack are treated as
 *  missing. Prevents a multi-hour outage from being scored as a 15m/1h move. */
export const LOOKBACK_SLACK_MS = 10 * 60 * 1000;

export const WINDOW_15M_MS = 15 * 60 * 1000;
export const WINDOW_1H_MS = 60 * 60 * 1000;
export const WINDOW_4H_MS = 4 * 60 * 60 * 1000;

export function lookbackWindow(
  polledAt: Date,
  windowMs: number,
  slackMs: number = LOOKBACK_SLACK_MS,
): { min: Date; max: Date } {
  const max = new Date(polledAt.getTime() - windowMs);
  const min = new Date(max.getTime() - slackMs);
  return { min, max };
}

export function isUsableLookbackSample(
  sampleAt: Date,
  window: { min: Date; max: Date },
): boolean {
  const t = sampleAt.getTime();
  return t >= window.min.getTime() && t <= window.max.getTime();
}

export function pctFromPrior(
  current: number,
  prior: number | null | undefined,
): number {
  if (prior == null) return 0;
  const from = Number(prior);
  if (!(from > 0) || !Number.isFinite(from) || !Number.isFinite(current)) {
    return 0;
  }
  return ((current - from) / from) * 100;
}
