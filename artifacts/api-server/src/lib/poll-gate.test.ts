import assert from "node:assert/strict";
import { test } from "node:test";
import { PollGate } from "./poll-gate";

test("PollGate skips overlapping tasks and reopens after completion", async () => {
  const gate = new PollGate();
  let releaseFirst!: () => void;
  let started = 0;

  const first = gate.run(
    () =>
      new Promise<void>((resolve) => {
        started += 1;
        releaseFirst = resolve;
      }),
  );

  await Promise.resolve();

  const second = await gate.run(async () => {
    started += 1;
  });

  assert.equal(second, false);
  assert.equal(started, 1);
  assert.equal(gate.isActive(), true);

  releaseFirst();
  assert.equal(await first, true);
  assert.equal(gate.isActive(), false);

  const third = await gate.run(async () => {
    started += 1;
  });

  assert.equal(third, true);
  assert.equal(started, 2);
});

test("ScannerEngine skips a scheduled poll while startup poll is active", async () => {
  process.env["DATABASE_URL"] ??= "postgres://user:pass@localhost:5432/db";

  const { scanner } = await import("./scanner-engine");
  const engine = scanner as unknown as {
    runOnce: () => Promise<void>;
    runOnceIfIdle: () => Promise<void>;
  };

  const originalRunOnce = engine.runOnce;
  let releaseFirst!: () => void;
  let started = 0;

  try {
    engine.runOnce = () =>
      new Promise<void>((resolve) => {
        started += 1;
        releaseFirst = resolve;
      });

    const startupPoll = engine.runOnceIfIdle();
    await Promise.resolve();

    await engine.runOnceIfIdle();

    assert.equal(started, 1);

    releaseFirst();
    await startupPoll;

    await engine.runOnceIfIdle();
    assert.equal(started, 2);
  } finally {
    engine.runOnce = originalRunOnce;
  }
});
