import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Home from "@/pages/Home";
import ProjectDetail from "@/pages/ProjectDetail";
import ProjectCreate from "@/pages/ProjectCreate";
import Feedback from "@/pages/Feedback";

function Router() {
  const { isAuthenticated, isLoading, error } = useAuth();

  // If authentication check fails (401), assume not authenticated
  const actuallyLoading = isLoading && !error;

  return (
    <Switch>
      {/* Public routes - available to all users */}
      <Route path="/projects/:id" component={ProjectDetail} />
      
      {/* Root route - shows Landing for non-authenticated, Home for authenticated */}
      <Route path="/">
        {actuallyLoading ? (
          <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : isAuthenticated ? (
          <Home />
        ) : (
          <Landing />
        )}
      </Route>
      
      {/* Protected routes - only for authenticated users */}
      {isAuthenticated && (
        <>
          <Route path="/create" component={ProjectCreate} />
          <Route path="/feedback" component={Feedback} />
          <Route path="/projects" component={Home} />
        </>
      )}
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
