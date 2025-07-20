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
import Projects from "@/pages/Projects";
import ProjectDetail from "@/pages/ProjectDetail";
import ProjectCreate from "@/pages/ProjectCreate";
import ProjectEdit from "@/pages/ProjectEdit";
import Feedback from "@/pages/Feedback";
import AuthPage from "@/pages/AuthPage";
import Search from "@/pages/Search";

function Router() {
  const { isAuthenticated, isLoading, error } = useAuth();

  // For 401 errors, consider not authenticated instead of loading
  const actuallyLoading = isLoading && !error?.message?.includes('401');

  return (
    <Switch>
      {/* Public routes - available to all users */}
      <Route path="/projects/:id" component={ProjectDetail} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/login" component={AuthPage} />
      <Route path="/register" component={AuthPage} />
      
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
      
      {/* Projects page - available to all users */}
      <Route path="/projects" component={Projects} />
      
      {/* Feedback page - available to all users */}
      <Route path="/feedback" component={Feedback} />
      
      {/* Search page - available to all users */}
      <Route path="/search" component={Search} />
      
      {/* Protected routes - only for authenticated users */}
      {isAuthenticated && (
        <>
          <Route path="/create" component={ProjectCreate} />
          <Route path="/projects/:id/edit" component={ProjectEdit} />
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
