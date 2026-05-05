import { generateInsight } from '@/hooks/use-sleep-journal';

// Simple translation mock — returns the key itself
const t = (key: string) => key;

describe('generateInsight', () => {
  it('returns high stress + low sleep insight', () => {
    const result = generateInsight({ sleepHours: 5, stressLevel: 8 }, t);
    expect(result).toBe('journal.insight_high_stress_sleep');
  });

  it('returns short sleep insight when sleep < 6 and stress is moderate', () => {
    const result = generateInsight({ sleepHours: 5.5, stressLevel: 4 }, t);
    expect(result).toBe('journal.insight_short_sleep');
  });

  it('returns high stress insight when sleep is ok but stress is high', () => {
    const result = generateInsight({ sleepHours: 7, stressLevel: 9 }, t);
    expect(result).toBe('journal.insight_high_stress');
  });

  it('returns good insight for good sleep and low stress', () => {
    const result = generateInsight({ sleepHours: 8, stressLevel: 3 }, t);
    expect(result).toBe('journal.insight_good');
  });

  it('returns stable for moderate sleep and moderate stress', () => {
    const result = generateInsight({ sleepHours: 6.5, stressLevel: 5 }, t);
    expect(result).toBe('journal.insight_stable');
  });

  it('returns stable for exactly 7h sleep and stress = 5', () => {
    // 7h sleep + stress 5 does not hit good (stress > 4), not short, not high_stress
    const result = generateInsight({ sleepHours: 7, stressLevel: 5 }, t);
    expect(result).toBe('journal.insight_stable');
  });

  it('prioritises high_stress_sleep over short_sleep when both true', () => {
    // sleepHours < 6 AND stress >= 7 → first branch wins
    const result = generateInsight({ sleepHours: 4, stressLevel: 7 }, t);
    expect(result).toBe('journal.insight_high_stress_sleep');
  });
});
