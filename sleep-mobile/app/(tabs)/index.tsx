import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as React from "react";
import {
    Pressable,
    StyleSheet,
    TextInput,
    View,
    Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
} from "react-native-reanimated";
import { BlurView } from 'expo-blur';

import ParallaxScrollView from "@/components/parallax-scroll-view";
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

const { width } = Dimensions.get('window');

const AI_TIPS = [
  "?? опробуйте лечь на 15 минут раньше. аше тело скажет спасибо!",
  "?? Тёплая ванна перед сном помогает организму настроиться на отдых",
  "?? берите экраны за 30 минут до сна для лучшего качества",
  "?? рохладная спальня (18-20°C) — залог крепкого сна",
  "? остоянный режим сна помогает регулировать циркадные ритмы",
  "?? ороткая медитация перед сном успокоит ваш разум",
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

  const [isPredicting, setIsPredicting] = React.useState(false);
  const [aiPrediction, setAiPrediction] = React.useState<{ quality: number; message: string } | null>(null);

  const handlePredictSleep = async () => {
    setIsPredicting(true);
    try {
      const sleepHours = Number(sleepHoursText.replace(",", ".")) || 7.5;
      const stressLevelNum = Number(stressLevelText) || 4;
      const heartRate = 65; 
      
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
      setAiPrediction({ quality: 0, message: "шибка связи с " });
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
      <ParallaxScrollView
        headerBackgroundColor={{ light: colors.headerGradientStart, dark: colors.headerGradientEnd }}
        headerImage={
          <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
            <Animated.View entering={FadeInDown.springify()} style={styles.headerContent}>
              <View style={styles.headerTextContainer}>
                <ThemedText style={styles.greeting}>
                  оброе утро, {user?.name?.split(" ")[0] || "ость"}! ??
                </ThemedText>
                <ThemedText style={styles.subGreeting}>
                  ак вы себя чувствуете сегодня?
                </ThemedText>
              </View>
              <View style={styles.headerBadgeContainer}>
                <BlurView intensity={20} tint={colorScheme === 'dark' ? 'dark' : 'light'} style={styles.glassBadge}>
                  <View style={[styles.statusDot, { backgroundColor: backendStatus.isOnline ? '#4ade80' : '#f87171' }]} />
                  <ThemedText style={styles.statusText}>
                    {backendStatus.isOnline ? " сети" : "флайн"}
                  </ThemedText>
                </BlurView>
              </View>
            </Animated.View>
          </SafeAreaView>
        }
      >
        <View style={styles.contentContainer}>
          <Animated.View entering={FadeInUp.delay(50).springify()}>
            <BlurView intensity={colorScheme === 'dark' ? 40 : 80} tint={colorScheme === 'dark' ? 'dark' : 'light'} style={styles.glassActionsRow}>
              <Pressable onPress={() => router.push("/(tabs)/stats")} style={styles.glassActionBtn}>
                <View style={[styles.iconCircle, { backgroundColor: `${colors.tint}20` }]}>
                  <IconSymbol name="chart.bar.fill" size={22} color={colors.tint} />
                </View>
                <ThemedText type="caption" style={styles.actionText}>налитика</ThemedText>
              </Pressable>
              
              <View style={styles.divider} />
              
              <Pressable onPress={() => router.push("/modal")} style={styles.glassActionBtn}>
                <View style={[styles.iconCircle, { backgroundColor: `${colors.accent}20` }]}>
                  <IconSymbol name="book.fill" size={22} color={colors.accent} />
                </View>
                <ThemedText type="caption" style={styles.actionText}>невник</ThemedText>
              </Pressable>

              <View style={styles.divider} />
              
              <Pressable onPress={() => setShowAddEntry((v) => !v)} style={styles.glassActionBtn}>
                <View style={[styles.iconCircle, { backgroundColor: `${colors.success}20` }]}>
                  <IconSymbol name="plus.circle.fill" size={22} color={colors.success} />
                </View>
                <ThemedText type="caption" style={styles.actionText}>аписать</ThemedText>
              </Pressable>
            </BlurView>
          </Animated.View>

          {showAddEntry && (
            <Animated.View entering={FadeIn.duration(300)}>
              <Card variant="elevated" style={styles.premiumCard}>
                <View style={styles.cardHeaderRow}>
                  <View style={[styles.cardIconWrapper, { backgroundColor: `${colors.tint}20` }]}>
                     <IconSymbol name="moon.stars.fill" size={20} color={colors.tint} />
                  </View>
                  <ThemedText type="subtitle" style={{flex:1}}>апись сна</ThemedText>
                </View>
                
                <View style={styles.inputRow}>
                  <View style={styles.inputField}>
                    <ThemedText type="caption" style={styles.inputLabel}>асов сна</ThemedText>
                    <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
                      <TextInput
                        value={sleepHoursText}
                        onChangeText={setSleepHoursText}
                        keyboardType="decimal-pad"
                        placeholder="7.5"
                        placeholderTextColor={iconColor}
                        style={[styles.input, { color: textColor }]}
                      />
                      <ThemedText style={{color: iconColor, paddingRight: 10}}>ч</ThemedText>
                    </View>
                  </View>
                  <View style={styles.inputField}>
                    <ThemedText type="caption" style={styles.inputLabel}>Стресс (1-10)</ThemedText>
                    <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
                      <TextInput
                        value={stressLevelText}
                        onChangeText={setStressLevelText}
                        keyboardType="number-pad"
                        placeholder="4"
                        placeholderTextColor={iconColor}
                        style={[styles.input, { color: textColor }]}
                      />
                      <IconSymbol name="bolt.heart.fill" size={16} color={iconColor} style={{paddingRight: 10}} />
                    </View>
                  </View>
                </View>
                
                <View style={styles.buttonRow}>
                  <View style={{flex:1}}>
                    <Button title="Сохранить" onPress={onSave} variant="primary" />
                  </View>
                  <View style={{flex:1}}>
                    <Button 
                      title={isPredicting ? "нализ..." : "AI нализ"} 
                      onPress={handlePredictSleep} 
                      variant="secondary" 
                      disabled={isPredicting}
                    />
                  </View>
                </View>
                
                {aiPrediction !== null && (
                  <Animated.View entering={FadeInDown.springify()} style={[styles.aiPredictionBox, { borderColor: `${colors.tint}50`, backgroundColor: `${colors.tint}10` }]}>
                    <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 6}}>
                      <IconSymbol name="sparkles" size={16} color={colors.tint} />
                      <ThemedText style={{ fontSize: 15, fontWeight: 'bold', color: colors.tint }}>
                        ценка качества: {aiPrediction.quality}/10
                      </ThemedText>
                    </View>
                    <ThemedText style={{ fontSize: 13, opacity: 0.9, lineHeight: 18 }}>
                      {aiPrediction.message}
                    </ThemedText>
                  </Animated.View>
                )}
              </Card>
            </Animated.View>
          )}

          <Animated.View entering={FadeInUp.delay(100).springify()}>
            <SleepTimer />
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(150).springify()}>
            <StressMonitor />
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(200).springify()} style={styles.statsRow}>
            <LinearGradient
              colors={[colorScheme === 'dark' ? '#1e1b4b' : '#e0e7ff', colorScheme === 'dark' ? '#312e81' : '#c7d2fe']}
              style={styles.gradientCard}
              start={{x:0, y:0}} end={{x:1, y:1}}
            >
              <View style={styles.cardIconWrapperAbsolute}>
                <IconSymbol name="moon.fill" size={40} color={`${colors.tint}20`} />
              </View>
              <ThemedText style={styles.quickStatLabel}>Сон сегодня</ThemedText>
              <ThemedText style={[styles.quickStatValue, { color: colors.tint }]}>{todaySleep}ч</ThemedText>
              <View style={styles.badgeRow}>
                <Badge label={sleepQuality === 'well-rested' ? 'тлично' : 'Слабо'} variant={sleepQuality === 'well-rested' ? 'success' : 'warning'} size="sm" animated={false} />
                <Badge label={`?? ${currentStreak} дн.`} variant="info" size="sm" animated={false} />
              </View>
            </LinearGradient>

            <LinearGradient
              colors={[colorScheme === 'dark' ? '#450a0a' : '#ffe4e6', colorScheme === 'dark' ? '#7f1d1d' : '#fecdd3']}
              style={styles.gradientCard}
              start={{x:0, y:0}} end={{x:1, y:1}}
            >
              <View style={styles.cardIconWrapperAbsolute}>
                <IconSymbol name="heart.fill" size={40} color={`${colors.danger}20`} />
              </View>
              <ThemedText style={styles.quickStatLabel}>Стресс</ThemedText>
              <ThemedText style={[styles.quickStatValue, { color: colors.danger }]}>
                {stressLevel <= 4 ? "изкий" : stressLevel <= 6 ? "Средний" : "ысокий"}
              </ThemedText>
              <View style={styles.badgeRow}>
                <Badge label="?? 68 уд/м" variant="default" size="sm" animated={false} />
              </View>
            </LinearGradient>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(250).springify()}>
            <Card variant="elevated" style={styles.premiumCard}>
              <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8}}>
                <View style={[styles.cardIconWrapper, { backgroundColor: `${colors.accent}20` }]}>
                  <IconSymbol name="sparkles" size={18} color={colors.accent} />
                </View>
                <ThemedText style={{fontSize: 16, fontWeight: '700'}}>AI-совет дня</ThemedText>
              </View>
              <ThemedText style={{fontSize: 15, lineHeight: 22, color: colors.textSecondary}}>
                {todayTip}
              </ThemedText>
            </Card>
          </Animated.View>

          {lastInsight && (
            <Animated.View entering={FadeIn.duration(300)}>
              <Card variant="elevated" style={styles.premiumCard}>
                <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8}}>
                  <View style={[styles.cardIconWrapper, { backgroundColor: `${colors.success}20` }]}>
                    <IconSymbol name="bolt.fill" size={18} color={colors.success} />
                  </View>
                  <ThemedText style={{fontSize: 16, fontWeight: '700'}}>нсайт от AI</ThemedText>
                </View>
                <ThemedText style={{fontSize: 15, lineHeight: 22, color: colors.textSecondary}}>
                  {lastInsight}
                </ThemedText>
              </Card>
            </Animated.View>
          )}

        </View>
      </ParallaxScrollView>

      {/* Floating Action Button */}
      <Animated.View
        entering={FadeIn.delay(600).duration(400)}
        style={styles.fabContainer}
      >
        <Pressable
          onPress={() => router.push("/modal")}
          style={({ pressed }) => [
            styles.fab,
            { backgroundColor: colors.tint, opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.95 : 1 }] },
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
  headerSafeArea: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 40,
    paddingHorizontal: Spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerTextContainer: {
    flex: 1,
    paddingRight: 16,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subGreeting: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  headerBadgeContainer: {
    paddingBottom: 4,
  },
  glassBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  contentContainer: {
    paddingTop: Spacing.sm,
    gap: Spacing.lg,
    paddingBottom: 100,
  },
  glassActionsRow: {
    flexDirection: 'row',
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 8,
    justifyContent: 'space-evenly',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(150,150,150,0.1)',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
  },
  glassActionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontWeight: '600',
  },
  divider: {
    width: 1,
    height: '60%',
    backgroundColor: 'rgba(150,150,150,0.2)',
  },
  premiumCard: {
    borderRadius: 24,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(150,150,150,0.1)',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  cardIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  inputField: { flex: 1 },
  inputLabel: {
    marginBottom: 6,
    fontWeight: '500',
    opacity: 0.8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    height: 46,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  aiPredictionBox: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
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
    shadowColor: "#000",
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
  fabContainer: {
    position: "absolute",
    bottom: 24,
    right: 24,
    zIndex: 100,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
});
