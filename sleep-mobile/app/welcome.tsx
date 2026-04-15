import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import * as React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BorderRadius, Colors, Spacing } from '@/constants/theme';
import { useIsAuthenticated } from '@/contexts/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function WelcomeScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { isAuthenticated, isLoading } = useIsAuthenticated();

  // If already authenticated, go to home
  if (!isLoading && isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <ThemedText style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading...
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.background}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Decorative circles */}
          <View style={[styles.circle, styles.circle1]} />
          <View style={[styles.circle, styles.circle2]} />
          <View style={[styles.circle, styles.circle3]} />

          <View style={styles.content}>
            {/* Logo Section */}
            <Animated.View entering={FadeInUp.duration(800)} style={styles.logoSection}>
              <View style={styles.logoContainer}>
                <IconSymbol name="moon.stars.fill" size={64} color="#FFFFFF" />
              </View>
              <ThemedText style={styles.brandName}>SleepMind</ThemedText>
              <ThemedText style={styles.tagline}>Ваш ИИ-тренер по сну</ThemedText>
            </Animated.View>

            {/* Features */}
            <Animated.View entering={FadeIn.duration(800).delay(400)} style={styles.features}>
              <View style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <IconSymbol name="chart.line.uptrend.xyaxis" size={24} color="#FFFFFF" />
                </View>
                <View style={styles.featureText}>
                  <ThemedText style={styles.featureTitle}>📊 Отслеживание сна</ThemedText>
                  <ThemedText style={styles.featureDesc}>
                    Мониторинг паттернов сна с анализом ИИ
                  </ThemedText>
                </View>
              </View>

              <View style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <IconSymbol name="brain.head.profile" size={24} color="#FFFFFF" />
                </View>
                <View style={styles.featureText}>
                  <ThemedText style={styles.featureTitle}>🧠 Анализ стресса</ThemedText>
                  <ThemedText style={styles.featureDesc}>
                    Понимание связи стресса и сна
                  </ThemedText>
                </View>
              </View>

              <View style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <IconSymbol name="sparkles" size={24} color="#FFFFFF" />
                </View>
                <View style={styles.featureText}>
                  <ThemedText style={styles.featureTitle}>✨ Персональный ИИ-тренер</ThemedText>
                  <ThemedText style={styles.featureDesc}>
                    Индивидуальные рекомендации по сну
                  </ThemedText>
                </View>
              </View>
            </Animated.View>

            {/* Buttons */}
            <Animated.View entering={FadeInDown.duration(800).delay(600)} style={styles.buttons}>
              <Pressable
                style={styles.primaryButton}
                onPress={() => router.push('/register' as any)}
              >
                <ThemedText style={styles.primaryButtonText}>🚀 Начать</ThemedText>
              </Pressable>

              <Pressable
                style={styles.secondaryButton}
                onPress={() => router.push('/login' as any)}
              >
                <ThemedText style={styles.secondaryButtonText}>
                  Уже есть аккаунт? Войти
                </ThemedText>
              </Pressable>

              {/* Skip for now - демо режим */}
              <Pressable
                style={styles.skipButton}
                onPress={() => router.replace('/(tabs)')}
              >
                <ThemedText style={styles.skipButtonText}>
                  Пропустить (Демо-режим)
                </ThemedText>
              </Pressable>
            </Animated.View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: 16,
  },
  background: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  circle: {
    position: 'absolute',
    borderRadius: 9999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  circle1: {
    width: 300,
    height: 300,
    top: -100,
    right: -100,
  },
  circle2: {
    width: 200,
    height: 200,
    bottom: 100,
    left: -80,
  },
  circle3: {
    width: 150,
    height: 150,
    top: '40%',
    right: -50,
  },
  content: {
    flex: 1,
    padding: Spacing.xl,
    justifyContent: 'space-between',
  },
  logoSection: {
    alignItems: 'center',
    paddingTop: Spacing.xl * 2,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  brandName: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: Spacing.xs,
  },
  tagline: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.8)',
  },
  features: {
    gap: Spacing.lg,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  buttons: {
    gap: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  primaryButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7C3AED',
  },
  secondaryButton: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  skipButton: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    textDecorationLine: 'underline',
  },
});
