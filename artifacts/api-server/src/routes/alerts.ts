import { Router, type IRouter } from "express";
import { scanner } from "../lib/scanner-engine";
import { sendPushover } from "../lib/pushover";

const router: IRouter = Router();

function serializeAlert(a: {
  id: number;
  symbol: string;
  alertLevel: string;
  setupScore: number;
  triggerReason: string;
  markPrice: number;
  dayChangePct: number;
  rvol: number;
  dismissed: boolean;
  pushoverSent: boolean;
  scoreBreakdown: unknown;
  createdAt: Date;
}) {
  return {
    id: a.id,
    symbol: a.symbol,
    alertLevel: a.alertLevel,
    setupScore: a.setupScore,
    triggerReason: a.triggerReason,
    markPrice: a.markPrice,
    dayChangePct: a.dayChangePct,
    rvol: a.rvol,
    dismissed: a.dismissed,
    pushoverSent: a.pushoverSent,
    scoreBreakdown: a.scoreBreakdown,
    createdAt: a.createdAt.toISOString(),
  };
}

router.get("/alerts", async (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const symbol = (req.query.symbol as string | undefined) ?? undefined;
  const alertLevel = (req.query.alertLevel as string | undefined) ?? undefined;
  const rows = await scanner.getRecentAlerts({ limit, symbol, alertLevel });
  res.json(rows.map(serializeAlert));
});

router.get("/alerts/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  const row = await scanner.getAlertById(id);
  if (!row) {
    res.status(404).json({ error: "alert not found" });
    return;
  }
  res.json(serializeAlert(row));
});

router.post("/alerts/:id/dismiss", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  const row = await scanner.dismissAlert(id);
  if (!row) {
    res.status(404).json({ error: "alert not found" });
    return;
  }
  res.json(serializeAlert(row));
});

router.post("/alerts/test-pushover", async (_req, res) => {
  const result = await sendPushover({
    title: "Hyperliquid Scanner Test",
    message: "Pushover is wired up correctly.",
  });
  res.json(result);
});

export default router;
