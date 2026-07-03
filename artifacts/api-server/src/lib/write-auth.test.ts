import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { authorizeWriteRequest } from "./write-auth";

describe("authorizeWriteRequest", () => {
  it("allows safe methods without a configured token", () => {
    assert.equal(
      authorizeWriteRequest({ method: "GET", nodeEnv: "production" }).allowed,
      true,
    );
    assert.equal(
      authorizeWriteRequest({ method: "OPTIONS", nodeEnv: "production" })
        .allowed,
      true,
    );
  });

  it("fails closed for writes when no token is configured outside development", () => {
    assert.deepEqual(
      authorizeWriteRequest({ method: "PUT", nodeEnv: "production" }),
      {
        allowed: false,
        status: 503,
        error: "Scanner write token is not configured",
      },
    );
  });

  it("allows local development writes when no token is configured", () => {
    assert.equal(
      authorizeWriteRequest({ method: "POST", nodeEnv: "development" })
        .allowed,
      true,
    );
  });

  it("requires the configured token for writes", () => {
    assert.equal(
      authorizeWriteRequest({
        method: "POST",
        configuredToken: "expected",
        authorizationHeader: "Bearer wrong",
        nodeEnv: "production",
      }).allowed,
      false,
    );

    assert.equal(
      authorizeWriteRequest({
        method: "POST",
        configuredToken: "expected",
        authorizationHeader: "Bearer expected",
        nodeEnv: "production",
      }).allowed,
      true,
    );
  });

  it("accepts the scanner write token header", () => {
    assert.equal(
      authorizeWriteRequest({
        method: "POST",
        configuredToken: "expected",
        scannerWriteTokenHeader: " expected ",
        nodeEnv: "production",
      }).allowed,
      true,
    );
  });
});
