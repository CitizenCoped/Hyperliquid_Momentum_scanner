import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { afterEach, describe, it } from "node:test";
import express from "express";
import { requireWriteAuth } from "./write-auth";

const originalToken = process.env["SCANNER_WRITE_TOKEN"];

afterEach(() => {
  if (originalToken === undefined) {
    delete process.env["SCANNER_WRITE_TOKEN"];
  } else {
    process.env["SCANNER_WRITE_TOKEN"] = originalToken;
  }
});

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

async function request(
  method: string,
  headers?: HeadersInit,
): Promise<Response> {
  const app = express();
  app.use(express.json());
  app.use(requireWriteAuth);
  app.get("/settings", (_req, res) => res.type("text").send("read ok"));
  app.put("/settings", (_req, res) => res.json({ updated: true }));
  app.post("/alerts/test-pushover", (_req, res) => res.json({ sent: true }));

  const server = app.listen(0);
  await once(server, "listening");

  try {
    const { port } = server.address() as AddressInfo;
    return await fetch(`http://127.0.0.1:${port}/settings`, {
      method,
      headers,
      body: method === "GET" ? undefined : JSON.stringify({ ok: true }),
    });
  } finally {
    await closeServer(server);
  }
}

describe("requireWriteAuth", () => {
  it("allows safe methods without a configured token", async () => {
    delete process.env["SCANNER_WRITE_TOKEN"];

    const response = await request("GET");

    assert.equal(response.status, 200);
    assert.equal(await response.text(), "read ok");
  });

  it("fails closed for writes when no token is configured", async () => {
    delete process.env["SCANNER_WRITE_TOKEN"];

    const response = await request("PUT");

    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {
      error: "Scanner write authentication is not configured",
    });
  });

  it("rejects writes without credentials when a token is configured", async () => {
    process.env["SCANNER_WRITE_TOKEN"] = "expected-token";

    const response = await request("PUT");

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "Unauthorized" });
  });

  it("rejects writes with an invalid token", async () => {
    process.env["SCANNER_WRITE_TOKEN"] = "expected-token";

    const response = await request("PUT", {
      authorization: "Bearer wrong-token",
    });

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "Unauthorized" });
  });

  it("allows writes with a valid bearer token", async () => {
    process.env["SCANNER_WRITE_TOKEN"] = "expected-token";

    const response = await request("PUT", {
      authorization: "Bearer expected-token",
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { updated: true });
  });

  it("allows writes with a valid scanner token header", async () => {
    process.env["SCANNER_WRITE_TOKEN"] = "expected-token";

    const response = await request("PUT", {
      "x-scanner-write-token": "expected-token",
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { updated: true });
  });
});
