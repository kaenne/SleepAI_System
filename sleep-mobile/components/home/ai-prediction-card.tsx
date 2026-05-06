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
  const qualityColor =
    q >= 75 ? colors.success : q >= 50 ? colors.accent : colors.danger;

  return (
    <Animated.View entering={FadeIn.duration(400)}>
      <Card variant="elevated" style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: `${colors.tint}18` }]}>
            <IconSymbol name="sparkles" size={18} color={colors.tint} />
          </View>
          <ThemedText style={styles.title}>{t('home.aiAnalysisTitle')}</ThemedText>
          {loading && (
            <ActivityIndicator
              size="small"
              color={colors.tint}
              style={{ marginLeft: 'auto' }}
            />
          )}
        </View>

        {result && (
          <>
            {/* Quality score */}
            <View style={styles.scoreSection}>
              <View style={styles.scoreRow}>
                <ThemedText style={[styles.scorePct, { color: qualityColor }]}>
                  {q.toFixed(0)}%
                </ThemedText>
                <ThemedText style={[styles.scoreLabel, { color: colors.textSecondary }]}>
                  {t('home.qualityLabel')}
                </ThemedText>
              </View>
              <View style={[styles.track, { backgroundColor: `${qualityColor}22` }]}>
                <Animated.View
                  style={[styles.fill, { backgroundColor: qualityColor }, qualityStyle]}
                />
              </View>
            </View>

            {/* Phase chips */}
            <View style={styles.phases}>
              <View style={styles.phaseItem}>
                <ThemedText style={[styles.phaseVal, { color: colors.remSleep }]}>
                  {result.remPercentage.toFixed(0)}%
                </ThemedText>
                <ThemedText style={[styles.phaseLbl, { color: colors.textSecondary }]}>
                  {t('home.remLabel')}
                </ThemedText>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

              <View style={styles.phaseItem}>
                <ThemedText style={[styles.phaseVal, { color: colors.deepSleep }]}>
                  {result.deepSleepPercentage.toFixed(0)}%
                </ThemedText>
                <ThemedText style={[styles.phaseLbl, { color: colors.textSecondary }]}>
                  {t('home.deepLabel')}
                </ThemedText>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

              <View style={styles.phaseItem}>
                <ThemedText
                  style={[
                    styles.phaseVal,
                    {
                      color:
                        result.awakeningsCategory === 0 ? colors.success : colors.danger,
                    },
                  ]}
                >
                  {result.awakeningsCategory === 0 ? t('home.awakeningsNormal') : t('home.awakeningsDisturbed')}
                </ThemedText>
                <ThemedText style={[styles.phaseLbl, { color: colors.textSecondary }]}>
                  {t('home.awakeningsLabel')}
                </ThemedText>
              </View>
            </View>

            {/* SHAP factors */}
            {result.topFactors.length > 0 && (
              <View style={styles.factors}>
                <ThemedText style={[styles.factorTitle, { color: colors.textSecondary }]}>
                  {t('home.topFactorsTitle')}
                </ThemedText>
                {result.topFactors.map((f, i) => (
                  <FactorBar
                    key={i}
                    label={f.feature}
                    impact={f.impact}
                    success={colors.success}
                    danger={colors.danger}
                  />
                ))}
              </View>
            )}

            {/* AI message */}
            {result.message ? (
              <ThemedText style={[styles.message, { color: colors.textSecondary }]}>
                {result.message}
              </ThemedText>
            ) : null}
          </>
        )}

        {!result && !loading && (
          <ThemedText style={[styles.empty, { color: colors.textSecondary }]}>
            {t('home.noDataForAnalysis')}
          </ThemedText>
        )}
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
