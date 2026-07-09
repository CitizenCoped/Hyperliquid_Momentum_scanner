import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import type { Request, Response } from "express";
import { requireWriteToken } from "./write-auth";

const ORIGINAL_TOKEN = process.env["SCANNER_WRITE_TOKEN"];

afterEach(() => {
  if (ORIGINAL_TOKEN === undefined) {
    delete process.env["SCANNER_WRITE_TOKEN"];
  } else {
    process.env["SCANNER_WRITE_TOKEN"] = ORIGINAL_TOKEN;
  }
});

function runMiddleware(method: string, headers: Record<string, string> = {}) {
  let statusCode: number | undefined;
  let body: unknown;
  let nextCalled = false;
  const normalizedHeaders = new Map(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  );

  const req = {
    method,
    get(name: string) {
      return normalizedHeaders.get(name.toLowerCase());
    },
  } as Request;

  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(payload: unknown) {
      body = payload;
      return this;
    },
  } as Response;

  requireWriteToken(req, res, () => {
    nextCalled = true;
  });

  return { statusCode, body, nextCalled };
}

describe("requireWriteToken", () => {
  it("allows read-only requests without a token", () => {
    delete process.env["SCANNER_WRITE_TOKEN"];

    const result = runMiddleware("GET");

    assert.equal(result.nextCalled, true);
    assert.equal(result.statusCode, undefined);
  });

  it("fails closed when write token is not configured", () => {
    delete process.env["SCANNER_WRITE_TOKEN"];

    const result = runMiddleware("PUT");

    assert.equal(result.nextCalled, false);
    assert.equal(result.statusCode, 503);
    assert.deepEqual(result.body, {
      error: "Scanner write API is disabled until SCANNER_WRITE_TOKEN is configured.",
    });
  });

  it("rejects writes with a missing or invalid token", () => {
    process.env["SCANNER_WRITE_TOKEN"] = "correct-token";

    const missing = runMiddleware("POST");
    const invalid = runMiddleware("POST", {
      authorization: "Bearer wrong-token",
    });

    assert.equal(missing.nextCalled, false);
    assert.equal(missing.statusCode, 401);
    assert.equal(invalid.nextCalled, false);
    assert.equal(invalid.statusCode, 401);
  });

  it("allows writes with the bearer token", () => {
    process.env["SCANNER_WRITE_TOKEN"] = "correct-token";

    const result = runMiddleware("PUT", {
      authorization: "Bearer correct-token",
    });

    assert.equal(result.nextCalled, true);
    assert.equal(result.statusCode, undefined);
  });

  it("allows writes with the scanner token header", () => {
    process.env["SCANNER_WRITE_TOKEN"] = "correct-token";

    const result = runMiddleware("POST", {
      "x-scanner-write-token": "correct-token",
    });

    assert.equal(result.nextCalled, true);
    assert.equal(result.statusCode, undefined);
  });
});
