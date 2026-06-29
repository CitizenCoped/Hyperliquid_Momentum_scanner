import { createServer } from "node:http";
import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { requireScannerWriteAuth } from "./write-auth";

async function request(
  path: string,
  init: RequestInit = {},
): Promise<{ status: number; body: string }> {
  const app = express();
  let writes = 0;

  app.use(express.json());
  app.use("/api", requireScannerWriteAuth);
  app.get("/api/read", (_req, res) => res.json({ ok: true }));
  app.put("/api/write", (_req, res) => {
    writes += 1;
    res.status(204).end();
  });

  const server = createServer(app);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });

  try {
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Test server did not bind to a TCP port");
    }

    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, init);
    return {
      status: response.status,
      body: `${await response.text()}|writes:${writes}`,
    };
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

test("scanner write auth leaves read requests public", async () => {
  delete process.env.SCANNER_WRITE_TOKEN;

  const response = await request("/api/read");

  assert.equal(response.status, 200);
  assert.match(response.body, /"ok":true/);
});

test("scanner write auth fails closed when no token is configured", async () => {
  delete process.env.SCANNER_WRITE_TOKEN;

  const response = await request("/api/write", { method: "PUT" });

  assert.equal(response.status, 503);
  assert.match(response.body, /write token is not configured/);
  assert.match(response.body, /writes:0$/);
});

test("scanner write auth rejects missing or invalid tokens", async () => {
  process.env.SCANNER_WRITE_TOKEN = "expected-token";

  const missing = await request("/api/write", { method: "PUT" });
  const invalid = await request("/api/write", {
    method: "PUT",
    headers: { authorization: "Bearer wrong-token" },
  });

  assert.equal(missing.status, 401);
  assert.equal(invalid.status, 401);
  assert.match(missing.body, /writes:0$/);
  assert.match(invalid.body, /writes:0$/);
});

test("scanner write auth accepts bearer and scanner token headers", async () => {
  process.env.SCANNER_WRITE_TOKEN = "expected-token";

  const bearer = await request("/api/write", {
    method: "PUT",
    headers: { authorization: "Bearer expected-token" },
  });
  const scannerHeader = await request("/api/write", {
    method: "PUT",
    headers: { "x-scanner-write-token": "expected-token" },
  });

  assert.equal(bearer.status, 204);
  assert.equal(scannerHeader.status, 204);
  assert.match(bearer.body, /writes:1$/);
  assert.match(scannerHeader.body, /writes:1$/);
});
