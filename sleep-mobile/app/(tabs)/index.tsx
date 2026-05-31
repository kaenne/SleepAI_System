import { router } from 'expo-router';
import * as React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { SleepTimer } from '@/components/sleep-timer';
import { AiTipCard } from '@/components/home/ai-info-cards';
import { HomeActionBar } from '@/components/home/home-action-bar';
import { AiPredictionCard } from '@/components/home/ai-prediction-card';
import { QuickStatsRow } from '@/components/home/quick-stats-row';
import { ThemedText } from '@/components/themed-text';
import { Btn } from '@/components/ui/btn';
import { Card } from '@/components/ui/card';
import { Ico } from '@/components/ui/ico';
import { Brand, Spacing, Type, tonal, tonalBorder } from '@/constants/theme';
import { useUser } from '@/contexts/auth-context';
import { useTranslation } from '@/contexts/i18n-context';
import { useBackendStatus } from '@/hooks/use-backend-status';
import { useSleepJournal } from '@/hooks/use-sleep-journal';
import { useStressMonitor } from '@/hooks/use-stress-monitor';

type HomeTab = 0 | 1 | 2;

export default function HomeScreen() {
  const user = useUser();
  const { entries } = useSleepJournal();
  const { t, tArray } = useTranslation();
  const { status: backendStatus } = useBackendStatus();
  const { latestStress } = useStressMonitor();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = React.useState<HomeTab>(0);

  // Online status colour resolves once — three discrete states.
  const onlineState = backendStatus.isChecking
    ? { color: Brand.warn, label: t('home.checking') }
    : backendStatus.isOnline
      ? { color: Brand.good, label: t('home.online') }
      : { color: Brand.textMuted, label: t('home.offline') };

  const handleMeasureHrv = React.useCallback(() => {
    router.push('/hrv-capture' as any);
  }, []);

  const todayTip = React.useMemo(() => {
    const tips = tArray('home.tips');
    if (tips.length === 0) return '';
    return tips[new Date().getDate() % tips.length];
  }, [tArray]);

  const latestEntry = entries[0];
  const todaySleep = latestEntry?.sleepHours ?? 7.5;
  const stressLevel = latestEntry?.stressLevel ?? 3;
  const sleepQuality: 'well-rested' | 'needs improvement' = latestEntry
    ? latestEntry.sleepHours >= 7 ? 'well-rested' : 'needs improvement'
    : 'well-rested';

  const currentStreak = React.useMemo(() => {
    if (entries.length === 0) return 0;
    const uniqueDays = new Set(entries.map((e) => new Date(e.createdAt).toDateString()));
    let streak = 0;
    const cursor = new Date();
    while (uniqueDays.has(cursor.toDateString())) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }, [entries]);

  const userName = user?.name?.split(' ')[0] || t('home.greetingFallback');

  const subtitles = [t('home.subtitle'), t('timer.subtitleSleeping'), t('home.aiAnalysisSubtitle')];
  const TAB_LABELS = [t('home.tabRecord'), t('home.tabSleeping'), t('home.tabAnalysis')];

  return (
    <View style={styles.root}>
      {/* ── Header ───────────────────────────────────────────────────── */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: Brand.background }}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top - 20, 8) }]}>
          <View style={{ flex: 1 }}>
            {activeTab === 2 ? (
              <ThemedText style={styles.headerTitle}>{t('home.aiAnalysisHeader')}</ThemedText>
            ) : (
              <ThemedText style={styles.headerTitle}>
                {t('home.greeting').replace('{{name}}', userName)}
              </ThemedText>
            )}
            <ThemedText style={styles.headerSub}>{subtitles[activeTab]}</ThemedText>
          </View>

          <View
            style={[
              styles.onlinePill,
              {
                backgroundColor: tonal(onlineState.color),
                borderColor: tonalBorder(onlineState.color),
              },
            ]}
          >
            <View style={[styles.onlineDot, { backgroundColor: onlineState.color }]} />
            <ThemedText style={[styles.onlineText, { color: onlineState.color }]}>
              {onlineState.label}
            </ThemedText>
          </View>
        </View>

        {/* ── Segmented switcher ─────────────────────────────────────── */}
        <View style={styles.segmentedWrap}>
          {TAB_LABELS.map((label, idx) => {
            const active = activeTab === idx;
            return (
              <Pressable
                key={idx}
                onPress={() => setActiveTab(idx as HomeTab)}
                style={[
                  styles.segmentPill,
                  active
                    ? { backgroundColor: Brand.accentSoft, borderColor: Brand.accentBorder, borderWidth: 1 }
                    : { backgroundColor: 'transparent', borderColor: 'transparent', borderWidth: 1 },
                ]}
              >
                <ThemedText
                  style={[
                    styles.segmentLabel,
                    { color: active ? Brand.accent : Brand.textSecondary },
                    active && { fontWeight: '600' },
                  ]}
                >
                  {label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>

      {/* ── Tab 0: Запись ────────────────────────────────────────────── */}
      {activeTab === 0 && (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeIn.duration(250)} style={{ gap: Spacing.md }}>
            <HomeActionBar
              statsLabel={t('home.statsTile')}
              addLabel={t('home.addTile')}
              onAddPress={() => router.push('/modal')}
            />

            {/* Last-night recap card */}
            <Card variant="bordered" animated={false} style={{ marginTop: Spacing.sm }}>
              <View style={styles.lastNightHeader}>
                <ThemedText style={styles.lastNightLabel}>{t('home.lastNightTitle')}</ThemedText>
                <View style={styles.lastNightRule} />
                <ThemedText style={styles.lastNightDash}>
                  {latestEntry
                    ? new Date(latestEntry.createdAt).toLocaleDateString([], { day: '2-digit', month: 'short' })
                    : '—'}
                </ThemedText>
              </View>
              {entries.length === 0 ? (
                <ThemedText style={styles.lastNightBody}>{t('home.noEntries')}</ThemedText>
              ) : (
                <View style={styles.lastNightMetrics}>
                  <View style={styles.lastNightMetric}>
                    <ThemedText style={[styles.lastNightVal, { color: Brand.info }]}>
                      {latestEntry?.sleepHours}h
                    </ThemedText>
                    <ThemedText style={styles.lastNightSub}>{t('home.sleepToday')}</ThemedText>
                  </View>
                  <View style={styles.lastNightDivider} />
                  <View style={styles.lastNightMetric}>
                    <ThemedText style={[styles.lastNightVal, { color: Brand.warn }]}>
                      {latestEntry?.stressLevel}/10
                    </ThemedText>
                    <ThemedText style={styles.lastNightSub}>{t('home.stressLabel')}</ThemedText>
                  </View>
                </View>
              )}
            </Card>

            {/* AI analysis of the latest entry — auto-fetched on mount */}
            {latestEntry && <AiPredictionCard entry={latestEntry} />}
          </Animated.View>
        </ScrollView>
      )}

      {/* ── Tab 1: Сон идёт ──────────────────────────────────────────── */}
      {activeTab === 1 && (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeIn.duration(250)}>
            <SleepTimer />
          </Animated.View>
        </ScrollView>
      )}

      {/* ── Tab 2: AI Анализ ─────────────────────────────────────────── */}
      {activeTab === 2 && (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeIn.duration(250)} style={{ gap: Spacing.md }}>
            {/* HRV measure card */}
            <Card variant="bordered" animated={false}>
              <View style={styles.hrvCardTop}>
                <View
                  style={[
                    styles.iconChip,
                    { backgroundColor: tonal(Brand.accent), borderColor: tonalBorder(Brand.accent) },
                  ]}
                >
                  <Ico.Heart size={20} color={Brand.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.hrvCardTitle}>{t('stress.measureBtn')}</ThemedText>
                  <ThemedText style={styles.hrvCardSub}>{t('stress.measureSubtitle')}</ThemedText>
                </View>
              </View>

              <View style={styles.hrvMetaRow}>
                <View style={styles.hrvMetaCell}>
                  <ThemedText
                    style={[
                      styles.hrvMetaVal,
                      { color: latestStress?.hrvScore != null ? Brand.accent : Brand.textMuted },
                    ]}
                    numberOfLines={1}
                  >
                    {latestStress?.hrvScore != null ? Math.round(latestStress.hrvScore) : '—'}
                  </ThemedText>
                  <ThemedText style={styles.hrvMetaLabel}>HRV</ThemedText>
                </View>
                <View style={styles.hrvMetaCell}>
                  <ThemedText
                    style={[
                      styles.hrvMetaVal,
                      {
                        color:
                          latestStress?.stressLevel && latestStress.stressLevel !== 'UNKNOWN'
                            ? Brand.info
                            : Brand.textMuted,
                        fontSize: latestStress?.stressLevel && latestStress.stressLevel !== 'UNKNOWN' ? 14 : 18,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {latestStress?.stressLevel && latestStress.stressLevel !== 'UNKNOWN'
                      ? t(`stress.level_${latestStress.stressLevel.toLowerCase()}`)
                      : '—'}
                  </ThemedText>
                  <ThemedText style={styles.hrvMetaLabel}>{t('stress.levelShort')}</ThemedText>
                </View>
                <View style={{ flex: 1.8 }}>
                  <Btn
                    label={t('stress.startMeasure')}
                    onPress={handleMeasureHrv}
                    leading={<Ico.Pulse size={16} color={Brand.textInverse} />}
                  />
                </View>
              </View>
            </Card>

            {/* Hero metric cards */}
            <QuickStatsRow
              todaySleep={todaySleep}
              sleepQuality={sleepQuality}
              stressLevel={stressLevel}
              currentStreak={currentStreak}
            />

            {/* AI tip */}
            <AiTipCard tip={todayTip} />
          </Animated.View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.background },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: 12,
  },
  headerTitle: { ...Type.titleL, color: Brand.textPrimary, letterSpacing: -0.3 },
  headerSub: { ...Type.bodyS, color: Brand.textSecondary, marginTop: 2 },

  onlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  onlineDot: { width: 7, height: 7, borderRadius: 4 },
  onlineText: { ...Type.monoS, fontSize: 11, letterSpacing: 0.4 },

  // Segmented tabs
  segmentedWrap: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: 999,
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.border,
    padding: 4,
  },
  segmentPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: 'center',
  },
  segmentLabel: { ...Type.bodyS, fontSize: 13 },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.md,
  },

  // Last-night card
  lastNightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  lastNightLabel: { ...Type.section, color: Brand.textMuted },
  lastNightRule: { flex: 1, height: 1, backgroundColor: Brand.borderSoft },
  lastNightDash: { ...Type.monoS, color: Brand.textMuted },
  lastNightBody: { ...Type.bodyS, color: Brand.textSecondary, lineHeight: 20 },
  lastNightMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  lastNightMetric: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 2,
  },
  lastNightVal: {
    ...Type.monoL,
    fontSize: 20,
    fontWeight: '700',
  },
  lastNightSub: {
    ...Type.section,
    color: Brand.textMuted,
    fontSize: 10,
  },
  lastNightDivider: {
    width: 1,
    height: 28,
    backgroundColor: Brand.borderSoft,
  },

  // HRV card
  hrvCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconChip: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hrvCardTitle: { ...Type.titleS, color: Brand.textPrimary, fontSize: 15 },
  hrvCardSub: { ...Type.bodyS, color: Brand.textSecondary, marginTop: 2, fontSize: 12 },
  hrvMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  hrvMetaCell: {
    flex: 1,
    backgroundColor: Brand.surfaceElevated,
    borderColor: Brand.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  hrvMetaVal: {
    ...Type.monoL,
    fontSize: 18,
    fontWeight: '700',
  },
  hrvMetaLabel: {
    ...Type.section,
    color: Brand.textMuted,
    fontSize: 10,
    marginTop: 4,
  },
});
