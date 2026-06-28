import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import type { AddressInfo } from "node:net";
import express from "express";
import {
  requireScannerWriteToken,
  WRITE_TOKEN_ENV_VAR,
} from "./write-auth";

afterEach(() => {
  delete process.env[WRITE_TOKEN_ENV_VAR];
});

function buildTestApp() {
  const app = express();
  app.use("/api", requireScannerWriteToken);
  app.use(express.json());
  app.get("/api/settings", (_req, res) => {
    res.json({ ok: true });
  });
  app.put("/api/settings", (_req, res) => {
    res.status(204).end();
  });
  app.post("/api/alerts/test-pushover", (_req, res) => {
    res.status(204).end();
  });
  return app;
}

async function request(
  method: string,
  path: string,
  headers?: Record<string, string>,
): Promise<Response> {
  const server = buildTestApp().listen(0);
  try {
    const { port } = server.address() as AddressInfo;
    return await fetch(`http://127.0.0.1:${port}${path}`, {
      method,
      headers,
      body: method === "GET" ? undefined : "{}",
    });
  } finally {
    server.close();
  }
}

async function readJsonObject(response: Response): Promise<Record<string, unknown>> {
  const body = await response.json();
  assert.equal(typeof body, "object");
  assert.notEqual(body, null);
  return body as Record<string, unknown>;
}

test("allows public read requests without a write token", async () => {
  const response = await request("GET", "/api/settings");

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
});

test("rejects write requests when the server token is not configured", async () => {
  const response = await request("PUT", "/api/settings");

  assert.equal(response.status, 503);
  const body = await readJsonObject(response);
  const error = body.error;
  if (typeof error !== "string") {
    throw new TypeError("Expected error response body to contain a string error");
  }
  assert.match(error, /SCANNER_WRITE_TOKEN/);
});

test("rejects write requests without credentials", async () => {
  process.env[WRITE_TOKEN_ENV_VAR] = "secret-token";

  const response = await request("POST", "/api/alerts/test-pushover");

  assert.equal(response.status, 401);
  assert.equal(
    response.headers.get("www-authenticate"),
    'Bearer realm="scanner-write"',
  );
});

test("allows write requests with the scanner write token header", async () => {
  process.env[WRITE_TOKEN_ENV_VAR] = "secret-token";

  const response = await request("PUT", "/api/settings", {
    "x-scanner-write-token": "secret-token",
  });

  assert.equal(response.status, 204);
});

test("allows write requests with an authorization bearer token", async () => {
  process.env[WRITE_TOKEN_ENV_VAR] = "secret-token";

  const response = await request("POST", "/api/alerts/test-pushover", {
    authorization: "Bearer secret-token",
  });

  assert.equal(response.status, 204);
});
