import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { useEffect } from "react";

import LandingPage from "@/pages/landing";
import LoginPage from "@/pages/login";
import NotFound from "@/pages/not-found";
import ServersPage from "@/pages/servers";
import DashboardLayout from "@/components/layout";
import OverviewPage from "@/pages/dashboard/overview";
import StaffPage from "@/pages/dashboard/staff";
import ApplicationsPage from "@/pages/dashboard/applications";
import StrikesPage from "@/pages/dashboard/strikes";
import LoaPage from "@/pages/dashboard/loa";
import ActivityPage from "@/pages/dashboard/activity";
import RanksPage from "@/pages/dashboard/ranks";
import ConfigPage from "@/pages/dashboard/config";
import TOSPage from "@/pages/tos";
import PrivacyPage from "@/pages/privacy";
import PremiumPage from "@/pages/premium";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component }: { component: any }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [isLoading, isAuthenticated, setLocation]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-16 h-16 bg-gray-200 rounded-xl mb-6"></div>
        </div>
      </div>
    );
  }

  return <Component />;
}

function DashboardRoutes({ params }: { params: { guildId: string } }) {
  const guildId = params.guildId;
  return (
    <DashboardLayout guildId={guildId}>
      <Switch>
        <Route path="/dashboard/:guildId" component={() => <OverviewPage guildId={guildId} />} />
        <Route path="/dashboard/:guildId/staff" component={() => <StaffPage guildId={guildId} />} />
        <Route path="/dashboard/:guildId/applications" component={() => <ApplicationsPage guildId={guildId} />} />
        <Route path="/dashboard/:guildId/strikes" component={() => <StrikesPage guildId={guildId} />} />
        <Route path="/dashboard/:guildId/loa" component={() => <LoaPage guildId={guildId} />} />
        <Route path="/dashboard/:guildId/activity" component={() => <ActivityPage guildId={guildId} />} />
        <Route path="/dashboard/:guildId/ranks" component={() => <RanksPage guildId={guildId} />} />
        <Route path="/dashboard/:guildId/config" component={() => <ConfigPage guildId={guildId} />} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/tos" component={TOSPage} />
      <Route path="/privacy" component={PrivacyPage} />
      
      <Route path="/servers" component={() => <ProtectedRoute component={ServersPage} />} />
      <Route path="/premium" component={PremiumPage} />
      <Route path="/dashboard/:guildId/*?" component={({ params }) => <ProtectedRoute component={() => <DashboardRoutes params={params as any} />} />} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
