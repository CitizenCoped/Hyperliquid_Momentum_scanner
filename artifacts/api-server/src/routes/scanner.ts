import { Router, type IRouter } from "express";
import { scanner, type AssetState } from "../lib/scanner-engine";

const router: IRouter = Router();

function serializeAsset(a: AssetState) {
  return {
    symbol: a.symbol,
    markPrice: a.markPrice,
    dayChangePct: a.dayChangePct,
    change15mPct: a.change15mPct,
    change1hPct: a.change1hPct,
    change4hPct: a.change4hPct,
    dailyRvol: a.dailyRvol,
    intradayRvol: a.intradayRvol,
    openInterestUsd: a.openInterestUsd,
    fundingRate: a.fundingRate,
    spreadBps: a.spreadBps,
    depth1pctUsd: a.depth1pctUsd,
    liquidationUsd1h: a.liquidationUsd1h,
    hasNews: a.hasNews,
    setupScore: a.setupScore,
    alertLevel: a.alertLevel,
    scoreBreakdown: a.scoreBreakdown,
    updatedAt: a.updatedAt,
  };
}

router.get("/scanner/assets", (req, res) => {
  let assets = scanner.getAssets();
  const minScore = req.query.minScore ? Number(req.query.minScore) : null;
  const alertLevel = (req.query.alertLevel as string | undefined) ?? null;
  const sortBy = (req.query.sortBy as string | undefined) ?? "setupScore";
  const sortDir = (req.query.sortDir as string | undefined) ?? "desc";

  if (minScore !== null && Number.isFinite(minScore)) {
    assets = assets.filter((a) => a.setupScore >= minScore);
  }
  if (alertLevel) {
    assets = assets.filter((a) => a.alertLevel === alertLevel);
  }
  const dir = sortDir === "asc" ? 1 : -1;
  const key = sortBy as keyof AssetState;
  assets = [...assets].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (typeof av === "number" && typeof bv === "number") {
      return (av - bv) * dir;
    }
    return 0;
  });
  res.json(assets.map(serializeAsset));
});

router.get("/scanner/assets/:symbol", (req, res) => {
  const a = scanner.getAsset(req.params.symbol);
  if (!a) {
    res.status(404).json({ error: "asset not found" });
    return;
  }
  res.json(serializeAsset(a));
});

router.get("/scanner/summary", (_req, res) => {
  res.json(scanner.getSummary());
});

export default router;
