import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractScannerWriteToken,
  isScannerWriteTokenValid,
  isWriteMethod,
} from "./write-auth";

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
});
