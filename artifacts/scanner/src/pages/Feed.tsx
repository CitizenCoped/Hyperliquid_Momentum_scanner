import { useListAlerts, useDismissAlert } from "@workspace/api-client-react";
import { formatTime } from "@/lib/format";
import { LevelBadge } from "@/components/ui/level-badge";
import { PulseNumber } from "@/components/ui/pulse-number";
import { formatPercent, formatNumber } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { BellRing, Check, BellOff } from "lucide-react";
import { useLocation } from "wouter";

export default function Feed() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: alerts = [], refetch } = useListAlerts(
    { limit: 100 },
    { query: { refetchInterval: 5000 } }
  );
  
  const dismissAlert = useDismissAlert();

  const handleDismiss = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    dismissAlert.mutate({ id }, {
      onSuccess: () => refetch(),
      onError: (err) => {
        toast({
          title: "Dismiss failed",
          description: err instanceof Error ? err.message : "Check the admin token in Settings.",
          variant: "destructive",
        });
      },
    });
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden p-4 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold flex items-center gap-2 uppercase tracking-widest text-primary">
          <BellRing className="h-5 w-5" /> Live Trigger Feed
        </h1>
        <div className="text-xs text-muted-foreground font-mono">
          POLLING EVERY 5S
        </div>
      </div>

      <div className="flex-1 overflow-auto space-y-2 pr-2">
        {alerts.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm uppercase tracking-widest border border-dashed border-border rounded-md">
            No recent alerts
          </div>
        ) : (
          alerts.map((alert) => (
            <div 
              key={alert.id}
              onClick={() => setLocation(`/asset/${alert.symbol}`)}
              className={`group flex items-center gap-4 p-3 rounded-md border border-border bg-card hover:border-primary/50 transition-all cursor-pointer relative overflow-hidden
                ${!alert.dismissed ? 'animate-new-alert border-l-4 border-l-primary' : 'opacity-70 grayscale-[50%]'}
              `}
            >
              <div className="w-16 flex-none text-xs font-mono text-muted-foreground">
                {formatTime(alert.createdAt)}
              </div>
              
              <div className="w-24 flex-none font-bold text-foreground text-lg">
                {alert.symbol}
              </div>

              <div className="w-24 flex-none">
                <LevelBadge level={alert.alertLevel} />
              </div>

              <div className="flex-1 text-sm text-muted-foreground">
                <span className="text-foreground font-mono mr-2">
                  SCORE: <PulseNumber value={alert.setupScore} formatFn={v => formatNumber(v, 1)} className="font-bold text-primary" />
                </span>
                <span className="uppercase">{alert.triggerReason}</span>
              </div>

              <div className="flex gap-4 items-center mr-4 font-mono text-xs text-muted-foreground">
                <div>CHG: <PulseNumber value={alert.dayChangePct} isPercent formatFn={v => formatPercent(v)} /></div>
                <div>RVOL: <span className="text-foreground">{formatNumber(alert.rvol, 1)}x</span></div>
              </div>
              
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {!alert.dismissed && (
                  <button 
                    onClick={(e) => handleDismiss(e, alert.id)}
                    className="p-1.5 bg-muted hover:bg-secondary text-foreground rounded border border-border hover:border-primary transition-colors"
                    title="Dismiss Alert"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                )}
                {alert.pushoverSent ? (
                  <BellRing className="h-4 w-4 text-primary" title="Pushover Sent" />
                ) : (
                  <BellOff className="h-4 w-4 text-muted-foreground" title="Pushover Not Sent" />
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
