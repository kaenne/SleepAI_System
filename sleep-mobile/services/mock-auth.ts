/**
 * Mock authentication service for development without a backend.
 * Used when EXPO_PUBLIC_API_BASE_URL is not configured or DEV_MODE=true
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiError, AuthResponse, AuthTokens, User } from './auth';

const AUTH_TOKEN_KEY = 'sleepMind.authToken';
const REFRESH_TOKEN_KEY = 'sleepMind.refreshToken';
const USER_KEY = 'sleepMind.user';

// Mock users for development
const MOCK_USERS: Record<string, { password: string; user: User }> = {
  'user@example.com': {
    password: 'password123',
    user: {
      id: '1',
      email: 'user@example.com',
      name: 'Test User',
      avatar: '👤',
      createdAt: new Date().toISOString(),
    },
  },
  'test@test.com': {
    password: 'test123',
    user: {
      id: '2',
      email: 'test@test.com',
      name: 'Test Account',
      avatar: '👨‍💼',
      createdAt: new Date().toISOString(),
    },
  },
};

function generateMockToken(): string {
  return 'mock_token_' + Math.random().toString(36).substring(2, 15);
}

export const mockAuthApi = {
  async login(email: string, password: string): Promise<AuthResponse> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    const mockUser = MOCK_USERS[email];
    if (!mockUser || mockUser.password !== password) {
      throw {
        message: 'Invalid email or password',
        status: 401,
      } as ApiError;
    }

    const tokens: AuthTokens = {
      accessToken: generateMockToken(),
      refreshToken: generateMockToken(),
      expiresIn: 3600,
    };

    // Store tokens and user
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, tokens.accessToken);
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(mockUser.user));

    return {
      user: mockUser.user,
      tokens,
    };
  },

  async register(
    name: string,
    email: string,
    password: string
  ): Promise<AuthResponse> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    if (MOCK_USERS[email]) {
      throw {
        message: 'Email already registered',
        status: 409,
      } as ApiError;
    }

    const newUser: User = {
      id: String(Object.keys(MOCK_USERS).length + 1),
      email,
      name,
      avatar: '👤',
      createdAt: new Date().toISOString(),
    };

    // Add to mock users (in-memory only, not persisted)
    MOCK_USERS[email] = { password, user: newUser };

    const tokens: AuthTokens = {
      accessToken: generateMockToken(),
      refreshToken: generateMockToken(),
      expiresIn: 3600,
    };

    // Store tokens and user
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, tokens.accessToken);
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(newUser));

    return {
      user: newUser,
      tokens,
    };
  },

  async logout(): Promise<void> {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
  },

  async getStoredAuth(): Promise<{ user: User | null; isAuthenticated: boolean }> {
    try {
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      const userJson = await AsyncStorage.getItem(USER_KEY);

      if (token && userJson) {
        return {
          user: JSON.parse(userJson),
          isAuthenticated: true,
        };
      }

      return {
        user: null,
        isAuthenticated: false,
      };
    } catch {
      return {
        user: null,
        isAuthenticated: false,
      };
    }
  },

  async getStoredUser(): Promise<User | null> {
    try {
      const userJson = await AsyncStorage.getItem(USER_KEY);
      return userJson ? JSON.parse(userJson) : null;
    } catch {
      return null;
    }
  },

  async getCurrentUser(): Promise<User> {
    const user = await this.getStoredUser();
    if (!user) {
      throw { message: 'No user found' } as ApiError;
    }
    return user;
  },

  async updateProfile(name?: string, avatar?: string): Promise<User> {
    const user = await this.getStoredUser();
    if (!user) {
      throw { message: 'No user found' } as ApiError;
    }

    const updatedUser = {
      ...user,
      ...(name && { name }),
      ...(avatar && { avatar }),
    };

    await AsyncStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
    return updatedUser;
  },
};

/**
 * Get test credentials for development
 */
export function getMockCredentials(): { email: string; password: string }[] {
  return Object.entries(MOCK_USERS).map(([email, { password }]) => ({
    email,
    password,
  }));
}
