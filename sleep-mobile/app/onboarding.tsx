  import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as React from 'react';
import {
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  View,
  ViewToken,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { StorageKeys } from '@/constants/storage';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useTranslation } from '@/contexts/i18n-context';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    icon: 'moon.stars.fill' as const,
    gradientStart: '#1E1B4B',
    gradientMid: '#3730A3',
    gradientEnd: '#6D28D9',
    iconColor: '#C4B5FD',
    accentColor: '#A78BFA',
  },
  {
    id: '2',
    icon: 'brain.head.profile' as const,
    gradientStart: '#0C1445',
    gradientMid: '#1E3A8A',
    gradientEnd: '#2563EB',
    iconColor: '#93C5FD',
    accentColor: '#60A5FA',
  },
  {
    id: '3',
    icon: 'sun.max.fill' as const,
    gradientStart: '#0F172A',
    gradientMid: '#134E4A',
    gradientEnd: '#0D9488',
    iconColor: '#5EEAD4',
    accentColor: '#2DD4BF',
  },
];

export const ONBOARDING_KEY = StorageKeys.ONBOARDING_DONE;

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const flatListRef = React.useRef<FlatList>(null);
  const buttonScale = useSharedValue(1);

  const onViewableItemsChanged = React.useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
    [],
  );

  const viewabilityConfig = React.useRef({ viewAreaCoveragePercentThreshold: 50 });

  const handleNext = async () => {
    buttonScale.value = withSpring(0.92, {}, () => {
      buttonScale.value = withSpring(1);
    });
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      router.replace('/welcome');
    }
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    router.replace('/welcome');
  };

  const buttonAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const currentSlide = SLIDES[currentIndex];

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig.current}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <SlideItem item={item} index={index} />
        )}
      />

      {/* Bottom overlay */}
      <View style={styles.bottomContainer}>
        {/* Dots */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <Dot key={i} active={i === currentIndex} color={currentSlide.accentColor} />
          ))}
        </View>

        {/* Button */}
        <Animated.View style={[styles.buttonWrapper, buttonAnimStyle]}>
          <Pressable onPress={handleNext} style={styles.buttonPressable}>
            <LinearGradient
              colors={[currentSlide.gradientMid, currentSlide.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.nextButton}
            >
              <ThemedText style={styles.nextButtonText}>
                {currentIndex === SLIDES.length - 1 ? t('onboarding.start') : t('onboarding.next')}
              </ThemedText>
              {currentIndex < SLIDES.length - 1 && (
                <IconSymbol name="chevron.right" size={18} color="#FFFFFF" />
              )}
            </LinearGradient>
          </Pressable>
        </Animated.View>

        {/* Skip */}
        {currentIndex < SLIDES.length - 1 && (
          <Pressable onPress={handleSkip} style={styles.skipButton}>
            <ThemedText style={[styles.skipText, { color: 'rgba(255,255,255,0.5)' }]}>
              {t('onboarding.skip')}
            </ThemedText>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function SlideItem({ item, index }: { item: (typeof SLIDES)[0]; index: number }) {
  const { t } = useTranslation();
  return (
    <View style={styles.slide}>
      <LinearGradient
        colors={[item.gradientStart, item.gradientMid, item.gradientEnd]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Decorative blobs */}
      <View style={[styles.blob, styles.blob1, { backgroundColor: item.accentColor }]} />
      <View style={[styles.blob, styles.blob2, { backgroundColor: item.iconColor }]} />

      <SafeAreaView style={styles.slideContent}>
        {/* Icon container */}
        <Animated.View entering={FadeIn.delay(index * 100).duration(600)} style={styles.iconWrapper}>
          <View style={[styles.iconCircle, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
            <View style={[styles.iconCircleInner, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
              <IconSymbol name={item.icon} size={72} color={item.iconColor} />
            </View>
          </View>
        </Animated.View>

        {/* Text */}
        <Animated.View
          entering={FadeInDown.delay(index * 100 + 200).duration(600)}
          style={styles.textSection}
        >
          <ThemedText style={styles.slideTitle}>{t(`onboarding.slide${item.id}_title` as any)}</ThemedText>
          <ThemedText style={styles.slideSubtitle}>{t(`onboarding.slide${item.id}_subtitle` as any)}</ThemedText>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

function Dot({ active, color }: { active: boolean; color: string }) {
  const scale = useSharedValue(active ? 1 : 0.7);
  const opacity = useSharedValue(active ? 1 : 0.4);

  React.useEffect(() => {
    scale.value = withSpring(active ? 1 : 0.7);
    opacity.value = withSpring(active ? 1 : 0.4);
  }, [active, scale, opacity]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.dot,
        style,
        {
          width: active ? 24 : 8,
          backgroundColor: active ? color : 'rgba(255,255,255,0.5)',
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F1A',
  },
  slide: {
    width,
    height,
    overflow: 'hidden',
  },
  slideContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: 200,
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.12,
  },
  blob1: {
    width: 320,
    height: 320,
    top: -80,
    right: -80,
  },
  blob2: {
    width: 240,
    height: 240,
    bottom: 200,
    left: -60,
  },
  iconWrapper: {
    marginBottom: 48,
  },
  iconCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleInner: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textSection: {
    alignItems: 'center',
    gap: 16,
  },
  slideTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  slideSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 48 : 32,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    gap: 16,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  buttonWrapper: {
    width: '100%',
  },
  buttonPressable: {
    width: '100%',
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 8,
  },
  nextButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
