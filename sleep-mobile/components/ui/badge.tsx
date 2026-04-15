import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { BorderRadius, Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

export type BadgeProps = {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  animated?: boolean;
  icon?: React.ReactNode;
};

export function Badge({
  label,
  variant = 'default',
  size = 'md',
  animated = true,
  icon,
}: BadgeProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const variantColors: Record<BadgeVariant, { bg: string; text: string; border: string }> = {
    default: {
      bg: colorScheme === 'dark' ? 'rgba(148, 163, 184, 0.15)' : 'rgba(100, 116, 139, 0.1)',
      text: colors.muted,
      border: colors.cardBorder,
    },
    success: {
      bg: colorScheme === 'dark' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(16, 185, 129, 0.1)',
      text: colors.success,
      border: colors.success,
    },
    warning: {
      bg: colorScheme === 'dark' ? 'rgba(251, 191, 36, 0.15)' : 'rgba(245, 158, 11, 0.1)',
      text: colors.warning,
      border: colors.warning,
    },
    danger: {
      bg: colorScheme === 'dark' ? 'rgba(248, 113, 113, 0.15)' : 'rgba(239, 68, 68, 0.1)',
      text: colors.danger,
      border: colors.danger,
    },
    info: {
      bg: colorScheme === 'dark' ? 'rgba(165, 180, 252, 0.15)' : 'rgba(99, 102, 241, 0.1)',
      text: colors.tint,
      border: colors.tint,
    },
  };

  const currentColors = variantColors[variant];
  const sizeStyles = size === 'sm' 
    ? { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, fontSize: 11 }
    : { paddingHorizontal: Spacing.sm + 4, paddingVertical: Spacing.xs + 2, fontSize: 12 };

  const content = (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: currentColors.bg,
          borderColor: currentColors.border,
          paddingHorizontal: sizeStyles.paddingHorizontal,
          paddingVertical: sizeStyles.paddingVertical,
        },
      ]}
    >
      {icon}
      <ThemedText
        style={[
          styles.text,
          {
            color: currentColors.text,
            fontSize: sizeStyles.fontSize,
          },
        ]}
      >
        {label}
      </ThemedText>
    </View>
  );

  if (animated) {
    return (
      <Animated.View entering={FadeIn.duration(300)}>
        {content}
      </Animated.View>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  text: {
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
