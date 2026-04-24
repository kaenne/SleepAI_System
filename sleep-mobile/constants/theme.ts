/**
 * SleepMind color palette - calming blues and purples for sleep wellness.
 * Inspired by the night sky and restful themes.
 */

import { Platform } from 'react-native';

// Primary accent colors - SleepMind brand colors
const primaryPurple = '#7C3AED'; // Vibrant purple
const primaryBlue = '#3B82F6';   // Bright blue

export const Colors = {
  light: {
    text: '#1F2937',              // Gray-800
    textSecondary: '#6B7280',     // Gray-500
    background: '#F3F4F6',        // Gray-100 (light gray bg)
    tint: primaryPurple,
    icon: '#9CA3AF',              // Gray-400
    tabIconDefault: '#9CA3AF',
    tabIconSelected: primaryPurple,
    // Extended palette for UI elements
    cardBackground: '#FFFFFF',
    cardBorder: '#E5E7EB',        // Gray-200
    success: '#10B981',           // Emerald-500
    warning: '#F59E0B',           // Amber-500
    danger: '#EF4444',            // Red-500
    error: '#EF4444',             // Red-500 (alias for danger)
    muted: '#6B7280',             // Gray-500
    accent: primaryBlue,
    // Gradient colors for headers
    headerGradientStart: '#3730A3', // Indigo-800
    headerGradientMid: '#5B21B6',   // Violet-800
    headerGradientEnd: '#7C3AED',   // Violet-600
    // Input colors
    inputBackground: '#FFFFFF',
    inputBorder: '#D1D5DB',       // Gray-300
    // Special colors
    sleepQuality: '#8B5CF6',      // Violet-500
    heartRate: '#EF4444',         // Red-500
    deepSleep: '#3B82F6',         // Blue-500
    remSleep: '#10B981',          // Emerald-500
  },
  dark: {
    text: '#F9FAFB',              // Gray-50
    textSecondary: '#9CA3AF',     // Gray-400
    background: '#111827',        // Gray-900
    tint: '#A78BFA',              // Violet-400
    icon: '#6B7280',              // Gray-500
    tabIconDefault: '#6B7280',
    tabIconSelected: '#A78BFA',
    // Extended palette for UI elements
    cardBackground: '#1F2937',    // Gray-800
    cardBorder: '#374151',        // Gray-700
    success: '#34D399',           // Emerald-400
    warning: '#FBBF24',           // Amber-400
    danger: '#F87171',            // Red-400
    error: '#F87171',             // Red-400 (alias for danger)
    muted: '#9CA3AF',             // Gray-400
    accent: '#60A5FA',            // Blue-400
    // Gradient colors for headers
    headerGradientStart: '#3730A3', // Indigo-800
    headerGradientMid: '#4C1D95',   // Violet-900
    headerGradientEnd: '#6D28D9',   // Violet-700
    // Input colors
    inputBackground: '#1F2937',
    inputBorder: '#374151',       // Gray-700
    // Special colors
    sleepQuality: '#A78BFA',      // Violet-400
    heartRate: '#F87171',         // Red-400
    deepSleep: '#60A5FA',         // Blue-400
    remSleep: '#34D399',          // Emerald-400
  },
};

// Shadows for elevated elements
export const Shadows = {
  light: {
    card: {
      shadowColor: '#6366F1',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    },
    button: {
      shadowColor: '#6366F1',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 6,
    },
  },
  dark: {
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 4,
    },
    button: {
      shadowColor: '#A5B4FC',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 6,
    },
  },
};

// Spacing scale for consistent layout
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Border radius scale
export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
