import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  // Temporarily disable auth to stop infinite loop
  // TODO: Fix Replit auth configuration
  return {
    user: null,
    isLoading: false,
    isAuthenticated: false,
    error: null,
  };
}
