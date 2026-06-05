import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { sendPushover } from "./pushover";

const originalToken = process.env.PUSHOVER_APP_TOKEN;
const originalUser = process.env.PUSHOVER_USER_KEY;

afterEach(() => {
  if (originalToken === undefined) {
    delete process.env.PUSHOVER_APP_TOKEN;
  } else {
    process.env.PUSHOVER_APP_TOKEN = originalToken;
  }

  if (originalUser === undefined) {
    delete process.env.PUSHOVER_USER_KEY;
  } else {
    process.env.PUSHOVER_USER_KEY = originalUser;
  }
});

describe("sendPushover", () => {
  it("returns a failure without calling fetch when credentials are missing", async () => {
    delete process.env.PUSHOVER_APP_TOKEN;
    delete process.env.PUSHOVER_USER_KEY;
    let called = false;

    const result = await sendPushover(
      { title: "test", message: "test" },
      {
        fetchImpl: (async () => {
          called = true;
          throw new Error("should not fetch");
        }) as typeof fetch,
      },
    );

    assert.equal(result.success, false);
    assert.equal(called, false);
  });

  it("aborts a stalled Pushover request", async () => {
    process.env.PUSHOVER_APP_TOKEN = "token";
    process.env.PUSHOVER_USER_KEY = "user";

    const startedAt = Date.now();
    const result = await sendPushover(
      { title: "test", message: "test" },
      {
        timeoutMs: 10,
        fetchImpl: ((_url, init) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => {
              reject(new Error("aborted"));
            });
          })) as typeof fetch,
      },
    );

    assert.equal(result.success, false);
    assert.match(result.message, /aborted/i);
    assert.ok(Date.now() - startedAt < 250);
  });
});
