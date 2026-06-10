import assert from "node:assert/strict";
import test from "node:test";
import { planAlertCandidate } from "./scanner-engine";

const now = new Date("2026-06-10T16:00:00.000Z").getTime();
const fiveMinutesAgo = new Date(now - 5 * 60 * 1000);

test("lower-tier feed row does not suppress an escalated push notification", () => {
  const plan = planAlertCandidate({
    now,
    alertLevel: "ACTIVE_SETUP",
    minAlertLevel: "ACTIVE_SETUP",
    pushoverEnabled: true,
    recentAny: {
      createdAt: fiveMinutesAgo,
      rank: 1,
    },
  });

  assert.deepEqual(plan, {
    shouldInsert: true,
    shouldSendPushover: true,
  });
});

test("failed push attempt does not suppress retry inside the cooldown window", () => {
  const plan = planAlertCandidate({
    now,
    alertLevel: "ACTIVE_SETUP",
    minAlertLevel: "ACTIVE_SETUP",
    pushoverEnabled: true,
    recentAny: {
      createdAt: fiveMinutesAgo,
      rank: 2,
    },
  });

  assert.deepEqual(plan, {
    shouldInsert: true,
    shouldSendPushover: true,
  });
});

test("successfully delivered notification suppresses same-level duplicate", () => {
  const plan = planAlertCandidate({
    now,
    alertLevel: "ACTIVE_SETUP",
    minAlertLevel: "ACTIVE_SETUP",
    pushoverEnabled: true,
    recentAny: {
      createdAt: fiveMinutesAgo,
      rank: 2,
    },
    recentNotification: {
      createdAt: fiveMinutesAgo,
      rank: 2,
    },
  });

  assert.deepEqual(plan, {
    shouldInsert: false,
    shouldSendPushover: false,
  });
});

test("delivered lower-tier notification does not suppress higher-tier escalation", () => {
  const plan = planAlertCandidate({
    now,
    alertLevel: "A_PLUS_SETUP",
    minAlertLevel: "WATCH",
    pushoverEnabled: true,
    recentAny: {
      createdAt: fiveMinutesAgo,
      rank: 1,
    },
    recentNotification: {
      createdAt: fiveMinutesAgo,
      rank: 1,
    },
  });

  assert.deepEqual(plan, {
    shouldInsert: true,
    shouldSendPushover: true,
  });
});
