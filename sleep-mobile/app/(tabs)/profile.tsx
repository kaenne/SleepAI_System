import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  Easing,
  ZoomIn,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useTranslation } from '@/contexts/i18n-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSleepJournal } from '@/hooks/use-sleep-journal';
import { useUserProfile } from '@/hooks/use-user-profile';
import { api } from '@/services/api';

const DISPLAY_NAME_KEY = 'sleepai_display_name';

// Animated progress bar for sleep goal
function GoalProgressBar({
  progress: targetPct,
  color,
  trackColor,
}: {
  progress: number;
  color: string;
  trackColor: string;
}) {
  const widthPct = useSharedValue(0);

  React.useEffect(() => {
    widthPct.value = withTiming(Math.min(100, Math.max(0, targetPct)), {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetPct]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${widthPct.value}%` as any,
  }));

  return (
    <View style={[styles.goalTrack, { backgroundColor: trackColor }]}>
      <Animated.View style={[styles.goalBar, { backgroundColor: color }, barStyle]} />
    </View>
  );
}

// Achievement badge with pop-in animation when unlocked
function AchievementBadge({
  icon,
  label,
  unlocked,
  colors,
  boxSize,
}: {
  icon: string;
  label: string;
  unlocked: boolean;
  colors: typeof Colors.light;
  boxSize: number;
}) {
  return (
    <View style={[styles.achievement, { width: boxSize }]}>
      <Animated.View
        entering={unlocked ? ZoomIn.springify().damping(12) : undefined}
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
      </Animated.View>
      <ThemedText
        numberOfLines={2}
        style={[styles.achievementLabel, { color: unlocked ? colors.text : colors.muted }]}
      >
        {label}
      </ThemedText>
    </View>
  );
}

type StatBoxProps = {
  icon: string;
  iconColor: string;
  label: string;
  value: string;
  subValue?: string;
  colors: typeof Colors.light;
};

function StatBox({ icon, iconColor, label, value, subValue, colors }: StatBoxProps) {
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      onPressIn={() => { scale.value = withSpring(0.96); }}
      onPressOut={() => { scale.value = withSpring(1); }}
      style={styles.statBoxPressable}
    >
      <Animated.View style={[styles.statBox, { backgroundColor: iconColor + '12' }, pressStyle]}>
        <View style={[styles.statBoxIcon, { backgroundColor: iconColor + '22' }]}>
          <IconSymbol name={icon as any} size={20} color={iconColor} />
        </View>
        <ThemedText style={[styles.statBoxValue, { color: colors.text }]} numberOfLines={1}>
          {value}
        </ThemedText>
        {subValue && (
          <ThemedText style={[styles.statBoxSub, { color: iconColor }]} numberOfLines={1}>
            {subValue}
          </ThemedText>
        )}
        <ThemedText style={[styles.statBoxLabel, { color: colors.textSecondary }]} numberOfLines={2}>
          {label}
        </ThemedText>
      </Animated.View>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { width: screenWidth } = useWindowDimensions();
  const { user, isAuthenticated } = useAuth();
  const { entries, stats } = useSleepJournal();
  const { profile, saveProfile } = useUserProfile();
  const { t } = useTranslation();

  // Achievement box: 3 per row, account for padding + gaps
  const achievementBoxSize = Math.floor((screenWidth - Spacing.md * 2 - Spacing.lg * 2 - 12 * 2) / 3);

  const [editingAiProfile, setEditingAiProfile] = React.useState(false);
  const [tempAge, setTempAge] = React.useState('');
  const [tempGender, setTempGender] = React.useState<0 | 1 | null>(null);
  const [tempBmi, setTempBmi] = React.useState<0 | 1 | 2 | null>(null);

  const openAiEdit = React.useCallback(() => {
    setTempAge(profile.age !== null ? String(profile.age) : '');
    setTempGender(profile.gender as 0 | 1 | null);
    setTempBmi(profile.bmiCategory as 0 | 1 | 2 | null);
    setEditingAiProfile(true);
  }, [profile]);

  const saveAiProfile = React.useCallback(async () => {
    await saveProfile({ age: tempAge ? Number(tempAge) : null, gender: tempGender, bmiCategory: tempBmi });
    setEditingAiProfile(false);
  }, [tempAge, tempGender, tempBmi, saveProfile]);

  const [displayName, setDisplayName] = React.useState('');
  const [editingName, setEditingName] = React.useState(false);
  const [tempName, setTempName] = React.useState('');

  React.useEffect(() => {
    AsyncStorage.getItem(DISPLAY_NAME_KEY).then(val => { if (val) setDisplayName(val); });
  }, []);

  const effectiveName = isAuthenticated && user?.name
    ? user.name
    : displayName || t('profile.guestName');

  const initials = React.useMemo(() => {
    const parts = effectiveName.trim().split(' ');
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : effectiveName.substring(0, 2).toUpperCase();
  }, [effectiveName]);

  const totalSleepHours = React.useMemo(
    () => entries.reduce((s, e) => s + e.sleepHours, 0),
    [entries],
  );

  const streak = React.useMemo(() => {
    if (entries.length === 0) return 0;
    let count = 0;
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      if (entries.some(e => e.createdAt.startsWith(dateStr))) count++;
      else if (i > 0) break;
    }
    return count;
  }, [entries]);

  const bestSleepNight = React.useMemo(
    () => (entries.length === 0 ? 0 : Math.max(...entries.map(e => e.sleepHours))),
    [entries],
  );

  const avgStress = React.useMemo(() => {
    if (!stats.avgStressLevel) return t('common.na');
    const l = stats.avgStressLevel;
    return l <= 3 ? t('profile.stress_low') : l <= 6 ? t('profile.stress_medium') : t('profile.stress_high');
  }, [stats.avgStressLevel, t]);

  const handleSaveName = async () => {
    const name = tempName.trim();
    if (name.length > 0 && name.length <= 30) {
      setDisplayName(name);
      await AsyncStorage.setItem(DISPLAY_NAME_KEY, name);
      try { await api.updateProfile(name); } catch {}
    }
    setEditingName(false);
  };

  const sleepLevel = React.useMemo(() => {
    const count = entries.length;
    if (count >= 50) return { label: t('profile.level'), color: '#F59E0B', icon: 'star.fill' };
    if (count >= 20) return { label: t('profile.level'), color: '#3B82F6', icon: 'chart.bar.fill' };
    if (count >= 5)  return { label: t('profile.level'), color: '#10B981', icon: 'leaf.fill' };
    return { label: t('profile.level'), color: '#8B5CF6', icon: 'moon.fill' };
  }, [entries.length, t]);

  const goalPct = stats.avgSleepHours
    ? Math.min(100, Math.round((stats.avgSleepHours / 8) * 100))
    : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Gradient header */}
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientMid, colors.headerGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
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

            {editingName ? (
              <View style={styles.nameEditRow}>
                <TextInput
                  value={tempName}
                  onChangeText={setTempName}
                  style={[styles.nameInput, { color: '#FFFFFF', borderColor: 'rgba(255,255,255,0.5)' }]}
                  placeholder={t('profile.editNamePlaceholder')}
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
                  if (!isAuthenticated) { setTempName(displayName); setEditingName(true); }
                }}
              >
                <ThemedText style={styles.nameText} numberOfLines={1}>{effectiveName}</ThemedText>
                {!isAuthenticated && (
                  <IconSymbol name="pencil" size={16} color="rgba(255,255,255,0.7)" />
                )}
              </Pressable>
            )}

            <ThemedText style={styles.emailText} numberOfLines={1}>
              {isAuthenticated && user?.email ? user.email : t('profile.localProfile')}
            </ThemedText>

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
        {/* Stats grid */}
        <Animated.View entering={FadeInUp.delay(80).duration(400)}>
          <Card variant="elevated">
            <ThemedText type="subtitle" style={styles.cardTitle}>{t('profile.myStats')}</ThemedText>
            <View style={styles.statsGrid}>
              <StatBox
                icon="moon.fill" iconColor={colors.tint}
                label={t('profile.totalHours')}
                value={`${totalSleepHours.toFixed(1)}h`}
                subValue={t('home.days').replace('{{n}}', String(Math.round(totalSleepHours / 24)))}
                colors={colors}
              />
              <StatBox
                icon="book.fill" iconColor={colors.accent}
                label={t('profile.entries')}
                value={String(entries.length)}
                colors={colors}
              />
              <StatBox
                icon="flame.fill" iconColor="#F59E0B"
                label={t('profile.streak')}
                value={`${streak}d`}
                subValue={streak > 0 ? '🔥' : undefined}
                colors={colors}
              />
              <StatBox
                icon="star.fill" iconColor={colors.success}
                label={t('profile.bestNight')}
                value={bestSleepNight > 0 ? `${bestSleepNight}h` : '—'}
                colors={colors}
              />
            </View>
          </Card>
        </Animated.View>

        {/* Sleep summary */}
        <Animated.View entering={FadeInUp.delay(130).duration(400)}>
          <Card variant="default">
            <ThemedText type="subtitle" style={styles.cardTitle}>{t('profile.summary')}</ThemedText>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <ThemedText style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                  {t('profile.avgSleep')}
                </ThemedText>
                <ThemedText style={[styles.summaryValue, { color: colors.text }]} numberOfLines={1}>
                  {stats.avgSleepHours ? `${stats.avgSleepHours}h` : '—'}
                </ThemedText>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: colors.cardBorder }]} />
              <View style={styles.summaryItem}>
                <ThemedText style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                  {t('profile.stressLabel')}
                </ThemedText>
                <ThemedText style={[styles.summaryValue, { color: colors.text }]} numberOfLines={1}>
                  {avgStress}
                </ThemedText>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: colors.cardBorder }]} />
              <View style={styles.summaryItem}>
                <ThemedText style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                  {t('profile.sleepGoal')}
                </ThemedText>
                <ThemedText style={[styles.summaryValue, { color: colors.success }]}>8h</ThemedText>
              </View>
            </View>

            {stats.avgSleepHours && (
              <View style={styles.goalSection}>
                <View style={styles.goalRow}>
                  <ThemedText style={[styles.goalLabel, { color: colors.textSecondary }]}>
                    {t('profile.goalProgress')}
                  </ThemedText>
                  <ThemedText style={[styles.goalPct, { color: colors.tint }]}>{goalPct}%</ThemedText>
                </View>
                <GoalProgressBar
                  progress={goalPct}
                  color={stats.avgSleepHours >= 7 ? colors.success : colors.warning}
                  trackColor={colors.cardBorder}
                />
              </View>
            )}
          </Card>
        </Animated.View>

        {/* AI Profile */}
        <Animated.View entering={FadeInUp.delay(160).duration(400)}>
          <Card variant="default">
            <View style={styles.aiProfileHeader}>
              <ThemedText type="subtitle" style={[styles.cardTitle, { flex: 1, marginBottom: 0 }]}>
                {t('profile.aiData')}
              </ThemedText>
              <Pressable onPress={openAiEdit} style={[styles.editBtn, { backgroundColor: colors.tint + '18' }]}>
                <IconSymbol name="pencil" size={14} color={colors.tint} />
                <ThemedText style={[styles.editBtnText, { color: colors.tint }]}>{t('profile.aiDataEdit')}</ThemedText>
              </Pressable>
            </View>
            <ThemedText style={[styles.aiProfileHint, { color: colors.textSecondary }]}>
              {t('profile.aiDataHint')}
            </ThemedText>
            <View style={styles.aiProfileRow}>
              <View style={styles.aiProfileItem}>
                <ThemedText style={[styles.aiProfileLabel, { color: colors.textSecondary }]}>{t('profile.ageLabel')}</ThemedText>
                <ThemedText style={[styles.aiProfileValue, { color: colors.text }]} numberOfLines={1}>
                  {profile.age !== null ? `${profile.age} ${t('profile.years')}` : '—'}
                </ThemedText>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: colors.cardBorder }]} />
              <View style={styles.aiProfileItem}>
                <ThemedText style={[styles.aiProfileLabel, { color: colors.textSecondary }]}>{t('profile.genderLabel')}</ThemedText>
                <ThemedText style={[styles.aiProfileValue, { color: colors.text }]} numberOfLines={1}>
                  {profile.gender === 1 ? t('profile.genderMale') : profile.gender === 0 ? t('profile.genderFemale') : '—'}
                </ThemedText>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: colors.cardBorder }]} />
              <View style={styles.aiProfileItem}>
                <ThemedText style={[styles.aiProfileLabel, { color: colors.textSecondary }]}>{t('profile.bmiLabel')}</ThemedText>
                <ThemedText style={[styles.aiProfileValue, { color: colors.text }]} numberOfLines={1}>
                  {profile.bmiCategory === 0 ? t('profile.bmiNormal')
                    : profile.bmiCategory === 1 ? t('profile.bmiOverweight')
                    : profile.bmiCategory === 2 ? t('profile.bmiObese') : '—'}
                </ThemedText>
              </View>
            </View>
          </Card>
        </Animated.View>

        {/* AI Profile Edit Modal */}
        <Modal
          visible={editingAiProfile}
          transparent
          animationType="fade"
          onRequestClose={() => setEditingAiProfile(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: colors.cardBackground }]}>
              <ThemedText type="subtitle" style={{ marginBottom: 4 }}>{t('profile.editAiTitle')}</ThemedText>
              <ThemedText style={{ color: colors.textSecondary, fontSize: 13, marginBottom: Spacing.lg }}>
                {t('profile.editAiSubtitle')}
              </ThemedText>

              <View style={styles.aiEditGroup}>
                <ThemedText style={[styles.aiEditLabel, { color: colors.textSecondary }]}>{t('profile.editAgeLabel')}</ThemedText>
                <View style={[styles.aiEditInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
                  <TextInput
                    style={{ color: colors.text, fontSize: 16, flex: 1 }}
                    value={tempAge}
                    onChangeText={v => setTempAge(v.replace(/[^0-9]/g, ''))}
                    placeholder={t('profile.editAgePlaceholder')}
                    placeholderTextColor={colors.muted}
                    keyboardType="numeric"
                    maxLength={3}
                  />
                </View>
              </View>

              <View style={styles.aiEditGroup}>
                <ThemedText style={[styles.aiEditLabel, { color: colors.textSecondary }]}>{t('profile.editGenderLabel')}</ThemedText>
                <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                  {(['male', 'female'] as const).map((key, val) => (
                    <Pressable key={key} onPress={() => setTempGender(tempGender === val ? null : val as 0 | 1)}
                      style={[styles.chipBtn, {
                        flex: 1,
                        backgroundColor: tempGender === val ? colors.tint + '20' : colors.inputBackground,
                        borderColor: tempGender === val ? colors.tint : colors.inputBorder,
                      }]}>
                      <ThemedText style={{ color: tempGender === val ? colors.tint : colors.muted, fontWeight: tempGender === val ? '700' : '400' }}>
                        {key === 'male' ? t('profile.genderMale') : t('profile.genderFemale')}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.aiEditGroup}>
                <ThemedText style={[styles.aiEditLabel, { color: colors.textSecondary }]}>{t('profile.editBmiLabel')}</ThemedText>
                <View style={{ flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' }}>
                  {([t('profile.bmiNormal'), t('profile.bmiOverweight'), t('profile.bmiObese')] as const).map((label, i) => (
                    <Pressable key={i} onPress={() => setTempBmi(tempBmi === i ? null : i as 0 | 1 | 2)}
                      style={[styles.chipBtn, {
                        backgroundColor: tempBmi === i ? colors.tint + '20' : colors.inputBackground,
                        borderColor: tempBmi === i ? colors.tint : colors.inputBorder,
                      }]}>
                      <ThemedText style={{ color: tempBmi === i ? colors.tint : colors.muted, fontWeight: tempBmi === i ? '700' : '400', fontSize: 13 }}>
                        {label}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.modalActions}>
                <Pressable style={[styles.modalBtn, { backgroundColor: colors.cardBorder }]} onPress={() => setEditingAiProfile(false)}>
                  <ThemedText style={{ color: colors.text, fontWeight: '600' }}>{t('common.cancel')}</ThemedText>
                </Pressable>
                <Pressable style={[styles.modalBtn, { backgroundColor: colors.tint }]} onPress={saveAiProfile}>
                  <ThemedText style={{ color: '#fff', fontWeight: '700' }}>{t('common.save')}</ThemedText>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* Achievements */}
        <Animated.View entering={FadeInUp.delay(180).duration(400)}>
          <Card variant="outlined">
            <ThemedText type="subtitle" style={styles.cardTitle}>{t('profile.achievements')}</ThemedText>
            <View style={styles.achievementsGrid}>
              {[
                { icon: 'moon.stars.fill', label: t('profile.ach_first'),   unlocked: entries.length >= 1 },
                { icon: 'flame.fill',      label: t('profile.ach_streak3'), unlocked: streak >= 3 },
                { icon: 'star.fill',       label: t('profile.ach_10'),      unlocked: entries.length >= 10 },
                { icon: 'trophy.fill',     label: t('profile.ach_streak7'), unlocked: streak >= 7 },
                { icon: 'heart.fill',      label: t('profile.ach_8h'),      unlocked: bestSleepNight >= 8 },
                { icon: 'chart.bar.fill',  label: t('profile.ach_20'),      unlocked: entries.length >= 20 },
              ].map((a) => (
                <AchievementBadge
                  key={a.icon}
                  icon={a.icon}
                  label={a.label}
                  unlocked={a.unlocked}
                  colors={colors}
                  boxSize={achievementBoxSize}
                />
              ))}
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
    paddingBottom: 28,
    paddingHorizontal: Spacing.lg,
  },
  headerContent: { paddingTop: 12, alignItems: 'center', gap: 8 },
  avatarContainer: { position: 'relative', marginBottom: 4 },
  avatarOuter: { padding: 4, borderRadius: 999, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 30, fontWeight: '700', color: '#FFFFFF' },
  streakBadge: { position: 'absolute', bottom: -2, right: -2, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  streakBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '80%' },
  nameText: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  nameEditRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nameInput: { fontSize: 18, fontWeight: '600', borderBottomWidth: 1.5, paddingVertical: 4, paddingHorizontal: 8, minWidth: 160 },
  nameEditBtn: { padding: 4 },
  emailText: { fontSize: 13, color: 'rgba(255,255,255,0.65)', maxWidth: '80%' },
  levelBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  levelText: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },
  scrollView: { flex: 1 },
  scrollContent: { padding: Spacing.md, gap: Spacing.md, paddingBottom: 32 },
  cardTitle: { marginBottom: 14 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statBoxPressable: { flex: 1, minWidth: '44%' },
  statBox: { borderRadius: 14, padding: 14, alignItems: 'center', gap: 4 },
  statBoxIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  statBoxValue: { fontSize: 22, fontWeight: '800' },
  statBoxSub: { fontSize: 11, fontWeight: '600', marginTop: -2 },
  statBoxLabel: { fontSize: 11, fontWeight: '500', textAlign: 'center', marginTop: 2 },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center', gap: 4 },
  summaryDivider: { width: 1, height: 40 },
  summaryLabel: { fontSize: 11, fontWeight: '500' },
  summaryValue: { fontSize: 18, fontWeight: '700' },
  goalSection: { marginTop: 16, gap: 8 },
  goalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  goalLabel: { fontSize: 13, fontWeight: '500' },
  goalPct: { fontSize: 13, fontWeight: '700' },
  goalTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  goalBar: { height: '100%', borderRadius: 4 },
  achievementsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'flex-start' },
  achievement: { alignItems: 'center', gap: 6 },
  achievementIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  achievementLabel: { fontSize: 10, fontWeight: '600', textAlign: 'center' },
  aiProfileHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: 8 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, flexShrink: 0 },
  editBtnText: { fontSize: 12, fontWeight: '600' },
  aiProfileHint: { fontSize: 12, marginBottom: 12 },
  aiProfileRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  aiProfileItem: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 8 },
  aiProfileLabel: { fontSize: 11, fontWeight: '500' },
  aiProfileValue: { fontSize: 16, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  modalCard: { width: '100%', borderRadius: 20, padding: Spacing.lg, gap: 4 },
  aiEditGroup: { marginTop: Spacing.sm, gap: 8 },
  aiEditLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
  aiEditInput: { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  chipBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1.5 },
  modalActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  modalBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
});
