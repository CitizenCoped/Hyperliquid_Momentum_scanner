export interface SymbolAsset {
  symbol: string;
}

export function findAssetBySymbol<T extends SymbolAsset>(
  assets: Iterable<T>,
  symbol: string,
): T | null {
  const normalized = symbol.toLowerCase();
  let caseInsensitiveMatch: T | null = null;

  for (const asset of assets) {
    if (asset.symbol === symbol) return asset;
    if (!caseInsensitiveMatch && asset.symbol.toLowerCase() === normalized) {
      caseInsensitiveMatch = asset;
    }
  }

  return caseInsensitiveMatch;
}
