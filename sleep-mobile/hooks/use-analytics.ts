import { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';

export type SleepAnalysis = {
  averageSleepHours: number;
  averageQuality: number;
  totalEntries: number;
  sleepTrend: string; // "improving", "stable", "declining"
  insights: string[];
  weeklyData: { day: string; hours: number; quality: number }[];
};

export type StressAnalysis = {
  averageStressLevel: number;
  stressTrend: string; // "improving", "stable", "worsening"
  highStressDays: number;
  insights: string[];
  weeklyData: { day: string; level: number }[];
};

export type AnalyticsData = {
  sleep: SleepAnalysis | null;
  stress: StressAnalysis | null;
  isLoading: boolean;
  isOffline: boolean;
  error: string | null;
  lastUpdated: Date | null;
};

export function useAnalytics() {
  const [sleep, setSleep] = useState<SleepAnalysis | null>(null);
  const [stress, setStress] = useState<StressAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchSleepAnalysis = useCallback(async (days: number = 7): Promise<SleepAnalysis | null> => {
    if (!api.getBaseUrl()) return null;
    try {
      // Backend returns a different shape than UI expects — cast through unknown.
      return (await api.getSleepAnalysis({ days })) as unknown as SleepAnalysis;
    } catch {
      return null;
    }
  }, []);

  const fetchStressAnalysis = useCallback(async (days: number = 7): Promise<StressAnalysis | null> => {
    if (!api.getBaseUrl()) return null;
    try {
      return (await api.getStressAnalysis({ days })) as unknown as StressAnalysis;
    } catch {
      return null;
    }
  }, []);

  const refresh = useCallback(async (days: number = 7) => {
    setIsLoading(true);
    setError(null);
    try {
      const [sleepData, stressData] = await Promise.all([
        fetchSleepAnalysis(days),
        fetchStressAnalysis(days),
      ]);
      const offline = sleepData === null && stressData === null;
      setIsOffline(offline);
      setSleep(sleepData);
      setStress(stressData);
      setLastUpdated(new Date());
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err?.message ?? 'Failed to fetch analytics');
      setIsOffline(true);
    } finally {
      setIsLoading(false);
    }
  }, [fetchSleepAnalysis, fetchStressAnalysis]);

  // Load analytics on mount
  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    sleep,
    stress,
    isLoading,
    isOffline,
    error,
    lastUpdated,
    refresh,
  };
}

// Kept for potential future use (e.g. onboarding screens without auth)
export function getMockSleepAnalysis(): SleepAnalysis {
  return {
    averageSleepHours: 7.2,
    averageQuality: 75,
    totalEntries: 0,
    sleepTrend: 'stable',
    insights: [],
    weeklyData: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => ({ day, hours: 0, quality: 0 })),
  };
}

export function getMockStressAnalysis(): StressAnalysis {
  return {
    averageStressLevel: 0,
    stressTrend: 'stable',
    highStressDays: 0,
    insights: [],
    weeklyData: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => ({ day, level: 0 })),
  };
}

// Utility function to format sleep hours
export function formatSleepHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// Utility to get trend icon
export function getTrendIcon(trend: string): string {
  switch (trend) {
    case 'improving':
      return '📈';
    case 'declining':
    case 'worsening':
      return '📉';
    default:
      return '➡️';
  }
}

// Utility to get trend color
export function getTrendColor(trend: string): string {
  switch (trend) {
    case 'improving':
      return '#4CAF50';
    case 'declining':
    case 'worsening':
      return '#F44336';
    default:
      return '#FF9800';
  }
}
