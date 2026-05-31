import { authApi, getAccessToken } from './auth';
import { type ApiError, getBaseUrl, httpRequest } from './http-client';

export type { ApiError };

type RequestOptions = RequestInit & {
  timeoutMs?: number;
  requireAuth?: boolean;
};

/**
 * Authenticated JSON request. Adds `Authorization: Bearer <token>`, transparently
 * refreshes on 401 once, then retries the original request. Network/timeout/JSON
 * handling is delegated to `httpRequest` to avoid duplication.
 */
async function requestJson<T>(
  path: string,
  init?: RequestOptions
): Promise<T> {
  const { timeoutMs = 8000, requireAuth = true, headers, ...rest } = init ?? {};

  const buildHeaders = async (): Promise<HeadersInit | undefined> => {
    if (!requireAuth) return headers;
    const token = await getAccessToken();
    return token
      ? { ...(headers ?? {}), Authorization: `Bearer ${token}` }
      : headers;
  };

  try {
    return await httpRequest<T>(path, { ...rest, headers: await buildHeaders(), timeoutMs });
  } catch (err: unknown) {
    const errorMsg = err as { status?: number };
    // Refresh-and-retry only on 401 with auth requested.
    if (errorMsg?.status !== 401 || !requireAuth) throw err;

    try {
      await authApi.refreshToken();
    } catch {
      throw { message: 'Session expired. Please login again.', status: 401 } satisfies ApiError;
    }

    return httpRequest<T>(path, { ...rest, headers: await buildHeaders(), timeoutMs });
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
  deepSleepPercent: number | null;
  remSleepPercent: number | null;
  insights: string[];
  recommendations: string[];
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  conversationId?: string;
};

export type ChatResponse = {
  message: ChatMessage;
  suggestions?: string[];
  conversationId?: string;
};

export type AiPredictionRequest = {
  sleepDuration: number;
  stressLevel: number;
  heartRate: number;
  physicalActivity?: number;
  caffeineIntake?: number;
  alcoholIntake?: number;
  exerciseFrequency?: number;
  // age / gender / bmiCategory come from the AI Profile editor in profile.tsx.
  // Omit when the user hasn't set them — the AI service treats missing as NaN.
  age?: number;
  gender?: number;        // 0 = female, 1 = male
  bmiCategory?: number;   // 0 = normal, 1 = overweight, 2 = obese
  bedtimeHour?: number;
};

export type AiPredictionFactor = {
  feature: string;
  impact: number;  // % пунктов качества (+ улучшает, - ухудшает)
};

export type StressLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'NO_DATA';

export type StressDataDto = {
  id: number;
  hrvScore: number;
  stressLevel: StressLevel;
  timestamp: string;
};

export type StressAverageDto = {
  averageHrv: number;
  stressLevel: StressLevel;
  period: string;
};

export type AiPredictionResponse = {
  predictedQuality: number;
  remPercentage: number;
  deepSleepPercentage: number;
  awakeningsCategory: number;    // 0=норма(0-2), 1=нарушен(3+)
  awakeningsLabel: string;
  topFactors: AiPredictionFactor[];
  message: string;
  modelVersion: string;
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
    if (params?.limit !== undefined) query.set('limit', params.limit.toString());
    if (params?.offset !== undefined) query.set('offset', params.offset.toString());
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

  // ============ Stress Data (HRV) ============

  async getLatestStress() {
    return requestJson<StressDataDto | { message: string }>('/api/stress/latest');
  },

  async getStressHistory(params?: { page?: number; size?: number }) {
    const query = new URLSearchParams();
    if (params?.page !== undefined) query.set('page', params.page.toString());
    if (params?.size !== undefined) query.set('size', params.size.toString());
    const qs = query.toString();
    return requestJson<StressDataDto[]>(`/api/stress/history${qs ? `?${qs}` : ''}`);
  },

  async getStressAverage(days: number = 7) {
    return requestJson<StressAverageDto>(`/api/stress/average?days=${days}`);
  },

  async saveStress(hrvScore: number) {
    return requestJson<StressDataDto>('/api/stress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hrvScore }),
    });
  },

  // ============ AI Chat ============

  async sendChatMessage(content: string, conversationId?: string, userContext?: string) {
    return requestJson<ChatResponse>('/api/chat/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, conversationId, userContext }),
    });
  },

  async getChatHistory(conversationId?: string) {
    const query = conversationId ? `?conversationId=${conversationId}` : '';
    return requestJson<ChatMessage[]>(`/api/chat/history${query}`);
  },

  async clearChatHistory() {
    return requestJson<{ message: string }>('/api/chat/history', { method: 'DELETE' });
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

  async updateProfile(name: string) {
    return requestJson<{ id: string; name: string; email: string }>('/api/auth/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
  },

  async googleLogin(accessToken: string) {
    return requestJson<{ user: any; tokens: { accessToken: string; refreshToken: string; expiresIn: number } }>(
      '/api/auth/google',
      {
        method: 'POST',
        requireAuth: false,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken }),
      }
    );
  },

  async forgotPassword(email: string): Promise<void> {
    await requestJson<{ message?: string }>('/api/auth/forgot-password', {
      method: 'POST',
      requireAuth: false,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
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

