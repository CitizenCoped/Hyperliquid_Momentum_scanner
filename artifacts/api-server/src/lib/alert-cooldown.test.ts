import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  alertRank,
  shouldSuppressForCooldown,
  type AlertCooldownEntry,
} from "./alert-cooldown";

const COOLDOWN_MS = 10 * 60 * 1000;
const NOW_MS = Date.UTC(2026, 5, 20, 16, 0, 0);

function recent(level: string, ageMs: number): AlertCooldownEntry {
  return {
    firedAtMs: NOW_MS - ageMs,
    rank: alertRank(level),
  };
}

describe("alert cooldown severity handling", () => {
  it("allows a higher-severity escalation during an existing lower-severity cooldown", () => {
    assert.equal(
      shouldSuppressForCooldown(
        recent("WATCH", 2 * 60 * 1000),
        alertRank("ACTIVE_SETUP"),
        NOW_MS,
        COOLDOWN_MS,
      ),
      false,
    );
  });

  it("suppresses duplicate alerts at the same severity during cooldown", () => {
    assert.equal(
      shouldSuppressForCooldown(
        recent("ACTIVE_SETUP", 2 * 60 * 1000),
        alertRank("ACTIVE_SETUP"),
        NOW_MS,
        COOLDOWN_MS,
      ),
      true,
    );
  });

  it("suppresses lower-severity alerts after a higher-severity alert during cooldown", () => {
    assert.equal(
      shouldSuppressForCooldown(
        recent("A_PLUS_SETUP", 2 * 60 * 1000),
        alertRank("WATCH"),
        NOW_MS,
        COOLDOWN_MS,
      ),
      true,
    );
  });

  it("allows same-severity alerts after the cooldown expires", () => {
    assert.equal(
      shouldSuppressForCooldown(
        recent("ACTIVE_SETUP", COOLDOWN_MS + 1),
        alertRank("ACTIVE_SETUP"),
        NOW_MS,
        COOLDOWN_MS,
      ),
      false,
    );
  });
});
