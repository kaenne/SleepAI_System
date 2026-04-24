import { LinearGradient } from 'expo-linear-gradient';
import type { PropsWithChildren, ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedRef,
  useAnimatedStyle,
  useScrollViewOffset,
} from 'react-native-reanimated';

import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';

const HEADER_HEIGHT = 270;

type Props = PropsWithChildren<{
  headerImage: ReactElement;
  headerBackgroundColor: { dark: string; light: string };
}>;

export default function ParallaxScrollView({
  children,
  headerImage,
  headerBackgroundColor,
}: Props) {
  const backgroundColor = useThemeColor({}, 'background');
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollOffset = useScrollViewOffset(scrollRef);

  // Only apply parallax on pull-down (negative offset); clamp to 0 for downward scroll
  // This prevents the header from sliding DOWN and bleeding over content on web
  const headerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: interpolate(
            scrollOffset.value,
            [-HEADER_HEIGHT, 0, HEADER_HEIGHT],
            [-HEADER_HEIGHT / 2, 0, 0],
            'clamp'
          ),
        },
        {
          scale: interpolate(
            scrollOffset.value,
            [-HEADER_HEIGHT, 0, HEADER_HEIGHT],
            [2, 1, 1],
            'clamp'
          ),
        },
      ],
    };
  });

  return (
    <Animated.ScrollView
      ref={scrollRef}
      style={{ backgroundColor, flex: 1 }}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerWrapper}>
        <Animated.View style={[styles.header, headerAnimatedStyle]}>
          <LinearGradient
            colors={[colors.headerGradientStart, colors.headerGradientMid ?? colors.headerGradientEnd, colors.headerGradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {/* Decorative circles for depth */}
          <View style={[styles.decorativeCircle, styles.circle1]} />
          <View style={[styles.decorativeCircle, styles.circle2]} />
          <View style={[styles.decorativeCircle, styles.circle3]} />
          {headerImage}
        </Animated.View>
        {/* Curved bottom edge — covers the hard header/content seam */}
        <View style={[styles.headerCurve, { backgroundColor }]} />
      </View>
      <ThemedView style={styles.content}>{children}</ThemedView>
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  headerWrapper: {
    position: 'relative',
  },
  header: {
    height: HEADER_HEIGHT,
    overflow: 'hidden',
  },
  decorativeCircle: {
    position: 'absolute',
    borderRadius: 9999,
  },
  circle1: {
    width: 240,
    height: 240,
    top: -70,
    right: -60,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  circle2: {
    width: 160,
    height: 160,
    bottom: 30,
    left: -50,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  circle3: {
    width: 90,
    height: 90,
    top: 50,
    left: '45%',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  headerCurve: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 32,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    overflow: 'hidden',
    marginTop: -4,
  },
});
