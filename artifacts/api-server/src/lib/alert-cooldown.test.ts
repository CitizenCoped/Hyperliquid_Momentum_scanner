import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  preferCooldownEntry,
  shouldSuppressForCooldown,
} from "./alert-cooldown";

const now = 1_000_000;
const cooldown = 10 * 60 * 1000;

describe("alert cooldown", () => {
  it("does not let WATCH suppress a later A+ escalation", () => {
    assert.equal(
      shouldSuppressForCooldown(
        "A_PLUS_SETUP",
        { alertLevel: "WATCH", createdAtMs: now - 60_000 },
        now,
        cooldown,
      ),
      false,
    );
  });

  it("suppresses repeated alerts at the same level within the cooldown", () => {
    assert.equal(
      shouldSuppressForCooldown(
        "ACTIVE_SETUP",
        { alertLevel: "ACTIVE_SETUP", createdAtMs: now - 60_000 },
        now,
        cooldown,
      ),
      true,
    );
  });

  it("uses the highest severity recent alert for DB cooldown backfill", () => {
    const watch = { alertLevel: "WATCH", createdAtMs: now - 10_000 };
    const active = { alertLevel: "ACTIVE_SETUP", createdAtMs: now - 30_000 };

    assert.deepEqual(preferCooldownEntry(watch, active), active);
  });

  it("allows a repeated level after the cooldown expires", () => {
    assert.equal(
      shouldSuppressForCooldown(
        "A_PLUS_SETUP",
        { alertLevel: "A_PLUS_SETUP", createdAtMs: now - cooldown },
        now,
        cooldown,
      ),
      false,
    );
  });
});
