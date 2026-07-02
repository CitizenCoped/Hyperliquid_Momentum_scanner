import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import type { Server } from "node:http";
import express from "express";
import { requireWriteToken } from "./write-auth";

const ORIGINAL_TOKEN = process.env["SCANNER_WRITE_TOKEN"];

beforeEach(() => {
  delete process.env["SCANNER_WRITE_TOKEN"];
});

afterEach(() => {
  if (ORIGINAL_TOKEN === undefined) {
    delete process.env["SCANNER_WRITE_TOKEN"];
  } else {
    process.env["SCANNER_WRITE_TOKEN"] = ORIGINAL_TOKEN;
  }
});

async function withServer(
  fn: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const app = express();
  app.use(express.json());
  app.use(requireWriteToken);
  app.get("/resource", (_req, res) => res.json({ ok: true }));
  app.put("/resource", (_req, res) => res.json({ updated: true }));
  app.post("/resource", (_req, res) => res.json({ created: true }));

  const server = await new Promise<Server>((resolve) => {
    const listener = app.listen(0, () => resolve(listener));
  });

  try {
    const address = server.address();
    assert(address && typeof address === "object");
    await fn(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

test("allows read requests without a configured write token", async () => {
  await withServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/resource`);

    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true });
  });
});

test("fails closed for write requests when the server token is not configured", async () => {
  await withServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/resource`, { method: "PUT" });

    assert.equal(res.status, 503);
    assert.match(await res.text(), /write token is not configured/i);
  });
});

test("rejects write requests without a token", async () => {
  process.env["SCANNER_WRITE_TOKEN"] = "correct-token";

  await withServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/resource`, { method: "POST" });

    assert.equal(res.status, 401);
    assert.match(await res.text(), /valid scanner write token/i);
  });
});

test("rejects write requests with the wrong token", async () => {
  process.env["SCANNER_WRITE_TOKEN"] = "correct-token";

  await withServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/resource`, {
      method: "POST",
      headers: { Authorization: "Bearer wrong-token" },
    });

    assert.equal(res.status, 401);
  });
});

test("allows write requests with a bearer token", async () => {
  process.env["SCANNER_WRITE_TOKEN"] = "correct-token";

  await withServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/resource`, {
      method: "PUT",
      headers: { Authorization: "Bearer correct-token" },
    });

    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { updated: true });
  });
});

test("allows write requests with the scanner write token header", async () => {
  process.env["SCANNER_WRITE_TOKEN"] = "correct-token";

  await withServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/resource`, {
      method: "POST",
      headers: { "x-scanner-write-token": "correct-token" },
    });

    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { created: true });
  });
});
