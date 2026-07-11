import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Shell } from "@/components/layout/Shell";
import Board from "@/pages/Board";
import Feed from "@/pages/Feed";
import Asset from "@/pages/Asset";
import Settings from "@/pages/Settings";
import { getStoredScannerWriteToken } from "@/lib/write-token";

const queryClient = new QueryClient();
setAuthTokenGetter(getStoredScannerWriteToken);

function Router() {
  return (
    <Shell>
      <Switch>
        <Route path="/" component={Board} />
        <Route path="/feed" component={Feed} />
        <Route path="/asset/:symbol" component={Asset} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </Shell>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
