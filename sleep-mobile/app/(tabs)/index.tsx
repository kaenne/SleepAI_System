import * as React from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SleepTimer } from '@/components/sleep-timer';
import { StressMonitor } from '@/components/stress-monitor';
import { AiTipCard } from '@/components/home/ai-info-cards';
import { HomeActionBar } from '@/components/home/home-action-bar';
import { QuickEntryForm } from '@/components/home/quick-entry-form';
import { QuickStatsRow } from '@/components/home/quick-stats-row';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useUser } from '@/contexts/auth-context';
import { useTranslation } from '@/contexts/i18n-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSleepJournal } from '@/hooks/use-sleep-journal';

type HomeTab = 0 | 1 | 2;

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const colors = Colors[colorScheme];
  const user = useUser();
  const { entries } = useSleepJournal();
  const { t, tArray } = useTranslation();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = React.useState<HomeTab>(0);

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

  // Header subtitle text differs per tab
  const subtitles = [t('home.subtitle'), t('timer.subtitleSleeping'), t('home.aiAnalysisSubtitle')];

  const TAB_LABELS = [t('home.tabRecord'), t('home.tabSleeping'), t('home.tabAnalysis')];

  return (
    <View style={[styles.root, { backgroundColor: isDark ? '#151522' : colors.background }]}>
      {/* ─── Header ─── */}
      <SafeAreaView style={{ backgroundColor: isDark ? '#151522' : colors.background }}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top - 20, 8) }]}>
          <View style={{ flex: 1 }}>
            {activeTab === 2 ? (
              <ThemedText style={styles.headerTitleBig}>{t('home.aiAnalysisHeader')}</ThemedText>
            ) : (
              <ThemedText style={styles.greeting}>
                {t('home.greeting').replace('{{name}}', userName)}
              </ThemedText>
            )}
            <ThemedText style={[styles.subGreeting, { color: colors.muted }]}>
              {subtitles[activeTab]}
            </ThemedText>
          </View>
          <View style={[
            styles.onlinePill,
            {
              backgroundColor: isDark ? '#0d2e1a' : '#d1fae5',
              borderColor: isDark ? '#1a5c34' : '#6ee7b7',
            },
          ]}>
            <View style={styles.onlineDot} />
            <ThemedText style={[styles.onlineText, { color: isDark ? '#4ADE80' : '#059669' }]}>
              {t('home.online')}
            </ThemedText>
          </View>
        </View>

        {/* ─── Segmented Switcher ─── */}
        <View style={[styles.segmentedWrap, { backgroundColor: isDark ? '#1E1E2D' : '#F3F4F6', borderColor: isDark ? '#2C2C3E' : '#E5E7EB' }]}>
          {TAB_LABELS.map((label, idx) => (
            <Pressable
              key={idx}
              onPress={() => setActiveTab(idx as HomeTab)}
              style={[
                styles.segmentPill,
                activeTab === idx && {
                  backgroundColor: isDark ? '#2D234A' : `${colors.tint}18`,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.segmentLabel,
                  { color: activeTab === idx ? colors.tint : colors.muted },
                  activeTab === idx && { fontWeight: '600' },
                ]}
              >
                {label}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </SafeAreaView>

      {/* ─── Tab 0: Запись ─── */}
      {activeTab === 0 && (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeIn.duration(250)}>
            <HomeActionBar
              colorScheme={colorScheme}
              tintColor={colors.tint}
              accentColor={colors.accent}
              successColor={colors.success}
              statsLabel={t('home.statsTile')}
              journalLabel={t('home.journalTile')}
              addLabel={t('home.addTile')}
              onAddPress={() => {}}
            />

            <QuickEntryForm onEntrySaved={() => {}} />

            {/* "Прошлая ночь" empty card */}
            <View style={[styles.lastNightCard, { backgroundColor: isDark ? '#1E1E2D' : '#FFFFFF', borderColor: isDark ? '#2C2C3E' : '#E5E7EB' }]}>
              <View style={styles.lastNightHeader}>
                <ThemedText style={[styles.lastNightLabel, { color: colors.muted }]}>
                  {t('home.lastNightTitle')}
                </ThemedText>
                <View style={[styles.lastNightDivider, { backgroundColor: isDark ? '#2C2C3E' : '#E5E7EB' }]} />
                <ThemedText style={[styles.lastNightDash, { color: colors.muted }]}>—</ThemedText>
              </View>
              <ThemedText style={[styles.lastNightBody, { color: colors.muted }]}>
                {entries.length === 0 ? t('home.noEntries') : `${t('home.sleepToday')}: ${latestEntry?.sleepHours}h`}
              </ThemedText>
            </View>
          </Animated.View>
        </ScrollView>
      )}

      {/* ─── Tab 1: Сон идёт ─── */}
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

      {/* ─── Tab 2: AI Анализ ─── */}
      {activeTab === 2 && (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeIn.duration(250)} style={{ gap: Spacing.md }}>

            {/* HRV Measure Card */}
            <View style={[styles.hrvCard, { backgroundColor: isDark ? '#1E1E2D' : '#FFFFFF', borderColor: isDark ? '#2C2C3E' : '#E5E7EB' }]}>
              <View style={styles.hrvCardTop}>
                <View style={[styles.hrvIconWrap, { backgroundColor: isDark ? '#2D1A4A' : '#EDE9FE' }]}>
                  <ThemedText style={{ fontSize: 22 }}>❤️</ThemedText>
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={[styles.hrvCardTitle, { color: isDark ? '#E2D8F0' : '#1F2937' }]}>
                    {t('stress.measureBtn')}
                  </ThemedText>
                  <ThemedText style={[styles.hrvCardSub, { color: isDark ? '#6B7280' : '#9CA3AF' }]}>
                    {t('stress.measureSubtitle')}
                  </ThemedText>
                </View>
              </View>
              <View style={styles.hrvMetaRow}>
                <View style={[styles.hrvMetaCell, { backgroundColor: isDark ? '#151522' : '#F3F4F6', borderColor: isDark ? '#2C2C3E' : '#E5E7EB' }]}>
                  <ThemedText style={[styles.hrvMetaVal, { color: '#A78BFA' }]}>—</ThemedText>
                  <ThemedText style={[styles.hrvMetaLabel, { color: isDark ? '#6B7280' : '#9CA3AF' }]}>HRV</ThemedText>
                </View>
                <View style={[styles.hrvMetaCell, { backgroundColor: isDark ? '#151522' : '#F3F4F6', borderColor: isDark ? '#2C2C3E' : '#E5E7EB' }]}>
                  <ThemedText style={[styles.hrvMetaVal, { color: '#60A5FA' }]}>—</ThemedText>
                  <ThemedText style={[styles.hrvMetaLabel, { color: isDark ? '#6B7280' : '#9CA3AF' }]}>bpm</ThemedText>
                </View>
                <Pressable
                  style={({ pressed }) => [styles.hrvStartBtn, { opacity: pressed ? 0.85 : 1 }]}
                >
                  <ThemedText style={styles.hrvStartBtnText}>{t('stress.startMeasure')}</ThemedText>
                </Pressable>
              </View>
            </View>

            {/* Stress tips card */}
            <StressMonitor />

            {/* Hero metric cards */}
            <QuickStatsRow
              todaySleep={todaySleep}
              sleepQuality={sleepQuality}
              stressLevel={stressLevel}
              currentStreak={currentStreak}
            />

            {/* AI Tip card */}
            <AiTipCard tip={todayTip} />
          </Animated.View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  headerTitleBig: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  subGreeting: {
    fontSize: 13,
    marginTop: 2,
  },
  onlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    gap: 5,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#4ADE80',
  },
  onlineText: {
    fontSize: 12,
    fontWeight: '600',
  },
  segmentedWrap: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: 999,
    borderWidth: 1,
    padding: 4,
  },
  segmentPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: 'center',
  },
  segmentLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.md,
  },
  lastNightCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  lastNightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  lastNightLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  lastNightDivider: {
    flex: 1,
    height: 1,
  },
  lastNightDash: {
    fontSize: 13,
  },
  lastNightBody: {
    fontSize: 13.5,
    lineHeight: 20,
  },
  hrvCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  hrvCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  hrvIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hrvCardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  hrvCardSub: {
    fontSize: 12,
    marginTop: 2,
  },
  hrvMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 4,
  },
  hrvMetaCell: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  hrvMetaVal: {
    fontSize: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  hrvMetaLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  hrvStartBtn: {
    flex: 1.5,
    backgroundColor: '#A78BFA',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  hrvStartBtnText: {
    color: '#1a1228',
    fontWeight: '700',
    fontSize: 14,
  },
});

