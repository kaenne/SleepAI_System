import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import {
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { BarChart, LineChart } from 'react-native-chart-kit';
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Spacing } from '@/constants/theme';
import { useTranslation } from '@/contexts/i18n-context';
import { useAnalytics, formatSleepHours, getTrendIcon, getTrendColor } from '@/hooks/use-analytics';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSleepJournal } from '@/hooks/use-sleep-journal';
import { useStressMonitor, getStressEmoji } from '@/hooks/use-stress-monitor';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function getLast7DayLabels(days: string[]): string[] {
  return [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return days[d.getDay()];
  });
}

// Animated sleep score arc — dashes fill from 0 to score on mount
function SleepScoreArc({ score, size = 120 }: { score: number; size?: number }) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcLength = Math.PI * radius; // half circle
  const dashOffset = circumference * 0.25;

  const progress = useSharedValue(0);

  React.useEffect(() => {
    progress.value = withTiming(Math.min(100, Math.max(0, score)) / 100, {
      duration: 1200,
      easing: Easing.out(Easing.cubic),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score]);

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

  const scoreColor = score >= 80 ? '#4ADE80' : score >= 60 ? '#FBBF24' : '#F87171';

  return (
    <View style={{ width: size, height: size / 2 + 24, alignItems: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', top: 0 }}>
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
          animatedProps={trackProps}
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={scoreColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
          animatedProps={fillProps}
        />
      </Svg>
      <View style={{ position: 'absolute', top: size / 2 - 8, alignItems: 'center' }}>
        <ThemedText style={{ fontSize: 26, fontWeight: '800', color: '#FFFFFF' }}>
          {score}
        </ThemedText>
        <ThemedText style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: -2 }}>
          / 100
        </ThemedText>
      </View>
    </View>
  );
}

// Animated progress bar
function AnimatedProgressBar({
  progress: targetProgress,
  color,
  trackColor,
}: {
  progress: number;
  color: string;
  trackColor: string;
}) {
  const width = useSharedValue(0);

  React.useEffect(() => {
    width.value = withTiming(targetProgress, { duration: 900, easing: Easing.out(Easing.cubic) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetProgress]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${width.value}%` as any,
  }));

  return (
    <View style={[styles.targetTrack, { backgroundColor: trackColor }]}>
      <Animated.View style={[styles.targetBar, { backgroundColor: color }, barStyle]} />
    </View>
  );
}

// Skeleton placeholder for loading state
function SkeletonBox({ height = 16, width = '100%', style }: { height?: number; width?: number | string; style?: any }) {
  const opacity = useSharedValue(0.4);

  React.useEffect(() => {
    opacity.value = withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) });
    const interval = setInterval(() => {
      opacity.value = withTiming(0.4, { duration: 700 });
      setTimeout(() => {
        opacity.value = withTiming(1, { duration: 700 });
      }, 700);
    }, 1400);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        { height, width, borderRadius: 8, backgroundColor: '#CBD5E1' },
        animStyle,
        style,
      ]}
    />
  );
}

function StatRow({
  icon, iconColor, label, value, colors,
}: {
  icon: string;
  iconColor: string;
  label: string;
  value: string;
  colors: typeof Colors.light;
}) {
  return (
    <View style={[styles.statRow, { borderBottomColor: colors.cardBorder }]}>
      <View style={styles.statRowLeft}>
        <View style={[styles.statIcon, { backgroundColor: iconColor + '20' }]}>
          <IconSymbol name={icon as any} size={18} color={iconColor} />
        </View>
        <ThemedText style={styles.statLabel} numberOfLines={1}>{label}</ThemedText>
      </View>
      <ThemedText style={[styles.statRowValue, { color: colors.text }]} numberOfLines={1}>
        {value}
      </ThemedText>
    </View>
  );
}

export default function StatsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { width: screenW } = useWindowDimensions();
  const chartWidth = screenW - 48 - 16; // padding + card inner

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
  const { t } = useTranslation();

  const sleepQualityPercentage = React.useMemo(() => {
    if (sleepAnalysis?.averageQuality) return Math.round(sleepAnalysis.averageQuality);
    if (!localStats.avgSleepHours) return 0;
    return Math.min(100, Math.round((localStats.avgSleepHours / 8) * 100));
  }, [localStats.avgSleepHours, sleepAnalysis]);

  const recent7 = entries.slice(0, 7);

  const avgDeepSleep = React.useMemo(() => {
    if (recent7.length === 0) return '--';
    const avg = recent7.reduce((s, e) => s + e.sleepHours * 0.4, 0) / recent7.length;
    return `${Math.floor(avg)}h ${Math.round((avg - Math.floor(avg)) * 60)}m`;
  }, [recent7]);

  const avgRemSleep = React.useMemo(() => {
    if (recent7.length === 0) return '--';
    const avg = recent7.reduce((s, e) => s + e.sleepHours * 0.25, 0) / recent7.length;
    return `${Math.floor(avg)}h ${Math.round((avg - Math.floor(avg)) * 60)}m`;
  }, [recent7]);

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
    const l = localStats.avgStressLevel ?? 0;
    return l <= 4 ? t('stats.stress_low') : l <= 6 ? t('stats.stress_medium') : t('stats.stress_high');
  }, [localStats.avgStressLevel, stressAnalysis, latestStress, t]);

  const sleepTrend = React.useMemo(() => {
    const raw = sleepAnalysis?.sleepTrend ?? 'stable';
    return {
      raw,
      label: raw === 'improving' ? t('stats.trend_improving') : raw === 'declining' ? t('stats.trend_declining') : t('stats.trend_stable'),
      icon: getTrendIcon(raw),
      color: getTrendColor(raw),
    };
  }, [sleepAnalysis, t]);

  const onRefresh = React.useCallback(async () => {
    setIsRefreshing(true);
    try { await refreshAnalytics(); } finally { setIsRefreshing(false); }
  }, [refreshAnalytics]);

  const weeklyTargetProgress = React.useMemo(() => {
    const avg = sleepAnalysis?.averageSleepHours ?? localStats.avgSleepHours ?? 0;
    return Math.max(0, Math.min(100, Math.round((avg / 8) * 100)));
  }, [sleepAnalysis, localStats.avgSleepHours]);

  // Safe chart data — react-native-chart-kit crashes on all-zero or empty arrays
  const sleepChartData = React.useMemo(() => {
    const raw = [...Array(7)].map((_, i) => recent7[6 - i]?.sleepHours ?? 0);
    const hasData = raw.some(v => v > 0);
    return hasData ? raw.map(v => Math.max(v, 0.01)) : [0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01];
  }, [recent7]);

  const stressChartData = React.useMemo(() => {
    const raw = [...Array(7)].map((_, i) => recent7[6 - i]?.stressLevel ?? 0);
    const hasData = raw.some(v => v > 0);
    return hasData ? raw.map(v => Math.max(v, 0)) : [0, 0, 0, 0, 0, 0, 0];
  }, [recent7]);

  const chartConfig = React.useMemo(() => ({
    backgroundColor: 'transparent',
    backgroundGradientFrom: colors.cardBackground,
    backgroundGradientTo: colors.cardBackground,
    decimalPlaces: 1,
    color: () => colors.tint,
    labelColor: () => colors.textSecondary,
    propsForDots: { r: '5', strokeWidth: '2', stroke: colors.tint },
    propsForBackgroundLines: { stroke: colors.cardBorder, strokeDasharray: '5,5' },
  }), [colors]);

  const stressChartConfig = React.useMemo(() => ({
    ...chartConfig,
    decimalPlaces: 0,
    color: () => colors.accent,
    barPercentage: 0.6,
  }), [chartConfig, colors.accent]);

  const days = t('stats.days') as unknown as string[];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientMid, colors.headerGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <Animated.View entering={FadeInDown.duration(500)} style={styles.headerContent}>
            <ThemedText style={styles.headerTitle}>{t('stats.title')}</ThemedText>
            <SleepScoreArc score={sleepQualityPercentage} size={130} />
            <ThemedText style={styles.headerSubtitle}>{t('stats.sleepScore')}</ThemedText>
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
      >
        {/* Analytics card */}
        <Animated.View entering={FadeInUp.delay(70).duration(350)}>
          <Card variant="default">
            <View style={styles.analyticsHeaderRow}>
              <ThemedText type="subtitle">{t('stats.analytics')}</ThemedText>
              <Badge
                label={analyticsLoading ? t('common.loading') : analyticsOffline ? t('home.offline') : t('stats.current')}
                variant={analyticsLoading ? 'warning' : analyticsOffline ? 'danger' : 'success'}
                size="sm"
                animated={false}
              />
            </View>
            {analyticsLoading ? (
              <View style={{ gap: 8 }}>
                <SkeletonBox height={13} width="70%" />
                <SkeletonBox height={10} />
              </View>
            ) : (
              <>
                <ThemedText style={styles.analyticsMeta}>
                  {t('stats.weeklyGoal').replace('{{pct}}', String(weeklyTargetProgress)).replace('{{hours}}', '8')}
                </ThemedText>
                <AnimatedProgressBar
                  progress={weeklyTargetProgress}
                  color={weeklyTargetProgress >= 85 ? colors.success : colors.warning}
                  trackColor={colors.cardBorder}
                />
              </>
            )}
            <Pressable onPress={onRefresh}>
              <ThemedText style={[styles.refreshLink, { color: colors.tint }]}>{t('stats.updateAnalytics')}</ThemedText>
            </Pressable>
          </Card>
        </Animated.View>

        {/* Sleep stats */}
        <Animated.View entering={FadeInUp.delay(110).duration(400)}>
          <Card variant="elevated">
            <ThemedText type="subtitle">{t('stats.mySleepStats')}</ThemedText>
            <StatRow icon="moon.fill" iconColor={colors.tint} label={t('stats.avgSleep')}
              value={sleepAnalysis?.averageSleepHours ? formatSleepHours(sleepAnalysis.averageSleepHours) : localStats.avgSleepHours ? `${localStats.avgSleepHours}h` : '7h 42m'}
              colors={colors} />
            <StatRow icon="moon.zzz.fill" iconColor={colors.deepSleep} label={t('stats.deepSleep')} value={avgDeepSleep} colors={colors} />
            <StatRow icon="brain.head.profile" iconColor={colors.remSleep} label={t('stats.remPhase')} value={avgRemSleep} colors={colors} />
            <StatRow icon="heart.fill" iconColor={colors.danger} label={t('stats.stressLevel')}
              value={`${stressLabel} ${latestStress ? getStressEmoji(latestStress.stressLevel) : ''}`.trim()}
              colors={colors} />
            <StatRow icon="waveform.path.ecg" iconColor={colors.heartRate} label={t('stats.heartRate')}
              value={latestStress?.hrvScore != null ? String(latestStress.hrvScore) : '--'}
              colors={colors} />
          </Card>
        </Animated.View>

        {/* Weekly overview */}
        <Animated.View entering={FadeInUp.delay(200).duration(400)}>
          <Card variant="default">
            <ThemedText type="subtitle">{t('stats.weeklyOverview')}</ThemedText>
            <View style={styles.weekGrid}>
              {days.slice(1).concat(days.slice(0, 1)).map((day, index) => {
                const entry = recent7[6 - index];
                return (
                  <View key={`${day}-${index}`} style={styles.weekDay}>
                    <ThemedText style={styles.weekDayLabel} numberOfLines={1}>{day}</ThemedText>
                    <View style={[styles.weekDayIndicator, {
                      backgroundColor: entry
                        ? entry.sleepHours >= 7 ? colors.success : colors.warning
                        : colors.cardBorder,
                    }]} />
                    <ThemedText style={styles.weekDayValue}>
                      {entry ? `${entry.sleepHours}h` : '-'}
                    </ThemedText>
                  </View>
                );
              })}
            </View>
          </Card>
        </Animated.View>

        {/* Sleep trend chart */}
        <Animated.View entering={FadeInUp.delay(250).duration(400)}>
          <Card variant="elevated">
            <View style={styles.chartTitleRow}>
              <ThemedText type="subtitle">{t('stats.lastWeek')}</ThemedText>
            </View>
            {recent7.length === 0 ? (
              <View style={styles.emptyChart}>
                <IconSymbol name="chart.line.uptrend.xyaxis" size={40} color={colors.tint} />
                <ThemedText style={[styles.emptyChartText, { color: colors.textSecondary }]}>{t('common.noData')}</ThemedText>
              </View>
            ) : (
              <View style={styles.chartContainer}>
                <LineChart
                  data={{ labels: getLast7DayLabels(days), datasets: [{ data: sleepChartData, color: () => colors.tint, strokeWidth: 3 }] }}
                  width={chartWidth}
                  height={180}
                  chartConfig={chartConfig}
                  bezier
                  style={styles.chart}
                  withInnerLines
                  withOuterLines={false}
                />
              </View>
            )}
          </Card>
        </Animated.View>

        {/* Stress chart */}
        <Animated.View entering={FadeInUp.delay(280).duration(400)}>
          <Card variant="elevated">
            <View style={styles.chartTitleRow}>
              <ThemedText type="subtitle">{t('stats.stressDynamics')}</ThemedText>
            </View>
            {recent7.length === 0 ? (
              <View style={styles.emptyChart}>
                <IconSymbol name="waveform.path.ecg" size={40} color={colors.accent} />
                <ThemedText style={[styles.emptyChartText, { color: colors.textSecondary }]}>{t('common.noData')}</ThemedText>
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
        </Animated.View>

        {/* Trends */}
        <Animated.View entering={FadeInUp.delay(290).duration(400)}>
          <Card variant="default">
            <View style={styles.trendRow}>
              <ThemedText type="subtitle">{sleepTrend.icon} {t('stats.sleepTrend')}</ThemedText>
              <Badge
                label={sleepTrend.label}
                variant={sleepTrend.raw === 'improving' ? 'success' : sleepTrend.raw === 'declining' ? 'danger' : 'warning'}
              />
            </View>
            {stressAnalysis && (
              <View style={styles.trendRow}>
                <ThemedText type="subtitle">{getTrendIcon(stressAnalysis.stressTrend)} {t('stats.stressTrend')}</ThemedText>
                <Badge
                  label={stressAnalysis.stressTrend === 'improving' ? t('stats.trend_improving') : stressAnalysis.stressTrend === 'worsening' ? t('stats.trend_worsening') : t('stats.trend_stable')}
                  variant={stressAnalysis.stressTrend === 'improving' ? 'success' : stressAnalysis.stressTrend === 'worsening' ? 'danger' : 'warning'}
                />
              </View>
            )}
          </Card>
        </Animated.View>

        {/* Insights */}
        <Animated.View entering={FadeInUp.delay(300).duration(400)}>
          <Card variant="outlined">
            <ThemedText type="subtitle">{t('stats.aiInsights')}</ThemedText>
            {sleepAnalysis?.insights?.slice(0, 2).map((insight, i) => (
              <View key={`sl-${i}`} style={styles.insightItem}>
                <IconSymbol name={i === 0 ? 'arrow.up.circle.fill' : 'star.fill'} size={20} color={i === 0 ? colors.success : colors.warning} />
                <ThemedText style={styles.insightText}>{insight}</ThemedText>
              </View>
            ))}
            {stressAnalysis?.insights?.slice(0, 1).map((insight, i) => (
              <View key={`st-${i}`} style={styles.insightItem}>
                <IconSymbol name="heart.fill" size={20} color={colors.danger} />
                <ThemedText style={styles.insightText}>{insight}</ThemedText>
              </View>
            ))}
            <View style={styles.insightItem}>
              <IconSymbol name="target" size={20} color={colors.tint} />
              <ThemedText style={styles.insightText}>
                {t('stats.journalEntries').replace('{{n}}', String(localStats.count || sleepAnalysis?.totalEntries || 0))}
              </ThemedText>
            </View>
          </Card>
        </Animated.View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 12,
    paddingBottom: 20,
    paddingHorizontal: Spacing.lg,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  headerContent: { paddingTop: 16, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginBottom: 2 },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 12, marginTop: 4 },
  scrollView: { flex: 1 },
  scrollContent: { padding: Spacing.md, gap: Spacing.md },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  statRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: 15, fontWeight: '500', flex: 1 },
  statRowValue: { fontSize: 15, fontWeight: '600', flexShrink: 0, marginLeft: 8 },
  weekGrid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  weekDay: { alignItems: 'center', gap: 6 },
  weekDayLabel: { fontSize: 11, fontWeight: '600', opacity: 0.6 },
  weekDayIndicator: { width: 8, height: 8, borderRadius: 4 },
  weekDayValue: { fontSize: 12, fontWeight: '500' },
  chartContainer: { marginTop: 12, marginHorizontal: -8, alignItems: 'center', overflow: 'hidden' },
  chart: { borderRadius: 12 },
  analyticsHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  analyticsMeta: { fontSize: 13, opacity: 0.8, marginBottom: 10 },
  targetTrack: { width: '100%', height: 10, borderRadius: 999, overflow: 'hidden', marginBottom: 10 },
  targetBar: { height: '100%', borderRadius: 999 },
  refreshLink: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  insightItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8 },
  insightText: { fontSize: 14, flex: 1, lineHeight: 20 },
  trendRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  chartTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sampleLabel: { fontSize: 11, fontWeight: '500', opacity: 0.6, fontStyle: 'italic' },
  emptyChart: { alignItems: 'center', paddingVertical: 32, gap: 12 },
  emptyChartText: { fontSize: 13, textAlign: 'center', maxWidth: 260, lineHeight: 20 },
});
