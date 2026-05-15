/**
 * Sleep-domain constants and scoring shared across modal, quick-entry, stats and chat.
 *
 * The scoring curve is calibrated to the WHO 7–9h adult norm:
 *   0h → 0, 7h → 100, 8h → 100, 9h → 100, 10h → 90, 12h → 70.
 * Oversleeping is penalized lightly (10pt/hour past 9h), with a 40pt floor so an
 * outlier reading does not collapse the whole UI to "0".
 */

export const SLEEP_MIN_HOURS = 0;
export const SLEEP_MAX_HOURS = 12;
export const SLEEP_NORM_FROM = 7;
export const SLEEP_NORM_TO = 9;

/**
 * Resting heart-rate fallback (bpm) sent to the AI prediction service when the user
 * has no real biometric reading. 65 bpm sits inside the healthy-adult resting range
 * (60–80) and matches the training data centroid. Note: this is pulse, not HRV —
 * the HRV stream from useStressMonitor is a separate metric and cannot be swapped in.
 */
export const DEFAULT_HEART_RATE_BPM = 65;

export function computeSleepScore(hours: number): number {
  if (!Number.isFinite(hours) || hours <= 0) return 0;
  if (hours <= SLEEP_NORM_FROM) return Math.round((hours / SLEEP_NORM_FROM) * 100);
  if (hours <= SLEEP_NORM_TO) return 100;
  return Math.max(40, Math.round(100 - (hours - SLEEP_NORM_TO) * 10));
}
