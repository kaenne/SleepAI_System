import { PixelRatio, useWindowDimensions } from 'react-native';

/**
 * Baseline design width (iPhone 14 / Pixel 7 — 390 dp).
 * All spacing and font values in designs are assumed to be at this width.
 */
const BASE_WIDTH = 390;

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  // How much the current screen deviates from the baseline
  const scale = width / BASE_WIDTH;

  // User's font-scale accessibility setting (1.0 = default)
  const userFontScale = PixelRatio.getFontScale();

  /**
   * Scale a layout size (padding, margin, icon, border-radius, etc.)
   * Clamps at 1.35× so huge tablets don't become comically large.
   */
  const rs = (size: number) => Math.round(size * Math.min(scale, 1.35));

  /**
   * Scale a font size, also respecting the user's accessibility font scale.
   * rs() is NOT applied to fonts — userFontScale already handles that via
   * the OS, and we only correct for screen width here.
   */
  const rf = (size: number) => {
    const screenAdjusted = size * Math.min(scale, 1.25);
    return Math.round(screenAdjusted / userFontScale);
  };

  return {
    /** Current screen width in dp */
    width,
    /** Current screen height in dp */
    height,
    /** width / BASE_WIDTH ratio */
    scale,
    /** Scale a layout size relative to the 390 dp baseline */
    rs,
    /** Scale a font size, accounting for accessibility font scale */
    rf,
    /** true when running on a tablet (≥ 768 dp wide) */
    isTablet: width >= 768,
    /** true on small-ish phones (< 360 dp) */
    isSmall: width < 360,
  };
}
