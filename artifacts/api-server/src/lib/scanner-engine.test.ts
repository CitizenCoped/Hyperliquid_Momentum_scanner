import assert from "node:assert/strict";
import { test } from "node:test";
import type { AssetState } from "./scanner-engine";

process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";

function makeAsset(symbol: string): AssetState {
  return {
    symbol,
    markPrice: 0.01,
    dayChangePct: 1,
    change15mPct: 0.5,
    change1hPct: 2,
    change4hPct: 3,
    dailyRvol: 1,
    intradayRvol: 1,
    openInterestUsd: 1_000_000,
    fundingRate: 0,
    spreadBps: 5,
    depth1pctUsd: 500_000,
    liquidationUsd1h: 0,
    hasNews: false,
    setupScore: 10,
    alertLevel: "IGNORE",
    scoreBreakdown: {
      dayChange: 0,
      rvol: 0,
      acceleration: 0,
      squeezeStructure: 10,
      catalyst: 0,
    },
    updatedAt: new Date(0).toISOString(),
  };
}

test("scanner asset lookup preserves Hyperliquid mixed-case symbols", async () => {
  const { scanner } = await import("./scanner-engine");
  const mutableScanner = scanner as unknown as {
    state: Map<string, AssetState>;
    getAsset(symbol: string): AssetState | null;
    stop(): void;
  };
  const previousState = mutableScanner.state;
  const mixedCaseAsset = makeAsset("kPEPE");

  try {
    mutableScanner.state = new Map([[mixedCaseAsset.symbol, mixedCaseAsset]]);

    assert.equal(mutableScanner.getAsset("kPEPE"), mixedCaseAsset);
    assert.equal(mutableScanner.getAsset("KPEPE"), mixedCaseAsset);
    assert.equal(mutableScanner.getAsset("kpepe"), mixedCaseAsset);
    assert.equal(mutableScanner.getAsset("DOGE"), null);
  } finally {
    mutableScanner.state = previousState;
    mutableScanner.stop();
  }
});
