import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ScannerEngine } from "./scanner-engine";

describe("scanner engine startup", () => {
  it("does not remain running after startup initialization fails", async () => {
    const engine = new ScannerEngine();
    const transientError = new Error("transient settings failure");
    let attempts = 0;

    (
      engine as unknown as {
        ensureDefaultSettings: () => Promise<void>;
      }
    ).ensureDefaultSettings = async () => {
      attempts += 1;
      throw transientError;
    };

    await assert.rejects(() => engine.start(), /transient settings failure/);
    assert.equal(
      (engine as unknown as { running: boolean }).running,
      false,
    );

    await assert.rejects(() => engine.start(), /transient settings failure/);
    assert.equal(attempts, 2);
  });
});
