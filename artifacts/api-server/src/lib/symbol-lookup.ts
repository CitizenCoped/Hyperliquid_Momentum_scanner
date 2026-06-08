export interface SymbolicAsset {
  symbol: string;
}

export function findAssetBySymbol<T extends SymbolicAsset>(
  assets: Iterable<T>,
  requestedSymbol: string,
): T | null {
  const assetList = Array.from(assets);

  for (const asset of assetList) {
    if (asset.symbol === requestedSymbol) return asset;
  }

  const normalizedRequestedSymbol = requestedSymbol.toLowerCase();
  for (const asset of assetList) {
    if (asset.symbol.toLowerCase() === normalizedRequestedSymbol) {
      return asset;
    }
  }

  return null;
}
