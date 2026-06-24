import test from "node:test";
import assert from "node:assert/strict";
import type { Request, Response } from "express";
import { requireAdminAuth } from "./admin-auth";

interface AuthResult {
  statusCode: number | null;
  body: unknown;
  nextCalled: boolean;
}

function runAuth(authorization?: string): AuthResult {
  const result: AuthResult = {
    statusCode: null,
    body: undefined,
    nextCalled: false,
  };

  const req = {
    header(name: string) {
      return name.toLowerCase() === "authorization" ? authorization : undefined;
    },
  } as Request;

  const res = {
    status(code: number) {
      result.statusCode = code;
      return this;
    },
    json(body: unknown) {
      result.body = body;
      return this;
    },
  } as Response;

  requireAdminAuth(req, res, () => {
    result.nextCalled = true;
  });

  return result;
}

function setAdminToken(value: string | undefined): () => void {
  const previous = process.env.SCANNER_ADMIN_TOKEN;
  if (value === undefined) {
    delete process.env.SCANNER_ADMIN_TOKEN;
  } else {
    process.env.SCANNER_ADMIN_TOKEN = value;
  }

  return () => {
    if (previous === undefined) {
      delete process.env.SCANNER_ADMIN_TOKEN;
    } else {
      process.env.SCANNER_ADMIN_TOKEN = previous;
    }
  };
}

test("mutating scanner routes fail closed when no admin token is configured", () => {
  const restore = setAdminToken(undefined);
  try {
    const result = runAuth("Bearer anything");

    assert.equal(result.statusCode, 503);
    assert.deepEqual(result.body, {
      error: "SCANNER_ADMIN_TOKEN is required for mutating scanner endpoints",
    });
    assert.equal(result.nextCalled, false);
  } finally {
    restore();
  }
});

test("mutating scanner routes require a bearer token", () => {
  const restore = setAdminToken("correct-token");
  try {
    const result = runAuth();

    assert.equal(result.statusCode, 401);
    assert.deepEqual(result.body, { error: "Admin bearer token required" });
    assert.equal(result.nextCalled, false);
  } finally {
    restore();
  }
});

test("mutating scanner routes reject incorrect bearer tokens", () => {
  const restore = setAdminToken("correct-token");
  try {
    const result = runAuth("Bearer wrong-token");

    assert.equal(result.statusCode, 403);
    assert.deepEqual(result.body, { error: "Invalid admin bearer token" });
    assert.equal(result.nextCalled, false);
  } finally {
    restore();
  }
});

test("mutating scanner routes continue after a valid bearer token", () => {
  const restore = setAdminToken("correct-token");
  try {
    const result = runAuth("Bearer correct-token");

    assert.equal(result.statusCode, null);
    assert.equal(result.body, undefined);
    assert.equal(result.nextCalled, true);
  } finally {
    restore();
  }
});
