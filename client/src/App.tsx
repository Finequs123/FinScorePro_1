import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Organizations from "@/pages/organizations";
import Users from "@/pages/users";
import AIGeneratorFixed from "@/pages/ai-generator-fixed";
import ScorecardConfig from "@/pages/scorecard-config";
import TestingEngine from "@/pages/testing-engine";
import ABTesting from "@/pages/ab-testing";
import APIManagement from "@/pages/api-management";
import BulkProcessing from "@/pages/bulk-processing";
import AuditTrail from "@/pages/audit-trail";

function Router() {
  const { isLoggedIn, isLoading } = useAuth();

  // Clear expired tokens on app load
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expiry = payload.exp * 1000;
        if (Date.now() >= expiry) {
          localStorage.removeItem("auth_token");
          window.location.href = "/login";
        }
      } catch (error) {
        localStorage.removeItem("auth_token");
        window.location.href = "/login";
      }
    }
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Login />;
  }

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/organizations" component={Organizations} />
      <Route path="/users" component={Users} />
      <Route path="/ai-scorecard-generator" component={AIGeneratorFixed} />
      <Route path="/scorecard-config" component={ScorecardConfig} />
      <Route path="/testing-engine" component={TestingEngine} />
      <Route path="/ab-testing" component={ABTesting} />
      <Route path="/api-management" component={APIManagement} />
      <Route path="/bulk-processing" component={BulkProcessing} />
      <Route path="/audit-trail" component={AuditTrail} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
