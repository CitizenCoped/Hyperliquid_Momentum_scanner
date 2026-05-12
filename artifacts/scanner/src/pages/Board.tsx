import { getListAssetsQueryKey, useListAssets } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { PulseNumber } from "@/components/ui/pulse-number";
import { LevelBadge } from "@/components/ui/level-badge";
import { formatCurrency, formatPercent, formatNumber } from "@/lib/format";
import { Search, ArrowUpDown, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function Board() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const listAssetsParams = { sortBy: "setupScore", sortDir: "desc" } as const;
  
  const { data: assets = [], isLoading } = useListAssets(
    listAssetsParams,
    {
      query: {
        queryKey: getListAssetsQueryKey(listAssetsParams),
        refetchInterval: 10000,
      },
    }
  );

  const filteredAssets = assets.filter(a => 
    a.symbol.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <div className="flex-none p-4 border-b border-border bg-card flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-64 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="FILTER SYMBOL..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-8 bg-background border-border text-xs uppercase font-mono"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-widest">
          <Filter className="h-4 w-4" />
          <span>{filteredAssets.length} ASSETS</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-card border-b border-border shadow-sm z-10">
            <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2 font-medium w-12">#</th>
              <th className="px-4 py-2 font-medium w-32">Symbol</th>
              <th className="px-4 py-2 font-medium text-right w-32">Score</th>
              <th className="px-4 py-2 font-medium text-center w-32">Level</th>
              <th className="px-4 py-2 font-medium text-right w-24">Price</th>
              <th className="px-4 py-2 font-medium text-right w-24">Day Chg</th>
              <th className="px-4 py-2 font-medium text-right w-24">15m Chg</th>
              <th className="px-4 py-2 font-medium text-right w-24">RVOL</th>
              <th className="px-4 py-2 font-medium text-right w-32">Breakdown</th>
            </tr>
          </thead>
          <tbody className="divide-y border-border divide-border text-xs font-mono">
            {isLoading && assets.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-muted-foreground">Loading assets...</td>
              </tr>
            ) : filteredAssets.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-muted-foreground">No assets match filter.</td>
              </tr>
            ) : (
              filteredAssets.map((asset, idx) => (
                <tr 
                  key={asset.symbol} 
                  className="hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => setLocation(`/asset/${asset.symbol}`)}
                >
                  <td className="px-4 py-2 text-muted-foreground">{idx + 1}</td>
                  <td className="px-4 py-2 font-bold text-foreground">{asset.symbol}</td>
                  <td className="px-4 py-2 text-right">
                    <PulseNumber value={asset.setupScore} formatFn={(v) => formatNumber(v, 1)} className="font-bold text-primary text-sm" />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <LevelBadge level={asset.alertLevel} />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <PulseNumber value={asset.markPrice} formatFn={(v) => formatCurrency(v, v < 1 ? 4 : 2)} />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <PulseNumber value={asset.dayChangePct} isPercent formatFn={(v) => formatPercent(v)} />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <PulseNumber value={asset.change15mPct} isPercent formatFn={(v) => formatPercent(v)} />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <PulseNumber value={asset.dailyRvol} formatFn={(v) => formatNumber(v, 1) + 'x'} className={asset.dailyRvol > 2 ? 'text-[hsl(35,100%,55%)] font-bold' : ''} />
                  </td>
                  <td className="px-4 py-2 text-right text-[10px] text-muted-foreground flex justify-end gap-2 items-center">
                    <div className="flex gap-1" title="Breakdown: Dly/Rvol/Acc/Sq/Cat">
                      <span className="w-4 text-center">{asset.scoreBreakdown.dayChange}</span>
                      <span className="w-4 text-center">{asset.scoreBreakdown.rvol}</span>
                      <span className="w-4 text-center">{asset.scoreBreakdown.acceleration}</span>
                      <span className="w-4 text-center">{asset.scoreBreakdown.squeezeStructure}</span>
                      <span className="w-4 text-center">{asset.scoreBreakdown.catalyst}</span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
