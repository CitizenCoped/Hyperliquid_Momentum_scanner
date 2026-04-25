import {
  pgTable,
  serial,
  text,
  doublePrecision,
  integer,
  boolean,
  timestamp,
  index,
  jsonb,
} from "drizzle-orm/pg-core";

export const metricSnapshots = pgTable(
  "metric_snapshots",
  {
    id: serial("id").primaryKey(),
    symbol: text("symbol").notNull(),
    polledAt: timestamp("polled_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    markPx: doublePrecision("mark_px").notNull(),
    midPx: doublePrecision("mid_px"),
    prevDayPx: doublePrecision("prev_day_px"),
    dayNtlVlm: doublePrecision("day_ntl_vlm").notNull(),
    openInterest: doublePrecision("open_interest").notNull(),
    fundingRate: doublePrecision("funding_rate").notNull(),
    oraclePx: doublePrecision("oracle_px"),
    premium: doublePrecision("premium"),
  },
  (t) => ({
    symbolPolledIdx: index("metric_snap_symbol_polled_idx").on(
      t.symbol,
      t.polledAt,
    ),
    polledIdx: index("metric_snap_polled_idx").on(t.polledAt),
  }),
);

export type MetricSnapshot = typeof metricSnapshots.$inferSelect;
export type InsertMetricSnapshot = typeof metricSnapshots.$inferInsert;

export const alerts = pgTable(
  "alerts",
  {
    id: serial("id").primaryKey(),
    symbol: text("symbol").notNull(),
    alertLevel: text("alert_level").notNull(),
    setupScore: doublePrecision("setup_score").notNull(),
    triggerReason: text("trigger_reason").notNull(),
    markPrice: doublePrecision("mark_price").notNull(),
    dayChangePct: doublePrecision("day_change_pct").notNull(),
    rvol: doublePrecision("rvol").notNull(),
    dismissed: boolean("dismissed").notNull().default(false),
    pushoverSent: boolean("pushover_sent").notNull().default(false),
    scoreBreakdown: jsonb("score_breakdown").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    createdIdx: index("alerts_created_idx").on(t.createdAt),
    symbolIdx: index("alerts_symbol_idx").on(t.symbol),
  }),
);

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = typeof alerts.$inferInsert;

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  watchThreshold: doublePrecision("watch_threshold").notNull().default(60),
  activeSetupThreshold: doublePrecision("active_setup_threshold")
    .notNull()
    .default(75),
  aPlusThreshold: doublePrecision("a_plus_threshold").notNull().default(85),
  pushoverEnabled: boolean("pushover_enabled").notNull().default(true),
  minAlertLevel: text("min_alert_level").notNull().default("ACTIVE_SETUP"),
  scanIntervalSeconds: integer("scan_interval_seconds").notNull().default(15),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Settings = typeof settings.$inferSelect;
export type InsertSettings = typeof settings.$inferInsert;
