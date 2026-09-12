import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LOOKBACK_SLACK_MS,
  WINDOW_15M_MS,
  WINDOW_1H_MS,
  isUsableLookbackSample,
  lookbackWindow,
  pctFromPrior,
} from "./lookback";

describe("lookbackWindow", () => {
  it("bounds the 15m window to [T-25m, T-15m] with default slack", () => {
    const polledAt = new Date("2026-09-12T16:00:00.000Z");
    const { min, max } = lookbackWindow(polledAt, WINDOW_15M_MS);

    assert.equal(max.toISOString(), "2026-09-12T15:45:00.000Z");
    assert.equal(min.toISOString(), "2026-09-12T15:35:00.000Z");
    assert.equal(max.getTime() - min.getTime(), LOOKBACK_SLACK_MS);
  });

  it("bounds the 1h window so a 6h-old snapshot cannot be used as the 1h mark", () => {
    const polledAt = new Date("2026-09-12T16:00:00.000Z");
    const window = lookbackWindow(polledAt, WINDOW_1H_MS);
    const sixHoursOld = new Date(polledAt.getTime() - 6 * 60 * 60 * 1000);

    assert.equal(isUsableLookbackSample(sixHoursOld, window), false);
    assert.equal(
      isUsableLookbackSample(new Date(polledAt.getTime() - WINDOW_1H_MS), window),
      true,
    );
  });
});

describe("isUsableLookbackSample", () => {
  const polledAt = new Date("2026-09-12T16:00:00.000Z");
  const window15 = lookbackWindow(polledAt, WINDOW_15M_MS);

  it("accepts a sample at the exact 15m target", () => {
    assert.equal(
      isUsableLookbackSample(new Date("2026-09-12T15:45:00.000Z"), window15),
      true,
    );
  });

  it("accepts a sample 5 minutes older than the 15m target (within slack)", () => {
    assert.equal(
      isUsableLookbackSample(new Date("2026-09-12T15:40:00.000Z"), window15),
      true,
    );
  });

  it("rejects a sample just older than the slack window", () => {
    assert.equal(
      isUsableLookbackSample(new Date("2026-09-12T15:34:59.000Z"), window15),
      false,
    );
  });

  it("rejects a 6-hour-old sample so an autoscale/sleep gap is not a 15m move", () => {
    assert.equal(
      isUsableLookbackSample(new Date("2026-09-12T10:00:00.000Z"), window15),
      false,
    );
  });

  it("rejects a sample newer than the 15m target (would understate the window)", () => {
    assert.equal(
      isUsableLookbackSample(new Date("2026-09-12T15:50:00.000Z"), window15),
      false,
    );
  });
});

describe("pctFromPrior", () => {
  it("computes percent change from a valid prior price", () => {
    assert.equal(pctFromPrior(110, 100), 10);
    assert.equal(pctFromPrior(95, 100), -5);
  });

  it("treats a missing or unusable prior as 0 so stale gaps do not inflate acceleration", () => {
    assert.equal(pctFromPrior(110, null), 0);
    assert.equal(pctFromPrior(110, undefined), 0);
    assert.equal(pctFromPrior(110, 0), 0);
    assert.equal(pctFromPrior(110, -1), 0);
    assert.equal(pctFromPrior(Number.NaN, 100), 0);
  });
});
