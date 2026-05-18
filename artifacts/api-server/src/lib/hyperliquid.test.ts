import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parsePerpSnapshots } from "./hyperliquid";

const universeEntry = {
  name: "BTC",
  szDecimals: 5,
  maxLeverage: 50,
};

const ctx = {
  funding: "0.0001",
  openInterest: "100",
  prevDayPx: "49000",
  dayNtlVlm: "1000000000",
  premium: null,
  oraclePx: "50010",
  markPx: "50000",
  midPx: "50001",
  impactPxs: null,
  dayBaseVlm: "20000",
};

describe("parsePerpSnapshots", () => {
  it("maps Hyperliquid metaAndAssetCtxs into scanner snapshots", () => {
    const [snapshot] = parsePerpSnapshots([
      { universe: [universeEntry] },
      [ctx],
    ]);

    assert.deepEqual(snapshot, {
      symbol: "BTC",
      markPrice: 50000,
      midPrice: 50001,
      prevDayPx: 49000,
      dayNtlVlm: 1000000000,
      openInterest: 5000000,
      fundingRate: 0.0001,
      oraclePx: 50010,
      premium: null,
      maxLeverage: 50,
    });
  });

  it("rejects empty universes so a transient upstream payload cannot clear scanner state", () => {
    assert.throws(
      () => parsePerpSnapshots([{ universe: [] }, []]),
      /empty perp universe/,
    );
  });

  it("rejects misaligned contexts so partial upstream payloads do not drop assets", () => {
    assert.throws(
      () =>
        parsePerpSnapshots([
          { universe: [universeEntry, { ...universeEntry, name: "ETH" }] },
          [ctx],
        ]),
      /context count 1 did not match universe count 2/,
    );
  });
});
