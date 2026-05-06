import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

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
  const { t, tArray } = useTranslation();

  const [showAddEntry, setShowAddEntry] = React.useState(false);
  const [lastInsight, setLastInsight] = React.useState<string | null>(null);

  const todayTip = React.useMemo(() => {
    const tips = tArray('home.tips');
    if (tips.length === 0) return '';
    return tips[new Date().getDate() % tips.length];
  }, [tArray]);

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
            userName={user?.name?.split(' ')[0] || (t('home.greetingFallback'))}
            isOnline={backendStatus.isOnline}
            colorScheme={colorScheme}
            greeting={t('home.greeting')}
            subtitle={t('home.subtitle')}
            onlineLabel={t('home.online')}
            offlineLabel={t('home.offline')}
          />
        }
      >
        <Animated.View style={styles.contentContainer} entering={FadeInUp.springify()}>
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

          <SleepTimer />

          <StressMonitor />

          <QuickStatsRow
            todaySleep={todaySleep}
            sleepQuality={sleepQuality}
            stressLevel={stressLevel}
            currentStreak={currentStreak}
          />

          {entries.length >= 2 && (
            <ErrorBoundary>
              <SleepTrendSparkline entries={entries} />
            </ErrorBoundary>
          )}

          {latestEntry && (
            <ErrorBoundary>
              <AiPredictionCard entry={latestEntry} />
            </ErrorBoundary>
          )}

          <AiTipCard tip={todayTip} />

          {lastInsight && <AiInsightCard insight={lastInsight} />}
        </Animated.View>
      </ParallaxScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { paddingTop: Spacing.sm, gap: Spacing.lg, paddingBottom: 100 },
});
