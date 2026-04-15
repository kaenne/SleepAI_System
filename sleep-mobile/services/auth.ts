import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { mockAuthApi } from './mock-auth';

const AUTH_TOKEN_KEY = 'sleepMind.authToken';
const REFRESH_TOKEN_KEY = 'sleepMind.refreshToken';
const USER_KEY = 'sleepMind.user';

// Check if we should use mock auth (no backend configured)
const USE_MOCK_AUTH = !process.env.EXPO_PUBLIC_API_BASE_URL || process.env.EXPO_PUBLIC_API_BASE_URL.trim() === '';

export type User = {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt?: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type RegisterRequest = {
  name: string;
  email: string;
  password: string;
};

export type AuthResponse = {
  user: User;
  tokens: AuthTokens;
};

export type ApiError = {
  message: string;
  status?: number;
  errors?: Record<string, string[]>;
};

function getBaseUrl(): string | null {
  const raw = (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').trim();
  if (!raw) return null;
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
}

function withTimeout(timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return { signal: controller.signal, dispose: () => clearTimeout(timeout) };
}

async function request<T>(
  path: string,
  init?: RequestInit & { timeoutMs?: number }
): Promise<T> {
  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    throw { message: 'API base URL is not configured (EXPO_PUBLIC_API_BASE_URL).' } as ApiError;
  }

  const url = `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
  const { timeoutMs = 10000, ...rest } = init ?? {};
  const { signal, dispose } = withTimeout(timeoutMs);

  try {
    const res = await fetch(url, {
      ...rest,
      signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(rest.headers ?? {}),
      },
    });

    const contentType = res.headers.get('content-type') ?? '';
    const isJson = contentType.includes('application/json');

    if (!res.ok) {
      let error: ApiError = { message: `Request failed (${res.status})`, status: res.status };
      try {
        if (isJson) {
          const data = await res.json();
          error.message = data?.message ?? data?.error ?? error.message;
          error.errors = data?.errors;
        }
      } catch {
        // ignore
      }
      throw error;
    }

    if (res.status === 204) {
      return undefined as T;
    }

    if (isJson) {
      return (await res.json()) as T;
    }

    return (await res.text()) as unknown as T;
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      throw { message: 'Request timeout' } as ApiError;
    }
    if (e?.message && e?.status) {
      throw e;
    }
    throw { message: e?.message || 'Network error' } as ApiError;
  } finally {
    dispose();
  }
}

// ============ Token Storage ============

export async function saveTokens(tokens: AuthTokens): Promise<void> {
  await SecureStore.setItemAsync(AUTH_TOKEN_KEY, tokens.accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(AUTH_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

// ============ User Storage ============

export async function saveUser(user: User): Promise<void> {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function getStoredUser(): Promise<User | null> {
  const raw = await AsyncStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export async function clearUser(): Promise<void> {
  await AsyncStorage.removeItem(USER_KEY);
}

// ============ Auth API ============

export const authApi = {
  /**
   * Login with email and password
   * POST /api/auth/login
   */
  async login(data: LoginRequest): Promise<AuthResponse> {
    if (USE_MOCK_AUTH) {
      return mockAuthApi.login(data.email, data.password);
    }

    const response = await request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    // Save tokens and user
    await saveTokens(response.tokens);
    await saveUser(response.user);

    return response;
  },

  /**
   * Register a new user
   * POST /api/auth/register
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    if (USE_MOCK_AUTH) {
      return mockAuthApi.register(data.name, data.email, data.password);
    }

    const response = await request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    // Save tokens and user
    await saveTokens(response.tokens);
    await saveUser(response.user);

    return response;
  },

  /**
   * Refresh access token
   * POST /api/auth/refresh
   */
  async refreshToken(): Promise<AuthTokens> {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      throw { message: 'No refresh token available' } as ApiError;
    }

    const tokens = await request<AuthTokens>('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });

    await saveTokens(tokens);
    return tokens;
  },

  /**
   * Logout - clear tokens
   * POST /api/auth/logout (optional backend call)
   */
  async logout(): Promise<void> {
    if (USE_MOCK_AUTH) {
      return mockAuthApi.logout();
    }

    try {
      const accessToken = await getAccessToken();
      if (accessToken) {
        // Optionally notify backend
        await request('/api/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
      }
    } catch {
      // Ignore errors during logout
    } finally {
      await clearTokens();
      await clearUser();
    }
  },

  /**
   * Get current user profile
   * GET /api/auth/me
   */
  async getCurrentUser(): Promise<User> {
    if (USE_MOCK_AUTH) {
      return mockAuthApi.getCurrentUser();
    }

    const accessToken = await getAccessToken();
    if (!accessToken) {
      throw { message: 'Not authenticated' } as ApiError;
    }

    const user = await request<User>('/api/auth/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    await saveUser(user);
    return user;
  },

  /**
   * Update user profile
   * PUT /api/auth/profile
   */
  async updateProfile(data: Partial<Pick<User, 'name' | 'avatar'>>): Promise<User> {
    if (USE_MOCK_AUTH) {
      return mockAuthApi.updateProfile(data.name, data.avatar);
    }

    const accessToken = await getAccessToken();
    if (!accessToken) {
      throw { message: 'Not authenticated' } as ApiError;
    }

    const user = await request<User>('/api/auth/profile', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(data),
    });

    await saveUser(user);
    return user;
  },

  /**
   * Change password
   * POST /api/auth/change-password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      throw { message: 'Not authenticated' } as ApiError;
    }

    await request('/api/auth/change-password', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  /**
   * Request password reset
   * POST /api/auth/forgot-password
   */
  async forgotPassword(email: string): Promise<void> {
    await request('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  /**
   * Check if user is authenticated (has valid token)
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await getAccessToken();
    return token !== null;
  },

  /**
   * Get stored authentication state
   */
  async getStoredAuth(): Promise<{ user: User | null; isAuthenticated: boolean }> {
    const [user, token] = await Promise.all([
      getStoredUser(),
      getAccessToken(),
    ]);

    return {
      user,
      isAuthenticated: token !== null && user !== null,
    };
  },
};

/**
 * Export mock auth info for development
 */
export { getMockCredentials } from './mock-auth';
export const DEBUG_USE_MOCK_AUTH = USE_MOCK_AUTH;
