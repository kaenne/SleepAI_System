import { getStressEmoji, interpretHrv } from '@/hooks/use-stress-monitor';

describe('getStressEmoji', () => {
  it('returns relaxed emoji for LOW', () => {
    expect(getStressEmoji('LOW')).toBe('😌');
  });

  it('returns neutral emoji for MEDIUM', () => {
    expect(getStressEmoji('MEDIUM')).toBe('😐');
  });

  it('returns anxious emoji for HIGH', () => {
    expect(getStressEmoji('HIGH')).toBe('😰');
  });

  it('returns question mark for UNKNOWN', () => {
    expect(getStressEmoji('UNKNOWN')).toBe('❓');
  });
});

describe('interpretHrv', () => {
  it('returns LOW for hrv >= 60', () => {
    const result = interpretHrv(60);
    expect(result.level).toBe('LOW');
    expect(result.description).toBeTruthy();
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

  it('returns non-empty description for all levels', () => {
    expect(interpretHrv(80).description.length).toBeGreaterThan(0);
    expect(interpretHrv(50).description.length).toBeGreaterThan(0);
    expect(interpretHrv(20).description.length).toBeGreaterThan(0);
  });
});
