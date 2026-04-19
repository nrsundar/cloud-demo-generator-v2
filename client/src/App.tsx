import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Router, Route, Switch } from "wouter";
import { AuthProvider } from "./hooks/useAuth";
import AppLayout from "./components/AppLayout";
import Home from "./pages/home";
import AdminPage from "./pages/admin";
import DemoRequestPage from "./pages/demo-request";
import LandingPage from "./pages/landing";
import AuthPage from "./pages/auth";
import NotFound from "./pages/not-found";

function AppRouter() {
  return (
    <Router>
      <AppLayout>
        <Switch>
          <Route path="/" component={LandingPage} />
          <Route path="/auth" component={AuthPage} />
          <Route path="/home" component={Home} />
          <Route path="/admin" component={AdminPage} />
          <Route path="/demo-request" component={DemoRequestPage} />
          <Route component={NotFound} />
        </Switch>
      </AppLayout>
    </Router>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </QueryClientProvider>
  );
}
