export interface SymbolAsset {
  symbol: string;
}

export function findAssetBySymbol<T extends SymbolAsset>(
  assets: Iterable<T>,
  requestedSymbol: string,
): T | null {
  for (const asset of assets) {
    if (asset.symbol === requestedSymbol) {
      return asset;
    }
  }

  const normalizedSymbol = requestedSymbol.toLowerCase();
  for (const asset of assets) {
    if (asset.symbol.toLowerCase() === normalizedSymbol) {
      return asset;
    }
  }

  return null;
}
