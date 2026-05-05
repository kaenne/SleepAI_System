import * as React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { Card } from '@/components/ui/card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useTranslation } from '@/contexts/i18n-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { type SleepStressEntry } from '@/hooks/use-sleep-journal';

type Props = {
  entries: SleepStressEntry[];
};

function buildSparklinePath(
  values: number[],
  width: number,
  height: number,
  min: number,
  max: number,
): string {
  if (values.length < 2) return '';
  const range = max - min || 1;
  const step = width / (values.length - 1);

  return values
    .map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * height;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

function buildAreaPath(
  values: number[],
  width: number,
  height: number,
  min: number,
  max: number,
): string {
  const line = buildSparklinePath(values, width, height, min, max);
  if (!line) return '';
  return `${line} L ${width.toFixed(1)} ${height} L 0 ${height} Z`;
}

function dayLabel(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString(undefined, { weekday: 'short' });
}

export function SleepTrendSparkline({ entries }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { t } = useTranslation();
  const { width: screenWidth } = useWindowDimensions();

  const last7 = React.useMemo(() => {
    const byDay = new Map<string, SleepStressEntry>();
    for (const e of entries) {
      const day = e.createdAt.slice(0, 10);
      if (!byDay.has(day)) byDay.set(day, e);
    }
    return [...byDay.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .slice(-7)
      .map(([, e]) => e);
  }, [entries]);

  if (last7.length < 2) return null;

  const values = last7.map((e) => e.sleepHours);
  const stressValues = last7.map((e) => e.stressLevel);
  const minV = Math.min(...values, 5);
  const maxV = Math.max(...values, 9);
  const avgSleep = values.reduce((s, v) => s + v, 0) / values.length;
  const avgStress = stressValues.reduce((s, v) => s + v, 0) / stressValues.length;

  const chartW = screenWidth - Spacing.lg * 2 - 32; // card padding * 2
  const chartH = 64;

  const linePath = buildSparklinePath(values, chartW, chartH, minV, maxV);
  const areaPath = buildAreaPath(values, chartW, chartH, minV, maxV);

  const lastPt = last7[last7.length - 1];
  const lastX = chartW;
  const lastY =
    chartH - ((lastPt.sleepHours - minV) / (maxV - minV || 1)) * chartH;

  const trendUp = values[values.length - 1] > values[0];
  const trendColor = trendUp ? colors.success : colors.danger;
  const trendIcon = trendUp ? 'arrow.up.right' : 'arrow.down.right';

  return (
    <Animated.View entering={FadeIn.duration(400)}>
      <Card variant="elevated" style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: `${colors.deepSleep}18` }]}>
            <IconSymbol name="chart.xyaxis.line" size={18} color={colors.deepSleep} />
          </View>
          <ThemedText style={styles.title}>{t('home.sleepTrendTitle')}</ThemedText>
          <View style={[styles.trendBadge, { backgroundColor: `${trendColor}18` }]}>
            <IconSymbol name={trendIcon} size={12} color={trendColor} />
            <ThemedText style={[styles.trendText, { color: trendColor }]}>
              {trendUp ? t('home.trendImproving') : t('home.trendDeclining')}
            </ThemedText>
          </View>
        </View>

        {/* SVG sparkline */}
        <View style={styles.chartWrap}>
          <Svg width={chartW} height={chartH}>
            <Defs>
              <LinearGradient id="sleepGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={colors.deepSleep} stopOpacity={0.28} />
                <Stop offset="100%" stopColor={colors.deepSleep} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {/* Area fill */}
            <Path d={areaPath} fill="url(#sleepGrad)" />
            {/* Line */}
            <Path
              d={linePath}
              stroke={colors.deepSleep}
              strokeWidth={2.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Last point dot */}
            <Circle cx={lastX} cy={lastY} r={5} fill={colors.deepSleep} />
            <Circle cx={lastX} cy={lastY} r={8} fill={colors.deepSleep} opacity={0.2} />
          </Svg>
        </View>

        {/* Day labels */}
        <View style={[styles.labels, { width: chartW }]}>
          {last7.map((e, i) => (
            <ThemedText
              key={e.id}
              style={[
                styles.dayLabel,
                { color: i === last7.length - 1 ? colors.deepSleep : colors.textSecondary },
              ]}
            >
              {dayLabel(e.createdAt)}
            </ThemedText>
          ))}
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <ThemedText style={[styles.statVal, { color: colors.text }]}>
              {avgSleep.toFixed(1)}{t('home.hourUnit')}
            </ThemedText>
            <ThemedText style={[styles.statLbl, { color: colors.textSecondary }]}>
              {t('home.avgSleep')}
            </ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.cardBorder }]} />
          <View style={styles.statItem}>
            <ThemedText
              style={[
                styles.statVal,
                {
                  color:
                    avgStress <= 4
                      ? colors.success
                      : avgStress <= 6
                      ? colors.warning
                      : colors.danger,
                },
              ]}
            >
              {avgStress.toFixed(1)}/10
            </ThemedText>
            <ThemedText style={[styles.statLbl, { color: colors.textSecondary }]}>
              {t('home.avgStress')}
            </ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.cardBorder }]} />
          <View style={styles.statItem}>
            <ThemedText style={[styles.statVal, { color: trendColor }]}>
              {(values[values.length - 1] - values[0] >= 0 ? '+' : '')}
              {(values[values.length - 1] - values[0]).toFixed(1)}{t('home.hourUnit')}
            </ThemedText>
            <ThemedText style={[styles.statLbl, { color: colors.textSecondary }]}>
              {t('home.sleepChange')}
            </ThemedText>
          </View>
        </View>
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(150,150,150,0.1)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 16, fontWeight: '700', flex: 1 },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  trendText: { fontSize: 11, fontWeight: '600' },
  chartWrap: { marginBottom: 4 },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  dayLabel: { fontSize: 11, fontWeight: '500' },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { width: 1, height: 32 },
  statVal: { fontSize: 17, fontWeight: '700' },
  statLbl: { fontSize: 11 },
});
