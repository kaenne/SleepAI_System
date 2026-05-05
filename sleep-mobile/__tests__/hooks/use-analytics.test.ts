import { formatSleepHours, getTrendIcon, getTrendColor } from '@/hooks/use-analytics';

describe('formatSleepHours', () => {
  it('formats whole hours', () => {
    expect(formatSleepHours(7)).toBe('7h');
    expect(formatSleepHours(8)).toBe('8h');
  });

  it('formats hours with minutes', () => {
    expect(formatSleepHours(7.5)).toBe('7h 30m');
    expect(formatSleepHours(6.25)).toBe('6h 15m');
    expect(formatSleepHours(8.75)).toBe('8h 45m');
  });

  it('formats 0 hours', () => {
    expect(formatSleepHours(0)).toBe('0h');
  });
});

describe('getTrendIcon', () => {
  it('returns up arrow for improving', () => {
    expect(getTrendIcon('improving')).toBe('📈');
  });

  it('returns down arrow for declining', () => {
    expect(getTrendIcon('declining')).toBe('📉');
  });

  it('returns down arrow for worsening', () => {
    expect(getTrendIcon('worsening')).toBe('📉');
  });

  it('returns right arrow for stable', () => {
    expect(getTrendIcon('stable')).toBe('➡️');
  });

  it('returns right arrow for unknown trend', () => {
    expect(getTrendIcon('unknown')).toBe('➡️');
  });
});

describe('getTrendColor', () => {
  it('returns green for improving', () => {
    expect(getTrendColor('improving')).toBe('#4CAF50');
  });

  it('returns red for declining', () => {
    expect(getTrendColor('declining')).toBe('#F44336');
  });

  it('returns red for worsening', () => {
    expect(getTrendColor('worsening')).toBe('#F44336');
  });

  it('returns orange for stable', () => {
    expect(getTrendColor('stable')).toBe('#FF9800');
  });
});
