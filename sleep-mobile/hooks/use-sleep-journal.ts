import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import * as React from 'react';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/auth-context';
import { StorageKeys } from '@/constants/storage';
import { generateDemoEntries } from '@/lib/demo-seed';

const STORAGE_KEY_BASE = StorageKeys.JOURNAL_ENTRIES_BASE;

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

export function generateInsight(
  entry: Pick<SleepStressEntry, 'sleepHours' | 'stressLevel'>,
  t: (key: string) => string,
) {
  const sleep = entry.sleepHours;
  const stress = entry.stressLevel;

  if (sleep < 6 && stress >= 7) {
    return t('journal.insight_high_stress_sleep');
  }

  if (sleep < 6) {
    return t('journal.insight_short_sleep');
  }

  if (stress >= 7) {
    return t('journal.insight_high_stress');
  }

  if (sleep >= 7 && stress <= 4) {
    return t('journal.insight_good');
  }

  return t('journal.insight_stable');
}

function storageKey(userId?: string | null) {
  return userId ? `${STORAGE_KEY_BASE}.${userId}` : STORAGE_KEY_BASE;
}

export async function clearJournalCache(userId: string | null | undefined) {
  await AsyncStorage.removeItem(storageKey(userId));
}

async function readEntries(key: string): Promise<SleepStressEntry[]> {
  const raw = await AsyncStorage.getItem(key);
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

async function writeEntries(key: string, entries: SleepStressEntry[]) {
  await AsyncStorage.setItem(key, JSON.stringify(entries));
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
  const { user } = useAuth();
  const key = storageKey(user?.id);

  const [entries, setEntries] = React.useState<SleepStressEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const stats = React.useMemo(() => computeStats(entries), [entries]);

  const refresh = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const loaded = await readEntries(key);

      // Sync from backend — merge, backend entries are authoritative
      try {
        const remote = await api.getJournalEntries({ limit: 200 });
        if (remote.length > 0) {
          const remoteMapped: SleepStressEntry[] = remote.map(e => ({
            id: e.id,
            createdAt: e.createdAt,
            sleepHours: clamp(Number(e.sleepHours), 0, 24),
            stressLevel: clamp(Number(e.stressLevel), 1, 10),
            note: e.note,
          }));
          // Local entries the backend doesn't yet have — match on createdAt to the second
          const remoteKeys = new Set(remoteMapped.map(e => e.createdAt.slice(0, 19)));
          const localOnly = loaded.filter(e => !remoteKeys.has(e.createdAt.slice(0, 19)));

          // Catch-up sync: push pending local-only entries to backend.
          // Each succeeds → it'll appear on next refresh and stop being "local-only".
          for (const entry of localOnly) {
            try {
              await api.createJournalEntry({
                createdAt: entry.createdAt,
                sleepHours: entry.sleepHours,
                stressLevel: entry.stressLevel,
                note: entry.note,
              });
            } catch {
              // Still offline / 401 — keep locally, retry on next refresh.
            }
          }

          const merged = [...remoteMapped, ...localOnly];
          merged.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
          await writeEntries(key, merged);
          setEntries(merged);
          setIsLoading(false);
          return;
        }
      } catch {
        // backend offline or unauthenticated — fall through to local data
      }

      loaded.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      setEntries(loaded);
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err?.message ?? 'Failed to load entries');
    } finally {
      setIsLoading(false);
    }
  }, [key]);

  // Re-fetch when the active user changes (account switch or logout)
  React.useEffect(() => {
    setEntries([]);
    void refresh();
  }, [key, refresh]);

  // Re-fetch every time the consumer screen becomes focused. Without this
  // each screen carries its own React state and Settings → Clear Data leaves
  // Home/Stats/Profile rendering a stale copy until the app is restarted.
  useFocusEffect(
    React.useCallback(() => {
      void refresh();
    }, [refresh])
  );

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
        void writeEntries(key, next).catch((e: unknown) => {
          const err = e as { message?: string };
          setError(err?.message ?? 'Failed to save entry');
        });
        return next;
      });

      // Fire-and-forget backend sync. On failure (offline / 401), the entry stays local
      // and refresh() will retry the catch-up upload on next foregrounding.
      void api
        .createJournalEntry({
          createdAt: newEntry.createdAt,
          sleepHours: newEntry.sleepHours,
          stressLevel: newEntry.stressLevel,
          note: newEntry.note,
        })
        .catch(() => { /* swallowed — picked up by refresh() catch-up loop */ });

      return newEntry;
    },
    [key]
  );

  return {
    entries,
    stats,
    isLoading,
    error,
    refresh,
    addEntry,
    clearAll: React.useCallback(async () => {
      await writeEntries(key, []);
      setEntries([]);
    }, [key]),
    seedDemo: React.useCallback(async () => {
      const demo = generateDemoEntries();
      const seeded: SleepStressEntry[] = demo.map((e, i) => ({
        ...e,
        id: `demo-${Date.now()}-${i}`,
      }));
      // Sort newest-first to match the rest of the app's invariant
      seeded.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      await writeEntries(key, seeded);
      setEntries(seeded);

      // Best-effort push to backend so AI predictions also see the data
      for (const entry of seeded) {
        try {
          await api.createJournalEntry({
            createdAt: entry.createdAt,
            sleepHours: entry.sleepHours,
            stressLevel: entry.stressLevel,
            note: entry.note,
          });
        } catch {
          // offline or 401 — local data is enough for demo
        }
      }
      return seeded.length;
    }, [key]),
  };
}
