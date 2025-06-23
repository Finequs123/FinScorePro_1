import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi, setAuthToken, getAuthToken, isAuthenticated } from "@/lib/auth";
import type { AuthUser } from "@/types";

export function useAuth() {
  const [isLoggedIn, setIsLoggedIn] = useState(isAuthenticated());
  const queryClient = useQueryClient();

  // Check authentication on mount and token changes
  useEffect(() => {
    const checkAuth = () => {
      const authenticated = isAuthenticated();
      setIsLoggedIn(authenticated);
    };
    
    checkAuth();
    
    // Listen for storage changes (logout from other tabs)
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  const { data: authUser, isLoading, error } = useQuery({
    queryKey: ["/api/auth/me"],
    enabled: isLoggedIn,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      console.log('Login successful:', data);
      setAuthToken(data.token);
      setIsLoggedIn(true);
      // Force refetch user data
      queryClient.refetchQueries({ queryKey: ["/api/auth/me"] });
      // Force page refresh to ensure clean state
      setTimeout(() => {
        window.location.href = "/";
      }, 100);
    },
    onError: (error) => {
      console.error('Login failed:', error);
    },
  });

  const logout = () => {
    authApi.logout();
    setIsLoggedIn(false);
    queryClient.clear();
    // Force redirect to login page
    window.location.href = "/login";
  };

  return {
    user: (authUser as any)?.user || null,
    organization: (authUser as any)?.organization || null,
    isLoggedIn,
    isLoading,
    error,
    login: loginMutation.mutate,
    loginLoading: loginMutation.isPending,
    loginError: loginMutation.error,
    logout,
  };
}
