import { ActivityIndicator, Pressable, StyleSheet, type PressableProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { BorderRadius, Colors, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type ButtonProps = Omit<PressableProps, 'style'> & {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
};

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  disabled,
  ...otherProps
}: ButtonProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const shadow = Shadows[colorScheme].button;
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const sizeStyles = {
    sm: { paddingVertical: Spacing.xs + 2, paddingHorizontal: Spacing.md, fontSize: 14 },
    md: { paddingVertical: Spacing.sm + 4, paddingHorizontal: Spacing.lg, fontSize: 16 },
    lg: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, fontSize: 18 },
  };

  const variantStyles = {
    primary: {
      container: {
        backgroundColor: colors.tint,
        ...shadow,
      },
      text: {
        color: colorScheme === 'dark' ? colors.background : '#FFFFFF',
        fontWeight: '700' as const,
      },
    },
    secondary: {
      container: {
        backgroundColor: colors.accent,
        ...shadow,
      },
      text: {
        color: '#FFFFFF',
        fontWeight: '600' as const,
      },
    },
    outline: {
      container: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: colors.tint,
      },
      text: {
        color: colors.tint,
        fontWeight: '600' as const,
      },
    },
    ghost: {
      container: {
        backgroundColor: 'transparent',
      },
      text: {
        color: colors.tint,
        fontWeight: '500' as const,
      },
    },
  };

  const currentSize = sizeStyles[size];
  const currentVariant = variantStyles[variant];

  return (
    <AnimatedPressable
      style={[
        styles.button,
        currentVariant.container,
        {
          paddingVertical: currentSize.paddingVertical,
          paddingHorizontal: currentSize.paddingHorizontal,
          opacity: disabled || loading ? 0.6 : 1,
          overflow: 'hidden',
        },
        animatedStyle,
      ]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      {...otherProps}
    >
      {variant === 'primary' && (
        <LinearGradient
          colors={[colors.headerGradientStart ?? colors.tint, colors.tint]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      {loading ? (
        <ActivityIndicator
          size="small"
          color={currentVariant.text.color}
        />
      ) : (
        <>
          {icon}
          <ThemedText
            style={[
              styles.text,
              currentVariant.text,
              { fontSize: currentSize.fontSize },
            ]}
          >
            {title}
          </ThemedText>
        </>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  text: {
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});
