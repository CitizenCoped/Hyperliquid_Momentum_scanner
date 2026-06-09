import assert from "node:assert/strict";
import { test } from "node:test";

process.env["DATABASE_URL"] ??= "postgres://scanner:scanner@127.0.0.1:1/scanner";
process.env["NODE_ENV"] = "production";

type TestableScannerEngine = {
  runOnce: () => Promise<void>;
  runOnceExclusive: () => Promise<void>;
};

test("scanner polls are serialized when scheduler entries overlap", async () => {
  const { ScannerEngine } = await import("./scanner-engine");
  const engine = new ScannerEngine() as unknown as TestableScannerEngine;

  let runCalls = 0;
  let activeRuns = 0;
  let maxActiveRuns = 0;
  let releaseFirstRun!: () => void;
  let firstRunStarted!: () => void;

  const firstRunStartedPromise = new Promise<void>((resolve) => {
    firstRunStarted = resolve;
  });
  const releaseFirstRunPromise = new Promise<void>((resolve) => {
    releaseFirstRun = resolve;
  });

  engine.runOnce = async () => {
    runCalls += 1;
    activeRuns += 1;
    maxActiveRuns = Math.max(maxActiveRuns, activeRuns);
    firstRunStarted();

    if (runCalls === 1) {
      await releaseFirstRunPromise;
    }

    activeRuns -= 1;
  };

  const first = engine.runOnceExclusive();
  await firstRunStartedPromise;
  const second = engine.runOnceExclusive();

  assert.equal(runCalls, 1);
  assert.equal(maxActiveRuns, 1);
  assert.equal(second, first);

  releaseFirstRun();
  await Promise.all([first, second]);

  await engine.runOnceExclusive();

  assert.equal(runCalls, 2);
  assert.equal(maxActiveRuns, 1);
});
