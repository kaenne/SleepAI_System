import { router } from 'expo-router';
import * as React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { SleepTimer } from '@/components/sleep-timer';
import { StressMonitor } from '@/components/stress-monitor';
import { AiInsightCard, AiTipCard } from '@/components/home/ai-info-cards';
import { AiPredictionCard } from '@/components/home/ai-prediction-card';
import { HomeActionBar } from '@/components/home/home-action-bar';
import { HomeHeader } from '@/components/home/home-header';
import { QuickEntryForm } from '@/components/home/quick-entry-form';
import { QuickStatsRow } from '@/components/home/quick-stats-row';
import { SleepTrendSparkline } from '@/components/home/sleep-trend-sparkline';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Spacing } from '@/constants/theme';
import { useUser } from '@/contexts/auth-context';
import { useTranslation } from '@/contexts/i18n-context';
import { useBackendStatus } from '@/hooks/use-backend-status';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSleepJournal } from '@/hooks/use-sleep-journal';

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const user = useUser();
  const { entries } = useSleepJournal();
  const { status: backendStatus } = useBackendStatus();
  const { t } = useTranslation();

  const [showAddEntry, setShowAddEntry] = React.useState(false);
  const [lastInsight, setLastInsight] = React.useState<string | null>(null);

  const todayTip = React.useMemo(() => {
    const tips = t('home.tips') as unknown as string[];
    return tips[new Date().getDate() % tips.length];
  }, [t]);

  const latestEntry = entries[0];
  const todaySleep = latestEntry?.sleepHours ?? 7.5;
  const sleepQuality: 'well-rested' | 'needs improvement' = latestEntry
    ? latestEntry.sleepHours >= 7 ? 'well-rested' : 'needs improvement'
    : 'well-rested';
  const stressLevel = latestEntry?.stressLevel ?? 3;

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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ParallaxScrollView
        headerBackgroundColor={{
          light: colors.headerGradientStart,
          dark: colors.headerGradientEnd,
        }}
        headerImage={
          <HomeHeader
            userName={user?.name?.split(' ')[0] || t('home.greetingFallback')}
            isOnline={backendStatus.isOnline}
            colorScheme={colorScheme}
            greeting={t('home.greeting')}
            subtitle={t('home.subtitle')}
            onlineLabel={t('home.online')}
            offlineLabel={t('home.offline')}
          />
        }
      >
        <View style={styles.contentContainer}>
          <HomeActionBar
            colorScheme={colorScheme}
            tintColor={colors.tint}
            accentColor={colors.accent}
            successColor={colors.success}
            statsLabel={t('home.statsTile')}
            journalLabel={t('home.journalTile')}
            addLabel={t('home.addTile')}
            onAddPress={() => setShowAddEntry((v) => !v)}
          />

          {showAddEntry && (
            <QuickEntryForm onEntrySaved={(insight) => {
              setLastInsight(insight);
              setShowAddEntry(false);
            }} />
          )}

          <Animated.View entering={FadeInUp.delay(100).springify()}>
            <SleepTimer />
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(150).springify()}>
            <StressMonitor />
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(200).springify()}>
            <QuickStatsRow
              todaySleep={todaySleep}
              sleepQuality={sleepQuality}
              stressLevel={stressLevel}
              currentStreak={currentStreak}
            />
          </Animated.View>

          {entries.length >= 2 && (
            <Animated.View entering={FadeInUp.delay(250).springify()}>
              <ErrorBoundary>
                <SleepTrendSparkline entries={entries} />
              </ErrorBoundary>
            </Animated.View>
          )}

          {latestEntry && (
            <Animated.View entering={FadeInUp.delay(300).springify()}>
              <ErrorBoundary>
                <AiPredictionCard entry={latestEntry} />
              </ErrorBoundary>
            </Animated.View>
          )}

          <Animated.View entering={FadeInUp.delay(350).springify()}>
            <AiTipCard tip={todayTip} />
          </Animated.View>

          {lastInsight && <AiInsightCard insight={lastInsight} />}
        </View>
      </ParallaxScrollView>

      {!showAddEntry && (
        <Animated.View entering={FadeIn.delay(600).duration(400)} style={styles.fabContainer}>
          <Pressable
            onPress={() => router.push('/modal')}
            style={({ pressed }) => [
              styles.fab,
              {
                backgroundColor: colors.tint,
                opacity: pressed ? 0.8 : 1,
                transform: [{ scale: pressed ? 0.95 : 1 }],
              },
            ]}
          >
            <IconSymbol name="plus" size={28} color="#FFFFFF" />
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { paddingTop: Spacing.sm, gap: Spacing.lg, paddingBottom: 100 },
  fabContainer: { position: 'absolute', bottom: 24, right: 24, zIndex: 100 },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
});
