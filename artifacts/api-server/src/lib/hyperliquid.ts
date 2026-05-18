import { logger } from "./logger";

const PUBLIC_INFO_URL = "https://api.hyperliquid.xyz/info";
const DEFAULT_TIMEOUT_MS = 8000;
const MAX_RETRIES = 3;

// Hyperliquid's /info endpoint is public and free; we use it directly for
// market data. QuickNode endpoints are reserved for streaming/gRPC paths.
function infoUrl(): string {
  return PUBLIC_INFO_URL;
}

/**
 * Resilient POST to Hyperliquid /info with timeout, exponential backoff +
 * jitter for transient 429/5xx errors. Returns the parsed JSON on success.
 * Throws only after retries are exhausted or on non-retryable errors.
 */
async function postInfo(
  body: unknown,
  opts: { timeoutMs?: number; maxRetries?: number; label: string } = {
    label: "info",
  },
): Promise<unknown> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = opts.maxRetries ?? MAX_RETRIES;
  let lastErr: unknown = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(infoUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.ok) {
        return await res.json();
      }
      // 4xx (other than 429) are non-retryable
      if (res.status !== 429 && res.status < 500) {
        const txt = await res.text().catch(() => "");
        throw new Error(
          `Hyperliquid ${opts.label} ${res.status}: ${txt.slice(0, 200)}`,
        );
      }
      lastErr = new Error(`Hyperliquid ${opts.label} ${res.status}`);
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      // AbortError or network error → retryable
    }

    if (attempt < maxRetries) {
      // Exponential backoff with jitter: 250ms, 500ms, 1000ms (+ up to 250ms jitter)
      const baseMs = 250 * Math.pow(2, attempt);
      const jitter = Math.random() * 250;
      await new Promise((r) => setTimeout(r, baseMs + jitter));
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error(`Hyperliquid ${opts.label} failed after retries`);
}

interface HlAssetCtx {
  funding: string;
  openInterest: string;
  prevDayPx: string;
  dayNtlVlm: string;
  premium: string | null;
  oraclePx: string;
  markPx: string;
  midPx: string | null;
  impactPxs: string[] | null;
  dayBaseVlm: string;
}

interface HlMeta {
  universe: Array<{
    name: string;
    szDecimals: number;
    maxLeverage: number;
    onlyIsolated?: boolean;
    isDelisted?: boolean;
  }>;
}

export interface HyperliquidAssetSnapshot {
  symbol: string;
  markPrice: number;
  midPrice: number | null;
  prevDayPx: number;
  dayNtlVlm: number;
  openInterest: number;
  fundingRate: number;
  oraclePx: number;
  premium: number | null;
  maxLeverage: number;
}

const num = (s: string | null | undefined): number => {
  if (s === null || s === undefined || s === "") return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

export function parsePerpSnapshots(data: unknown): HyperliquidAssetSnapshot[] {
  if (!Array.isArray(data) || data.length !== 2) {
    throw new Error("Unexpected metaAndAssetCtxs shape");
  }
  const [meta, ctxs] = data;
  if (!meta || !Array.isArray(meta.universe) || !Array.isArray(ctxs)) {
    throw new Error("Missing universe or contexts");
  }
  if (meta.universe.length === 0) {
    throw new Error("Hyperliquid returned an empty perp universe");
  }
  if (ctxs.length !== meta.universe.length) {
    throw new Error(
      `Hyperliquid context count ${ctxs.length} did not match universe count ${meta.universe.length}`,
    );
  }

  const out: HyperliquidAssetSnapshot[] = [];
  for (let i = 0; i < meta.universe.length; i++) {
    const u = meta.universe[i];
    const c = ctxs[i];
    if (!u || !c || u.isDelisted) continue;
    const markPrice = num(c.markPx);
    if (markPrice <= 0) continue;
    const midPx = num(c.midPx);
    const openInterestSize = num(c.openInterest);
    const openInterestUsd = openInterestSize * markPrice;
    out.push({
      symbol: u.name,
      markPrice,
      midPrice: midPx > 0 ? midPx : null,
      prevDayPx: num(c.prevDayPx),
      dayNtlVlm: num(c.dayNtlVlm),
      openInterest: openInterestUsd,
      fundingRate: num(c.funding),
      oraclePx: num(c.oraclePx),
      premium: c.premium == null ? null : num(c.premium),
      maxLeverage: u.maxLeverage,
    });
  }
  if (out.length === 0) {
    throw new Error("Hyperliquid returned no active perp snapshots");
  }
  return out;
}

export async function fetchPerpSnapshots(): Promise<HyperliquidAssetSnapshot[]> {
  const data = await postInfo(
    { type: "metaAndAssetCtxs" },
    { label: "metaAndAssetCtxs" },
  );
  return parsePerpSnapshots(data);
}

export interface L2Level {
  px: string;
  sz: string;
  n: number;
}

export interface L2Book {
  coin: string;
  time: number;
  levels: [L2Level[], L2Level[]];
}

export async function fetchL2Book(coin: string): Promise<L2Book | null> {
  try {
    // Books are best-effort; use shorter timeout and fewer retries.
    const data = (await postInfo(
      { type: "l2Book", coin },
      { label: `l2Book:${coin}`, timeoutMs: 4000, maxRetries: 1 },
    )) as L2Book;
    if (!data?.levels || data.levels.length !== 2) return null;
    return data;
  } catch (err) {
    logger.debug({ err, coin }, "fetchL2Book failed");
    return null;
  }
}

export interface BookStats {
  spreadBps: number;
  depth1pctUsd: number;
  midPrice: number;
}

export function summarizeBook(book: L2Book): BookStats | null {
  const [bids, asks] = book.levels;
  if (!bids?.length || !asks?.length) return null;
  const bestBid = Number(bids[0]?.px);
  const bestAsk = Number(asks[0]?.px);
  if (!Number.isFinite(bestBid) || !Number.isFinite(bestAsk)) return null;
  if (bestBid <= 0 || bestAsk <= 0) return null;
  const mid = (bestBid + bestAsk) / 2;
  const spreadBps = ((bestAsk - bestBid) / mid) * 10000;
  const lower = mid * 0.99;
  const upper = mid * 1.01;
  let depthUsd = 0;
  for (const lvl of bids) {
    const px = Number(lvl.px);
    const sz = Number(lvl.sz);
    if (px >= lower) depthUsd += px * sz;
  }
  for (const lvl of asks) {
    const px = Number(lvl.px);
    const sz = Number(lvl.sz);
    if (px <= upper) depthUsd += px * sz;
  }
  return { spreadBps, depth1pctUsd: depthUsd, midPrice: mid };
}
