import {
  getGetAssetQueryKey,
  getListAlertsQueryKey,
  useGetAsset,
  useListAlerts,
} from "@workspace/api-client-react";
import { useParams } from "wouter";
import { PulseNumber } from "@/components/ui/pulse-number";
import { LevelBadge } from "@/components/ui/level-badge";
import { formatCurrency, formatPercent, formatNumber, formatCompactCurrency, formatTime, formatDate } from "@/lib/format";
import { ArrowLeft, ExternalLink, Activity, Info } from "lucide-react";
import { Link } from "wouter";

export default function Asset() {
  const params = useParams<{ symbol: string }>();
  const symbol = params.symbol;
  const normalizedSymbol = symbol?.toUpperCase();
  const alertParams = { symbol: normalizedSymbol, limit: 20 };

  const { data: asset, isLoading } = useGetAsset(normalizedSymbol || "", {
    query: { 
      queryKey: getGetAssetQueryKey(normalizedSymbol || ""),
      enabled: !!normalizedSymbol,
      refetchInterval: 5000 
    } 
  });

  const { data: alerts = [] } = useListAlerts(
    alertParams,
    {
      query: {
        queryKey: getListAlertsQueryKey(alertParams),
        enabled: !!normalizedSymbol,
        refetchInterval: 10000,
      },
    }
  );

  if (isLoading && !asset) {
    return <div className="p-8 text-center text-muted-foreground font-mono">LOADING ASSET {symbol}...</div>;
  }

  if (!asset) {
    return <div className="p-8 text-center text-destructive font-mono">ASSET NOT FOUND</div>;
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto w-full space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 bg-card border border-border hover:border-primary rounded-md text-muted-foreground hover:text-foreground transition-colors inline-flex"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
                {asset.symbol}
                <LevelBadge level={asset.alertLevel} className="text-sm px-3 py-1" />
              </h1>
              <div className="text-xs text-muted-foreground font-mono mt-1 flex gap-4">
                <span>UPDATED: {formatTime(asset.updatedAt)}</span>
                {asset.hasNews && <span className="text-[hsl(35,100%,55%)] font-bold">HAS RECENT NEWS</span>}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground font-mono uppercase tracking-widest mb-1">Setup Score</div>
            <PulseNumber value={asset.setupScore} formatFn={v => formatNumber(v, 1)} className="text-4xl font-black text-primary" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Price Metrics */}
          <div className="bg-card border border-border rounded-lg p-5 flex flex-col gap-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Activity className="h-4 w-4" /> Price Action
            </h3>
            <div className="space-y-3">
              <MetricRow label="Mark Price" value={<PulseNumber value={asset.markPrice} formatFn={v => formatCurrency(v, v < 1 ? 4 : 2)} className="text-lg font-bold" />} />
              <MetricRow label="24h Change" value={<PulseNumber value={asset.dayChangePct} isPercent formatFn={v => formatPercent(v)} className="font-bold" />} />
              <MetricRow label="1h Change" value={<PulseNumber value={asset.change1hPct} isPercent formatFn={v => formatPercent(v)} />} />
              <MetricRow label="15m Change" value={<PulseNumber value={asset.change15mPct} isPercent formatFn={v => formatPercent(v)} />} />
              <MetricRow label="4h Change" value={<PulseNumber value={asset.change4hPct} isPercent formatFn={v => formatPercent(v)} />} />
            </div>
          </div>

          {/* Volume & Liquidity */}
          <div className="bg-card border border-border rounded-lg p-5 flex flex-col gap-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Activity className="h-4 w-4" /> Liquidity
            </h3>
            <div className="space-y-3">
              <MetricRow label="Daily RVOL" value={<PulseNumber value={asset.dailyRvol} formatFn={v => formatNumber(v, 2) + 'x'} className={asset.dailyRvol > 2 ? 'text-primary font-bold' : ''} />} />
              <MetricRow label="Intraday RVOL" value={<PulseNumber value={asset.intradayRvol} formatFn={v => formatNumber(v, 2) + 'x'} />} />
              <MetricRow label="Open Interest" value={<span className="font-mono">{formatCompactCurrency(asset.openInterestUsd)}</span>} />
              <MetricRow label="1% Depth" value={<span className="font-mono">{formatCompactCurrency(asset.depth1pctUsd)}</span>} />
              <MetricRow label="Funding Rate" value={<span className="font-mono">{formatPercent(asset.fundingRate, 4)}</span>} />
            </div>
          </div>

          {/* Score Breakdown */}
          <div className="bg-card border border-border rounded-lg p-5 flex flex-col gap-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Info className="h-4 w-4" /> Score Breakdown
            </h3>
            <div className="space-y-3">
              <ScoreBar label="Day Change (20)" value={asset.scoreBreakdown.dayChange} max={20} />
              <ScoreBar label="RVOL (25)" value={asset.scoreBreakdown.rvol} max={25} />
              <ScoreBar label="Acceleration (20)" value={asset.scoreBreakdown.acceleration} max={20} />
              <ScoreBar label="Squeeze (20)" value={asset.scoreBreakdown.squeezeStructure} max={20} />
              <ScoreBar label="Catalyst (15)" value={asset.scoreBreakdown.catalyst} max={15} />
            </div>
          </div>
        </div>

        {/* Recent Alerts Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-muted/30">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-widest">Recent Alerts for {asset.symbol}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-card border-b border-border">
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Time</th>
                  <th className="px-5 py-3 font-medium">Level</th>
                  <th className="px-5 py-3 font-medium text-right">Score</th>
                  <th className="px-5 py-3 font-medium">Trigger Reason</th>
                  <th className="px-5 py-3 font-medium text-right">Price</th>
                  <th className="px-5 py-3 font-medium text-right">RVOL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs font-mono">
                {alerts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">No alerts recorded.</td>
                  </tr>
                ) : (
                  alerts.map(alert => (
                    <tr key={alert.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-5 py-3 text-muted-foreground">{formatDate(alert.createdAt)}</td>
                      <td className="px-5 py-3"><LevelBadge level={alert.alertLevel} /></td>
                      <td className="px-5 py-3 text-right font-bold text-foreground">{formatNumber(alert.setupScore, 1)}</td>
                      <td className="px-5 py-3 text-muted-foreground uppercase">{alert.triggerReason}</td>
                      <td className="px-5 py-3 text-right">{formatCurrency(alert.markPrice, alert.markPrice < 1 ? 4 : 2)}</td>
                      <td className="px-5 py-3 text-right">{formatNumber(alert.rvol, 1)}x</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricRow({ label, value }: { label: string, value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center pb-2 border-b border-border border-dashed last:border-0 last:pb-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

function ScoreBar({ label, value, max }: { label: string, value: number, max: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div>
      <div className="flex justify-between text-xs mb-1 font-mono">
        <span className="text-muted-foreground uppercase">{label}</span>
        <span className="text-foreground font-bold">{value} <span className="text-muted-foreground font-normal">/ {max}</span></span>
      </div>
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
