import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BorderRadius, Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSleepJournal } from '@/hooks/use-sleep-journal';

// Persist display name locally (for guest users)
const DISPLAY_NAME_KEY = 'sleepai_display_name';

type StatBoxProps = {
  icon: string;
  iconColor: string;
  label: string;
  value: string;
  subValue?: string;
  colors: typeof Colors.light;
};

function StatBox({ icon, iconColor, label, value, subValue, colors }: StatBoxProps) {
  return (
    <View style={[styles.statBox, { backgroundColor: iconColor + '12' }]}>
      <View style={[styles.statBoxIcon, { backgroundColor: iconColor + '22' }]}>
        <IconSymbol name={icon as any} size={20} color={iconColor} />
      </View>
      <ThemedText style={[styles.statBoxValue, { color: colors.text }]}>{value}</ThemedText>
      {subValue && (
        <ThemedText style={[styles.statBoxSub, { color: iconColor }]}>{subValue}</ThemedText>
      )}
      <ThemedText style={[styles.statBoxLabel, { color: colors.textSecondary }]}>{label}</ThemedText>
    </View>
  );
}

export default function ПрофильScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { user, isAuthenticated } = useAuth();
  const { entries, stats } = useSleepJournal();

  const [displayName, setDisplayName] = React.useState('');
  const [editingName, setEditingName] = React.useState(false);
  const [tempName, setTempName] = React.useState('');

  // Load local display name
  React.useEffect(() => {
    AsyncStorage.getItem(DISPLAY_NAME_KEY).then((val) => {
      if (val) setDisplayName(val);
    });
  }, []);

  const effectiveName = isAuthenticated && user?.name
    ? user.name
    : displayName || 'Гость';

  const initials = React.useMemo(() => {
    const name = effectiveName;
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }, [effectiveName]);

  // Stats calculations
  const totalSleepHours = React.useMemo(() => {
    return entries.reduce((sum, e) => sum + e.sleepHours, 0);
  }, [entries]);

  const streak = React.useMemo(() => {
    if (entries.length === 0) return 0;
    let count = 0;
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const hasEntry = entries.some((e) => e.createdAt.startsWith(dateStr));
      if (hasEntry) count++;
      else if (i > 0) break; // gap found, stop
    }
    return count;
  }, [entries]);

  const bestSleepNight = React.useMemo(() => {
    if (entries.length === 0) return 0;
    return Math.max(...entries.map((e) => e.sleepHours));
  }, [entries]);

  const avgStress = React.useMemo(() => {
    if (!stats.avgStressLevel) return 'н/д';
    const level = stats.avgStressLevel;
    if (level <= 3) return 'Низкий';
    if (level <= 6) return 'Средний';
    return 'Высокий';
  }, [stats.avgStressLevel]);

  const handleSaveName = async () => {
    const name = tempName.trim();
    if (name.length > 0 && name.length <= 30) {
      setDisplayName(name);
      await AsyncStorage.setItem(DISPLAY_NAME_KEY, name);
    }
    setEditingName(false);
  };

  const sleepLevel = React.useMemo(() => {
    const count = entries.length;
    if (count >= 50) return { label: 'Эксперт', color: '#F59E0B', icon: 'star.fill' };
    if (count >= 20) return { label: 'Продвинутый', color: '#3B82F6', icon: 'chart.bar.fill' };
    if (count >= 5) return { label: 'Новичок', color: '#10B981', icon: 'leaf.fill' };
    return { label: 'Стартер', color: '#8B5CF6', icon: 'moon.fill' };
  }, [entries.length]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientMid, colors.headerGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            {/* Avatar */}
            <View style={styles.avatarContainer}>
              <View style={styles.avatarOuter}>
                <View style={[styles.avatar, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                  <ThemedText style={styles.avatarText}>{initials}</ThemedText>
                </View>
              </View>
              {streak > 0 && (
                <View style={[styles.streakBadge, { backgroundColor: '#F59E0B' }]}>
                  <ThemedText style={styles.streakBadgeText}>🔥{streak}</ThemedText>
                </View>
              )}
            </View>

            {/* Name */}
            {editingName ? (
              <View style={styles.nameEditRow}>
                <TextInput
                  value={tempName}
                  onChangeText={setTempName}
                  style={[styles.nameInput, { color: '#FFFFFF', borderColor: 'rgba(255,255,255,0.5)' }]}
                  placeholder="Ваше имя"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  maxLength={30}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleSaveName}
                />
                <Pressable onPress={handleSaveName} style={styles.nameEditBtn}>
                  <IconSymbol name="checkmark.circle.fill" size={28} color="#FFFFFF" />
                </Pressable>
              </View>
            ) : (
              <Pressable
                style={styles.nameRow}
                onPress={() => {
                  if (!isAuthenticated) {
                    setTempName(displayName);
                    setEditingName(true);
                  }
                }}
              >
                <ThemedText style={styles.nameText}>{effectiveName}</ThemedText>
                {!isAuthenticated && (
                  <IconSymbol name="pencil" size={16} color="rgba(255,255,255,0.7)" />
                )}
              </Pressable>
            )}

            <ThemedText style={styles.emailText}>
              {isAuthenticated && user?.email ? user.email : 'Локальный профиль'}
            </ThemedText>

            {/* Level badge */}
            <View style={[styles.levelBadge, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
              <IconSymbol name={sleepLevel.icon as any} size={14} color={sleepLevel.color} />
              <ThemedText style={styles.levelText}>{sleepLevel.label}</ThemedText>
            </View>
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Grid */}
        <Animated.View entering={FadeInUp.delay(80).duration(400)}>
          <Card variant="elevated">
            <ThemedText type="subtitle" style={styles.cardTitle}>📊 Моя статистика</ThemedText>
            <View style={styles.statsGrid}>
              <StatBox
                icon="moon.fill"
                iconColor={colors.tint}
                label="Всего часов сна"
                value={`${totalSleepHours.toFixed(1)}h`}
                subValue={`≈ ${Math.round(totalSleepHours / 24)} дн.`}
                colors={colors}
              />
              <StatBox
                icon="book.fill"
                iconColor={colors.accent}
                label="Записей"
                value={String(entries.length)}
                subValue={entries.length > 0 ? 'ночей' : undefined}
                colors={colors}
              />
              <StatBox
                icon="flame.fill"
                iconColor="#F59E0B"
                label="Серия"
                value={`${streak}d`}
                subValue={streak > 0 ? '🔥' : undefined}
                colors={colors}
              />
              <StatBox
                icon="star.fill"
                iconColor={colors.success}
                label="Лучшая ночь"
                value={bestSleepNight > 0 ? `${bestSleepNight}h` : '—'}
                colors={colors}
              />
            </View>
          </Card>
        </Animated.View>

        {/* Sleep Summary */}
        <Animated.View entering={FadeInUp.delay(130).duration(400)}>
          <Card variant="default">
            <ThemedText type="subtitle" style={styles.cardTitle}>🌙 Сводка сна</ThemedText>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <ThemedText style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                  Средний сон
                </ThemedText>
                <ThemedText style={[styles.summaryValue, { color: colors.text }]}>
                  {stats.avgSleepHours ? `${stats.avgSleepHours}h` : '—'}
                </ThemedText>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: colors.cardBorder }]} />
              <View style={styles.summaryItem}>
                <ThemedText style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                  Стресс
                </ThemedText>
                <ThemedText style={[styles.summaryValue, { color: colors.text }]}>
                  {avgStress}
                </ThemedText>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: colors.cardBorder }]} />
              <View style={styles.summaryItem}>
                <ThemedText style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                  Цель сна
                </ThemedText>
                <ThemedText style={[styles.summaryValue, { color: colors.success }]}>
                  8h
                </ThemedText>
              </View>
            </View>

            {/* Goal progress */}
            {stats.avgSleepHours && (
              <View style={styles.goalSection}>
                <View style={styles.goalRow}>
                  <ThemedText style={[styles.goalLabel, { color: colors.textSecondary }]}>
                    Прогресс к цели
                  </ThemedText>
                  <ThemedText style={[styles.goalPct, { color: colors.tint }]}>
                    {Math.min(100, Math.round((stats.avgSleepHours / 8) * 100))}%
                  </ThemedText>
                </View>
                <View style={[styles.goalTrack, { backgroundColor: colors.cardBorder }]}>
                  <View
                    style={[
                      styles.goalBar,
                      {
                        width: `${Math.min(100, Math.round((stats.avgSleepHours / 8) * 100))}%`,
                        backgroundColor:
                          stats.avgSleepHours >= 7 ? colors.success : colors.warning,
                      },
                    ]}
                  />
                </View>
              </View>
            )}
          </Card>
        </Animated.View>

        {/* Achievements */}
        <Animated.View entering={FadeInUp.delay(180).duration(400)}>
          <Card variant="outlined">
            <ThemedText type="subtitle" style={styles.cardTitle}>🏆 Достижения</ThemedText>
            <View style={styles.achievementsGrid}>
              <AchievementBadge
                icon="moon.stars.fill"
                label="Первая ночь"
                unlocked={entries.length >= 1}
                colors={colors}
              />
              <AchievementBadge
                icon="flame.fill"
                label="3 дня подряд"
                unlocked={streak >= 3}
                colors={colors}
              />
              <AchievementBadge
                icon="star.fill"
                label="10 записей"
                unlocked={entries.length >= 10}
                colors={colors}
              />
              <AchievementBadge
                icon="trophy.fill"
                label="7 дней подряд"
                unlocked={streak >= 7}
                colors={colors}
              />
              <AchievementBadge
                icon="heart.fill"
                label="Сон 8h"
                unlocked={bestSleepNight >= 8}
                colors={colors}
              />
              <AchievementBadge
                icon="chart.bar.fill"
                label="20 записей"
                unlocked={entries.length >= 20}
                colors={colors}
              />
            </View>
          </Card>
        </Animated.View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

function AchievementBadge({
  icon,
  label,
  unlocked,
  colors,
}: {
  icon: string;
  label: string;
  unlocked: boolean;
  colors: typeof Colors.light;
}) {
  return (
    <View style={styles.achievement}>
      <View
        style={[
          styles.achievementIcon,
          {
            backgroundColor: unlocked ? colors.tint + '20' : colors.cardBorder,
            borderWidth: 1.5,
            borderColor: unlocked ? colors.tint + '40' : 'transparent',
          },
        ]}
      >
        <IconSymbol
          name={icon as any}
          size={22}
          color={unlocked ? colors.tint : colors.muted}
        />
      </View>
      <ThemedText
        style={[
          styles.achievementLabel,
          { color: unlocked ? colors.text : colors.muted },
        ]}
      >
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 12,
    paddingBottom: 28,
    paddingHorizontal: Spacing.lg,
  },
  headerContent: {
    paddingTop: 12,
    alignItems: 'center',
    gap: 8,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 4,
  },
  avatarOuter: {
    padding: 4,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 30,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  streakBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  streakBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nameText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  nameEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nameInput: {
    fontSize: 18,
    fontWeight: '600',
    borderBottomWidth: 1.5,
    paddingVertical: 4,
    paddingHorizontal: 8,
    minWidth: 160,
  },
  nameEditBtn: {
    padding: 4,
  },
  emailText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  levelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
  },
  cardTitle: {
    marginBottom: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statBox: {
    flex: 1,
    minWidth: '44%',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  statBoxIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statBoxValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  statBoxSub: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: -2,
  },
  statBoxLabel: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  summaryDivider: {
    width: 1,
    height: 40,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  goalSection: {
    marginTop: 16,
    gap: 8,
  },
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  goalLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  goalPct: {
    fontSize: 13,
    fontWeight: '700',
  },
  goalTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  goalBar: {
    height: '100%',
    borderRadius: 4,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  achievement: {
    width: '30%',
    alignItems: 'center',
    gap: 6,
  },
  achievementIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievementLabel: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
});
