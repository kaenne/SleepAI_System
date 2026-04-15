import AsyncStorage from '@react-native-async-storage/async-storage';
import * as React from 'react';

const STORAGE_KEY = 'sleepMobile.sleepJournalEntries.v1';

export type SleepStressEntry = {
  id: string;
  createdAt: string; // ISO
  sleepHours: number;
  stressLevel: number; // 1-10
  note?: string;
};

export type SleepJournalStats = {
  count: number;
  avgSleepHours: number | null;
  avgStressLevel: number | null;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

export function generateInsight(entry: Pick<SleepStressEntry, 'sleepHours' | 'stressLevel'>) {
  const sleep = entry.sleepHours;
  const stress = entry.stressLevel;

  if (sleep < 6 && stress >= 7) {
    return 'High stress + short sleep detected. Consider a 10-minute breathing session before bed and aim for earlier bedtime.';
  }

  if (sleep < 6) {
    return 'Short sleep detected. Try to increase sleep duration by 30–60 minutes tonight.';
  }

  if (stress >= 7) {
    return 'High stress detected. A short walk, journaling, or breathing exercise may help reduce tension.';
  }

  if (sleep >= 7 && stress <= 4) {
    return 'Great balance today: good sleep and low stress. Keep your routine consistent.';
  }

  return 'Stable day. Keep tracking to spot patterns over time.';
}

async function readEntries(): Promise<SleepStressEntry[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((item: any): SleepStressEntry | null => {
      if (!item || typeof item !== 'object') return null;
      if (typeof item.id !== 'string') return null;
      if (typeof item.createdAt !== 'string') return null;

      const sleepHours = Number(item.sleepHours);
      const stressLevel = Number(item.stressLevel);
      if (!Number.isFinite(sleepHours) || !Number.isFinite(stressLevel)) return null;

      const note = typeof item.note === 'string' ? item.note : undefined;

      return {
        id: item.id,
        createdAt: item.createdAt,
        sleepHours: clamp(sleepHours, 0, 24),
        stressLevel: clamp(stressLevel, 1, 10),
        note,
      };
    })
    .filter(Boolean) as SleepStressEntry[];
}

async function writeEntries(entries: SleepStressEntry[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function computeStats(entries: SleepStressEntry[]): SleepJournalStats {
  if (entries.length === 0) {
    return { count: 0, avgSleepHours: null, avgStressLevel: null };
  }

  const totalSleep = entries.reduce((sum, e) => sum + e.sleepHours, 0);
  const totalStress = entries.reduce((sum, e) => sum + e.stressLevel, 0);

  return {
    count: entries.length,
    avgSleepHours: round1(totalSleep / entries.length),
    avgStressLevel: round1(totalStress / entries.length),
  };
}

export function useSleepJournal() {
  const [entries, setEntries] = React.useState<SleepStressEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const stats = React.useMemo(() => computeStats(entries), [entries]);

  const refresh = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const loaded = await readEntries();
      loaded.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      setEntries(loaded);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load entries');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const addEntry = React.useCallback(
    async (data: Omit<SleepStressEntry, 'id' | 'createdAt'> & { createdAt?: string }) => {
      const newEntry: SleepStressEntry = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        createdAt: data.createdAt ?? new Date().toISOString(),
        sleepHours: clamp(Number(data.sleepHours), 0, 24),
        stressLevel: clamp(Number(data.stressLevel), 1, 10),
        note: data.note?.trim() ? data.note.trim() : undefined,
      };

      setEntries((previous) => {
        const next = [newEntry, ...previous];
        void writeEntries(next).catch((e: any) => {
          setError(e?.message ?? 'Failed to save entry');
        });
        return next;
      });

      return newEntry;
    },
    []
  );

  return {
    entries,
    stats,
    isLoading,
    error,
    refresh,
    addEntry,
  };
}
