import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTranslation } from '@/contexts/i18n-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Colors } from '@/constants/theme';

type Props = {
  todaySleep: number;
  sleepQuality: 'well-rested' | 'needs improvement';
  stressLevel: number;
  currentStreak: number;
};

export function QuickStatsRow({ todaySleep, sleepQuality, stressLevel, currentStreak }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { t } = useTranslation();

  return (
    <View style={styles.statsRow}>
      <LinearGradient
        colors={[
          colorScheme === 'dark' ? '#1e1b4b' : '#e0e7ff',
          colorScheme === 'dark' ? '#312e81' : '#c7d2fe',
        ]}
        style={styles.gradientCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.cardIconWrapperAbsolute}>
          <IconSymbol name="moon.fill" size={40} color={`${colors.tint}20`} />
        </View>
        <ThemedText style={styles.quickStatLabel}>{t('home.sleepToday')}</ThemedText>
        <ThemedText style={[styles.quickStatValue, { color: colors.tint }]}>{todaySleep}h</ThemedText>
        <View style={styles.badgeRow}>
          <Badge
            label={sleepQuality === 'well-rested' ? t('home.good') : t('home.bad')}
            variant={sleepQuality === 'well-rested' ? 'success' : 'warning'}
            size="sm"
            animated={false}
          />
          <Badge
            label={`🔥 ${t('home.days').replace('{{n}}', String(currentStreak))}`}
            variant="info"
            size="sm"
            animated={false}
          />
        </View>
      </LinearGradient>

      <LinearGradient
        colors={[
          colorScheme === 'dark' ? '#450a0a' : '#ffe4e6',
          colorScheme === 'dark' ? '#7f1d1d' : '#fecdd3',
        ]}
        style={styles.gradientCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.cardIconWrapperAbsolute}>
          <IconSymbol name="heart.fill" size={40} color={`${colors.danger}20`} />
        </View>
        <ThemedText style={styles.quickStatLabel}>{t('home.stressLabel')}</ThemedText>
        <ThemedText style={[styles.quickStatValue, { color: colors.danger }]}>
          {stressLevel <= 4
            ? t('home.stress_low')
            : stressLevel <= 6
            ? t('home.stress_medium')
            : t('home.stress_high')}
        </ThemedText>
        <View style={styles.badgeRow}>
          <Badge label="❤️ 68 bpm" variant="default" size="sm" animated={false} />
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  gradientCard: {
    flex: 1,
    borderRadius: 24,
    padding: Spacing.lg,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardIconWrapperAbsolute: {
    position: 'absolute',
    top: -10,
    right: -10,
    opacity: 0.5,
  },
  quickStatLabel: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.8,
    marginBottom: 4,
  },
  quickStatValue: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
});
