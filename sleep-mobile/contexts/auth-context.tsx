import * as React from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
    ApiError,
    authApi,
    getStoredUser,
    LoginRequest,
    RegisterRequest,
    User,
} from '@/services/auth';

type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
};

type AuthContextType = AuthState & {
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (data: Partial<Pick<User, 'name' | 'avatar'>>) => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  // Initialize auth state from storage
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { user, isAuthenticated } = await authApi.getStoredAuth();
        setState({
          user,
          isAuthenticated,
          isLoading: false,
          error: null,
        });

        // If we have a token, try to refresh user data
        if (isAuthenticated && user) {
          try {
            await authApi.getCurrentUser();
            const freshUser = await getStoredUser();
            if (freshUser) {
              setState((prev) => ({ ...prev, user: freshUser }));
            }
          } catch {
            // Token might be expired, but don't logout yet
            // Let the user continue with cached data
          }
        }
      } catch {
        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      }
    };

    initAuth();
  }, []);

  const login = useCallback(async (data: LoginRequest) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await authApi.login(data);
      setState({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (e) {
      const error = e as ApiError;
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Login failed',
      }));
      throw e;
    }
  }, []);

  const register = useCallback(async (data: RegisterRequest) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await authApi.register(data);
      setState({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (e) {
      const error = e as ApiError;
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Registration failed',
      }));
      throw e;
    }
  }, []);

  const logout = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      await authApi.logout();
    } finally {
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (!state.isAuthenticated) return;

    try {
      const user = await authApi.getCurrentUser();
      setState((prev) => ({ ...prev, user }));
    } catch (e) {
      const error = e as ApiError;
      // If token is expired, try to refresh
      if (error.status === 401) {
        try {
          await authApi.refreshToken();
          const user = await authApi.getCurrentUser();
          setState((prev) => ({ ...prev, user }));
        } catch {
          // Refresh failed, logout
          await logout();
        }
      }
    }
  }, [state.isAuthenticated, logout]);

  const updateProfile = useCallback(
    async (data: Partial<Pick<User, 'name' | 'avatar'>>) => {
      if (!state.isAuthenticated) return;

      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const user = await authApi.updateProfile(data);
        setState((prev) => ({ ...prev, user, isLoading: false }));
      } catch (e) {
        const error = e as ApiError;
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error.message || 'Failed to update profile',
        }));
        throw e;
      }
    },
    [state.isAuthenticated]
  );

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      login,
      register,
      logout,
      refreshUser,
      updateProfile,
      clearError,
    }),
    [state, login, register, logout, refreshUser, updateProfile, clearError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function useUser() {
  const { user } = useAuth();
  return user;
}

export function useIsAuthenticated() {
  const { isAuthenticated, isLoading } = useAuth();
  return { isAuthenticated, isLoading };
}
