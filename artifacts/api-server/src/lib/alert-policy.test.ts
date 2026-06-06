import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ALERT_LEVEL_RANK,
  currentAlertRanks,
  selectTransitionAlertCandidates,
  type AlertPolicyAsset,
} from "./alert-policy";

const now = 1_000_000;
const cooldownMs = 10_000;

function candidates(
  assets: AlertPolicyAsset[],
  previousRanks: ReadonlyMap<string, number>,
  lastAlertAt: ReadonlyMap<string, number> = new Map(),
) {
  return selectTransitionAlertCandidates({
    assets,
    previousRanks,
    lastAlertAt,
    now,
    cooldownMs,
  }).map((asset) => asset.symbol);
}

describe("selectTransitionAlertCandidates", () => {
  it("baselines the first observation without alerting existing setups", () => {
    assert.deepEqual(
      candidates([{ symbol: "BTC", alertLevel: "A_PLUS_SETUP" }], new Map()),
      [],
    );
  });

  it("does not re-alert unchanged alert tiers after cooldown", () => {
    assert.deepEqual(
      candidates(
        [{ symbol: "ETH", alertLevel: "ACTIVE_SETUP" }],
        new Map([["ETH", ALERT_LEVEL_RANK.ACTIVE_SETUP]]),
      ),
      [],
    );
  });

  it("alerts when an asset re-enters from IGNORE", () => {
    assert.deepEqual(
      candidates(
        [{ symbol: "SOL", alertLevel: "WATCH" }],
        new Map([["SOL", ALERT_LEVEL_RANK.IGNORE]]),
      ),
      ["SOL"],
    );
  });

  it("alerts tier upgrades", () => {
    assert.deepEqual(
      candidates(
        [{ symbol: "HYPE", alertLevel: "A_PLUS_SETUP" }],
        new Map([["HYPE", ALERT_LEVEL_RANK.WATCH]]),
      ),
      ["HYPE"],
    );
  });

  it("suppresses transition alerts during the cooldown window", () => {
    assert.deepEqual(
      candidates(
        [{ symbol: "DOGE", alertLevel: "ACTIVE_SETUP" }],
        new Map([["DOGE", ALERT_LEVEL_RANK.WATCH]]),
        new Map([["DOGE", now - cooldownMs + 1]]),
      ),
      [],
    );
  });
});

describe("currentAlertRanks", () => {
  it("captures the latest observed rank for each asset", () => {
    assert.deepEqual(
      Array.from(
        currentAlertRanks([
          { symbol: "BTC", alertLevel: "IGNORE" },
          { symbol: "ETH", alertLevel: "ACTIVE_SETUP" },
        ]).entries(),
      ),
      [
        ["BTC", ALERT_LEVEL_RANK.IGNORE],
        ["ETH", ALERT_LEVEL_RANK.ACTIVE_SETUP],
      ],
    );
  });
});
