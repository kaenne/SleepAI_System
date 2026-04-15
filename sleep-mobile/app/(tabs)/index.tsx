import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as React from "react";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
} from "react-native-reanimated";

import { SleepTimer } from "@/components/sleep-timer";
import { StressMonitor } from "@/components/stress-monitor";
import { ThemedText } from "@/components/themed-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { BorderRadius, Colors, Spacing } from "@/constants/theme";
import { useUser } from "@/contexts/auth-context";
import { useBackendStatus } from "@/hooks/use-backend-status";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { generateInsight, useSleepJournal } from "@/hooks/use-sleep-journal";
import { useThemeColor } from "@/hooks/use-theme-color";
import { api } from "@/services/api";

const AI_TIPS = [
  "🌙 Попробуйте лечь на 15 минут раньше. Ваше тело скажет спасибо!",
  "🛁 Тёплая ванна перед сном помогает организму настроиться на отдых",
  "📵 Уберите экраны за 30 минут до сна для лучшего качества",
  "❄️ Прохладная спальня (18-20°C) — залог крепкого сна",
  "⏰ Постоянный режим сна помогает регулировать циркадные ритмы",
  "🧘 Короткая медитация перед сном успокоит ваш разум",
];

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const textColor = useThemeColor({}, "text");
  const iconColor = useThemeColor({}, "icon");
  const user = useUser();
  const { entries, stats, addEntry } = useSleepJournal();
  const { status: backendStatus } = useBackendStatus();

  const [sleepHoursText, setSleepHoursText] = React.useState("7.5");
  const [stressLevelText, setStressLevelText] = React.useState("4");
  const [showAddEntry, setShowAddEntry] = React.useState(false);
  const [lastInsight, setLastInsight] = React.useState<string | null>(null);

  // AI Prediction State
  const [isPredicting, setIsPredicting] = React.useState(false);
  const [aiPrediction, setAiPrediction] = React.useState<{ quality: number; message: string } | null>(null);

  const handlePredictSleep = async () => {
    setIsPredicting(true);
    try {
      // Подставляем данные из полей ввода или по умолчанию
      const sleepHours = Number(sleepHoursText.replace(",", ".")) || 7.5;
      const stressLevelNum = Number(stressLevelText) || 4;
      const heartRate = 65; // Можно было бы брать из HealthKit
      
      const response = await api.predictSleepQuality({
        sleepDuration: sleepHours,
        stressLevel: stressLevelNum,
        heartRate: heartRate,
      });
      setAiPrediction({
        quality: response.predictedQuality,
        message: response.message
      });
    } catch (error) {
      console.error(error);
      setAiPrediction({ quality: 0, message: "Ошибка связи с ИИ" });
    } finally {
      setIsPredicting(false);
    }
  };

  const todayTip = React.useMemo(() => {
    const dayIndex = new Date().getDate() % AI_TIPS.length;
    return AI_TIPS[dayIndex];
  }, []);

  const latestEntry = entries[0];
  const todaySleep = latestEntry?.sleepHours ?? 7.5;
  const sleepQuality = latestEntry
    ? latestEntry.sleepHours >= 7
      ? "well-rested"
      : "needs improvement"
    : "well-rested";
  const stressLevel = latestEntry?.stressLevel ?? 3;
  const currentStreak = React.useMemo(() => {
    if (entries.length === 0) return 0;
    const uniqueDays = new Set(
      entries.map((e) => new Date(e.createdAt).toDateString()),
    );
    let streak = 0;
    const cursor = new Date();
    while (uniqueDays.has(cursor.toDateString())) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }, [entries]);

  const onSave = React.useCallback(async () => {
    const sleepHours = Number(sleepHoursText.replace(",", "."));
    const stressLevelNum = Number(stressLevelText);
    if (!Number.isFinite(sleepHours) || sleepHours < 0 || sleepHours > 24)
      return;
    if (
      !Number.isFinite(stressLevelNum) ||
      stressLevelNum < 1 ||
      stressLevelNum > 10
    )
      return;

    const saved = await addEntry({
      sleepHours,
      stressLevel: stressLevelNum,
      note: "",
    });
    setLastInsight(generateInsight(saved));
    setShowAddEntry(false);

    try {
      if (api.getBaseUrl()) {
        await api.createJournalEntry({
          createdAt: saved.createdAt,
          sleepHours: saved.sleepHours,
          stressLevel: saved.stressLevel,
          note: saved.note,
        });
      }
    } catch {}
  }, [addEntry, sleepHoursText, stressLevelText]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <SafeAreaView edges={['top']} style={{ flex: 1 }}>
          <Animated.View
            entering={FadeInDown.duration(500)}
            style={styles.headerContent}
          >
            <View>
              <ThemedText style={styles.greeting}>
                Доброе утро, {user?.name?.split(" ")[0] || "Гость"}! 👋
              </ThemedText>
              <ThemedText style={styles.subGreeting}>
                Как вы себя чувствуете сегодня?
              </ThemedText>
            </View>
            <Badge
              label={backendStatus.isOnline ? "● В сети" : "○ Офлайн"}
              variant={backendStatus.isOnline ? "success" : "default"}
              animated={false}
            />
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Sleep Timer */}
        <Animated.View entering={FadeInUp.delay(50).duration(400)}>
          <SleepTimer />
        </Animated.View>

        {/* Stress Monitor */}
        <Animated.View entering={FadeInUp.delay(75).duration(400)}>
          <StressMonitor />
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(100).duration(400)}
          style={styles.quickStatsRow}
        >
          <Card
            variant="elevated"
            style={styles.quickStatCard}
            animated={false}
          >
            <ThemedText style={styles.quickStatLabel}>
              🌙 Сон сегодня
            </ThemedText>
            <ThemedText style={[styles.quickStatValue, { color: colors.tint }]}>
              {todaySleep}ч
            </ThemedText>
            <ThemedText style={styles.quickStatMeta}>
              Качество:{" "}
              <ThemedText style={{ fontWeight: "600" }}>
                {sleepQuality === 'well-rested' ? 'Хорошее' : 'Требует внимания'}
              </ThemedText>
            </ThemedText>
            <Badge
              label={`${currentStreak} дней подряд`}
              variant={currentStreak >= 5 ? "success" : "info"}
              size="sm"
              animated={false}
            />
            <Pressable onPress={() => setShowAddEntry(!showAddEntry)}>
              <ThemedText style={[styles.viewLink, { color: colors.accent }]}>
                {showAddEntry ? "Отмена" : "Отметить сон →"}
              </ThemedText>
            </Pressable>
          </Card>
          <Card
            variant="elevated"
            style={styles.quickStatCard}
            animated={false}
          >
            <ThemedText style={styles.quickStatLabel}>
              🎯 Стресс и Пульс
            </ThemedText>
            <ThemedText
              style={[
                styles.stressValue,
                { color: stressLevel <= 4 ? colors.success : colors.warning },
              ]}
            >
              {stressLevel <= 4 ? "Низкий" : stressLevel <= 6 ? "Средний" : "Высокий"}
            </ThemedText>
            <ThemedText style={styles.quickStatMeta}>
              Пульс:{" "}
              <ThemedText style={{ fontWeight: "600", color: colors.danger }}>
                68 уд/мин
              </ThemedText>
            </ThemedText>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(150).duration(400)}>
          <Card variant="default" animated={false}>
            <View style={styles.quickActionsRow}>
              <Pressable
                onPress={() => router.push("/(tabs)/stats")}
                style={[styles.quickActionBtn, { borderColor: colors.cardBorder }]}
              >
                <ThemedText style={styles.quickActionEmoji}>📈</ThemedText>
                <ThemedText type="caption">Аналитика</ThemedText>
              </Pressable>
              <Pressable
                onPress={() => router.push("/modal")}
                style={[styles.quickActionBtn, { borderColor: colors.cardBorder }]}
              >
                <ThemedText style={styles.quickActionEmoji}>📝</ThemedText>
                <ThemedText type="caption">Дневник</ThemedText>
              </Pressable>
              <Pressable
                onPress={() => setShowAddEntry((v) => !v)}
                style={[styles.quickActionBtn, { borderColor: colors.cardBorder }]}
              >
                <ThemedText style={styles.quickActionEmoji}>⚡</ThemedText>
                <ThemedText type="caption">Быстро</ThemedText>
              </Pressable>
            </View>
          </Card>
        </Animated.View>

        {showAddEntry && (
          <Animated.View entering={FadeIn.duration(300)}>
            <Card variant="elevated" animationDelay={0}>
              <ThemedText type="subtitle">📝 Добавить запись</ThemedText>
              <View style={styles.inputRow}>
                <View style={styles.inputField}>
                  <ThemedText type="caption">Часов сна</ThemedText>
                  <TextInput
                    value={sleepHoursText}
                    onChangeText={setSleepHoursText}
                    keyboardType="decimal-pad"
                    placeholder="7.5"
                    placeholderTextColor={iconColor}
                    style={[
                      styles.input,
                      {
                        color: textColor,
                        borderColor: colors.inputBorder,
                        backgroundColor: colors.inputBackground,
                      },
                    ]}
                  />
                </View>
                <View style={styles.inputField}>
                  <ThemedText type="caption">Стресс (1-10)</ThemedText>
                  <TextInput
                    value={stressLevelText}
                    onChangeText={setStressLevelText}
                    keyboardType="number-pad"
                    placeholder="4"
                    placeholderTextColor={iconColor}
                    style={[
                      styles.input,
                      {
                        color: textColor,
                        borderColor: colors.inputBorder,
                        backgroundColor: colors.inputBackground,
                      },
                    ]}
                  />
                </View>
              </View>
              <Button title="Сохранить" onPress={onSave} variant="primary" />
              <View style={{ marginTop: 8 }}>
                <Button 
                  title={isPredicting ? "Загрузка ИИ..." : "💡 Анализировать ИИ"} 
                  onPress={handlePredictSleep} 
                  variant="outlined" 
                  disabled={isPredicting}
                />
              </View>
              
              {aiPrediction !== null && (
                <Animated.View entering={FadeIn.duration(400)} style={{ marginTop: Spacing.md, padding: 12, backgroundColor: 'rgba(92, 196, 172, 0.15)', borderRadius: BorderRadius.md, borderWidth: 1, borderColor: colors.tint }}>
                  <ThemedText style={{ fontSize: 16, fontWeight: 'bold', color: colors.tint, textAlign: 'center' }}>
                    🤖 Оценка ИИ: {aiPrediction.quality}/10
                  </ThemedText>
                  <ThemedText style={{ fontSize: 13, textAlign: 'center', marginTop: 4, opacity: 0.8 }}>
                    {aiPrediction.message}
                  </ThemedText>
                </Animated.View>
              )}
            </Card>
          </Animated.View>
        )}

        <Animated.View entering={FadeInUp.delay(200).duration(400)}>
          <Card
            variant="elevated"
            style={[styles.tipCard, { backgroundColor: colors.tint }]}
            animated={false}
          >
            <ThemedText style={styles.tipTitle}>
              🧠 AI-совет дня
            </ThemedText>
            <ThemedText style={styles.tipText}>{todayTip}</ThemedText>
          </Card>
        </Animated.View>

        {lastInsight && (
          <Animated.View entering={FadeIn.duration(300)}>
            <Card variant="default">
              <ThemedText type="subtitle">💡 Последний инсайт от AI</ThemedText>
              <ThemedText>{lastInsight}</ThemedText>
            </Card>
          </Animated.View>
        )}

        <Animated.View entering={FadeInUp.delay(300).duration(400)}>
          <Card variant="default">
            <ThemedText type="subtitle">📊 Ваша статистика</ThemedText>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <IconSymbol name="moon.fill" size={24} color={colors.tint} />
                <ThemedText style={styles.statValue}>
                  {stats.avgSleepHours ?? "-"}ч
                </ThemedText>
                <ThemedText type="caption">Ср. сон</ThemedText>
              </View>
              <View style={styles.statItem}>
                <IconSymbol name="heart.fill" size={24} color={colors.danger} />
                <ThemedText style={styles.statValue}>
                  {stats.avgStressLevel ?? "-"}
                </ThemedText>
                <ThemedText type="caption">Ср. стресс</ThemedText>
              </View>
              <View style={styles.statItem}>
                <IconSymbol name="calendar" size={24} color={colors.accent} />
                <ThemedText style={styles.statValue}>{stats.count}</ThemedText>
                <ThemedText type="caption">Записей</ThemedText>
              </View>
            </View>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(400).duration(400)}>
          <Card variant="outlined">
            <View style={styles.recentLogsHeader}>
              <ThemedText type="subtitle">📅 Недавние записи</ThemedText>
              <Pressable onPress={() => router.push("/modal")}>
                <ThemedText style={[styles.addLogLink, { color: colors.tint }]}>
                  + Добавить
                </ThemedText>
              </Pressable>
            </View>
            {entries.length === 0 ? (
              <View style={styles.emptyState}>
                <ThemedText style={styles.emptyEmoji}>😴</ThemedText>
                <ThemedText type="caption">
                  Пока нет записей. Начните вести дневник!
                </ThemedText>
                <Pressable
                  onPress={() => router.push("/modal")}
                  style={[
                    styles.logFirstButton,
                    { backgroundColor: colors.tint },
                  ]}
                >
                  <ThemedText style={styles.logFirstButtonText}>
                    📝 Log Your First Night
                  </ThemedText>
                </Pressable>
              </View>
            ) : (
              entries.slice(0, 5).map((e) => (
                <View
                  key={e.id}
                  style={[
                    styles.entryRow,
                    { borderTopColor: colors.cardBorder },
                  ]}
                >
                  <View style={styles.entryLeft}>
                    <ThemedText type="defaultSemiBold">
                      {new Date(e.createdAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </ThemedText>
                    {e.note ? (
                      <ThemedText type="caption" numberOfLines={1}>
                        {e.note}
                      </ThemedText>
                    ) : null}
                  </View>
                  <View style={styles.entryBadges}>
                    <Badge
                      label={`${e.sleepHours}h`}
                      variant="info"
                      size="sm"
                      animated={false}
                    />
                    <Badge
                      label={
                        e.stressLevel <= 4
                          ? "Low"
                          : e.stressLevel <= 6
                            ? "Med"
                            : "High"
                      }
                      variant={
                        e.stressLevel <= 4
                          ? "success"
                          : e.stressLevel <= 6
                            ? "warning"
                            : "danger"
                      }
                      size="sm"
                      animated={false}
                    />
                  </View>
                </View>
              ))
            )}
          </Card>
        </Animated.View>
        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Floating Action Button */}
      <Animated.View
        entering={FadeIn.delay(600).duration(400)}
        style={styles.fabContainer}
      >
        <Pressable
          onPress={() => router.push("/modal")}
          style={({ pressed }) => [
            styles.fab,
            { backgroundColor: colors.tint, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <IconSymbol name="plus" size={28} color="#FFFFFF" />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: Spacing.lg,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingTop: 40,
  },
  greeting: {
    fontSize: 26,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  subGreeting: { fontSize: 14, color: "rgba(255,255,255,0.8)" },
  scrollView: { flex: 1, marginTop: -20 },
  scrollContent: { padding: Spacing.md },
  quickStatsRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  quickStatCard: { flex: 1, padding: Spacing.md },
  quickStatLabel: { fontSize: 13, fontWeight: "600", marginBottom: 8 },
  quickStatValue: { fontSize: 28, fontWeight: "700", marginBottom: 4 },
  quickStatMeta: { fontSize: 12, opacity: 0.7, marginBottom: 8 },
  stressValue: { fontSize: 20, fontWeight: "700", marginBottom: 4 },
  viewLink: { fontSize: 13, fontWeight: "600" },
  inputRow: { flexDirection: "row", gap: Spacing.md },
  inputField: { flex: 1, gap: 4 },
  input: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: 16,
  },
  tipCard: { marginBottom: Spacing.md },
  tipTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  tipText: { fontSize: 15, color: "#FFFFFF", lineHeight: 22 },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: Spacing.sm,
  },
  quickActionsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    justifyContent: "space-between",
  },
  quickActionBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm + 2,
    gap: 4,
  },
  quickActionEmoji: {
    fontSize: 18,
  },
  statItem: { alignItems: "center", gap: 4 },
  statValue: { fontSize: 22, fontWeight: "700" },
  recentLogsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  addLogLink: { fontSize: 14, fontWeight: "600" },
  emptyState: { alignItems: "center", paddingVertical: Spacing.lg },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.sm },
  logFirstButton: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  logFirstButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  entryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm + 2,
    borderTopWidth: 1,
  },
  entryLeft: { flex: 1, marginRight: Spacing.sm },
  entryBadges: { flexDirection: "row", gap: Spacing.xs },
  fabContainer: {
    position: "absolute",
    bottom: 24,
    right: 24,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
