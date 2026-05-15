import * as React from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { BarChart, LineChart } from 'react-native-chart-kit';
import Animated, {
  Easing,
  FadeInUp,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Ico, type IcoName } from '@/components/ui/ico';
import { SectionHeader } from '@/components/ui/section-header';
import { computeSleepScore } from '@/constants/sleep';
import { Brand, Spacing, Type, tonal, tonalBorder } from '@/constants/theme';
import { useTranslation } from '@/contexts/i18n-context';
import { formatSleepHours, useAnalytics } from '@/hooks/use-analytics';
import { useSleepJournal } from '@/hooks/use-sleep-journal';
import { useStressMonitor } from '@/hooks/use-stress-monitor';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ── Helpers ──────────────────────────────────────────────────────────────────
function getLast7DayLabels(days: string[]): string[] {
  return [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return days[d.getDay()];
  });
}

function trendVisual(raw: string): { icon: IcoName; color: string } {
  if (raw === 'improving') return { icon: 'ArrowUp', color: Brand.good };
  if (raw === 'declining' || raw === 'worsening') return { icon: 'ArrowDown', color: '#ff6b6b' };
  return { icon: 'Minus', color: Brand.warn };
}

function scoreColor(score: number): string {
  return score >= 80 ? Brand.good : score >= 60 ? Brand.warn : '#ff6b6b';
}

// ── Score arc ────────────────────────────────────────────────────────────────
function SleepScoreArc({ score, size = 140 }: { score: number; size?: number }) {
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcLength = Math.PI * radius;     // half circle
  const dashOffset = circumference * 0.25;

  const progress = useSharedValue(0);

  React.useEffect(() => {
    progress.value = withTiming(Math.min(100, Math.max(0, score)) / 100, {
      duration: 1200,
      easing: Easing.out(Easing.cubic),
    });
  }, [score, progress]);

  const trackProps = useAnimatedProps(() => ({
    strokeDasharray: `${arcLength} ${circumference - arcLength}`,
    strokeDashoffset: dashOffset,
  }));

  const fillProps = useAnimatedProps(() => {
    const filled = progress.value * arcLength;
    return {
      strokeDasharray: `${filled} ${circumference - filled}`,
      strokeDashoffset: dashOffset,
    };
  });

  const fill = scoreColor(score);

  return (
    <View style={{ width: size, height: size / 2 + 22, alignItems: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', top: 0 }}>
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={Brand.borderSoft}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
          animatedProps={trackProps}
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={fill}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
          animatedProps={fillProps}
        />
      </Svg>
      <View style={{ position: 'absolute', top: size / 2 - 14, alignItems: 'center' }}>
        <ThemedText style={[styles.scoreNumber, { color: Brand.textPrimary }]}>{score}</ThemedText>
        <ThemedText style={styles.scoreUnit}>/ 100</ThemedText>
      </View>
    </View>
  );
}

// ── Animated progress bar ────────────────────────────────────────────────────
function AnimatedProgressBar({
  progress: targetProgress,
  color,
}: {
  progress: number;
  color: string;
}) {
  const width = useSharedValue(0);

  React.useEffect(() => {
    width.value = withTiming(targetProgress, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [targetProgress, width]);

  const barStyle = useAnimatedStyle(() => ({ width: `${width.value}%` as any }));

  return (
    <View style={styles.targetTrack}>
      <Animated.View style={[styles.targetBar, { backgroundColor: color }, barStyle]} />
    </View>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonBox({ height = 14, width = '100%' }: { height?: number; width?: number | string }) {
  const opacity = useSharedValue(0.4);

  React.useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [opacity]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        { height, width: width as any, borderRadius: 6, backgroundColor: Brand.surfaceElevated },
        animStyle,
      ]}
    />
  );
}

// ── Stat row ─────────────────────────────────────────────────────────────────
function StatRow({
  icon, iconColor, label, value, isLast,
}: {
  icon: IcoName;
  iconColor: string;
  label: string;
  value: string;
  isLast?: boolean;
}) {
  const Icon = Ico[icon];
  return (
    <View style={[styles.statRow, !isLast && styles.statRowDivider]}>
      <View style={styles.statRowLeft}>
        <View style={[styles.iconChip, { backgroundColor: tonal(iconColor), borderColor: tonalBorder(iconColor) }]}>
          <Icon size={18} color={iconColor} />
        </View>
        <ThemedText style={styles.statLabel} numberOfLines={1}>{label}</ThemedText>
      </View>
      <ThemedText style={styles.statRowValue} numberOfLines={1}>{value}</ThemedText>
    </View>
  );
}

// ── Trend row ────────────────────────────────────────────────────────────────
function TrendRow({ label, raw, valueLabel }: { label: string; raw: string; valueLabel: string }) {
  const v = trendVisual(raw);
  const TrendIcon = Ico[v.icon];
  return (
    <View style={styles.trendRow}>
      <ThemedText style={styles.trendLabel}>{label}</ThemedText>
      <View
        style={[
          styles.trendPill,
          { backgroundColor: tonal(v.color), borderColor: tonalBorder(v.color) },
        ]}
      >
        <TrendIcon size={12} color={v.color} />
        <ThemedText style={[styles.trendPillText, { color: v.color }]}>{valueLabel}</ThemedText>
      </View>
    </View>
  );
}

// ── Status pill (analytics card header) ──────────────────────────────────────
function StatusPill({ tone, label }: { tone: 'good' | 'warn' | 'bad'; label: string }) {
  const c = tone === 'good' ? Brand.good : tone === 'warn' ? Brand.warn : '#ff6b6b';
  return (
    <View style={[styles.statusPill, { backgroundColor: tonal(c), borderColor: tonalBorder(c) }]}>
      <View style={[styles.statusDot, { backgroundColor: c }]} />
      <ThemedText style={[styles.statusPillText, { color: c }]}>{label}</ThemedText>
    </View>
  );
}

// ── Screen ───────────────────────────────────────────────────────────────────
export default function StatsScreen() {
  const { width: screenW } = useWindowDimensions();
  // Card padding is 16, screen padding 16 — chart fills the inner width.
  const chartWidth = screenW - Spacing.md * 4;

  const { entries, stats: localStats } = useSleepJournal();
  const {
    sleep: sleepAnalysis,
    stress: stressAnalysis,
    isLoading: analyticsLoading,
    isOffline: analyticsOffline,
    refresh: refreshAnalytics,
  } = useAnalytics();
  const { latestStress } = useStressMonitor();
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const { t, tArray } = useTranslation();

  const sleepQualityPercentage = React.useMemo(() => {
    if (sleepAnalysis?.averageQuality) return Math.round(sleepAnalysis.averageQuality);
    if (!localStats.avgSleepHours) return 0;
    return computeSleepScore(localStats.avgSleepHours);
  }, [localStats.avgSleepHours, sleepAnalysis]);

  const recent7 = entries.slice(0, 7);

  // Phase data only comes from per-night AI prediction, not from journal aggregation.
  // Showing a 40 % / 25 % heuristic of total sleep would be misleading, so we surface
  // "No data" and rely on AiPredictionCard for real values.
  const avgDeepSleep = t('common.noData');
  const avgRemSleep = t('common.noData');

  const stressLabel = React.useMemo(() => {
    if (stressAnalysis?.averageStressLevel != null) {
      const l = stressAnalysis.averageStressLevel;
      return l <= 4 ? t('stats.stress_low') : l <= 6 ? t('stats.stress_medium') : t('stats.stress_high');
    }
    if (latestStress) {
      return latestStress.stressLevel === 'LOW' ? t('stats.stress_low')
        : latestStress.stressLevel === 'MEDIUM' ? t('stats.stress_medium')
        : t('stats.stress_high');
    }
    if (!localStats.avgStressLevel) return t('common.noData');
    const l = localStats.avgStressLevel;
    return l <= 4 ? t('stats.stress_low') : l <= 6 ? t('stats.stress_medium') : t('stats.stress_high');
  }, [localStats.avgStressLevel, stressAnalysis, latestStress, t]);

  const sleepTrendRaw = sleepAnalysis?.sleepTrend ?? 'stable';
  const sleepTrendLabel = sleepTrendRaw === 'improving'
    ? t('stats.trend_improving')
    : sleepTrendRaw === 'declining' ? t('stats.trend_declining')
    : t('stats.trend_stable');

  const stressTrendRaw = stressAnalysis?.stressTrend ?? 'stable';
  const stressTrendLabel = stressTrendRaw === 'improving'
    ? t('stats.trend_improving')
    : stressTrendRaw === 'worsening' ? t('stats.trend_worsening')
    : t('stats.trend_stable');

  const onRefresh = React.useCallback(async () => {
    setIsRefreshing(true);
    try { await refreshAnalytics(); } finally { setIsRefreshing(false); }
  }, [refreshAnalytics]);

  const weeklyTargetProgress = React.useMemo(() => {
    const avg = sleepAnalysis?.averageSleepHours ?? localStats.avgSleepHours ?? 0;
    return computeSleepScore(avg);
  }, [sleepAnalysis, localStats.avgSleepHours]);

  // The `recent7.length === 0` guard below skips the chart entirely. We still
  // coerce sleepHours to ≥ 0.01 because chart-kit (LineChart) chokes when every
  // data-point is exactly 0 — the y-axis collapses and bezier curves NaN.
  const sleepChartData = React.useMemo(
    () => [...Array(7)].map((_, i) => Math.max(recent7[6 - i]?.sleepHours ?? 0, 0.01)),
    [recent7],
  );

  const stressChartData = React.useMemo(
    () => [...Array(7)].map((_, i) => recent7[6 - i]?.stressLevel ?? 0),
    [recent7],
  );

  // chart-kit accepts hex/rgb in `color` but expects a function returning rgba-ish string.
  // Brand tokens stay literal here — chart-kit doesn't support our token system natively.
  const chartConfig = React.useMemo(() => ({
    backgroundColor: 'transparent',
    backgroundGradientFrom: Brand.surface,
    backgroundGradientTo: Brand.surface,
    decimalPlaces: 1,
    color: () => Brand.accent,
    labelColor: () => Brand.textSecondary,
    propsForDots: { r: '4', strokeWidth: '2', stroke: Brand.accent },
    propsForBackgroundLines: { stroke: Brand.borderSoft, strokeDasharray: '4,4' },
  }), []);

  const stressChartConfig = React.useMemo(() => ({
    ...chartConfig,
    decimalPlaces: 0,
    color: () => Brand.flame,
    barPercentage: 0.55,
  }), [chartConfig]);

  const days = tArray('stats.days');
  const totalEntries = localStats.count || sleepAnalysis?.totalEntries || 0;

  // Status pill state — analyticsLoading > analyticsOffline > online
  const status: { tone: 'good' | 'warn' | 'bad'; label: string } = analyticsLoading
    ? { tone: 'warn', label: t('common.loading') }
    : analyticsOffline
      ? { tone: 'bad',  label: t('home.offline') }
      : { tone: 'good', label: t('stats.current') };

  return (
    <View style={styles.screen}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: Brand.background }}>
        <View style={styles.header}>
          <ThemedText style={styles.headerTitle}>{t('stats.title')}</ThemedText>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={Brand.accent}
            colors={[Brand.accent]}
            progressBackgroundColor={Brand.surface}
          />
        }
      >
        {/* ── Score hero ─────────────────────────────────────────── */}
        <Animated.View entering={FadeInUp.duration(350)}>
          <Card variant="bordered" animated={false}>
            <View style={styles.scoreCardInner}>
              <ThemedText style={styles.scoreLabel}>{t('stats.sleepScore')}</ThemedText>
              <SleepScoreArc score={sleepQualityPercentage} size={130} />
              <ThemedText
                style={[
                  styles.scoreCaption,
                  { color: scoreColor(sleepQualityPercentage) },
                ]}
              >
                {sleepQualityPercentage >= 80
                  ? t('stats.scoreCaption_high')
                  : sleepQualityPercentage >= 60
                    ? t('stats.scoreCaption_mid')
                    : t('stats.scoreCaption_low')}
              </ThemedText>
            </View>
          </Card>
        </Animated.View>

        {/* ── Analytics status ───────────────────────────────────── */}
        <Animated.View entering={FadeInUp.delay(60).duration(350)}>
          <Card variant="bordered" animated={false}>
            <View style={styles.analyticsHeader}>
              <ThemedText style={styles.analyticsTitle}>{t('stats.analytics')}</ThemedText>
              <StatusPill tone={status.tone} label={status.label} />
            </View>
            {analyticsLoading ? (
              <View style={{ gap: 8, marginTop: 4 }}>
                <SkeletonBox height={12} width="60%" />
                <SkeletonBox height={8} />
              </View>
            ) : (
              <>
                <ThemedText style={styles.analyticsMeta}>
                  {t('stats.weeklyGoal').replace('{{pct}}', String(weeklyTargetProgress)).replace('{{hours}}', '8')}
                </ThemedText>
                <AnimatedProgressBar
                  progress={weeklyTargetProgress}
                  color={weeklyTargetProgress >= 85 ? Brand.good : Brand.warn}
                />
              </>
            )}
            <Pressable onPress={onRefresh} style={styles.refreshHit} hitSlop={6}>
              <ThemedText style={styles.refreshLink}>{t('stats.updateAnalytics')}</ThemedText>
            </Pressable>
          </Card>
        </Animated.View>

        {/* ── Sleep stats ────────────────────────────────────────── */}
        <SectionHeader title={t('stats.mySleepStats')} />
        <Card variant="flat" animated={false} style={styles.cardPad}>
          <StatRow
            icon="Moon"
            iconColor={Brand.accent}
            label={t('stats.avgSleep')}
            value={sleepAnalysis?.averageSleepHours
              ? formatSleepHours(sleepAnalysis.averageSleepHours)
              : localStats.avgSleepHours
                ? `${localStats.avgSleepHours}h`
                : t('common.noData')}
          />
          <StatRow icon="Moon" iconColor={Brand.info} label={t('stats.deepSleep')} value={avgDeepSleep} />
          <StatRow icon="Sparkles" iconColor={Brand.good} label={t('stats.remPhase')} value={avgRemSleep} />
          <StatRow icon="Heart" iconColor="#ff6b6b" label={t('stats.stressLevel')} value={stressLabel} />
          <StatRow
            icon="Pulse"
            iconColor={Brand.flame}
            label={t('stats.heartRate')}
            value={latestStress?.hrvScore != null ? String(Math.round(latestStress.hrvScore)) : t('common.noData')}
            isLast
          />
        </Card>

        {/* ── Weekly overview ───────────────────────────────────── */}
        <SectionHeader title={t('stats.weeklyOverview')} />
        <Card variant="bordered" animated={false}>
          <View style={styles.weekGrid}>
            {days.slice(1).concat(days.slice(0, 1)).map((day, index) => {
              const entry = recent7[6 - index];
              const filled = !!entry;
              const dotColor = filled
                ? entry.sleepHours >= 7 ? Brand.good : Brand.warn
                : Brand.surfaceElevated;
              return (
                <View key={`${day}-${index}`} style={styles.weekDay}>
                  <ThemedText style={styles.weekDayLabel} numberOfLines={1}>{day}</ThemedText>
                  <View
                    style={[
                      styles.weekDayIndicator,
                      {
                        backgroundColor: dotColor,
                        borderColor: filled ? tonalBorder(dotColor) : Brand.border,
                      },
                    ]}
                  />
                  <ThemedText style={[styles.weekDayValue, !filled && { color: Brand.textMuted }]}>
                    {filled ? `${entry.sleepHours}h` : '—'}
                  </ThemedText>
                </View>
              );
            })}
          </View>
        </Card>

        {/* ── Sleep trend chart ─────────────────────────────────── */}
        <SectionHeader title={t('stats.lastWeek')} />
        <Card variant="bordered" animated={false}>
          {recent7.length === 0 ? (
            <View style={styles.emptyChart}>
              <Ico.ChartBar size={32} color={Brand.textMuted} />
              <ThemedText style={styles.emptyChartText}>{t('common.noData')}</ThemedText>
            </View>
          ) : (
            <View style={styles.chartContainer}>
              <LineChart
                data={{
                  labels: getLast7DayLabels(days),
                  datasets: [{ data: sleepChartData, color: () => Brand.accent, strokeWidth: 3 }],
                }}
                width={chartWidth}
                height={170}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
                withInnerLines
                withOuterLines={false}
              />
            </View>
          )}
        </Card>

        {/* ── Stress chart ──────────────────────────────────────── */}
        <SectionHeader title={t('stats.stressDynamics')} />
        <Card variant="bordered" animated={false}>
          {recent7.length === 0 ? (
            <View style={styles.emptyChart}>
              <Ico.Pulse size={32} color={Brand.textMuted} />
              <ThemedText style={styles.emptyChartText}>{t('common.noData')}</ThemedText>
            </View>
          ) : (
            <View style={styles.chartContainer}>
              <BarChart
                data={{ labels: getLast7DayLabels(days), datasets: [{ data: stressChartData }] }}
                width={chartWidth}
                height={160}
                chartConfig={stressChartConfig}
                style={styles.chart}
                withInnerLines
                showValuesOnTopOfBars
                fromZero
                yAxisSuffix=""
                yAxisLabel=""
              />
            </View>
          )}
        </Card>

        {/* ── Trends ────────────────────────────────────────────── */}
        <SectionHeader title={t('stats.sleepTrend')} />
        <Card variant="flat" animated={false} style={styles.cardPad}>
          <View style={styles.trendRowOuter}>
            <TrendRow label={t('stats.avgSleep')} raw={sleepTrendRaw} valueLabel={sleepTrendLabel} />
          </View>
          {stressAnalysis ? (
            <View style={[styles.trendRowOuter, styles.statRowDivider]}>
              <TrendRow label={t('stats.stressLevel')} raw={stressTrendRaw} valueLabel={stressTrendLabel} />
            </View>
          ) : null}
        </Card>

        {/* ── AI insights ──────────────────────────────────────── */}
        <SectionHeader title={t('stats.aiInsights')} />
        <Card variant="bordered" animated={false}>
          {sleepAnalysis?.insights?.slice(0, 2).map((insight, i) => (
            <View key={`sl-${i}`} style={styles.insightItem}>
              <View style={[
                styles.insightIcon,
                { backgroundColor: tonal(i === 0 ? Brand.good : Brand.warn), borderColor: tonalBorder(i === 0 ? Brand.good : Brand.warn) },
              ]}>
                {i === 0 ? <Ico.ArrowUp size={14} color={Brand.good} /> : <Ico.Star size={14} color={Brand.warn} />}
              </View>
              <ThemedText style={styles.insightText}>{insight}</ThemedText>
            </View>
          ))}
          {stressAnalysis?.insights?.slice(0, 1).map((insight, i) => (
            <View key={`st-${i}`} style={styles.insightItem}>
              <View style={[styles.insightIcon, { backgroundColor: tonal('#ff6b6b'), borderColor: tonalBorder('#ff6b6b') }]}>
                <Ico.Heart size={14} color="#ff6b6b" />
              </View>
              <ThemedText style={styles.insightText}>{insight}</ThemedText>
            </View>
          ))}
          <View style={styles.insightItem}>
            <View style={[styles.insightIcon, { backgroundColor: tonal(Brand.accent), borderColor: tonalBorder(Brand.accent) }]}>
              <Ico.Sparkles size={14} color={Brand.accent} />
            </View>
            <ThemedText style={styles.insightText}>
              {t('stats.journalEntries').replace('{{n}}', String(totalEntries))}
            </ThemedText>
          </View>
        </Card>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.background },

  // Header
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 8,
    paddingBottom: 12,
    alignItems: 'center',
  },
  headerTitle: { ...Type.titleL, color: Brand.textPrimary },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.md, paddingBottom: 32 },

  // Score hero
  scoreCardInner: { alignItems: 'center', paddingVertical: 8 },
  scoreLabel: { ...Type.section, color: Brand.textMuted },
  scoreNumber: { ...Type.monoL, fontSize: 38, lineHeight: 42, fontWeight: '700' },
  scoreUnit: { ...Type.monoS, color: Brand.textMuted, marginTop: -2, fontSize: 11 },
  scoreCaption: { ...Type.bodyS, fontSize: 12, fontWeight: '600', marginTop: 6 },

  // Analytics card
  analyticsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  analyticsTitle: { ...Type.titleS, color: Brand.textPrimary },
  analyticsMeta: { ...Type.bodyS, color: Brand.textSecondary, marginBottom: 10, fontSize: 12 },
  targetTrack: { width: '100%', height: 6, borderRadius: 999, overflow: 'hidden', backgroundColor: Brand.borderSoft },
  targetBar: { height: '100%', borderRadius: 999 },
  refreshHit: { paddingVertical: 8, marginTop: 6, alignSelf: 'flex-start' },
  refreshLink: { ...Type.bodyS, color: Brand.accent, fontSize: 13, fontWeight: '600' },

  // Status pill
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusPillText: { ...Type.monoS, fontSize: 10, letterSpacing: 0.6 },

  // Stat row
  cardPad: { padding: 0, gap: 0 },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: Spacing.hitArea,
    gap: 12,
  },
  statRowDivider: { borderBottomWidth: 1, borderBottomColor: Brand.borderSoft },
  statRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  iconChip: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: { ...Type.bodyM, color: Brand.textPrimary, fontSize: 14, fontWeight: '500', flex: 1 },
  statRowValue: { ...Type.monoM, color: Brand.textPrimary, flexShrink: 0, marginLeft: 8 },

  // Weekly overview
  weekGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  weekDay: { alignItems: 'center', gap: 6, flex: 1 },
  weekDayLabel: { ...Type.section, color: Brand.textMuted, fontSize: 10 },
  weekDayIndicator: { width: 9, height: 9, borderRadius: 5, borderWidth: 1 },
  weekDayValue: { ...Type.monoS, color: Brand.textPrimary, fontSize: 11 },

  // Charts
  chartContainer: { marginHorizontal: -8, alignItems: 'center', overflow: 'hidden' },
  chart: { borderRadius: 12, marginVertical: 4 },
  emptyChart: { alignItems: 'center', paddingVertical: 28, gap: 10 },
  emptyChartText: { ...Type.bodyS, color: Brand.textMuted, fontSize: 12 },

  // Trends
  trendRowOuter: { paddingHorizontal: 16 },
  trendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    minHeight: Spacing.hitArea,
  },
  trendLabel: { ...Type.bodyM, color: Brand.textPrimary, fontSize: 14, fontWeight: '500' },
  trendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  trendPillText: { ...Type.monoS, fontSize: 10, letterSpacing: 0.4 },

  // Insights
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 8,
  },
  insightIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  insightText: { ...Type.bodyS, color: Brand.textSecondary, fontSize: 13, flex: 1, lineHeight: 19 },
});
