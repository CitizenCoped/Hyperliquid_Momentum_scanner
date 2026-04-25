import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Activity, LayoutDashboard, Settings as SettingsIcon, TerminalSquare } from "lucide-react";
import { useHealthCheck, useGetScannerSummary } from "@workspace/api-client-react";
import { PulseNumber } from "../ui/pulse-number";
import { formatNumber } from "@/lib/format";

interface ShellProps {
  children: ReactNode;
}

export function Shell({ children }: ShellProps) {
  const [location] = useLocation();
  const { data: health } = useHealthCheck({ query: { refetchInterval: 30000 } });
  const { data: summary } = useGetScannerSummary({ query: { refetchInterval: 10000 } });

  const navItems = [
    { href: "/", label: "Board", icon: LayoutDashboard },
    { href: "/feed", label: "Feed", icon: Activity },
    { href: "/settings", label: "Settings", icon: SettingsIcon },
  ];

  const isHealthy = health?.status === "ok";

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground dark">
      <header className="sticky top-0 z-50 flex h-12 items-center gap-4 border-b border-border bg-card px-4 text-xs font-medium uppercase tracking-wider shadow-sm">
        <div className="flex items-center gap-2 mr-4 text-primary">
          <TerminalSquare className="h-5 w-5" />
          <span className="font-bold tracking-widest hidden sm:inline-block">HYPERLIQUID SCANNER</span>
        </div>

        <nav className="flex items-center gap-1 flex-1">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-sm transition-colors cursor-pointer",
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {summary && (
          <div className="hidden lg:flex items-center gap-4 text-muted-foreground font-mono text-[10px]">
            <div className="flex items-center gap-1.5">
              <span>TOTAL ASSETS:</span>
              <span className="text-foreground">{summary.totalAssets}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>A+:</span>
              <span className="text-[hsl(280,85%,65%)] font-bold">{summary.aPlusCount}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>ACTIVE:</span>
              <span className="text-[hsl(35,100%,55%)] font-bold">{summary.activeSetupCount}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>AVG RVOL:</span>
              <span className="text-foreground">{formatNumber(summary.avgRvol, 1)}x</span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 ml-4">
          <div className="flex items-center gap-1.5">
            <span className={cn("relative flex h-2 w-2")}>
              {isHealthy && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-positive opacity-75"></span>}
              <span className={cn("relative inline-flex rounded-full h-2 w-2", isHealthy ? "bg-positive" : "bg-destructive")}></span>
            </span>
            <span className="text-[10px] text-muted-foreground">
              {isHealthy ? "API ONLINE" : "API OFFLINE"}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col w-full h-[calc(100vh-3rem)] overflow-hidden">
        {children}
      </main>
    </div>
  );
}
