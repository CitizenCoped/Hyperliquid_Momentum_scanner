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
