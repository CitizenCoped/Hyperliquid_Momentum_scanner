import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { Server } from "node:http";

process.env.DATABASE_URL ??= "postgres://scanner:scanner@127.0.0.1:5432/scanner";

let server: Server;
let baseUrl: string;

before(async () => {
  const { default: app } = await import("../app");

  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", () => {
      const address = server.address();
      assert(address && typeof address === "object");
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

describe("scanner write authentication", () => {
  it("allows public read requests without a write token", async () => {
    delete process.env.SCANNER_WRITE_TOKEN;

    const response = await fetch(`${baseUrl}/api/healthz`);

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "ok" });
  });

  it("denies write requests when the server token is not configured", async () => {
    delete process.env.SCANNER_WRITE_TOKEN;

    const response = await fetch(`${baseUrl}/api/alerts/test-pushover`, {
      method: "POST",
    });

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), {
      error: "Scanner write token is not configured",
    });
  });

  it("denies write requests with an invalid token", async () => {
    process.env.SCANNER_WRITE_TOKEN = "correct-token";

    const response = await fetch(`${baseUrl}/api/alerts/test-pushover`, {
      method: "POST",
      headers: {
        authorization: "Bearer wrong-token",
      },
    });

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), {
      error: "Invalid scanner write token",
    });
  });

  it("allows write requests with a matching bearer token", async () => {
    process.env.SCANNER_WRITE_TOKEN = "correct-token";

    const response = await fetch(`${baseUrl}/api/alerts/test-pushover`, {
      method: "POST",
      headers: {
        authorization: "Bearer correct-token",
      },
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      success: false,
      message: "PUSHOVER_APP_TOKEN or PUSHOVER_USER_KEY not configured",
    });
  });

  it("allows write requests with a matching scanner token header", async () => {
    process.env.SCANNER_WRITE_TOKEN = "correct-token";

    const response = await fetch(`${baseUrl}/api/alerts/test-pushover`, {
      method: "POST",
      headers: {
        "x-scanner-write-token": "correct-token",
      },
    });

    assert.equal(response.status, 200);
  });
});
