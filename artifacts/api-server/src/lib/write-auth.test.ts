import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { afterEach, describe, it } from "node:test";
import express from "express";
import { requireScannerWriteAuth } from "./write-auth";

const originalToken = process.env["SCANNER_WRITE_TOKEN"];

afterEach(() => {
  if (originalToken === undefined) {
    delete process.env["SCANNER_WRITE_TOKEN"];
  } else {
    process.env["SCANNER_WRITE_TOKEN"] = originalToken;
  }
});

async function makeRequest(
  method: string,
  headers?: Record<string, string>,
): Promise<Response> {
  const app = express();
  app.use(requireScannerWriteAuth);
  app.all("/resource", (_req, res) => {
    res.json({ ok: true });
  });

  const server = app.listen(0);

  try {
    const { port } = server.address() as AddressInfo;
    return await fetch(`http://127.0.0.1:${port}/resource`, {
      method,
      headers,
    });
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

describe("requireScannerWriteAuth", () => {
  it("allows read requests without a configured token", async () => {
    delete process.env["SCANNER_WRITE_TOKEN"];

    const response = await makeRequest("GET");

    assert.equal(response.status, 200);
  });

  it("fails closed for write requests when no token is configured", async () => {
    delete process.env["SCANNER_WRITE_TOKEN"];

    const response = await makeRequest("POST");

    assert.equal(response.status, 503);
  });

  it("rejects write requests without the scanner write token", async () => {
    process.env["SCANNER_WRITE_TOKEN"] = "correct-token";

    const response = await makeRequest("PUT");

    assert.equal(response.status, 401);
  });

  it("rejects write requests with the wrong scanner write token", async () => {
    process.env["SCANNER_WRITE_TOKEN"] = "correct-token";

    const response = await makeRequest("POST", {
      authorization: "Bearer wrong-token",
    });

    assert.equal(response.status, 401);
  });

  it("allows write requests with a matching bearer token", async () => {
    process.env["SCANNER_WRITE_TOKEN"] = "correct-token";

    const response = await makeRequest("POST", {
      authorization: "Bearer correct-token",
    });

    assert.equal(response.status, 200);
  });

  it("allows write requests with a matching scanner token header", async () => {
    process.env["SCANNER_WRITE_TOKEN"] = "correct-token";

    const response = await makeRequest("POST", {
      "x-scanner-write-token": "correct-token",
    });

    assert.equal(response.status, 200);
  });
});
