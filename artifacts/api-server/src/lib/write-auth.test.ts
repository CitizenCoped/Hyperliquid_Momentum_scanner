import assert from "node:assert/strict";
import test from "node:test";
import { requireWriteToken } from "./write-auth";

function invokeMiddleware(opts: {
  method: string;
  headers?: Record<string, string>;
  env?: Record<string, string | undefined>;
}) {
  const previousEnv = {
    NODE_ENV: process.env.NODE_ENV,
    SCANNER_WRITE_TOKEN: process.env.SCANNER_WRITE_TOKEN,
  };

  for (const [key, value] of Object.entries(opts.env ?? {})) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  let statusCode = 200;
  let body: unknown = null;
  const responseHeaders = new Map<string, string>();
  let nextCalled = false;

  try {
    requireWriteToken(
      {
        method: opts.method,
        get(name: string) {
          return opts.headers?.[name.toLowerCase()];
        },
      } as any,
      {
        status(code: number) {
          statusCode = code;
          return this;
        },
        json(payload: unknown) {
          body = payload;
          return this;
        },
        setHeader(name: string, value: string) {
          responseHeaders.set(name.toLowerCase(), value);
        },
      } as any,
      () => {
        nextCalled = true;
      },
    );
  } finally {
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }

  return { statusCode, body, responseHeaders, nextCalled };
}

test("allows read-only API requests without a write token", () => {
  const result = invokeMiddleware({
    method: "GET",
    env: { NODE_ENV: "production", SCANNER_WRITE_TOKEN: "secret" },
  });

  assert.equal(result.nextCalled, true);
  assert.equal(result.statusCode, 200);
});

test("fails closed for production writes when no write token is configured", () => {
  const result = invokeMiddleware({
    method: "PUT",
    env: { NODE_ENV: "production", SCANNER_WRITE_TOKEN: undefined },
  });

  assert.equal(result.nextCalled, false);
  assert.equal(result.statusCode, 503);
  assert.deepEqual(result.body, {
    error: "SCANNER_WRITE_TOKEN must be configured before API writes are enabled.",
  });
});

test("rejects writes with a missing or invalid token", () => {
  const missing = invokeMiddleware({
    method: "POST",
    env: { NODE_ENV: "production", SCANNER_WRITE_TOKEN: "secret" },
  });
  assert.equal(missing.nextCalled, false);
  assert.equal(missing.statusCode, 401);
  assert.equal(
    missing.responseHeaders.get("www-authenticate"),
    'Bearer realm="scanner-admin"',
  );

  const invalid = invokeMiddleware({
    method: "POST",
    headers: { authorization: "Bearer wrong" },
    env: { NODE_ENV: "production", SCANNER_WRITE_TOKEN: "secret" },
  });
  assert.equal(invalid.nextCalled, false);
  assert.equal(invalid.statusCode, 401);
});

test("allows writes with the configured bearer token", () => {
  const result = invokeMiddleware({
    method: "POST",
    headers: { authorization: "Bearer secret" },
    env: { NODE_ENV: "production", SCANNER_WRITE_TOKEN: "secret" },
  });

  assert.equal(result.nextCalled, true);
  assert.equal(result.statusCode, 200);
});

test("allows writes without a token only in local development", () => {
  const result = invokeMiddleware({
    method: "PUT",
    env: { NODE_ENV: "development", SCANNER_WRITE_TOKEN: undefined },
  });

  assert.equal(result.nextCalled, true);
  assert.equal(result.statusCode, 200);
});
