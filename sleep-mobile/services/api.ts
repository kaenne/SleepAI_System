import { authApi, getAccessToken } from './auth';

export type ApiError = {
  message: string;
  status?: number;
  url?: string;
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

type RequestOptions = RequestInit & { 
  timeoutMs?: number;
  requireAuth?: boolean;
};

async function requestJson<T>(
  path: string,
  init?: RequestOptions
): Promise<T> {
  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    throw { message: 'API base URL is not configured (EXPO_PUBLIC_API_BASE_URL).' } satisfies ApiError;
  }

  const url = `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
  const { timeoutMs = 8000, requireAuth = true, ...rest } = init ?? {};
  const { signal, dispose } = withTimeout(timeoutMs);

  // Get auth token if required
  let authHeaders: Record<string, string> = {};
  if (requireAuth) {
    const token = await getAccessToken();
    if (token) {
      authHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  try {
    const res = await fetch(url, {
      ...rest,
      signal,
      headers: {
        Accept: 'application/json',
        ...authHeaders,
        ...(rest.headers ?? {}),
      },
    });

    const contentType = res.headers.get('content-type') ?? '';
    const isJson = contentType.includes('application/json');

    // Handle 401 Unauthorized - try to refresh token
    if (res.status === 401 && requireAuth) {
      try {
        await authApi.refreshToken();
        // Retry the request with new token
        const newToken = await getAccessToken();
        if (newToken) {
          const retryRes = await fetch(url, {
            ...rest,
            signal,
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${newToken}`,
              ...(rest.headers ?? {}),
            },
          });
          
          if (retryRes.ok) {
            if (retryRes.status === 204) return undefined as T;
            const retryContentType = retryRes.headers.get('content-type') ?? '';
            if (retryContentType.includes('application/json')) {
              return (await retryRes.json()) as T;
            }
            return (await retryRes.text()) as unknown as T;
          }
        }
      } catch {
        // Token refresh failed
        throw { message: 'Session expired. Please login again.', status: 401, url } satisfies ApiError;
      }
    }

    if (!res.ok) {
      let message = `Request failed (${res.status})`;
      try {
        if (isJson) {
          const data: any = await res.json();
          message = data?.message ?? data?.error ?? message;
        } else {
          const text = await res.text();
          if (text) message = text;
        }
      } catch {
        // ignore
      }

      throw { message, status: res.status, url } satisfies ApiError;
    }

    if (res.status === 204) {
      return undefined as T;
    }

    if (isJson) {
      return (await res.json()) as T;
    }

    const text = await res.text();
    return text as unknown as T;
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      throw { message: 'Request timeout', url } satisfies ApiError;
    }
    if (e?.message && e?.status) {
      throw e;
    }
    if (e?.message) {
      throw { message: e.message, url } satisfies ApiError;
    }
    throw { message: 'Network error', url } satisfies ApiError;
  } finally {
    dispose();
  }
}

export type HealthResponse = {
  status?: string;
};

export type CreateJournalEntryRequest = {
  createdAt: string;
  sleepHours: number;
  stressLevel: number;
  note?: string;
};

export type CreateJournalEntryResponse = {
  id?: string;
};

export type JournalEntry = {
  id: string;
  userId: string;
  createdAt: string;
  sleepHours: number;
  stressLevel: number;
  note?: string;
};

export type SleepAnalysis = {
  sleepQuality: number; // 0-100
  averageSleep: number;
  deepSleepPercent: number;
  remSleepPercent: number;
  insights: string[];
  recommendations: string[];
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
};

export type ChatResponse = {
  message: ChatMessage;
  suggestions?: string[];
};

export type AiPredictionRequest = {
  sleepDuration: number;
  stressLevel: number;
  heartRate: number;
};

export type AiPredictionResponse = {
  predictedQuality: number;
  message: string;
};

export const api = {
  getBaseUrl,

  async health(): Promise<{ ok: boolean; urlTried?: string }> {
    const baseUrl = getBaseUrl();
    if (!baseUrl) return { ok: false };

    const candidates = ['/health', '/actuator/health'];
    for (const path of candidates) {
      try {
        await requestJson<HealthResponse>(path, { 
          method: 'GET', 
          timeoutMs: 4000,
          requireAuth: false,
        });
        return { ok: true, urlTried: `${baseUrl}${path}` };
      } catch {
        // try next
      }
    }

    return { ok: false, urlTried: `${baseUrl}${candidates[0]}` };
  },

  // ============ Journal Entries ============

  async createJournalEntry(payload: CreateJournalEntryRequest) {
    return requestJson<CreateJournalEntryResponse>('/api/journal/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  async getJournalEntries(params?: { limit?: number; offset?: number }) {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.offset) query.set('offset', params.offset.toString());
    const qs = query.toString();
    
    return requestJson<JournalEntry[]>(`/api/journal/entries${qs ? `?${qs}` : ''}`);
  },

  async getJournalEntry(id: string) {
    return requestJson<JournalEntry>(`/api/journal/entries/${id}`);
  },

  async deleteJournalEntry(id: string) {
    return requestJson<void>(`/api/journal/entries/${id}`, { method: 'DELETE' });
  },

  // ============ Sleep Analysis ============

  async getSleepAnalysis(params?: { days?: number }) {
    const query = params?.days ? `?days=${params.days}` : '';
    return requestJson<SleepAnalysis>(`/api/analysis/sleep${query}`);
  },

  async getStressAnalysis(params?: { days?: number }) {
    const query = params?.days ? `?days=${params.days}` : '';
    return requestJson<{ averageStress: number; trend: string; insights: string[] }>(
      `/api/analysis/stress${query}`
    );
  },

  // ============ AI Chat ============

  async sendChatMessage(content: string, _conversationId?: string) {
    return requestJson<{ reply: string }>('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: content }),
    });
  },

  async getChatHistory(conversationId?: string) {
    const query = conversationId ? `?conversationId=${conversationId}` : '';
    return requestJson<ChatMessage[]>(`/api/chat/history${query}`);
  },

  // ============ User Settings ============

  async getUserSettings() {
    return requestJson<{
      notifications: boolean;
      darkMode: boolean;
      reminderTime: string;
      dataSync: boolean;
    }>('/api/user/settings');
  },

  async updateUserSettings(settings: Partial<{
    notifications: boolean;
    darkMode: boolean;
    reminderTime: string;
    dataSync: boolean;
  }>) {
    return requestJson<void>('/api/user/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
  },

  // ============ Data Export ============

  async exportUserData() {
    return requestJson<{ downloadUrl: string }>('/api/user/export');
  },

  async deleteUserData() {
    return requestJson<void>('/api/user/data', { method: 'DELETE' });
  },

  // ============ AI Prediction ============

  async predictSleepQuality(payload: AiPredictionRequest) {
    return requestJson<AiPredictionResponse>('/api/ai/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },
};

