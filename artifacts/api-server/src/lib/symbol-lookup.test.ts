import assert from "node:assert/strict";
import test from "node:test";
import { findAssetBySymbol } from "./symbol-lookup";

const assets = [{ symbol: "BTC" }, { symbol: "kPEPE" }, { symbol: "PURR" }];

test("findAssetBySymbol preserves exact mixed-case matches", () => {
  assert.equal(findAssetBySymbol(assets, "kPEPE")?.symbol, "kPEPE");
});

test("findAssetBySymbol falls back to case-insensitive matches", () => {
  assert.equal(findAssetBySymbol(assets, "btc")?.symbol, "BTC");
  assert.equal(findAssetBySymbol(assets, "KPEPE")?.symbol, "kPEPE");
});

test("findAssetBySymbol returns null when no symbol matches", () => {
  assert.equal(findAssetBySymbol(assets, "MISSING"), null);
});
