/**
 * SleepMind design tokens — single source of truth.
 *
 * Palette is calibrated for a quiet, calm dark UI. Light mode mirrors the
 * structure with lifted surfaces. Numeric values across the app use the mono
 * stack with tabular numbers (`font-feature-settings: "tnum"`).
 */

import { Platform } from 'react-native';

// ── Brand tokens ─────────────────────────────────────────────────────────────
export const Brand = {
  background: '#0e1117',
  surface: '#161b24',
  surfaceElevated: '#1c222d',

  accent: '#9d8cff',         // Primary action / highlights
  accentSoft: '#9d8cff1f',   // 12% — for tonal pills and active-tab background
  accentBorder: '#9d8cff33', // 20% — for subtle outlines

  info: '#7eb6ff',
  good: '#5dd39e',
  warn: '#ffb450',
  flame: '#ff8a4c',

  // Text scale
  textPrimary: '#e7eaf0',
  textSecondary: '#9aa3b2',
  textMuted: '#5a6478',      // Section headers, hint copy
  textInverse: '#0e1117',

  // Borders
  border: '#262d3a',
  borderSoft: '#1d2330',
} as const;

/**
 * Convert a brand colour to its tonal background (12% alpha) — used for icon chips,
 * tag fills, and any state-change tints. Pass as backgroundColor.
 */
export const tonal = (hex: string) => `${hex}1f`;
/** 20% alpha for outlined pills / tag borders. */
export const tonalBorder = (hex: string) => `${hex}33`;

// ── Theme map (kept for backward compatibility) ──────────────────────────────
export type ThemeTokens = {
  text: string;
  textSecondary: string;
  background: string;
  tint: string;
  icon: string;
  tabIconDefault: string;
  tabIconSelected: string;
  cardBackground: string;
  cardBorder: string;
  success: string;
  warning: string;
  danger: string;
  error: string;
  muted: string;
  accent: string;
  headerGradientStart: string;
  headerGradientMid: string;
  headerGradientEnd: string;
  inputBackground: string;
  inputBorder: string;
  sleepQuality: string;
  heartRate: string;
  deepSleep: string;
  remSleep: string;
};

export const Colors: { light: ThemeTokens; dark: ThemeTokens } = {
  light: {
    text: '#1F2937',
    textSecondary: '#6B7280',
    background: '#F3F4F6',
    tint: Brand.accent,
    icon: '#9CA3AF',
    tabIconDefault: '#9CA3AF',
    tabIconSelected: Brand.accent,
    cardBackground: '#FFFFFF',
    cardBorder: '#E5E7EB',
    success: Brand.good,
    warning: Brand.warn,
    danger: '#EF4444',
    error: '#EF4444',
    muted: '#6B7280',
    accent: Brand.info,
    headerGradientStart: Brand.surface,
    headerGradientMid: Brand.surface,
    headerGradientEnd: Brand.surface,
    inputBackground: '#FFFFFF',
    inputBorder: '#D1D5DB',
    sleepQuality: Brand.accent,
    heartRate: '#EF4444',
    deepSleep: Brand.info,
    remSleep: Brand.good,
  },
  dark: {
    text: Brand.textPrimary,
    textSecondary: Brand.textSecondary,
    background: Brand.background,
    tint: Brand.accent,
    icon: Brand.textMuted,
    tabIconDefault: Brand.textMuted,
    tabIconSelected: Brand.accent,
    cardBackground: Brand.surface,
    cardBorder: Brand.border,
    success: Brand.good,
    warning: Brand.warn,
    danger: '#ff6b6b',
    error: '#ff6b6b',
    muted: Brand.textMuted,
    accent: Brand.info,
    // Gradient endpoints collapsed to the flat surface — no purple haze.
    headerGradientStart: Brand.background,
    headerGradientMid: Brand.background,
    headerGradientEnd: Brand.background,
    inputBackground: Brand.surfaceElevated,
    inputBorder: Brand.border,
    sleepQuality: Brand.accent,
    heartRate: '#ff6b6b',
    deepSleep: Brand.info,
    remSleep: Brand.good,
  },
};

// ── Typography ───────────────────────────────────────────────────────────────
/**
 * Font stack. Inter for body/UI, JetBrains Mono for numerics, time, dates,
 * version strings, and section headers (with letter-spacing + uppercase).
 *
 * On iOS we fall back to the system fonts when expo-font hasn't yet loaded;
 * on Android the loaded font names are used directly. On web we layer
 * web-safe families.
 */
export const Fonts = Platform.select({
  ios: {
    sans:    'Inter',
    sansAlt: 'system-ui',
    mono:    'JetBrainsMono',
    monoAlt: 'ui-monospace',
    serif:   'ui-serif',
    rounded: 'ui-rounded',
  },
  default: {
    sans:    'Inter_400Regular',
    sansAlt: 'normal',
    mono:    'JetBrainsMono_500Medium',
    monoAlt: 'monospace',
    serif:   'serif',
    rounded: 'normal',
  },
  web: {
    sans:    "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    sansAlt: "system-ui, sans-serif",
    mono:    "'JetBrains Mono', SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    monoAlt: "monospace",
    serif:   "Georgia, serif",
    rounded: "'SF Pro Rounded', sans-serif",
  },
})!;

/**
 * Pre-baked text styles. Spread these into `style={[Type.bodyM, ...]}`.
 * Mono variants enable tabular numbers — drop-in for any numeric display.
 */
export const Type = {
  // Body / UI text (Inter)
  display: { fontFamily: Fonts.sans, fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.2 },
  titleL:  { fontFamily: Fonts.sans, fontSize: 22, fontWeight: '700' as const },
  titleM:  { fontFamily: Fonts.sans, fontSize: 18, fontWeight: '600' as const },
  titleS:  { fontFamily: Fonts.sans, fontSize: 16, fontWeight: '600' as const },
  bodyM:   { fontFamily: Fonts.sans, fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  bodyS:   { fontFamily: Fonts.sans, fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  caption: { fontFamily: Fonts.sans, fontSize: 12, fontWeight: '500' as const },

  // Mono — numerics, time, dates, code-like labels (JetBrains Mono)
  monoL:   { fontFamily: Fonts.mono, fontSize: 22, fontWeight: '600' as const, letterSpacing: 0.3 },
  monoM:   { fontFamily: Fonts.mono, fontSize: 14, fontWeight: '500' as const, letterSpacing: 0.4 },
  monoS:   { fontFamily: Fonts.mono, fontSize: 12, fontWeight: '500' as const, letterSpacing: 0.4 },

  // Section header — JetBrains Mono, uppercase, wide tracking.
  // Explicit lineHeight overrides ThemedText's default (26) which made section
  // labels render in a much taller box than their 11px glyphs warrant.
  section: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600' as const,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
    color: Brand.textMuted,
  },
} as const;

// ── Spacing ──────────────────────────────────────────────────────────────────
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  /** Minimum hit-area dimension per accessibility guidelines. */
  hitArea: 44,
};

// ── Radius ───────────────────────────────────────────────────────────────────
export const BorderRadius = {
  sm: 8,
  md: 12,
  /** Default card radius for the new design system. */
  card: 18,
  lg: 16,
  xl: 24,
  full: 9999,
};

// ── Shadows ──────────────────────────────────────────────────────────────────
/**
 * Drop-shadow presets. The `flat` Card variant explicitly omits these; only
 * `glow` and pressed states use them.
 */
export const Shadows = {
  light: {
    card:   { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8,  elevation: 2 },
    button: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 8,  elevation: 4 },
  },
  dark: {
    card:   { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.20, shadowRadius: 10, elevation: 2 },
    button: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.30, shadowRadius: 10, elevation: 4 },
    /** Soft accent glow — use sparingly on `glow` Card variant. */
    glow:   { shadowColor: Brand.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.30, shadowRadius: 18, elevation: 6 },
  },
};
