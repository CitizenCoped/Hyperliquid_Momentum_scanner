import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ALERT_LEVEL_RANK, shouldCreateActivationAlert } from "./alerting";

describe("shouldCreateActivationAlert", () => {
  it("does not alert on the first observed state", () => {
    assert.equal(
      shouldCreateActivationAlert({
        currentRank: ALERT_LEVEL_RANK.ACTIVE_SETUP,
        previousRank: undefined,
        minRank: ALERT_LEVEL_RANK.WATCH,
      }),
      false,
    );
  });

  it("alerts when a symbol crosses the configured minimum tier", () => {
    assert.equal(
      shouldCreateActivationAlert({
        currentRank: ALERT_LEVEL_RANK.ACTIVE_SETUP,
        previousRank: ALERT_LEVEL_RANK.WATCH,
        minRank: ALERT_LEVEL_RANK.ACTIVE_SETUP,
      }),
      true,
    );
  });

  it("does not alert for unchanged levels or downgrades", () => {
    assert.equal(
      shouldCreateActivationAlert({
        currentRank: ALERT_LEVEL_RANK.ACTIVE_SETUP,
        previousRank: ALERT_LEVEL_RANK.ACTIVE_SETUP,
        minRank: ALERT_LEVEL_RANK.WATCH,
      }),
      false,
    );
    assert.equal(
      shouldCreateActivationAlert({
        currentRank: ALERT_LEVEL_RANK.WATCH,
        previousRank: ALERT_LEVEL_RANK.ACTIVE_SETUP,
        minRank: ALERT_LEVEL_RANK.WATCH,
      }),
      false,
    );
  });

  it("suppresses lower-tier activations below the configured minimum", () => {
    assert.equal(
      shouldCreateActivationAlert({
        currentRank: ALERT_LEVEL_RANK.WATCH,
        previousRank: ALERT_LEVEL_RANK.IGNORE,
        minRank: ALERT_LEVEL_RANK.ACTIVE_SETUP,
      }),
      false,
    );
  });
});
