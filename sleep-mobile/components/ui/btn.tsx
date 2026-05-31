import * as React from 'react';
import { Pressable, StyleSheet, type StyleProp, type TextStyle, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { BorderRadius, Brand, Spacing, Type } from '@/constants/theme';

/**
 * SleepMind button primitive. Three semantic variants:
 *  - `primary`   — accent-filled, for the main action on a screen
 *  - `secondary` — bordered, transparent fill, for cancel / dismiss
 *  - `ghost`     — text-only, no border, for inline tertiary actions
 *
 * Hit areas always meet the 44px minimum (controlled via `minHeight`). Press
 * feedback is a subtle 0.97 scale spring — no opacity blink.
 */
export type BtnProps = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  /** Optional leading element (an icon component). Rendered before the label. */
  leading?: React.ReactNode;
  /** Optional trailing element. */
  trailing?: React.ReactNode;
  disabled?: boolean;
  /** Stretch to fill parent width. */
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  /** Accessibility label override (defaults to `label`). */
  accessibilityLabel?: string;
};

export function Btn({
  label,
  onPress,
  variant = 'primary',
  leading,
  trailing,
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
  accessibilityLabel,
}: BtnProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const palette = (() => {
    switch (variant) {
      case 'secondary':
        return { bg: 'transparent', border: Brand.border, fg: Brand.textPrimary };
      case 'ghost':
        return { bg: 'transparent', border: 'transparent', fg: Brand.accent };
      case 'primary':
      default:
        return { bg: Brand.accent, border: 'transparent', fg: Brand.textInverse };
    }
  })();

  return (
    <Animated.View style={[fullWidth ? { flexGrow: 1, alignSelf: 'stretch' } : null, animatedStyle, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled }}
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.97, { stiffness: 300, damping: 18 }); }}
        onPressOut={() => { scale.value = withSpring(1, { stiffness: 300, damping: 18 }); }}
        disabled={disabled}
        style={[
          styles.base,
          {
            backgroundColor: palette.bg,
            borderColor: palette.border,
            borderWidth: variant === 'secondary' ? 1 : 0,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        {leading ? <View style={styles.slot}>{leading}</View> : null}
        <ThemedText style={[styles.label, { color: palette.fg }, textStyle]}>{label}</ThemedText>
        {trailing ? <View style={styles.slot}>{trailing}</View> : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: Spacing.hitArea,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  slot: { alignItems: 'center', justifyContent: 'center' },
  label: {
    ...Type.titleS,
    fontWeight: '600',
    textAlign: 'center',
  },
});
