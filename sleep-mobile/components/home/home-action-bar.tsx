import { router } from 'expo-router';
import * as React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface Props {
  colorScheme: 'light' | 'dark';
  tintColor: string;
  accentColor: string;
  successColor: string;
  statsLabel: string;
  journalLabel: string;
  addLabel: string;
  onAddPress: () => void;
}

export function HomeActionBar({
  colorScheme,
  tintColor,
  statsLabel,
  journalLabel,
  addLabel,
  onAddPress,
}: Props) {
  const isDark = colorScheme === 'dark';
  return (
    <Animated.View entering={FadeInUp.delay(50).springify()}>
      <View style={[styles.row, {
        backgroundColor: isDark ? '#1E1E2D' : '#FFFFFF',
        borderColor: isDark ? '#2C2C3E' : '#E5E7EB',
      }]}>
        {/* Статистика */}
        <Pressable onPress={() => router.navigate('/stats')} style={styles.btn}>
          <View style={[styles.iconCircle, { backgroundColor: isDark ? '#2D234A' : `${tintColor}15` }]}>
            <IconSymbol name="chart.bar.fill" size={20} color={tintColor} />
          </View>
          <ThemedText style={[styles.label, { color: isDark ? '#A78BFA' : tintColor }]}>{statsLabel}</ThemedText>
        </Pressable>

        <View style={[styles.divider, { backgroundColor: isDark ? '#2C2C3E' : '#E5E7EB' }]} />

        {/* Дневник */}
        <Pressable onPress={() => router.navigate('/')} style={styles.btn}>
          <View style={[styles.iconCircle, { backgroundColor: isDark ? '#1A2A4A' : '#EFF6FF' }]}>
            <IconSymbol name="book.fill" size={20} color="#60A5FA" />
          </View>
          <ThemedText style={[styles.label, { color: '#60A5FA' }]}>{journalLabel}</ThemedText>
        </Pressable>

        <View style={[styles.divider, { backgroundColor: isDark ? '#2C2C3E' : '#E5E7EB' }]} />

        {/* Добавить — solid green */}
        <Pressable onPress={onAddPress} style={styles.btn}>
          <View style={[styles.iconCircle, { backgroundColor: '#22c55e' }]}>
            <IconSymbol name="plus" size={20} color="#0a1e0a" />
          </View>
          <ThemedText style={[styles.label, { color: '#22c55e' }]}>{addLabel}</ThemedText>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 8,
    justifyContent: 'space-evenly',
    alignItems: 'center',
    borderWidth: 1,
  },
  btn: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  label: { fontSize: 12, fontWeight: '600' },
  divider: { width: 1, height: 40 },
});
