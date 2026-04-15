import { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  error: string | null;
  lastUpdated: Date | null;
};

// Helper to get auth token
async function getToken(): Promise<string> {
  return (await AsyncStorage.getItem('sleepMind.authToken')) || '';
}

export function useAnalytics() {
  const [sleep, setSleep] = useState<SleepAnalysis | null>(null);
  const [stress, setStress] = useState<StressAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchSleepAnalysis = useCallback(async (days: number = 7) => {
    const baseUrl = api.getBaseUrl();
    
    if (!baseUrl) {
      // Return mock data when backend unavailable
      return getMockSleepAnalysis();
    }

    try {
      const token = await getToken();
      const response = await fetch(`${baseUrl}/api/analysis/sleep?days=${days}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data as SleepAnalysis;
      }
    } catch (e) {
      console.error('Failed to fetch sleep analysis:', e);
    }
    
    return getMockSleepAnalysis();
  }, []);

  const fetchStressAnalysis = useCallback(async (days: number = 7) => {
    const baseUrl = api.getBaseUrl();
    
    if (!baseUrl) {
      // Return mock data when backend unavailable
      return getMockStressAnalysis();
    }

    try {
      const token = await getToken();
      const response = await fetch(`${baseUrl}/api/analysis/stress?days=${days}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data as StressAnalysis;
      }
    } catch (e) {
      console.error('Failed to fetch stress analysis:', e);
    }
    
    return getMockStressAnalysis();
  }, []);

  const refresh = useCallback(async (days: number = 7) => {
    setIsLoading(true);
    setError(null);

    try {
      const [sleepData, stressData] = await Promise.all([
        fetchSleepAnalysis(days),
        fetchStressAnalysis(days),
      ]);

      setSleep(sleepData);
      setStress(stressData);
      setLastUpdated(new Date());
    } catch (e: any) {
      setError(e.message || 'Failed to fetch analytics');
    } finally {
      setIsLoading(false);
    }
  }, [fetchSleepAnalysis, fetchStressAnalysis]);

  // Load analytics on mount
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    sleep,
    stress,
    isLoading,
    error,
    lastUpdated,
    refresh,
  };
}

// Mock data generators
function getMockSleepAnalysis(): SleepAnalysis {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return {
    averageSleepHours: 7.2,
    averageQuality: 75,
    totalEntries: 14,
    sleepTrend: 'improving',
    insights: [
      'Your sleep quality improved by 12% this week',
      'Best sleep was on Saturday (8.5 hours)',
      'Consider going to bed 30 minutes earlier',
    ],
    weeklyData: days.map((day, i) => ({
      day,
      hours: 6 + Math.random() * 3,
      quality: 60 + Math.random() * 40,
    })),
  };
}

function getMockStressAnalysis(): StressAnalysis {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return {
    averageStressLevel: 4.5,
    stressTrend: 'stable',
    highStressDays: 2,
    insights: [
      'Your stress levels are relatively stable',
      'Peak stress occurred on Wednesday',
      'Weekend stress levels were significantly lower',
    ],
    weeklyData: days.map((day) => ({
      day,
      level: Math.round(2 + Math.random() * 6),
    })),
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
