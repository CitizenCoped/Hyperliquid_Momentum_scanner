import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findAssetBySymbol } from "../src/lib/symbol-lookup.ts";

const assets = [
  { symbol: "BTC", id: 1 },
  { symbol: "kPEPE", id: 2 },
  { symbol: "PURR", id: 3 },
];

describe("findAssetBySymbol", () => {
  it("preserves exact mixed-case exchange symbols", () => {
    assert.equal(findAssetBySymbol(assets, "kPEPE")?.id, 2);
  });

  it("falls back to case-insensitive matching for manually typed symbols", () => {
    assert.equal(findAssetBySymbol(assets, "KPEPE")?.id, 2);
    assert.equal(findAssetBySymbol(assets, "kpepe")?.id, 2);
  });

  it("returns null for unknown symbols", () => {
    assert.equal(findAssetBySymbol(assets, "NOPE"), null);
  });
});
