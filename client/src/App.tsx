import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Router, Route, Switch } from "wouter";
import Home from "@/pages/home";
import AuthPage from "@/pages/auth";
import LandingPage from "@/pages/landing";
import AdminPage from "@/pages/admin";
import SqlOptimizer from "@/pages/sql-optimizer";
import DemoRequestPage from "@/pages/demo-request";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";

function AppRouter() {
  const { user, loading } = useFirebaseAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Router>
      <Switch>
        <Route path="/auth" component={AuthPage} />
        <Route path="/admin" component={AdminPage} />
        <Route path="/sql-optimizer" component={SqlOptimizer} />
        <Route path="/demo-request" component={DemoRequestPage} />
        <Route path="/">
          {user ? <Home /> : <LandingPage />}
        </Route>
      </Switch>
    </Router>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppRouter />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
