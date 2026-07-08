import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractScannerWriteToken,
  isScannerWriteTokenValid,
  isWriteMethod,
  requireScannerWriteToken,
} from "./write-auth";

async function invokeWriteAuth(
  method: string,
  headers: Record<string, string | undefined>,
  expectedToken?: string,
) {
  const previousToken = process.env.SCANNER_WRITE_TOKEN;
  if (expectedToken === undefined) {
    delete process.env.SCANNER_WRITE_TOKEN;
  } else {
    process.env.SCANNER_WRITE_TOKEN = expectedToken;
  }

  let statusCode: number | null = null;
  let body: unknown = null;
  let nextCalled = false;

  const req = {
    method,
    get(name: string) {
      return headers[name.toLowerCase()];
    },
  };
  const res = {
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(payload: unknown) {
      body = payload;
      return res;
    },
  };

  await requireScannerWriteToken(
    req as never,
    res as never,
    () => {
      nextCalled = true;
    },
  );

  if (previousToken === undefined) {
    delete process.env.SCANNER_WRITE_TOKEN;
  } else {
    process.env.SCANNER_WRITE_TOKEN = previousToken;
  }

  return { statusCode, body, nextCalled };
}

describe("scanner write auth", () => {
  it("classifies mutating methods as writes", () => {
    assert.equal(isWriteMethod("GET"), false);
    assert.equal(isWriteMethod("HEAD"), false);
    assert.equal(isWriteMethod("OPTIONS"), false);
    assert.equal(isWriteMethod("POST"), true);
    assert.equal(isWriteMethod("put"), true);
    assert.equal(isWriteMethod("PATCH"), true);
    assert.equal(isWriteMethod("DELETE"), true);
  });

  it("extracts bearer and fallback header tokens", () => {
    assert.equal(extractScannerWriteToken("Bearer secret", undefined), "secret");
    assert.equal(
      extractScannerWriteToken("bearer   spaced-secret  ", undefined),
      "spaced-secret",
    );
    assert.equal(
      extractScannerWriteToken(undefined, " header-secret "),
      "header-secret",
    );
    assert.equal(
      extractScannerWriteToken("Basic ignored", "fallback-secret"),
      "fallback-secret",
    );
  });

  it("fails closed without a configured server token", () => {
    assert.equal(isScannerWriteTokenValid(undefined, "secret"), false);
    assert.equal(isScannerWriteTokenValid("", "secret"), false);
    assert.equal(isScannerWriteTokenValid("   ", "secret"), false);
  });

  it("requires an exact token match", () => {
    assert.equal(isScannerWriteTokenValid("secret", "secret"), true);
    assert.equal(isScannerWriteTokenValid("secret", "wrong"), false);
    assert.equal(isScannerWriteTokenValid("secret", "secret-extra"), false);
    assert.equal(isScannerWriteTokenValid(" secret ", "secret"), true);
  });

  it("allows reads without a token", async () => {
    const result = await invokeWriteAuth("GET", {});

    assert.equal(result.nextCalled, true);
    assert.equal(result.statusCode, null);
  });

  it("fails closed for writes when the server token is missing", async () => {
    const result = await invokeWriteAuth("PUT", {
      authorization: "Bearer secret",
    });

    assert.equal(result.nextCalled, false);
    assert.equal(result.statusCode, 503);
    assert.deepEqual(result.body, {
      error: "Scanner write token is not configured",
    });
  });

  it("rejects writes with a missing or invalid token", async () => {
    const missing = await invokeWriteAuth("POST", {}, "secret");
    const invalid = await invokeWriteAuth(
      "DELETE",
      { "x-scanner-write-token": "wrong" },
      "secret",
    );

    assert.equal(missing.nextCalled, false);
    assert.equal(missing.statusCode, 401);
    assert.equal(invalid.nextCalled, false);
    assert.equal(invalid.statusCode, 401);
  });

  it("allows writes with a valid bearer or fallback header token", async () => {
    const bearer = await invokeWriteAuth(
      "POST",
      { authorization: "Bearer secret" },
      "secret",
    );
    const fallback = await invokeWriteAuth(
      "PATCH",
      { "x-scanner-write-token": "secret" },
      "secret",
    );

    assert.equal(bearer.nextCalled, true);
    assert.equal(bearer.statusCode, null);
    assert.equal(fallback.nextCalled, true);
    assert.equal(fallback.statusCode, null);
  });
});
