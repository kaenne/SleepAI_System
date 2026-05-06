import { useState, useEffect, useCallback } from 'react';
import { api, type StressDataDto, type StressAverageDto, type StressLevel as StressLevelDto } from '@/services/api';

export type StressLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN';

export type StressData = {
  id: number;
  hrvScore: number;
  stressLevel: StressLevel;
  timestamp: string;
};

export type StressStats = {
  averageHrv: number;
  stressLevel: StressLevel;
  period: string;
};

function normaliseLevel(level: StressLevelDto | string | undefined): StressLevel {
  if (level === 'LOW' || level === 'MEDIUM' || level === 'HIGH') return level;
  return 'UNKNOWN';
}

function adaptStress(dto: StressDataDto): StressData {
  return {
    id: dto.id,
    hrvScore: dto.hrvScore,
    stressLevel: normaliseLevel(dto.stressLevel),
    timestamp: dto.timestamp,
  };
}

function adaptStats(dto: StressAverageDto): StressStats {
  return {
    averageHrv: dto.averageHrv,
    stressLevel: normaliseLevel(dto.stressLevel),
    period: dto.period,
  };
}

export function useStressMonitor() {
  const [latestStress, setLatestStress] = useState<StressData | null>(null);
  const [history, setHistory] = useState<StressData[]>([]);
  const [stats, setStats] = useState<StressStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLatestStress = useCallback(async () => {
    if (!api.getBaseUrl()) return;
    try {
      const data = await api.getLatestStress();
      // Backend returns { message: ... } when no data exists; only update on real readings.
      if ('hrvScore' in data && data.hrvScore !== undefined) {
        setLatestStress(adaptStress(data));
      }
    } catch (e) {
      console.warn('Failed to fetch latest stress:', e);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    if (!api.getBaseUrl()) return;
    setIsLoading(true);
    try {
      const data = await api.getStressHistory();
      setHistory(data.map(adaptStress));
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err?.message ?? 'Failed to fetch stress history');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async (days: number = 7) => {
    if (!api.getBaseUrl()) return;
    try {
      const data = await api.getStressAverage(days);
      setStats(adaptStats(data));
    } catch (e) {
      console.warn('Failed to fetch stress stats:', e);
    }
  }, []);

  const recordStress = useCallback(async (hrvScore: number): Promise<StressData> => {
    if (!api.getBaseUrl()) {
      // Offline mode: derive level locally so the UI still updates.
      const mockData: StressData = {
        id: Date.now(),
        hrvScore,
        stressLevel: hrvScore >= 60 ? 'LOW' : hrvScore >= 40 ? 'MEDIUM' : 'HIGH',
        timestamp: new Date().toISOString(),
      };
      setLatestStress(mockData);
      setHistory((prev) => [mockData, ...prev]);
      return mockData;
    }

    setIsLoading(true);
    setError(null);
    try {
      const dto = await api.saveStress(hrvScore);
      const adapted = adaptStress(dto);
      setLatestStress(adapted);
      setHistory((prev) => [adapted, ...prev]);
      return adapted;
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err?.message ?? 'Failed to record stress');
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Simulate HRV measurement (in real app, this would use device sensors)
  const measureHrv = useCallback(async (): Promise<number> => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const baseHrv = 55;
    const variation = Math.random() * 30 - 15; // ±15
    return Math.round(baseHrv + variation);
  }, []);

  useEffect(() => {
    void fetchLatestStress();
    void fetchStats();
  }, [fetchLatestStress, fetchStats]);

  return {
    latestStress,
    history,
    stats,
    isLoading,
    error,
    recordStress,
    measureHrv,
    refresh: useCallback(() => {
      void fetchLatestStress();
      void fetchHistory();
      void fetchStats();
    }, [fetchLatestStress, fetchHistory, fetchStats]),
  };
}

// Helper function to get stress color
export function getStressColor(level: StressLevel): string {
  switch (level) {
    case 'LOW':
      return '#4CAF50'; // Green
    case 'MEDIUM':
      return '#FF9800'; // Orange
    case 'HIGH':
      return '#F44336'; // Red
    default:
      return '#9E9E9E'; // Gray
  }
}

// Helper function to get stress emoji (removed as per user request to drop emojis)
export function getStressEmoji(level: StressLevel): string {
  return '';
}

// Helper to interpret HRV
export function interpretHrv(hrv: number): {
  level: StressLevel;
  descriptionKey: string;
} {
  if (hrv >= 60) {
    return {
      level: 'LOW',
      descriptionKey: 'stress.desc_low',
    };
  } else if (hrv >= 40) {
    return {
      level: 'MEDIUM',
      descriptionKey: 'stress.desc_medium',
    };
  } else {
    return {
      level: 'HIGH',
      descriptionKey: 'stress.desc_high',
    };
  }
}
