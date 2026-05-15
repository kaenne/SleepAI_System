import { router } from 'expo-router';
import * as React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Brand } from '@/constants/theme';

interface Props {
  statsLabel: string;
  addLabel: string;
  onAddPress: () => void;
}

export function HomeActionBar({ statsLabel, addLabel, onAddPress }: Props) {
  return (
    <Animated.View entering={FadeInUp.delay(50).springify()}>
      <View style={styles.row}>
        {/* Статистика */}
        <Pressable onPress={() => router.navigate('/stats')} style={styles.btn}>
          <View style={[styles.iconCircle, { backgroundColor: Brand.accentSoft }]}>
            <IconSymbol name="chart.bar.fill" size={20} color={Brand.accent} />
          </View>
          <ThemedText style={[styles.label, { color: Brand.accent }]}>{statsLabel}</ThemedText>
        </Pressable>

        <View style={styles.divider} />

        {/* Добавить — solid Brand.good */}
        <Pressable onPress={onAddPress} style={styles.btn}>
          <View style={[styles.iconCircle, { backgroundColor: Brand.good }]}>
            <IconSymbol name="plus" size={20} color={Brand.textInverse} />
          </View>
          <ThemedText style={[styles.label, { color: Brand.good }]}>{addLabel}</ThemedText>
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
    backgroundColor: Brand.surface,
    borderColor: Brand.border,
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
  divider: { width: 1, height: 40, backgroundColor: Brand.border },
});
