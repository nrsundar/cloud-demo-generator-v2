import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Router, Route, Switch } from "wouter";
import { AuthProvider } from "./hooks/useAuth";
import AppLayout from "./components/AppLayout";
import Home from "./pages/home";
import GeneratorPage from "./pages/generator";
import AdminPage from "./pages/admin";
import DemoRequestPage from "./pages/demo-request";
import MyRequestsPage from "./pages/my-requests";
import LandingPage from "./pages/landing";
import AuthPage from "./pages/auth";
import GuidePage from "./pages/guide";
import PresentationPage from "./pages/presentation";
import ReleaseNotesPage from "./pages/release-notes";
import NotFound from "./pages/not-found";

function AppRouter() {
  return (
    <Router>
      <AppLayout>
        <Switch>
          <Route path="/" component={LandingPage} />
          <Route path="/auth" component={AuthPage} />
          <Route path="/home" component={Home} />
          <Route path="/generator" component={GeneratorPage} />
          <Route path="/admin" component={AdminPage} />
          <Route path="/demo-request" component={DemoRequestPage} />
          <Route path="/my-requests" component={MyRequestsPage} />
          <Route path="/guide" component={GuidePage} />
          <Route path="/presentation" component={PresentationPage} />
          <Route path="/release-notes" component={ReleaseNotesPage} />
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
