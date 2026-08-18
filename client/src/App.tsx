import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import LiveMap from "@/pages/live-map";
import Vehicles from "@/pages/vehicles";
import Drivers from "@/pages/drivers";
import Trips from "@/pages/trips";
import Alerts from "@/pages/alerts";
import Analytics from "@/pages/analytics";

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/map" component={LiveMap} />
      <Route path="/vehicles" component={Vehicles} />
      <Route path="/drivers" component={Drivers} />
      <Route path="/trips" component={Trips} />
      <Route path="/alerts" component={Alerts} />
      <Route path="/analytics" component={Analytics} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router hook={useHashLocation}>
          <SidebarProvider style={style as React.CSSProperties}>
            <div className="flex h-dvh min-h-0 w-full overflow-hidden bg-background">
              <AppSidebar />
              <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                </header>
                <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                  <AppRouter />
                </main>
              </div>
            </div>
          </SidebarProvider>
        </Router>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
