import { LinearGradient } from "expo-linear-gradient";
import * as React from "react";
import {
    Dimensions,
  Pressable,
  RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import { BarChart, LineChart } from "react-native-chart-kit";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

import { ThemedText } from "@/components/themed-text";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors, Spacing } from "@/constants/theme";
import { useAnalytics, formatSleepHours, getTrendIcon, getTrendColor } from "@/hooks/use-analytics";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useStressMonitor, getStressEmoji } from "@/hooks/use-stress-monitor";
import { useSleepJournal } from "@/hooks/use-sleep-journal";

const screenWidth = Dimensions.get("window").width - 48; // padding

// Circular Progress Component
function CircularProgress({
  percentage,
  size = 160,
  strokeWidth = 12,
  color,
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg
        width={size}
        height={size}
        style={{ transform: [{ rotate: "-90deg" }] }}
      >
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.2)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </Svg>
      <View
        style={[
          StyleSheet.absoluteFill,
          { alignItems: "center", justifyContent: "center" },
        ]}
      >
        <Badge
          label="😴 Качество сна"
          variant="success"
          size="sm"
          animated={false}
        />
        <ThemedText style={styles.progressText}>{percentage}%</ThemedText>
        <ThemedText style={styles.progressSubtext}>отдохнувший</ThemedText>
      </View>
    </View>
  );
}

// Stat Row Component
function StatRow({
  icon,
  iconColor,
  label,
  value,
  colors,
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
        <View style={[styles.statIcon, { backgroundColor: iconColor + "20" }]}>
          <IconSymbol name={icon as any} size={18} color={iconColor} />
        </View>
        <ThemedText style={styles.statLabel}>{label}</ThemedText>
      </View>
      <ThemedText style={[styles.statRowValue, { color: colors.text }]}>
        {value}
      </ThemedText>
    </View>
  );
}

export default function СтатистикаScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const { entries, stats: Статистика } = useSleepJournal();
  const { sleep: sleepAnalysis, stress: stressAnalysis, isLoading: analyticsLoading, refresh: refreshAnalytics } = useAnalytics();
  const { latestStress } = useStressMonitor();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Calculate sleep quality percentage
  const sleepQualityPercentage = React.useMemo(() => {
    if (sleepAnalysis?.averageQuality) return Math.round(sleepAnalysis.averageQuality);
    if (!Статистика.avgSleepHours) return 75;
    // 8 hours = 100%, scale accordingly
    return Math.min(100, Math.round((Статистика.avgSleepHours / 8) * 100));
  }, [Статистика.avgSleepHours, sleepAnalysis]);

  // Calculate recent Статистика
  const recent7 = entries.slice(0, 7);
  const avgDeepSleep = React.useMemo(() => {
    if (recent7.length === 0) return "3h 10m";
    const avg =
      recent7.reduce((s, e) => s + e.sleepHours * 0.4, 0) / recent7.length;
    const hours = Math.floor(avg);
    const mins = Math.round((avg - hours) * 60);
    return `${hours}h ${mins}m`;
  }, [recent7]);

  const avgRemSleep = React.useMemo(() => {
    if (recent7.length === 0) return "2h 00m";
    const avg =
      recent7.reduce((s, e) => s + e.sleepHours * 0.25, 0) / recent7.length;
    const hours = Math.floor(avg);
    const mins = Math.round((avg - hours) * 60);
    return `${hours}h ${mins}m`;
  }, [recent7]);

  const stressLabel = React.useMemo(() => {
    // Use stress analysis data if available
    if (stressAnalysis?.averageStressLevel != null) {
      const level = stressAnalysis.averageStressLevel;
      if (level <= 4) return "Low 😊";
      if (level <= 6) return "Medium 😐";
      return "High 😰";
    }
    // Fallback to latest stress or journal Статистика
    if (latestStress) {
      return `${latestStress.stressLevel === 'LOW' ? 'Low 😊' : latestStress.stressLevel === 'MEDIUM' ? 'Medium 😐' : 'High 😰'}`;
    }
    if (!Статистика.avgStressLevel) return "Low 😊";
    if (Статистика.avgStressLevel <= 4) return "Low 😊";
    if (Статистика.avgStressLevel <= 6) return "Medium 😐";
    return "High 😰";
  }, [Статистика.avgStressLevel, stressAnalysis, latestStress]);

  // Get sleep trend
  const sleepTrend = React.useMemo(() => {
    if (sleepAnalysis?.sleepTrend) {
      return {
        label: sleepAnalysis.sleepTrend === 'improving' ? 'Improving' : sleepAnalysis.sleepTrend === 'declining' ? 'Declining' : 'Stable',
        icon: getTrendIcon(sleepAnalysis.sleepTrend),
        color: getTrendColor(sleepAnalysis.sleepTrend),
      };
    }
    return { label: 'Stable', icon: '➡️', color: '#FF9800' };
  }, [sleepAnalysis]);

  const onRefresh = React.useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshAnalytics();
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshAnalytics]);

  const weeklyTargetProgress = React.useMemo(() => {
    const avg = sleepAnalysis?.averageSleepHours ?? Статистика.avgSleepHours ?? 0;
    return Math.max(0, Math.min(100, Math.round((avg / 8) * 100)));
  }, [sleepAnalysis, Статистика.avgSleepHours]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Gradient Header with Circle Progress */}
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <Animated.View
            entering={FadeInDown.duration(500)}
            style={styles.headerContent}
          >
            <ThemedText style={styles.headerTitle}>
              🌙 Обзор вашего сна
            </ThemedText>
            <ThemedText style={styles.headerSubtitle}>
              {"Ваша ежедневная сводка здоровья 🌙"}
            </ThemedText>

            <View style={styles.circleContainer}>
              <CircularProgress
                percentage={sleepQualityPercentage}
                color={colors.sleepQuality}
                size={180}
                strokeWidth={14}
              />
            </View>
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.tint}
          />
        }
      >
        <Animated.View entering={FadeInUp.delay(70).duration(350)}>
          <Card variant="default">
            <View style={styles.analyticsHeaderRow}>
              <ThemedText type="subtitle">🧠 Статус аналитики</ThemedText>
              <Badge
                label={analyticsLoading ? "Обновление..." : "Актуально"}
                variant={analyticsLoading ? "warning" : "success"}
                size="sm"
                animated={false}
              />
            </View>
            <ThemedText style={styles.analyticsMeta}>
              Недельная цель: {weeklyTargetProgress}% от 8ч
            </ThemedText>
            <View style={[styles.targetTrack, { backgroundColor: colors.cardBorder }]}>
              <View
                style={[
                  styles.targetBar,
                  {
                    width: `${weeklyTargetProgress}%`,
                    backgroundColor:
                      weeklyTargetProgress >= 85 ? colors.success : colors.warning,
                  },
                ]}
              />
            </View>
            <Pressable onPress={onRefresh}>
              <ThemedText style={[styles.refreshLink, { color: colors.tint }]}>Обновить аналитику →</ThemedText>
            </Pressable>
          </Card>
        </Animated.View>

        {/* Sleep Статистика Card */}
        <Animated.View entering={FadeInUp.delay(110).duration(400)}>
          <Card variant="elevated">
            <ThemedText type="subtitle">📊 Ваша статистика сна</ThemedText>

            <StatRow
              icon="moon.fill"
              iconColor={colors.tint}
              label="Средний сон"
              value={
                sleepAnalysis?.averageSleepHours
                  ? formatSleepHours(sleepAnalysis.averageSleepHours)
                  : Статистика.avgSleepHours
                    ? `${Статистика.avgSleepHours}h`
                    : "7h 42m"
              }
              colors={colors}
            />
            <StatRow
              icon="moon.zzz.fill"
              iconColor={colors.deepSleep}
              label="Глубокий сон"
              value={avgDeepSleep}
              colors={colors}
            />
            <StatRow
              icon="brain.head.profile"
              iconColor={colors.remSleep}
              label="REM-фаза"
              value={avgRemSleep}
              colors={colors}
            />
            <StatRow
              icon="heart.fill"
              iconColor={colors.danger}
              label="Уровень стресса"
              value={`${stressLabel} ${latestStress ? getStressEmoji(latestStress.stressLevel) : ""}`.trim()}
              colors={colors}
            />
            <StatRow
              icon="waveform.path.ecg"
              iconColor={colors.heartRate}
              label="Пульс"
              value="68 bpm"
              colors={colors}
            />
          </Card>
        </Animated.View>

        {/* Weekly Overview */}
        <Animated.View entering={FadeInUp.delay(200).duration(400)}>
          <Card variant="default">
            <ThemedText type="subtitle">📅 Недельный обзор</ThemedText>
            <View style={styles.weekGrid}>
              {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map(
                (day, index) => {
                  const entry = recent7[6 - index];
                  const hasData = !!entry;
                  return (
                    <View key={day} style={styles.weekDay}>
                      <ThemedText style={styles.weekDayLabel}>{day}</ThemedText>
                      <View
                        style={[
                          styles.weekDayIndicator,
                          {
                            backgroundColor: hasData
                              ? entry.sleepHours >= 7
                                ? colors.success
                                : colors.warning
                              : colors.cardBorder,
                          },
                        ]}
                      />
                      <ThemedText style={styles.weekDayValue}>
                        {hasData ? `${entry.sleepHours}h` : "-"}
                      </ThemedText>
                    </View>
                  );
                },
              )}
            </View>
          </Card>
        </Animated.View>

        {/* Sleep Trend Chart */}
        <Animated.View entering={FadeInUp.delay(250).duration(400)}>
          <Card variant="elevated">
            <ThemedText type="subtitle">
              📈 Тренд сна (Последние 7 дней)
            </ThemedText>
            <View style={styles.chartContainer}>
              <LineChart
                data={{
                  labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
                  datasets: [
                    {
                      data:
                        recent7.length > 0
                          ? [...Array(7)].map(
                              (_, i) => recent7[6 - i]?.sleepHours || 0,
                            )
                          : [7, 6.5, 8, 7.5, 6, 8.5, 7],
                      color: () => colors.tint,
                      strokeWidth: 3,
                    },
                  ],
                }}
                width={screenWidth - 16}
                height={180}
                chartConfig={{
                  backgroundColor: "transparent",
                  backgroundGradientFrom: colors.cardBackground,
                  backgroundGradientTo: colors.cardBackground,
                  decimalPlaces: 1,
                  color: () => colors.tint,
                  labelColor: () => colors.textSecondary,
                  propsForDots: {
                    r: "5",
                    strokeWidth: "2",
                    stroke: colors.tint,
                  },
                  propsForBackgroundLines: {
                    stroke: colors.cardBorder,
                    strokeDasharray: "5,5",
                  },
                }}
                bezier
                style={styles.chart}
                withInnerLines={true}
                withOuterLines={false}
              />
            </View>
          </Card>
        </Animated.View>

        {/* Stress Level Chart */}
        <Animated.View entering={FadeInUp.delay(280).duration(400)}>
          <Card variant="elevated">
            <ThemedText type="subtitle">😓 Тренд стресса</ThemedText>
            <View style={styles.chartContainer}>
              <BarChart
                data={{
                  labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
                  datasets: [
                    {
                      data:
                        recent7.length > 0
                          ? [...Array(7)].map(
                              (_, i) => recent7[6 - i]?.stressLevel || 0,
                            )
                          : [5, 6, 4, 7, 5, 3, 4],
                    },
                  ],
                }}
                width={screenWidth - 16}
                height={160}
                chartConfig={{
                  backgroundColor: "transparent",
                  backgroundGradientFrom: colors.cardBackground,
                  backgroundGradientTo: colors.cardBackground,
                  decimalPlaces: 0,
                  color: () => colors.accent,
                  labelColor: () => colors.textSecondary,
                  barPercentage: 0.6,
                  propsForBackgroundLines: {
                    stroke: colors.cardBorder,
                    strokeDasharray: "5,5",
                  },
                }}
                style={styles.chart}
                withInnerLines={true}
                showValuesOnTopOfBars={true}
                fromZero
                yAxisSuffix=""
                yAxisLabel=""
              />
            </View>
          </Card>
        </Animated.View>

        {/* Sleep Trend Badge */}
        <Animated.View entering={FadeInUp.delay(290).duration(400)}>
          <Card variant="default">
            <View style={styles.trendRow}>
              <ThemedText type="subtitle">{sleepTrend.icon} Тренд сна</ThemedText>
              <Badge 
                label={sleepTrend.label} 
                variant={sleepTrend.label === 'Improving' ? 'success' : sleepTrend.label === 'Declining' ? 'danger' : 'warning'} 
              />
            </View>
            {stressAnalysis && (
              <View style={styles.trendRow}>
                <ThemedText type="subtitle">{getTrendIcon(stressAnalysis.stressTrend)} Тренд стресса</ThemedText>
                <Badge 
                  label={stressAnalysis.stressTrend === 'improving' ? 'Improving' : stressAnalysis.stressTrend === 'worsening' ? 'Worsening' : 'Stable'} 
                  variant={stressAnalysis.stressTrend === 'improving' ? 'success' : stressAnalysis.stressTrend === 'worsening' ? 'danger' : 'warning'} 
                />
              </View>
            )}
          </Card>
        </Animated.View>

        {/* Insights */}
        <Animated.View entering={FadeInUp.delay(300).duration(400)}>
          <Card variant="outlined">
            <ThemedText type="subtitle">💡 Инсайты ИИ</ThemedText>
            {/* Sleep insights from analytics */}
            {sleepAnalysis?.insights?.slice(0, 2).map((insight, index) => (
              <View key={`sleep-${index}`} style={styles.insightItem}>
                <IconSymbol
                  name={index === 0 ? "arrow.up.circle.fill" : "star.fill"}
                  size={20}
                  color={index === 0 ? colors.success : colors.warning}
                />
                <ThemedText style={styles.insightText}>{insight}</ThemedText>
              </View>
            ))}
            {/* Stress insights */}
            {stressAnalysis?.insights?.slice(0, 1).map((insight, index) => (
              <View key={`stress-${index}`} style={styles.insightItem}>
                <IconSymbol name="heart.fill" size={20} color={colors.danger} />
                <ThemedText style={styles.insightText}>{insight}</ThemedText>
              </View>
            ))}
            {/* Journey progress */}
            <View style={styles.insightItem}>
              <IconSymbol name="target" size={20} color={colors.tint} />
              <ThemedText style={styles.insightText}>
                {"Вы"} {Статистика.count || sleepAnalysis?.totalEntries || 0} {"записей в вашем дневнике сна!"}
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
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: Spacing.lg,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  headerContent: {
    paddingTop: 40,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 24,
  },
  circleContainer: {
    marginTop: 8,
  },
  progressText: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 8,
  },
  progressSubtext: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
  },
  scrollView: {
    flex: 1,
    marginTop: -20,
  },
  scrollContent: {
    padding: Spacing.md,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  statRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: {
    fontSize: 15,
    fontWeight: "500",
  },
  statRowValue: {
    fontSize: 15,
    fontWeight: "600",
  },
  weekGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  weekDay: {
    alignItems: "center",
    gap: 6,
  },
  weekDayLabel: {
    fontSize: 11,
    fontWeight: "600",
    opacity: 0.6,
  },
  weekDayIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  weekDayValue: {
    fontSize: 12,
    fontWeight: "500",
  },
  chartContainer: {
    marginTop: 12,
    marginHorizontal: -8,
    alignItems: "center",
  },
  chart: {
    borderRadius: 12,
  },
  analyticsHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  analyticsMeta: {
    fontSize: 13,
    opacity: 0.8,
    marginBottom: 10,
  },
  targetTrack: {
    width: "100%",
    height: 10,
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 10,
  },
  targetBar: {
    height: "100%",
    borderRadius: 999,
  },
  refreshLink: {
    fontSize: 13,
    fontWeight: "600",
  },
  insightItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  insightText: {
    fontSize: 14,
    flex: 1,
  },
  trendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
});
