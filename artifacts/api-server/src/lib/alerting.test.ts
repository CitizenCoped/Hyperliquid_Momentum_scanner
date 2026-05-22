import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldFireAlertForTransition } from "./alerting";

describe("shouldFireAlertForTransition", () => {
  it("fires when a setup first enters an alertable tier", () => {
    assert.equal(shouldFireAlertForTransition(undefined, "WATCH"), true);
    assert.equal(shouldFireAlertForTransition("IGNORE", "ACTIVE_SETUP"), true);
  });

  it("fires when a setup escalates to a higher tier", () => {
    assert.equal(shouldFireAlertForTransition("WATCH", "ACTIVE_SETUP"), true);
    assert.equal(shouldFireAlertForTransition("ACTIVE_SETUP", "A_PLUS_SETUP"), true);
  });

  it("does not fire for steady-state, downgrade, or ignored tiers", () => {
    assert.equal(shouldFireAlertForTransition("WATCH", "WATCH"), false);
    assert.equal(shouldFireAlertForTransition("A_PLUS_SETUP", "ACTIVE_SETUP"), false);
    assert.equal(shouldFireAlertForTransition("IGNORE", "IGNORE"), false);
  });
});
