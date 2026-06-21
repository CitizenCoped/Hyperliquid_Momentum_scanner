import assert from "node:assert/strict";
import { test } from "node:test";
import { findAssetBySymbol } from "./asset-lookup";

test("scanner asset lookup preserves Hyperliquid mixed-case symbols", async () => {
  const btc = { symbol: "BTC" };
  const mixedCaseAsset = { symbol: "kPEPE" };
  const assets = [btc, mixedCaseAsset];

  assert.equal(findAssetBySymbol(assets, "BTC"), btc);
  assert.equal(findAssetBySymbol(assets, "kPEPE"), mixedCaseAsset);
  assert.equal(findAssetBySymbol(assets, "KPEPE"), mixedCaseAsset);
  assert.equal(findAssetBySymbol(assets, "kpepe"), mixedCaseAsset);
  assert.equal(findAssetBySymbol(assets, "DOGE"), null);
});
