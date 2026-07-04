import assert from "node:assert/strict";
import test from "node:test";
import type { NextFunction, Request, Response } from "express";
import { requireWriteToken } from "./write-auth";

type MockResponse = Pick<Response, "status" | "json"> & {
  body?: unknown;
  statusCode?: number;
};

function withWriteToken<T>(token: string | undefined, fn: () => T): T {
  const previous = process.env.SCANNER_WRITE_TOKEN;
  if (token === undefined) {
    delete process.env.SCANNER_WRITE_TOKEN;
  } else {
    process.env.SCANNER_WRITE_TOKEN = token;
  }

  try {
    return fn();
  } finally {
    if (previous === undefined) {
      delete process.env.SCANNER_WRITE_TOKEN;
    } else {
      process.env.SCANNER_WRITE_TOKEN = previous;
    }
  }
}

function mockRequest(
  method: string,
  headers: Record<string, string> = {},
): Request {
  const normalized = new Map(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  );

  return {
    method,
    get(name: string) {
      return normalized.get(name.toLowerCase());
    },
  } as Request;
}

function mockResponse(): MockResponse {
  const res: MockResponse = {
    status(code: number) {
      res.statusCode = code;
      return res as Response;
    },
    json(body: unknown) {
      res.body = body;
      return res as Response;
    },
  };
  return res;
}

function runMiddleware(
  method: string,
  headers: Record<string, string> = {},
): { nextCalled: boolean; res: MockResponse } {
  const req = mockRequest(method, headers);
  const res = mockResponse();
  let nextCalled = false;
  const next: NextFunction = () => {
    nextCalled = true;
  };

  requireWriteToken(req, res as Response, next);

  return { nextCalled, res };
}

test("allows public read and preflight methods without a token", () => {
  withWriteToken(undefined, () => {
    assert.equal(runMiddleware("GET").nextCalled, true);
    assert.equal(runMiddleware("HEAD").nextCalled, true);
    assert.equal(runMiddleware("OPTIONS").nextCalled, true);
  });
});

test("fails closed for write methods when SCANNER_WRITE_TOKEN is unset", () => {
  withWriteToken(undefined, () => {
    const { nextCalled, res } = runMiddleware("POST");

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 503);
    assert.deepEqual(res.body, {
      error: "Scanner write API is not configured",
    });
  });
});

test("rejects write methods without a matching token", () => {
  withWriteToken("correct-token", () => {
    assert.equal(runMiddleware("PUT").res.statusCode, 401);
    assert.equal(
      runMiddleware("PUT", { authorization: "Bearer wrong-token" }).res
        .statusCode,
      401,
    );
    assert.equal(
      runMiddleware("PUT", { "x-scanner-write-token": "wrong-token" }).res
        .statusCode,
      401,
    );
  });
});

test("allows write methods with a matching bearer or scanner token header", () => {
  withWriteToken("correct-token", () => {
    assert.equal(
      runMiddleware("POST", { authorization: "Bearer correct-token" })
        .nextCalled,
      true,
    );
    assert.equal(
      runMiddleware("DELETE", { "x-scanner-write-token": "correct-token" })
        .nextCalled,
      true,
    );
  });
});
