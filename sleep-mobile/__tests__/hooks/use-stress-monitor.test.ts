import { getStressEmoji, interpretHrv } from '@/hooks/use-stress-monitor';

// Emojis were intentionally dropped from the UI — getStressEmoji now returns ''
// for every level. Keeping a single test ensures the function still exists and
// returns a string, but no specific emoji values are asserted.
describe('getStressEmoji', () => {
  it('returns a string for any level', () => {
    expect(typeof getStressEmoji('LOW')).toBe('string');
    expect(typeof getStressEmoji('MEDIUM')).toBe('string');
    expect(typeof getStressEmoji('HIGH')).toBe('string');
    expect(typeof getStressEmoji('UNKNOWN')).toBe('string');
  });
});

describe('interpretHrv', () => {
  it('returns LOW for hrv >= 60', () => {
    const result = interpretHrv(60);
    expect(result.level).toBe('LOW');
    expect(result.descriptionKey).toBeTruthy();
  });

  it('returns LOW for high hrv values', () => {
    expect(interpretHrv(100).level).toBe('LOW');
  });

  it('returns MEDIUM for hrv between 40 and 59', () => {
    expect(interpretHrv(40).level).toBe('MEDIUM');
    expect(interpretHrv(55).level).toBe('MEDIUM');
  });

  it('returns HIGH for hrv below 40', () => {
    expect(interpretHrv(39).level).toBe('HIGH');
    expect(interpretHrv(10).level).toBe('HIGH');
  });

  it('returns translation key for all levels', () => {
    expect(interpretHrv(80).descriptionKey).toMatch(/^stress\./);
    expect(interpretHrv(50).descriptionKey).toMatch(/^stress\./);
    expect(interpretHrv(20).descriptionKey).toMatch(/^stress\./);
  });
});
