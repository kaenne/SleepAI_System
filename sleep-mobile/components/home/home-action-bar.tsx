import { BlurView } from 'expo-blur';
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
  accentColor,
  successColor,
  statsLabel,
  journalLabel,
  addLabel,
  onAddPress,
}: Props) {
  return (
    <Animated.View entering={FadeInUp.delay(50).springify()}>
      <BlurView
        intensity={colorScheme === 'dark' ? 40 : 80}
        tint={colorScheme === 'dark' ? 'dark' : 'light'}
        style={styles.row}
      >
        <Pressable onPress={() => router.push('/(tabs)/stats')} style={styles.btn}>
          <View style={[styles.iconCircle, { backgroundColor: `${tintColor}20` }]}>
            <IconSymbol name="chart.bar.fill" size={22} color={tintColor} />
          </View>
          <ThemedText type="caption" style={styles.label}>{statsLabel}</ThemedText>
        </Pressable>

        <View style={styles.divider} />

        <Pressable onPress={() => router.push('/modal')} style={styles.btn}>
          <View style={[styles.iconCircle, { backgroundColor: `${accentColor}20` }]}>
            <IconSymbol name="book.fill" size={22} color={accentColor} />
          </View>
          <ThemedText type="caption" style={styles.label}>{journalLabel}</ThemedText>
        </Pressable>

        <View style={styles.divider} />

        <Pressable onPress={onAddPress} style={styles.btn}>
          <View style={[styles.iconCircle, { backgroundColor: `${successColor}20` }]}>
            <IconSymbol name="plus.circle.fill" size={22} color={successColor} />
          </View>
          <ThemedText type="caption" style={styles.label}>{addLabel}</ThemedText>
        </Pressable>
      </BlurView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 8,
    justifyContent: 'space-evenly',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(150,150,150,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
  },
  btn: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  label: { fontWeight: '600' },
  divider: { width: 1, height: '60%', backgroundColor: 'rgba(150,150,150,0.2)' },
});
