import { db } from "@workspace/db";
import {
  alerts as alertsTable,
  metricSnapshots,
  settings as settingsTable,
  type Settings,
} from "@workspace/db/schema";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { logger } from "./logger";
import {
  fetchL2Book,
  fetchPerpSnapshots,
  summarizeBook,
  type HyperliquidAssetSnapshot,
} from "./hyperliquid";
import { sendPushover } from "./pushover";
import {
  totalSetupScore,
  type AlertLevel,
  type ScoreBreakdown,
} from "./scoring";

export interface AssetState {
  symbol: string;
  markPrice: number;
  dayChangePct: number;
  change15mPct: number;
  change1hPct: number;
  change4hPct: number;
  dailyRvol: number;
  intradayRvol: number;
  openInterestUsd: number;
  fundingRate: number;
  spreadBps: number;
  depth1pctUsd: number;
  liquidationUsd1h: number;
  hasNews: boolean;
  setupScore: number;
  alertLevel: AlertLevel;
  scoreBreakdown: ScoreBreakdown;
  updatedAt: string;
}

const ALERT_LEVEL_RANK: Record<string, number> = {
  IGNORE: 0,
  WATCH: 1,
  ACTIVE_SETUP: 2,
  A_PLUS_SETUP: 3,
};

const ALERT_COOLDOWN_MS = 10 * 60 * 1000;
const BOOK_REFRESH_INTERVAL_MS = 60 * 1000;
const SNAPSHOT_RETENTION_MS = 24 * 60 * 60 * 1000;
const TOP_N_FOR_BOOK_DETAILS = 25;
const ALERT_LOCK_NAMESPACE_KEY = 1_648_139_761;

function advisoryLockKey(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash | 0;
}

function pgBoolean(value: unknown): boolean {
  return value === true || value === "t" || value === "true";
}

interface BookCacheEntry {
  spreadBps: number;
  depth1pctUsd: number;
  fetchedAt: number;
}

type AlertReservation =
  | { status: "locked_elsewhere" }
  | { status: "cooldown"; lastAlertAt: number }
  | { status: "reserved"; alertId: number };

class ScannerEngine {
  private state = new Map<string, AssetState>();
  private bookCache = new Map<string, BookCacheEntry>();
  private lastAlertAt = new Map<string, number>();
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private pollInFlight = false;
  private currentIntervalSec = 15;
  private lastUpdated: Date | null = null;
  private lastError: string | null = null;
  private pollCount = 0;

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    await this.ensureDefaultSettings();
    const s = await this.getSettings();
    this.currentIntervalSec = s.scanIntervalSeconds;
    logger.info(
      { intervalSec: this.currentIntervalSec },
      "Scanner engine starting",
    );
    void this.runOnce();
    this.scheduleNext();
  }

  stop(): void {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private scheduleNext() {
    if (!this.running) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      void this.runOnce().finally(() => this.scheduleNext());
    }, this.currentIntervalSec * 1000);
  }

  private async ensureDefaultSettings(): Promise<void> {
    const existing = await db.select().from(settingsTable).limit(1);
    if (existing.length === 0) {
      await db.insert(settingsTable).values({});
    }
  }

  async getSettings(): Promise<Settings> {
    await this.ensureDefaultSettings();
    const [row] = await db.select().from(settingsTable).limit(1);
    if (!row) throw new Error("Settings row missing after ensure");
    return row;
  }

  async updateSettings(patch: Partial<Settings>): Promise<Settings> {
    await this.ensureDefaultSettings();
    const [existing] = await db.select().from(settingsTable).limit(1);
    if (!existing) throw new Error("Settings row missing");
    const updates: Partial<Settings> = { ...patch };
    delete updates.id;
    const [updated] = await db
      .update(settingsTable)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(settingsTable.id, existing.id))
      .returning();
    if (!updated) throw new Error("Failed to update settings");
    if (updated.scanIntervalSeconds !== this.currentIntervalSec) {
      this.currentIntervalSec = updated.scanIntervalSeconds;
      this.scheduleNext();
    }
    return updated;
  }

  getAssets(): AssetState[] {
    return Array.from(this.state.values()).sort(
      (a, b) => b.setupScore - a.setupScore,
    );
  }

  getAsset(symbol: string): AssetState | null {
    return this.state.get(symbol) ?? null;
  }

  getStatus() {
    return {
      lastUpdated: this.lastUpdated,
      lastError: this.lastError,
      pollCount: this.pollCount,
      assetCount: this.state.size,
    };
  }

  private async runOnce(): Promise<void> {
    if (this.pollInFlight) {
      logger.warn(
        "Scanner poll skipped because a previous poll is still running",
      );
      return;
    }
    this.pollInFlight = true;
    try {
      const settings = await this.getSettings();
      const snapshots = await fetchPerpSnapshots();
      const polledAt = new Date();

      // Persist snapshots (chunk insert)
      const insertRows = snapshots.map((s) => ({
        symbol: s.symbol,
        polledAt,
        markPx: s.markPrice,
        midPx: s.midPrice,
        prevDayPx: s.prevDayPx,
        dayNtlVlm: s.dayNtlVlm,
        openInterest: s.openInterest,
        fundingRate: s.fundingRate,
        oraclePx: s.oraclePx,
        premium: s.premium,
      }));
      if (insertRows.length > 0) {
        await db.insert(metricSnapshots).values(insertRows);
      }

      // Compute scores per asset
      const newState = new Map<string, AssetState>();
      const thresholds = {
        watch: settings.watchThreshold,
        active: settings.activeSetupThreshold,
        aPlus: settings.aPlusThreshold,
      };

      // Pre-compute change_15m, change_1h, change_4h, RVOL via SQL
      const changesBySymbol = await this.fetchChangeMetrics(
        snapshots.map((s) => s.symbol),
        polledAt,
      );

      for (const snap of snapshots) {
        const c = changesBySymbol.get(snap.symbol) ?? {
          change15mPct: 0,
          change1hPct: 0,
          change4hPct: 0,
          dailyRvol: 1,
          intradayRvol: 1,
        };

        const dayChangePct =
          snap.prevDayPx > 0
            ? ((snap.markPrice - snap.prevDayPx) / snap.prevDayPx) * 100
            : 0;

        const book = this.bookCache.get(snap.symbol);
        const spreadBps = book?.spreadBps ?? 5;
        const depth1pctUsd = book?.depth1pctUsd ?? 600_000;

        const scored = totalSetupScore(
          {
            symbol: snap.symbol,
            markPrice: snap.markPrice,
            dayChangePct,
            change15mPct: c.change15mPct,
            change1hPct: c.change1hPct,
            dailyRvol: c.dailyRvol,
            intradayRvol: c.intradayRvol,
            openInterestUsd: snap.openInterest,
            fundingRate: snap.fundingRate,
            spreadBps,
            depth1pctUsd,
            liquidationUsd1h: 0,
            hasNews: false,
          },
          thresholds,
        );

        newState.set(snap.symbol, {
          symbol: snap.symbol,
          markPrice: snap.markPrice,
          dayChangePct,
          change15mPct: c.change15mPct,
          change1hPct: c.change1hPct,
          change4hPct: c.change4hPct,
          dailyRvol: c.dailyRvol,
          intradayRvol: c.intradayRvol,
          openInterestUsd: snap.openInterest,
          fundingRate: snap.fundingRate,
          spreadBps,
          depth1pctUsd,
          liquidationUsd1h: 0,
          hasNews: false,
          setupScore: scored.setupScore,
          alertLevel: scored.alertLevel,
          scoreBreakdown: scored.breakdown,
          updatedAt: polledAt.toISOString(),
        });
      }

      this.state = newState;
      this.lastUpdated = polledAt;
      this.lastError = null;
      this.pollCount += 1;

      // Refresh book stats for top N
      void this.refreshTopBooks(snapshots);

      // Trigger alerts
      await this.maybeFireAlerts(settings);

      // Periodic cleanup
      if (this.pollCount % 20 === 0) {
        void this.cleanupOldSnapshots();
      }
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : String(err);
      logger.error({ err }, "Scanner poll failed");
    } finally {
      this.pollInFlight = false;
    }
  }

  private async fetchChangeMetrics(
    symbols: string[],
    polledAt: Date,
  ): Promise<
    Map<
      string,
      {
        change15mPct: number;
        change1hPct: number;
        change4hPct: number;
        dailyRvol: number;
        intradayRvol: number;
      }
    >
  > {
    const result = new Map<
      string,
      {
        change15mPct: number;
        change1hPct: number;
        change4hPct: number;
        dailyRvol: number;
        intradayRvol: number;
      }
    >();
    if (symbols.length === 0) return result;

    const t15m = new Date(polledAt.getTime() - 15 * 60 * 1000);
    const t1h = new Date(polledAt.getTime() - 60 * 60 * 1000);
    const t4h = new Date(polledAt.getTime() - 4 * 60 * 60 * 1000);
    const t24h = new Date(polledAt.getTime() - 24 * 60 * 60 * 1000);

    // Find prior price closest to each window per symbol
    // Using a single grouped query with window functions
    const rows = await db.execute<{
      symbol: string;
      px15: number | null;
      px1h: number | null;
      px4h: number | null;
      vlm15: number | null;
      vlm1h: number | null;
      vlm24h_first: number | null;
    }>(sql`
      SELECT
        symbol,
        (SELECT mark_px FROM metric_snapshots m2
          WHERE m2.symbol = m.symbol AND m2.polled_at <= ${t15m}
          ORDER BY m2.polled_at DESC LIMIT 1) AS "px15",
        (SELECT mark_px FROM metric_snapshots m2
          WHERE m2.symbol = m.symbol AND m2.polled_at <= ${t1h}
          ORDER BY m2.polled_at DESC LIMIT 1) AS "px1h",
        (SELECT mark_px FROM metric_snapshots m2
          WHERE m2.symbol = m.symbol AND m2.polled_at <= ${t4h}
          ORDER BY m2.polled_at DESC LIMIT 1) AS "px4h",
        (SELECT day_ntl_vlm FROM metric_snapshots m2
          WHERE m2.symbol = m.symbol AND m2.polled_at <= ${t15m}
          ORDER BY m2.polled_at DESC LIMIT 1) AS "vlm15",
        (SELECT day_ntl_vlm FROM metric_snapshots m2
          WHERE m2.symbol = m.symbol AND m2.polled_at <= ${t1h}
          ORDER BY m2.polled_at DESC LIMIT 1) AS "vlm1h",
        (SELECT day_ntl_vlm FROM metric_snapshots m2
          WHERE m2.symbol = m.symbol AND m2.polled_at >= ${t24h}
          ORDER BY m2.polled_at ASC LIMIT 1) AS "vlm24h_first"
      FROM (SELECT DISTINCT symbol FROM metric_snapshots WHERE polled_at >= ${t24h}) m
    `);

    const currentBySymbol = new Map<string, { px: number; vlm: number }>();
    for (const sym of symbols) {
      const cur = this.state.get(sym);
      if (cur) currentBySymbol.set(sym, { px: cur.markPrice, vlm: 0 });
    }

    // Build a price/vlm lookup from latest in DB (since current snapshot was just inserted)
    const latest = await db.execute<{
      symbol: string;
      mark_px: number;
      day_ntl_vlm: number;
    }>(sql`
      SELECT DISTINCT ON (symbol) symbol, mark_px, day_ntl_vlm
      FROM metric_snapshots
      ORDER BY symbol, polled_at DESC
    `);
    const latestMap = new Map<string, { px: number; vlm: number }>();
    for (const r of latest.rows as unknown as Array<{
      symbol: string;
      mark_px: number;
      day_ntl_vlm: number;
    }>) {
      latestMap.set(r.symbol, {
        px: Number(r.mark_px),
        vlm: Number(r.day_ntl_vlm),
      });
    }

    for (const r of rows.rows as unknown as Array<{
      symbol: string;
      px15: number | null;
      px1h: number | null;
      px4h: number | null;
      vlm15: number | null;
      vlm1h: number | null;
      vlm24h_first: number | null;
    }>) {
      const cur = latestMap.get(r.symbol);
      if (!cur) continue;
      const px = cur.px;
      const vlm = cur.vlm;

      const pct = (from: number | null) =>
        from && from > 0 ? ((px - Number(from)) / Number(from)) * 100 : 0;

      const change15mPct = pct(r.px15);
      const change1hPct = pct(r.px1h);
      const change4hPct = pct(r.px4h);

      // Intraday RVOL: 15min volume vs 1h average 15min volume (over last hour)
      // 15m vlm = vlm - vlm15
      // baseline 15m vlm = (vlm - vlm1h) / 4 over last hour
      const vlm15 = r.vlm15 != null ? Number(r.vlm15) : null;
      const vlm1h = r.vlm1h != null ? Number(r.vlm1h) : null;
      let intradayRvol = 1;
      if (vlm15 != null && vlm1h != null && vlm > vlm1h) {
        const cur15 = Math.max(0, vlm - vlm15);
        const last1hVlm = vlm - vlm1h;
        const avg15In1h = last1hVlm / 4;
        if (avg15In1h > 0) intradayRvol = cur15 / avg15In1h;
      }

      // Daily RVOL: today's full-day notional vs prior 24h trailing
      // Approximation: vlm now / (vlm 24h ago first sample - 0)
      // The dayNtlVlm field is "today's" rolling, so we compare to first sample 24h ago
      const vlm24hFirst =
        r.vlm24h_first != null ? Number(r.vlm24h_first) : null;
      let dailyRvol = 1;
      if (vlm24hFirst && vlm24hFirst > 0) {
        dailyRvol = vlm / vlm24hFirst;
      }

      result.set(r.symbol, {
        change15mPct,
        change1hPct,
        change4hPct,
        dailyRvol: Number.isFinite(dailyRvol) ? dailyRvol : 1,
        intradayRvol: Number.isFinite(intradayRvol) ? intradayRvol : 1,
      });
    }

    return result;
  }

  private async refreshTopBooks(
    snapshots: HyperliquidAssetSnapshot[],
  ): Promise<void> {
    const top = [...snapshots]
      .sort((a, b) => b.dayNtlVlm - a.dayNtlVlm)
      .slice(0, TOP_N_FOR_BOOK_DETAILS);
    const now = Date.now();
    for (const s of top) {
      const cached = this.bookCache.get(s.symbol);
      if (cached && now - cached.fetchedAt < BOOK_REFRESH_INTERVAL_MS) continue;
      try {
        const book = await fetchL2Book(s.symbol);
        if (!book) continue;
        const stats = summarizeBook(book);
        if (!stats) continue;
        this.bookCache.set(s.symbol, {
          spreadBps: stats.spreadBps,
          depth1pctUsd: stats.depth1pctUsd,
          fetchedAt: now,
        });
      } catch (err) {
        logger.debug({ err, symbol: s.symbol }, "Book fetch failed");
      }
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  private async maybeFireAlerts(settings: Settings): Promise<void> {
    if (this.state.size === 0) return;
    const minRank = ALERT_LEVEL_RANK[settings.minAlertLevel] ?? 2;
    const now = Date.now();
    const cutoff = new Date(now - ALERT_COOLDOWN_MS);

    // Build the candidate set first so we can do one DB lookup for all symbols.
    const candidates: AssetState[] = [];
    for (const asset of this.state.values()) {
      const rank = ALERT_LEVEL_RANK[asset.alertLevel] ?? 0;
      if (rank < ALERT_LEVEL_RANK.WATCH) continue;
      // Fast in-memory short-circuit; durable DB check happens below.
      const lastInMem = this.lastAlertAt.get(asset.symbol) ?? 0;
      if (now - lastInMem < ALERT_COOLDOWN_MS) continue;
      candidates.push(asset);
    }
    if (candidates.length === 0) return;

    // DB-backed cooldown: pull most recent alert per symbol within the window.
    // Survives restarts, scales to multiple workers (one row per fire).
    const recent = await db.execute<{ symbol: string; created_at: Date }>(sql`
      SELECT DISTINCT ON (symbol) symbol, created_at
      FROM alerts
      WHERE created_at >= ${cutoff}
      ORDER BY symbol, created_at DESC
    `);
    const recentBySymbol = new Map<string, Date>();
    for (const r of recent.rows as unknown as Array<{
      symbol: string;
      created_at: Date | string;
    }>) {
      recentBySymbol.set(
        r.symbol,
        r.created_at instanceof Date ? r.created_at : new Date(r.created_at),
      );
    }

    for (const asset of candidates) {
      const rank = ALERT_LEVEL_RANK[asset.alertLevel] ?? 0;
      const triggerReason = this.buildTriggerReason(asset);
      const lastDb = recentBySymbol.get(asset.symbol);
      if (lastDb && now - lastDb.getTime() < ALERT_COOLDOWN_MS) {
        // Backfill in-memory cache so future cycles short-circuit.
        this.lastAlertAt.set(asset.symbol, lastDb.getTime());
        continue;
      }

      const reserved = await db.transaction(async (tx): Promise<AlertReservation> => {
        // Serialize alert reservation per symbol across overlapping workers.
        const lockRows = await tx.execute<{ locked: boolean }>(sql`
          SELECT pg_try_advisory_xact_lock(
            ${ALERT_LOCK_NAMESPACE_KEY},
            ${advisoryLockKey(asset.symbol)}
          ) AS locked
        `);
        const [lockRow] = lockRows.rows as unknown as Array<{
          locked: boolean | string;
        }>;
        if (!pgBoolean(lockRow?.locked)) {
          return { status: "locked_elsewhere" };
        }

        const recentRows = await tx.execute<{ created_at: Date }>(sql`
          SELECT created_at
          FROM alerts
          WHERE symbol = ${asset.symbol}
            AND created_at >= ${cutoff}
          ORDER BY created_at DESC
          LIMIT 1
        `);
        const [recentRow] = recentRows.rows as unknown as Array<{
          created_at: Date | string;
        }>;
        if (recentRow) {
          const lastAlert =
            recentRow.created_at instanceof Date
              ? recentRow.created_at
              : new Date(recentRow.created_at);
          return {
            status: "cooldown",
            lastAlertAt: lastAlert.getTime(),
          };
        }

        const [alert] = await tx
          .insert(alertsTable)
          .values({
            symbol: asset.symbol,
            alertLevel: asset.alertLevel,
            setupScore: asset.setupScore,
            triggerReason,
            markPrice: asset.markPrice,
            dayChangePct: asset.dayChangePct,
            rvol: asset.dailyRvol,
            pushoverSent: false,
            scoreBreakdown: asset.scoreBreakdown,
          })
          .returning({ id: alertsTable.id });
        if (!alert) {
          throw new Error(`Failed to reserve alert for ${asset.symbol}`);
        }
        return { status: "reserved", alertId: alert.id };
      });

      if (reserved.status === "locked_elsewhere") {
        logger.debug(
          { symbol: asset.symbol },
          "Alert skipped because another scanner owns the cooldown lock",
        );
        continue;
      }

      if (reserved.status === "cooldown") {
        this.lastAlertAt.set(asset.symbol, reserved.lastAlertAt);
        continue;
      }

      this.lastAlertAt.set(asset.symbol, now);

      if (settings.pushoverEnabled && rank >= minRank) {
        const result = await sendPushover({
          title: `${asset.alertLevel.replace("_", " ")} ${asset.symbol} ${asset.setupScore}`,
          message: triggerReason,
          priority: asset.alertLevel === "A_PLUS_SETUP" ? 1 : 0,
        });
        if (result.success) {
          await db
            .update(alertsTable)
            .set({ pushoverSent: true })
            .where(eq(alertsTable.id, reserved.alertId));
        }
      }
    }
  }

  private buildTriggerReason(asset: AssetState): string {
    const parts: string[] = [];
    parts.push(`px ${asset.markPrice.toFixed(4)}`);
    parts.push(`day ${asset.dayChangePct >= 0 ? "+" : ""}${asset.dayChangePct.toFixed(2)}%`);
    parts.push(`15m ${asset.change15mPct >= 0 ? "+" : ""}${asset.change15mPct.toFixed(2)}%`);
    parts.push(`1h ${asset.change1hPct >= 0 ? "+" : ""}${asset.change1hPct.toFixed(2)}%`);
    parts.push(`RVOL ${asset.dailyRvol.toFixed(2)}x / ${asset.intradayRvol.toFixed(2)}x`);
    parts.push(`OI $${(asset.openInterestUsd / 1e6).toFixed(1)}M`);
    parts.push(`fund ${(asset.fundingRate * 100).toFixed(4)}%`);
    return parts.join(" · ");
  }

  private async cleanupOldSnapshots(): Promise<void> {
    const cutoff = new Date(Date.now() - SNAPSHOT_RETENTION_MS);
    try {
      await db.delete(metricSnapshots).where(lte(metricSnapshots.polledAt, cutoff));
    } catch (err) {
      logger.warn({ err }, "Snapshot cleanup failed");
    }
  }

  async getRecentAlerts(opts: {
    limit?: number;
    symbol?: string;
    alertLevel?: string;
  }) {
    const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
    const conds = [] as ReturnType<typeof eq>[];
    if (opts.symbol) conds.push(eq(alertsTable.symbol, opts.symbol));
    if (opts.alertLevel) conds.push(eq(alertsTable.alertLevel, opts.alertLevel));
    const where = conds.length ? and(...conds) : undefined;
    const rows = await db
      .select()
      .from(alertsTable)
      .where(where as unknown as undefined)
      .orderBy(desc(alertsTable.createdAt))
      .limit(limit);
    return rows;
  }

  async getAlertById(id: number) {
    const [row] = await db
      .select()
      .from(alertsTable)
      .where(eq(alertsTable.id, id))
      .limit(1);
    return row ?? null;
  }

  async dismissAlert(id: number) {
    const [row] = await db
      .update(alertsTable)
      .set({ dismissed: true })
      .where(eq(alertsTable.id, id))
      .returning();
    return row ?? null;
  }

  getSummary() {
    const assets = this.getAssets();
    let aPlus = 0,
      active = 0,
      watch = 0,
      rvolSum = 0,
      rvolCount = 0;
    let topMover: AssetState | null = null;
    for (const a of assets) {
      if (a.alertLevel === "A_PLUS_SETUP") aPlus++;
      else if (a.alertLevel === "ACTIVE_SETUP") active++;
      else if (a.alertLevel === "WATCH") watch++;
      if (Number.isFinite(a.dailyRvol)) {
        rvolSum += a.dailyRvol;
        rvolCount++;
      }
      if (!topMover || Math.abs(a.dayChangePct) > Math.abs(topMover.dayChangePct)) {
        topMover = a;
      }
    }
    return {
      totalAssets: assets.length,
      aPlusCount: aPlus,
      activeSetupCount: active,
      watchCount: watch,
      avgRvol: rvolCount > 0 ? rvolSum / rvolCount : 0,
      topMoverSymbol: topMover?.symbol ?? null,
      topMoverChangePct: topMover?.dayChangePct ?? null,
      lastUpdated: (this.lastUpdated ?? new Date()).toISOString(),
    };
  }
}

export const scanner = new ScannerEngine();

// Suppress unused import warning for `gte` (kept for future use)
void gte;
