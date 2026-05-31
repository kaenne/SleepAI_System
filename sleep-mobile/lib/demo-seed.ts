import type { SleepStressEntry } from '@/hooks/use-sleep-journal';

// Day-of-week sleep pattern — weekdays slightly worse, weekends recover.
// Index: 0=Sun, 1=Mon, ..., 6=Sat
const SLEEP_BY_DOW = [8.2, 6.8, 7.0, 6.5, 7.2, 6.4, 8.5];
const STRESS_BY_DOW = [3, 6, 5, 7, 5, 7, 3];

const NOTES = [
  'Лёг поздно, читал перед сном',
  'Тренировка вечером, заснул быстро',
  'Стресс на работе, ворочался',
  'Выпил кофе после обеда — зря',
  '',
  '',
  'Долго смотрел в телефон',
  'Чай с ромашкой — помог',
  '',
  'Шумные соседи',
  'Прохладно в комнате, спал крепко',
  '',
  'Тяжёлый ужин',
  'Хорошая ночь, проснулся бодрым',
];

function seededRandom(seed: number): number {
  // Mulberry32 — deterministic so demo data looks the same each run
  let t = seed + 0x6d2b79f5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Generates 14 days of realistic sleep+stress entries ending yesterday.
 * Pattern: weekday/weekend variation + 1-2 "bad nights" + noise.
 * Deterministic seed so demos look consistent across runs.
 */
export function generateDemoEntries(): Omit<SleepStressEntry, 'id'>[] {
  const entries: Omit<SleepStressEntry, 'id'>[] = [];
  const now = new Date();

  for (let daysAgo = 13; daysAgo >= 0; daysAgo--) {
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    // Wake-up time varies 06:30–08:30
    date.setHours(7, Math.floor(seededRandom(daysAgo * 17) * 60), 0, 0);

    const dow = date.getDay();
    const baseSleep = SLEEP_BY_DOW[dow];
    const baseStress = STRESS_BY_DOW[dow];

    // Noise ±0.6h sleep, ±1 stress
    const sleepNoise = (seededRandom(daysAgo * 31 + 1) - 0.5) * 1.2;
    const stressNoise = Math.round((seededRandom(daysAgo * 31 + 2) - 0.5) * 2);

    let sleepHours = clamp(baseSleep + sleepNoise, 4, 10);
    let stressLevel = clamp(baseStress + stressNoise, 1, 10);

    // Inject 2 "bad nights" for variety (day 9 and day 4 ago)
    if (daysAgo === 9 || daysAgo === 4) {
      sleepHours = 4.5 + seededRandom(daysAgo) * 0.8;
      stressLevel = 8;
    }

    const note = NOTES[daysAgo] || undefined;

    entries.push({
      createdAt: date.toISOString(),
      sleepHours: Math.round(sleepHours * 10) / 10,
      stressLevel: Math.round(stressLevel),
      note: note?.trim() ? note : undefined,
    });
  }

  return entries;
}

export const DEMO_ENTRY_COUNT = 14;
