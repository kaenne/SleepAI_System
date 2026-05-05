import { BlurView } from 'expo-blur';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

interface Props {
  userName: string;
  isOnline: boolean;
  colorScheme: 'light' | 'dark';
  onlineLabel: string;
  offlineLabel: string;
  greeting: string;
  subtitle: string;
}

export function HomeHeader({ userName, isOnline, colorScheme, onlineLabel, offlineLabel, greeting, subtitle }: Props) {
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <Animated.View entering={FadeInDown.springify()} style={styles.content}>
        <View style={styles.textContainer}>
          <ThemedText style={styles.greeting}>
            {greeting.replace('{{name}}', userName)}
          </ThemedText>
          <ThemedText style={styles.subGreeting}>{subtitle}</ThemedText>
        </View>

        <View style={styles.badgeContainer}>
          <BlurView
            intensity={20}
            tint={colorScheme === 'dark' ? 'dark' : 'light'}
            style={styles.glassBadge}
          >
            <View style={[styles.statusDot, { backgroundColor: isOnline ? '#4ade80' : '#f87171' }]} />
            <ThemedText style={styles.statusText}>
              {isOnline ? onlineLabel : offlineLabel}
            </ThemedText>
          </BlurView>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 40,
    paddingHorizontal: Spacing.lg,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  textContainer: { flex: 1, paddingRight: 16 },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subGreeting: { fontSize: 15, color: 'rgba(255,255,255,0.9)', fontWeight: '500' },
  badgeContainer: { paddingBottom: 4 },
  glassBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },
});
