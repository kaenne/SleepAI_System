import { StyleSheet, View, type ViewProps } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { BorderRadius, Brand, Colors, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * SleepMind surface primitive. Use the new variants — `flat`, `bordered`, `glow` —
 * for the redesigned screens. The legacy variants (`default`, `elevated`, `outlined`)
 * stay for backward compatibility while screens migrate.
 *
 *  - `flat`     — surface fill, no border, no shadow. Default for grouped lists.
 *  - `bordered` — surface fill + thin border. Use for outlined controls or to
 *                 separate cards on the same surface.
 *  - `glow`     — surface fill + accent shadow. Use sparingly for hero cards.
 */
export type CardVariant =
  | 'flat'
  | 'bordered'
  | 'glow'
  // legacy
  | 'default'
  | 'elevated'
  | 'outlined';

export type CardProps = ViewProps & {
  variant?: CardVariant;
  animationDelay?: number;
  animated?: boolean;
};

export function Card({
  style,
  variant = 'flat',
  animationDelay = 0,
  animated = true,
  children,
  ...otherProps
}: CardProps) {
  const colorScheme = useColorScheme() ?? 'dark';
  const isDark = colorScheme === 'dark';
  const tokens = Colors[colorScheme];
  const shadow = Shadows[colorScheme].card;

  const variantStyle = (() => {
    switch (variant) {
      case 'flat':
        return {
          backgroundColor: isDark ? Brand.surface : tokens.cardBackground,
          borderWidth: 0,
        };
      case 'bordered':
        return {
          backgroundColor: isDark ? Brand.surface : tokens.cardBackground,
          borderWidth: 1,
          borderColor: isDark ? Brand.border : tokens.cardBorder,
        };
      case 'glow':
        return {
          backgroundColor: isDark ? Brand.surface : tokens.cardBackground,
          borderWidth: 1,
          borderColor: Brand.accentBorder,
          ...(isDark ? Shadows.dark.glow : shadow),
        };

      // ── Legacy variants ────────────────────────────────────────────────────
      case 'elevated':
        return {
          backgroundColor: tokens.cardBackground,
          borderWidth: isDark ? 1 : 0,
          borderColor: isDark ? Brand.border : 'transparent',
          ...shadow,
        };
      case 'outlined':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderColor: tokens.cardBorder,
        };
      case 'default':
      default:
        return {
          backgroundColor: tokens.cardBackground,
          borderWidth: 1,
          borderColor: tokens.cardBorder,
          ...shadow,
        };
    }
  })();

  const content = (
    <View style={[styles.card, variantStyle, style]} {...otherProps}>
      {children}
    </View>
  );

  if (animated) {
    return (
      <Animated.View entering={FadeInDown.delay(animationDelay).duration(400).springify()}>
        {content}
      </Animated.View>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.card,
    padding: Spacing.md,
    gap: Spacing.sm + 4,
    marginBottom: Spacing.sm + 4,
  },
});
