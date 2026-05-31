import * as React from 'react';
import { StyleSheet, View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Ico } from '@/components/ui/ico';
import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing, tonal, tonalBorder } from '@/constants/theme';
import { useTranslation } from '@/contexts/i18n-context';

type Props = {
  todaySleep: number;
  sleepQuality: 'well-rested' | 'needs improvement';
  stressLevel: number;
  currentStreak: number;
};

type StressTier = 'low' | 'medium' | 'high';

export function QuickStatsRow({ todaySleep, sleepQuality, stressLevel, currentStreak }: Props) {
  const { t } = useTranslation();

  const stressTier: StressTier =
    stressLevel <= 4 ? 'low' : stressLevel <= 6 ? 'medium' : 'high';

  const stressColor =
    stressTier === 'low' ? Brand.good :
    stressTier === 'medium' ? Brand.warn :
    '#ff6b6b';

  const stressLabel =
    stressTier === 'low' ? t('home.stress_low') :
    stressTier === 'medium' ? t('home.stress_medium') :
    t('home.stress_high');

  return (
    <View style={styles.row}>
      {/* Sleep card */}
      <View style={styles.card}>
        <View style={[styles.accentBar, { backgroundColor: Brand.info }]} />
        <View style={styles.cardInner}>
          <View style={styles.headRow}>
            <View style={[styles.iconChip, { backgroundColor: tonal(Brand.info), borderColor: tonalBorder(Brand.info) }]}>
              <Ico.Moon size={14} color={Brand.info} />
            </View>
            <ThemedText style={styles.label}>{t('home.sleepToday')}</ThemedText>
          </View>
          <ThemedText style={[styles.value, { color: Brand.info }]}>{todaySleep}h</ThemedText>
          <View style={styles.badgeRow}>
            <Badge
              label={sleepQuality === 'well-rested' ? t('home.good') : t('home.bad')}
              variant={sleepQuality === 'well-rested' ? 'success' : 'warning'}
              size="sm"
              animated={false}
            />
            {currentStreak > 0 && (
              <Badge
                label={t('home.days').replace('{{n}}', String(currentStreak))}
                variant="info"
                size="sm"
                animated={false}
              />
            )}
          </View>
        </View>
      </View>

      {/* Stress card */}
      <View style={styles.card}>
        <View style={[styles.accentBar, { backgroundColor: stressColor }]} />
        <View style={styles.cardInner}>
          <View style={styles.headRow}>
            <View style={[styles.iconChip, { backgroundColor: tonal(stressColor), borderColor: tonalBorder(stressColor) }]}>
              <Ico.Heart size={14} color={stressColor} />
            </View>
            <ThemedText style={styles.label}>{t('home.stressLabel')}</ThemedText>
          </View>
          <ThemedText style={[styles.value, { color: stressColor }]} numberOfLines={1}>
            {stressLabel}
          </ThemedText>
          <View style={styles.badgeRow}>
            <Badge label={`${stressLevel}/10`} variant="default" size="sm" animated={false} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  card: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Brand.borderSoft,
    backgroundColor: Brand.surface,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  accentBar: {
    width: 3,
  },
  cardInner: {
    flex: 1,
    padding: Spacing.md,
    gap: 8,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconChip: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    color: Brand.textSecondary,
    fontWeight: '500',
    flex: 1,
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: 2,
  },
});
