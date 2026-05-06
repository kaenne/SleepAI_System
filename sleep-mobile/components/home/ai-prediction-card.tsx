import * as React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Card } from '@/components/ui/card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useTranslation } from '@/contexts/i18n-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { type SleepStressEntry } from '@/hooks/use-sleep-journal';
import { api, type AiPredictionResponse } from '@/services/api';

// ─── Factor bar with animated fill ───────────────────────────────────────────

function FactorBar({
  label,
  impact,
  danger,
  success,
}: {
  label: string;
  impact: number;
  danger: string;
  success: string;
}) {
  const isPositive = impact >= 0;
  const barColor = isPositive ? success : danger;
  const fillRatio = Math.min(Math.abs(impact) / 20, 1);
  const width = useSharedValue(0);

  React.useEffect(() => {
    width.value = withTiming(fillRatio, { duration: 900 });
  }, [fillRatio, width]);

  const barStyle = useAnimatedStyle(() => ({ width: `${width.value * 100}%` }));

  return (
    <View style={factorStyles.row}>
      <ThemedText style={factorStyles.label} numberOfLines={1}>
        {label}
      </ThemedText>
      <View style={[factorStyles.track, { backgroundColor: `${barColor}22` }]}>
        <Animated.View style={[factorStyles.fill, { backgroundColor: barColor }, barStyle]} />
      </View>
      <ThemedText style={[factorStyles.impact, { color: barColor }]}>
        {isPositive ? '+' : ''}{impact.toFixed(0)}
      </ThemedText>
    </View>
  );
}

const factorStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 7 },
  label: { fontSize: 13, width: 128 },
  track: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  impact: { fontSize: 12, fontWeight: '700', width: 32, textAlign: 'right' },
});

// ─── Main card ────────────────────────────────────────────────────────────────

type Props = {
  entry: SleepStressEntry;
};

export function AiPredictionCard({ entry }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { t } = useTranslation();

  const [result, setResult] = React.useState<AiPredictionResponse | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(false);

  const qualityWidth = useSharedValue(0);
  const qualityStyle = useAnimatedStyle(() => ({ width: `${qualityWidth.value}%` }));

  React.useEffect(() => {
    setLoading(true);
    setError(false);
    setResult(null);
    qualityWidth.value = 0;

    api
      .predictSleepQuality({
        sleepDuration: entry.sleepHours,
        stressLevel: entry.stressLevel,
        heartRate: 70,
        bedtimeHour: new Date(entry.createdAt).getHours() || 23,
      })
      .then((data) => {
        setResult(data);
        qualityWidth.value = withTiming(data.predictedQuality, { duration: 1100 });
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.id]);

  if (error) return null;

  const q = result?.predictedQuality ?? 0;
  const qualityColor = '#4ADE80'; // Fixed green accent
  const qualityBg = '#1A3B2E';    // Fixed dark green bg
  const isDark = colorScheme === 'dark';

  return (
    <Animated.View entering={FadeIn.duration(400)}>
      <View style={[styles.card, isDark && styles.cardDark]}>
        {/* Header */}
        <View style={[styles.header, isDark && styles.headerDark]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <IconSymbol name="sparkles" size={14} color={isDark ? "#A78BFA" : colors.tint} />
            <ThemedText style={{ color: isDark ? '#A78BFA' : colors.tint, fontSize: 13, fontWeight: '600' }}>
              {t('home.aiAnalysisTitle')}
            </ThemedText>
          </View>
          {loading && (
            <ActivityIndicator
              size="small"
              color={colors.tint}
              style={{ marginLeft: 'auto' }}
            />
          )}
        </View>

        {result && (
          <View style={[styles.aiDataGrid, isDark && styles.aiDataGridDark]}>
            {/* Quality score cell */}
            <View style={[styles.aiDataCell, isDark && styles.sideBorder, isDark && styles.bottomBorder]}>
              <ThemedText style={styles.aiDataLabel}>{t('home.qualityLabel').toUpperCase()}</ThemedText>
              <View style={styles.aiDataValueRow}>
                <ThemedText style={styles.aiDataValue}>{q.toFixed(0)}<ThemedText style={styles.aiDataUnit}> %</ThemedText></ThemedText>
                <View style={[styles.aiBadge, { backgroundColor: qualityBg }]}><ThemedText style={[styles.aiBadgeText, { color: qualityColor }]}>GOOD</ThemedText></View>
              </View>
            </View>

            {/* REM phase cell */}
            <View style={[styles.aiDataCell, isDark && styles.bottomBorder]}>
              <ThemedText style={styles.aiDataLabel}>{t('home.remLabel').toUpperCase()}</ThemedText>
              <View style={styles.aiDataValueRow}>
                <ThemedText style={styles.aiDataValue}>{result.remPercentage.toFixed(0)}<ThemedText style={styles.aiDataUnit}> %</ThemedText></ThemedText>
                <View style={[styles.aiBadge, { backgroundColor: '#2D234A' }]}><ThemedText style={[styles.aiBadgeText, { color: '#A78BFA' }]}>AVG</ThemedText></View>
              </View>
            </View>

            {/* Deep Sleep cell */}
            <View style={[styles.aiDataCell, isDark && styles.sideBorder]}>
              <ThemedText style={styles.aiDataLabel}>{t('home.deepLabel').toUpperCase()}</ThemedText>
              <View style={styles.aiDataValueRow}>
                <ThemedText style={styles.aiDataValue}>{result.deepSleepPercentage.toFixed(0)}<ThemedText style={styles.aiDataUnit}> %</ThemedText></ThemedText>
                <View style={[styles.aiBadge, { backgroundColor: qualityBg }]}><ThemedText style={[styles.aiBadgeText, { color: qualityColor }]}>GOOD</ThemedText></View>
              </View>
            </View>

            {/* Awakenings cell */}
            <View style={styles.aiDataCell}>
              <ThemedText style={styles.aiDataLabel}>{t('home.awakeningsLabel').toUpperCase()}</ThemedText>
              <View style={styles.aiDataValueRow}>
                <ThemedText style={[styles.aiDataValue, { fontSize: 13 }]}>
                  {result.awakeningsCategory === 0 ? t('home.awakeningsNormal') : t('home.awakeningsDisturbed')}
                </ThemedText>
              </View>
            </View>
          </View>
        )}

        {/* AI message */}
        {result?.message && (
          <View style={{ padding: Spacing.md, borderTopWidth: 1, borderTopColor: isDark ? '#2C2C3E' : 'rgba(150,150,150,0.1)' }}>
            <ThemedText style={[{ fontSize: 14, lineHeight: 20 }, { color: isDark ? '#E2D8F0' : colors.textSecondary }]}>
              {result.message}
            </ThemedText>
          </View>
        )}

        {!result && !loading && (
          <View style={{ padding: Spacing.md }}>
            <ThemedText style={[styles.empty, { color: colors.textSecondary }]}>
              {t('home.noDataForAnalysis')}
            </ThemedText>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(150,150,150,0.1)',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  cardDark: {
    borderColor: '#2C2C3E',
    backgroundColor: '#1E1E2D',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.1)',
  },
  headerDark: {
    backgroundColor: '#1E1E2D',
    borderBottomColor: '#2C2C3E',
  },
  aiDataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#FFFFFF',
  },
  aiDataGridDark: {
    backgroundColor: '#151522',
  },
  aiDataCell: {
    width: '50%',
    padding: 12,
  },
  sideBorder: {
    borderRightWidth: 1,
    borderColor: '#2C2C3E',
  },
  bottomBorder: {
    borderBottomWidth: 1,
    borderColor: '#2C2C3E',
  },
  aiDataLabel: {
    fontSize: 10,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    fontWeight: '600',
  },
  aiDataValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiDataValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  aiDataUnit: {
    fontSize: 12,
    fontWeight: '500',
    color: '#888',
  },
  aiBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  aiBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 16, fontWeight: '700' },
  scoreSection: { marginBottom: 16 },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 8 },
  scorePct: { fontSize: 34, fontWeight: '800' },
  scoreLabel: { fontSize: 14 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  phases: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(150,150,150,0.05)',
  },
  phaseItem: { flex: 1, alignItems: 'center', gap: 3 },
  divider: { width: 1, marginVertical: 4 },
  phaseVal: { fontSize: 17, fontWeight: '700' },
  phaseLbl: { fontSize: 11 },
  factors: { gap: 0 },
  factorTitle: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  message: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 19,
    fontStyle: 'italic',
  },
  empty: { fontSize: 14, lineHeight: 20 },
});
