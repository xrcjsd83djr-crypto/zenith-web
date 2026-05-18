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
  import WarningsPage from "@/pages/dashboard/warnings";
  import LoaPage from "@/pages/dashboard/loa";
  import ActivityPage from "@/pages/dashboard/activity";
  import StatsPage from "@/pages/dashboard/stats";
  import RanksPage from "@/pages/dashboard/ranks";
  import ConfigPage from "@/pages/dashboard/config";
  import BlacklistPage from "@/pages/dashboard/blacklist";
  import BotCustomizationPage from "@/pages/dashboard/bot-customization";
  import TOSPage from "@/pages/tos";
  import PrivacyPage from "@/pages/privacy";
  import PremiumPage from "@/pages/premium";
  import PortalPage from "@/pages/portal";

  const queryClient = new QueryClient();

  function ProtectedRoute({ component: Component }: { component: any }) {
    const { isAuthenticated, isLoading } = useAuth();
    const [, setLocation] = useLocation();
    useEffect(() => {
      if (!isLoading && !isAuthenticated) setLocation("/login");
    }, [isLoading, isAuthenticated, setLocation]);
    if (isLoading || !isAuthenticated) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-pulse flex flex-col items-center">
            <div className="w-12 h-12 bg-gray-200 rounded-xl mb-4" />
            <div className="h-3 w-24 bg-gray-200 rounded" />
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
          <Route path="/dashboard/:guildId"              component={() => <OverviewPage guildId={guildId} />} />
          <Route path="/dashboard/:guildId/staff"        component={() => <StaffPage guildId={guildId} />} />
          <Route path="/dashboard/:guildId/applications" component={() => <ApplicationsPage guildId={guildId} />} />
          <Route path="/dashboard/:guildId/strikes"      component={() => <StrikesPage guildId={guildId} />} />
          <Route path="/dashboard/:guildId/warnings"     component={() => <WarningsPage guildId={guildId} />} />
          <Route path="/dashboard/:guildId/loa"          component={() => <LoaPage guildId={guildId} />} />
          <Route path="/dashboard/:guildId/activity"     component={() => <ActivityPage guildId={guildId} />} />
          <Route path="/dashboard/:guildId/stats"        component={() => <StatsPage guildId={guildId} />} />
          <Route path="/dashboard/:guildId/ranks"        component={() => <RanksPage guildId={guildId} />} />
          <Route path="/dashboard/:guildId/config"       component={() => <ConfigPage guildId={guildId} />} />
          <Route path="/dashboard/:guildId/blacklist"    component={() => <BlacklistPage guildId={guildId} />} />
          <Route path="/dashboard/:guildId/bot-customization" component={() => <BotCustomizationPage guildId={guildId} />} />
          <Route path="/dashboard/:guildId/promotions"  component={() => <PromotionsPage  guildId={guildId} />} />
          <Route path="/dashboard/:guildId/shifts"      component={() => <ShiftsPage      guildId={guildId} />} />
          <Route path="/dashboard/:guildId/divisions"   component={() => <DivisionsPage   guildId={guildId} />} />
          <Route path="/dashboard/:guildId/performance" component={() => <PerformancePage guildId={guildId} />} />
          <Route path="/dashboard/:guildId/analytics"  component={() => <AnalyticsPage   guildId={guildId} />} />
          <Route path="/dashboard/:guildId/automation" component={() => <AutomationPage  guildId={guildId} />} />
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
        <Route path="/premium" component={PremiumPage} />
        <Route path="/portal/:apak" component={({ params }) => <PortalPage apak={params.apak} />} />
        <Route path="/servers" component={() => <ProtectedRoute component={ServersPage} />} />
        <Route path="/dashboard/:guildId/*?" component={({ params }) => <ProtectedRoute component={() => <DashboardRoutes params={params as any} />} />} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  export default function App() {
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
  