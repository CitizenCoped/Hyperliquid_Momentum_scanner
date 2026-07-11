import test from "node:test";
import assert from "node:assert/strict";
import type { NextFunction, Request, Response } from "express";
import { requireScannerWriteAuth } from "./write-auth";

function withScannerWriteToken<T>(token: string | undefined, run: () => T): T {
  const previous = process.env.SCANNER_WRITE_TOKEN;
  if (token === undefined) {
    delete process.env.SCANNER_WRITE_TOKEN;
  } else {
    process.env.SCANNER_WRITE_TOKEN = token;
  }

  try {
    return run();
  } finally {
    if (previous === undefined) {
      delete process.env.SCANNER_WRITE_TOKEN;
    } else {
      process.env.SCANNER_WRITE_TOKEN = previous;
    }
  }
}

function invoke(headers: Record<string, string | string[] | undefined> = {}) {
  const normalized = new Map(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  );
  const req = {
    headers: Object.fromEntries(normalized),
    get(name: string) {
      const value = normalized.get(name.toLowerCase());
      return Array.isArray(value) ? value[0] : value;
    },
  } as unknown as Request;
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
  };
  let nextCalls = 0;
  const next: NextFunction = () => {
    nextCalls += 1;
  };

  requireScannerWriteAuth(req, res as unknown as Response, next);
  return { res, nextCalls };
}

test("write auth fails closed when SCANNER_WRITE_TOKEN is not configured", () => {
  withScannerWriteToken(undefined, () => {
    const { res, nextCalls } = invoke({
      authorization: "Bearer any-token",
    });

    assert.equal(nextCalls, 0);
    assert.equal(res.statusCode, 503);
    assert.deepEqual(res.body, {
      error: "Scanner write token is not configured",
    });
  });
});

test("write auth rejects missing or invalid caller tokens", () => {
  withScannerWriteToken("expected-token", () => {
    const missing = invoke();
    assert.equal(missing.nextCalls, 0);
    assert.equal(missing.res.statusCode, 401);

    const invalid = invoke({
      authorization: "Bearer wrong-token",
    });
    assert.equal(invalid.nextCalls, 0);
    assert.equal(invalid.res.statusCode, 401);
  });
});

test("write auth accepts a valid bearer token", () => {
  withScannerWriteToken("expected-token", () => {
    const { res, nextCalls } = invoke({
      authorization: "Bearer expected-token",
    });

    assert.equal(nextCalls, 1);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body, undefined);
  });
});

test("write auth accepts the scanner write-token header", () => {
  withScannerWriteToken("expected-token", () => {
    const { res, nextCalls } = invoke({
      "x-scanner-write-token": "expected-token",
    });

    assert.equal(nextCalls, 1);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body, undefined);
  });
});
