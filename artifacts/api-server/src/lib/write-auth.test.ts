import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  authorizeWriteRequest,
  WRITE_TOKEN_ENV_VAR,
  type WriteAuthDecision,
} from "./write-auth";

function authorize(
  input: Parameters<typeof authorizeWriteRequest>[0],
): WriteAuthDecision {
  return authorizeWriteRequest(input);
}

describe("authorizeWriteRequest", () => {
  it("allows safe read methods without a configured write token", () => {
    assert.deepEqual(authorize({ method: "GET" }), { allowed: true });
    assert.deepEqual(authorize({ method: "HEAD" }), { allowed: true });
    assert.deepEqual(authorize({ method: "OPTIONS" }), { allowed: true });
  });

  it("fails closed for writes when the server token is not configured", () => {
    assert.deepEqual(authorize({ method: "PUT" }), {
      allowed: false,
      status: 503,
      error: `${WRITE_TOKEN_ENV_VAR} is required before scanner write endpoints can be used`,
    });
  });

  it("rejects writes without the configured token", () => {
    assert.deepEqual(
      authorize({
        method: "POST",
        configuredToken: "server-secret",
      }),
      {
        allowed: false,
        status: 401,
        error: "A valid scanner write token is required",
      },
    );
  });

  it("rejects writes with an incorrect bearer token", () => {
    assert.equal(
      authorize({
        method: "POST",
        configuredToken: "server-secret",
        authorizationHeader: "Bearer wrong-secret",
      }).allowed,
      false,
    );
  });

  it("allows writes with the configured bearer token", () => {
    assert.deepEqual(
      authorize({
        method: "POST",
        configuredToken: "server-secret",
        authorizationHeader: "Bearer server-secret",
      }),
      { allowed: true },
    );
  });

  it("allows writes with the scanner write token header", () => {
    assert.deepEqual(
      authorize({
        method: "PUT",
        configuredToken: "server-secret",
        scannerWriteTokenHeader: " server-secret ",
      }),
      { allowed: true },
    );
  });
});
