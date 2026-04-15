import { StyleSheet, View, type ViewProps } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { BorderRadius, Colors, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type CardProps = ViewProps & {
  variant?: 'default' | 'elevated' | 'outlined';
  /** Animation delay in ms for staggered appearance */
  animationDelay?: number;
  /** Whether to animate on mount */
  animated?: boolean;
};

export function Card({
  style,
  variant = 'default',
  animationDelay = 0,
  animated = true,
  children,
  ...otherProps
}: CardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const cardBg = Colors[colorScheme].cardBackground;
  const cardBorder = Colors[colorScheme].cardBorder;
  const shadow = Shadows[colorScheme].card;

  const variantStyles = {
    default: {
      backgroundColor: cardBg,
      borderWidth: 1,
      borderColor: cardBorder,
      ...shadow,
    },
    elevated: {
      backgroundColor: cardBg,
      borderWidth: 0,
      ...shadow,
      shadowOpacity: shadow.shadowOpacity * 1.5,
    },
    outlined: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: cardBorder,
    },
  };

  const content = (
    <View
      style={[styles.card, variantStyles[variant], style]}
      {...otherProps}
    >
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
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.sm + 4,
    marginBottom: Spacing.sm + 4,
  },
});
