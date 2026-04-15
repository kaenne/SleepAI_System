import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '@/services/api';

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

export function useStressMonitor() {
  const [latestStress, setLatestStress] = useState<StressData | null>(null);
  const [history, setHistory] = useState<StressData[]>([]);
  const [stats, setStats] = useState<StressStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLatestStress = useCallback(async () => {
    if (!api.getBaseUrl()) return;
    
    try {
      const response = await fetch(`${api.getBaseUrl()}/api/stress/latest`, {
        headers: {
          'Authorization': `Bearer ${await getToken()}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.hrvScore !== undefined) {
          setLatestStress(data);
        }
      }
    } catch (e) {
      console.error('Failed to fetch stress data:', e);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    if (!api.getBaseUrl()) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`${api.getBaseUrl()}/api/stress/history`, {
        headers: {
          'Authorization': `Bearer ${await getToken()}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      }
    } catch {
      setError('Failed to fetch stress history');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async (days: number = 7) => {
    if (!api.getBaseUrl()) return;
    
    try {
      const response = await fetch(`${api.getBaseUrl()}/api/stress/average?days=${days}`, {
        headers: {
          'Authorization': `Bearer ${await getToken()}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (e) {
      console.error('Failed to fetch stress stats:', e);
    }
  }, []);

  const recordStress = useCallback(async (hrvScore: number) => {
    if (!api.getBaseUrl()) {
      // Mock data for offline mode
      const mockData: StressData = {
        id: Date.now(),
        hrvScore,
        stressLevel: hrvScore >= 60 ? 'LOW' : hrvScore >= 40 ? 'MEDIUM' : 'HIGH',
        timestamp: new Date().toISOString(),
      };
      setLatestStress(mockData);
      setHistory(prev => [mockData, ...prev]);
      return mockData;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${api.getBaseUrl()}/api/stress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getToken()}`,
        },
        body: JSON.stringify({ hrvScore }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setLatestStress(data);
        setHistory(prev => [data, ...prev]);
        return data;
      } else {
        throw new Error('Failed to record stress');
      }
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Simulate HRV measurement (in real app, this would use device sensors)
  const measureHrv = useCallback(async (): Promise<number> => {
    // Simulate measurement delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate realistic HRV value (30-90 range)
    const baseHrv = 55;
    const variation = Math.random() * 30 - 15; // ±15
    return Math.round(baseHrv + variation);
  }, []);

  useEffect(() => {
    fetchLatestStress();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    latestStress,
    history,
    stats,
    isLoading,
    error,
    recordStress,
    measureHrv,
    refresh: () => {
      fetchLatestStress();
      fetchHistory();
      fetchStats();
    },
  };
}

// Helper to get token
async function getToken(): Promise<string> {
  return (await AsyncStorage.getItem('sleepMind.authToken')) || '';
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

// Helper function to get stress emoji
export function getStressEmoji(level: StressLevel): string {
  switch (level) {
    case 'LOW':
      return '😌';
    case 'MEDIUM':
      return '😐';
    case 'HIGH':
      return '😰';
    default:
      return '❓';
  }
}

// Helper to interpret HRV
export function interpretHrv(hrv: number): {
  level: StressLevel;
  description: string;
} {
  if (hrv >= 60) {
    return {
      level: 'LOW',
      description: 'Excellent! Your body is relaxed and recovering well.',
    };
  } else if (hrv >= 40) {
    return {
      level: 'MEDIUM',
      description: 'Moderate stress detected. Consider taking a break.',
    };
  } else {
    return {
      level: 'HIGH',
      description: 'High stress levels. Try breathing exercises or meditation.',
    };
  }
}
