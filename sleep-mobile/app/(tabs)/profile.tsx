import AsyncStorage from '@react-native-async-storage/async-storage';
import * as React from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Btn } from '@/components/ui/btn';
import { Card } from '@/components/ui/card';
import { Ico, type IcoName } from '@/components/ui/ico';
import { SectionHeader } from '@/components/ui/section-header';
import { computeSleepScore } from '@/constants/sleep';
import { StorageKeys } from '@/constants/storage';
import { BorderRadius, Brand, Spacing, Type, tonal, tonalBorder } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useTranslation } from '@/contexts/i18n-context';
import { useSleepJournal } from '@/hooks/use-sleep-journal';
import { useUserProfile } from '@/hooks/use-user-profile';
import { api } from '@/services/api';

const DISPLAY_NAME_KEY = StorageKeys.DISPLAY_NAME;

// ── Goal progress bar ────────────────────────────────────────────────────────
function GoalProgressBar({ progress: targetPct, color }: { progress: number; color: string }) {
  const widthPct = useSharedValue(0);

  React.useEffect(() => {
    widthPct.value = withTiming(Math.min(100, Math.max(0, targetPct)), {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
  }, [targetPct, widthPct]);

  const barStyle = useAnimatedStyle(() => ({ width: `${widthPct.value}%` as any }));

  return (
    <View style={styles.goalTrack}>
      <Animated.View style={[styles.goalBar, { backgroundColor: color }, barStyle]} />
    </View>
  );
}

// ── Achievement badge ────────────────────────────────────────────────────────
function AchievementBadge({
  icon,
  label,
  unlocked,
  boxSize,
}: {
  icon: IcoName;
  label: string;
  unlocked: boolean;
  boxSize: number;
}) {
  const Icon = Ico[icon];
  return (
    <View style={[styles.achievement, { width: boxSize }]}>
      <Animated.View
        entering={unlocked ? ZoomIn.springify().damping(12) : undefined}
        style={[
          styles.achievementIcon,
          unlocked
            ? { backgroundColor: tonal(Brand.accent), borderColor: tonalBorder(Brand.accent) }
            : { backgroundColor: Brand.surfaceElevated, borderColor: Brand.border },
        ]}
      >
        <Icon size={20} color={unlocked ? Brand.accent : Brand.textMuted} />
      </Animated.View>
      <ThemedText
        numberOfLines={2}
        style={[
          styles.achievementLabel,
          { color: unlocked ? Brand.textPrimary : Brand.textMuted },
        ]}
      >
        {label}
      </ThemedText>
    </View>
  );
}

// ── Stat box (4-up grid) ─────────────────────────────────────────────────────
type StatBoxProps = {
  icon: IcoName;
  iconColor: string;
  label: string;
  value: string;
  subValue?: string;
};

function StatBox({ icon, iconColor, label, value, subValue }: StatBoxProps) {
  const Icon = Ico[icon];
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      onPressIn={() => { scale.value = withSpring(0.97); }}
      onPressOut={() => { scale.value = withSpring(1); }}
      style={styles.statBoxPressable}
    >
      <Animated.View
        style={[
          styles.statBox,
          {
            backgroundColor: Brand.surfaceElevated,
            borderColor: Brand.border,
          },
          pressStyle,
        ]}
      >
        <View style={[styles.statBoxIcon, { backgroundColor: tonal(iconColor), borderColor: tonalBorder(iconColor) }]}>
          <Icon size={18} color={iconColor} />
        </View>
        <ThemedText style={styles.statBoxValue} numberOfLines={1}>
          {value}
        </ThemedText>
        {subValue ? (
          <ThemedText style={[styles.statBoxSub, { color: iconColor }]} numberOfLines={1}>
            {subValue}
          </ThemedText>
        ) : null}
        <ThemedText style={styles.statBoxLabel} numberOfLines={2}>
          {label}
        </ThemedText>
      </Animated.View>
    </Pressable>
  );
}

// ── Screen ───────────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const { user, isAuthenticated } = useAuth();
  const { entries, stats } = useSleepJournal();
  const { profile, saveProfile } = useUserProfile();
  const { t } = useTranslation();

  const achievementBoxSize = Math.floor((screenWidth - Spacing.md * 2 - Spacing.md * 2 - 12 * 2) / 3);

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
    try {
      await saveProfile({ age: tempAge ? Number(tempAge) : null, gender: tempGender, bmiCategory: tempBmi });
    } catch {
      Alert.alert(t('common.error'), t('profile.nameSyncFailed'));
    } finally {
      setEditingAiProfile(false);
    }
  }, [tempAge, tempGender, tempBmi, saveProfile, t]);

  const [displayName, setDisplayName] = React.useState('');
  const [editingName, setEditingName] = React.useState(false);
  const [tempName, setTempName] = React.useState('');

  React.useEffect(() => {
    AsyncStorage.getItem(DISPLAY_NAME_KEY).then((val) => { if (val) setDisplayName(val); });
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
      if (entries.some((e) => e.createdAt.startsWith(dateStr))) count++;
      else if (i > 0) break;
    }
    return count;
  }, [entries]);

  const bestSleepNight = React.useMemo(
    () => (entries.length === 0 ? 0 : Math.max(...entries.map((e) => e.sleepHours))),
    [entries],
  );

  const avgStress = React.useMemo(() => {
    if (!stats.avgStressLevel) return t('common.noData');
    const l = stats.avgStressLevel;
    return l <= 3 ? t('profile.stress_low') : l <= 6 ? t('profile.stress_medium') : t('profile.stress_high');
  }, [stats.avgStressLevel, t]);

  const handleSaveName = async () => {
    const name = tempName.trim();
    if (name.length > 0 && name.length <= 30) {
      setDisplayName(name);
      await AsyncStorage.setItem(DISPLAY_NAME_KEY, name);
      try {
        await api.updateProfile(name);
      } catch {
        Alert.alert(t('common.error'), t('profile.nameSyncFailed'));
      }
    }
    setEditingName(false);
  };

  // Sleep level ladder — driven by entry count, used in the header pill.
  const sleepLevel = React.useMemo<{ icon: IcoName; color: string; label: string }>(() => {
    const count = entries.length;
    if (count >= 50) return { icon: 'Star', color: Brand.warn, label: t('profile.level') };
    if (count >= 20) return { icon: 'ChartBar', color: Brand.info, label: t('profile.level') };
    if (count >= 5)  return { icon: 'Leaf', color: Brand.good, label: t('profile.level') };
    return { icon: 'Moon', color: Brand.accent, label: t('profile.level') };
  }, [entries.length, t]);

  const goalPct = stats.avgSleepHours ? computeSleepScore(stats.avgSleepHours) : 0;

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Brand.background }}>
        <View style={styles.header}>
          <ThemedText style={styles.headerTitle}>{t('tabs.profile')}</ThemedText>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Account hero ─────────────────────────────────────────── */}
        <Card variant="bordered" animated={false}>
          <View style={styles.heroRow}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatar}>
                <ThemedText style={styles.avatarText}>{initials}</ThemedText>
              </View>
              {streak > 0 ? (
                <View style={styles.streakBadge}>
                  <Ico.Flame size={11} color={Brand.flame} />
                  <ThemedText style={styles.streakBadgeText}>{streak}</ThemedText>
                </View>
              ) : null}
            </View>

            <View style={{ flex: 1, gap: 4 }}>
              {editingName ? (
                <View style={styles.nameEditRow}>
                  <TextInput
                    value={tempName}
                    onChangeText={setTempName}
                    style={styles.nameInput}
                    placeholder={t('profile.editNamePlaceholder')}
                    placeholderTextColor={Brand.textMuted}
                    maxLength={30}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={handleSaveName}
                  />
                  <Pressable onPress={handleSaveName} style={styles.nameEditBtn} hitSlop={6}>
                    <Ico.Check size={20} color={Brand.accent} />
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
                  {!isAuthenticated ? <Ico.Pencil size={14} color={Brand.textMuted} /> : null}
                </Pressable>
              )}

              <ThemedText style={styles.emailText} numberOfLines={1}>
                {isAuthenticated && user?.email ? user.email : t('profile.localProfile')}
              </ThemedText>

              <View
                style={[
                  styles.levelPill,
                  { backgroundColor: tonal(sleepLevel.color), borderColor: tonalBorder(sleepLevel.color) },
                ]}
              >
                {(() => {
                  const Icon = Ico[sleepLevel.icon];
                  return <Icon size={12} color={sleepLevel.color} />;
                })()}
                <ThemedText style={[styles.levelText, { color: sleepLevel.color }]}>{sleepLevel.label}</ThemedText>
              </View>
            </View>
          </View>
        </Card>

        {/* ── Stats grid ───────────────────────────────────────────── */}
        <SectionHeader title={t('profile.myStats')} />
        <View style={styles.statsGrid}>
          <StatBox
            icon="Moon"
            iconColor={Brand.accent}
            label={t('profile.totalHours')}
            value={`${totalSleepHours.toFixed(1)}h`}
            subValue={t('home.days').replace('{{n}}', String(Math.round(totalSleepHours / 24)))}
          />
          <StatBox
            icon="Book"
            iconColor={Brand.info}
            label={t('profile.entries')}
            value={String(entries.length)}
          />
          <StatBox
            icon="Flame"
            iconColor={Brand.flame}
            label={t('profile.streak')}
            value={`${streak}d`}
          />
          <StatBox
            icon="Star"
            iconColor={Brand.good}
            label={t('profile.bestNight')}
            value={bestSleepNight > 0 ? `${bestSleepNight}h` : t('common.noData')}
          />
        </View>

        {/* ── Sleep summary ────────────────────────────────────────── */}
        <SectionHeader title={t('profile.summary')} />
        <Card variant="bordered" animated={false}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <ThemedText style={styles.summaryLabel}>{t('profile.avgSleep')}</ThemedText>
              <ThemedText style={styles.summaryValue} numberOfLines={1}>
                {stats.avgSleepHours ? `${stats.avgSleepHours}h` : t('common.noData')}
              </ThemedText>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <ThemedText style={styles.summaryLabel}>{t('profile.stressLabel')}</ThemedText>
              <ThemedText style={styles.summaryValue} numberOfLines={1}>{avgStress}</ThemedText>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <ThemedText style={styles.summaryLabel}>{t('profile.sleepGoal')}</ThemedText>
              <ThemedText style={[styles.summaryValue, { color: Brand.good }]}>8h</ThemedText>
            </View>
          </View>

          {stats.avgSleepHours ? (
            <View style={styles.goalSection}>
              <View style={styles.goalRow}>
                <ThemedText style={styles.goalLabel}>{t('profile.goalProgress')}</ThemedText>
                <ThemedText style={styles.goalPct}>{goalPct}%</ThemedText>
              </View>
              <GoalProgressBar
                progress={goalPct}
                color={stats.avgSleepHours >= 7 ? Brand.good : Brand.warn}
              />
            </View>
          ) : null}
        </Card>

        {/* ── AI Data ─────────────────────────────────────────────── */}
        <SectionHeader title={t('profile.aiData')} />
        <Card variant="bordered" animated={false}>
          <View style={styles.aiHeader}>
            <ThemedText style={styles.aiHint}>{t('profile.aiDataHint')}</ThemedText>
            <Pressable
              onPress={openAiEdit}
              style={[styles.editBtn, { backgroundColor: tonal(Brand.accent), borderColor: tonalBorder(Brand.accent) }]}
              hitSlop={6}
            >
              <Ico.Pencil size={12} color={Brand.accent} />
              <ThemedText style={[styles.editBtnText, { color: Brand.accent }]}>{t('profile.aiDataEdit')}</ThemedText>
            </Pressable>
          </View>
          <View style={styles.aiProfileRow}>
            <View style={styles.aiProfileItem}>
              <ThemedText style={styles.aiProfileLabel}>{t('profile.ageLabel')}</ThemedText>
              <ThemedText style={styles.aiProfileValue} numberOfLines={1}>
                {profile.age !== null ? `${profile.age} ${t('profile.years')}` : t('common.noData')}
              </ThemedText>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.aiProfileItem}>
              <ThemedText style={styles.aiProfileLabel}>{t('profile.genderLabel')}</ThemedText>
              <ThemedText style={styles.aiProfileValue} numberOfLines={1}>
                {profile.gender === 1 ? t('profile.genderMale') : profile.gender === 0 ? t('profile.genderFemale') : t('common.noData')}
              </ThemedText>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.aiProfileItem}>
              <ThemedText style={styles.aiProfileLabel}>{t('profile.bmiLabel')}</ThemedText>
              <ThemedText style={styles.aiProfileValue} numberOfLines={1}>
                {profile.bmiCategory === 0 ? t('profile.bmiNormal')
                  : profile.bmiCategory === 1 ? t('profile.bmiOverweight')
                  : profile.bmiCategory === 2 ? t('profile.bmiObese') : t('common.noData')}
              </ThemedText>
            </View>
          </View>
        </Card>


        {/* ── Achievements ────────────────────────────────────────── */}
        <SectionHeader title={t('profile.achievements')} />
        <Card variant="bordered" animated={false}>
          <View style={styles.achievementsGrid}>
            {([
              { icon: 'Moon',     label: t('profile.ach_first'),   unlocked: entries.length >= 1 },
              { icon: 'Flame',    label: t('profile.ach_streak3'), unlocked: streak >= 3 },
              { icon: 'Star',     label: t('profile.ach_10'),      unlocked: entries.length >= 10 },
              { icon: 'Trophy',   label: t('profile.ach_streak7'), unlocked: streak >= 7 },
              { icon: 'Heart',    label: t('profile.ach_8h'),      unlocked: bestSleepNight >= 8 },
              { icon: 'ChartBar', label: t('profile.ach_20'),      unlocked: entries.length >= 20 },
            ] as const).map((a) => (
              <AchievementBadge
                key={a.icon}
                icon={a.icon}
                label={a.label}
                unlocked={a.unlocked}
                boxSize={achievementBoxSize}
              />
            ))}
          </View>
        </Card>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── AI Profile Edit Modal ─────────────────────────────────── */}
      <Modal
        visible={editingAiProfile}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingAiProfile(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <ThemedText style={styles.modalTitle}>{t('profile.editAiTitle')}</ThemedText>
            <ThemedText style={styles.modalSub}>{t('profile.editAiSubtitle')}</ThemedText>

            <View style={styles.aiEditGroup}>
              <ThemedText style={styles.aiEditLabel}>{t('profile.editAgeLabel')}</ThemedText>
              <View style={styles.aiEditInputWrap}>
                <TextInput
                  style={styles.aiEditInput}
                  value={tempAge}
                  onChangeText={(v) => setTempAge(v.replace(/[^0-9]/g, ''))}
                  placeholder={t('profile.editAgePlaceholder')}
                  placeholderTextColor={Brand.textMuted}
                  keyboardType="numeric"
                  maxLength={3}
                />
              </View>
            </View>

            <View style={styles.aiEditGroup}>
              <ThemedText style={styles.aiEditLabel}>{t('profile.editGenderLabel')}</ThemedText>
              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                {(['male', 'female'] as const).map((key, val) => {
                  const active = tempGender === val;
                  return (
                    <Pressable
                      key={key}
                      onPress={() => setTempGender(active ? null : (val as 0 | 1))}
                      style={[
                        styles.chipBtn,
                        { flex: 1 },
                        active
                          ? { backgroundColor: Brand.accentSoft, borderColor: Brand.accentBorder }
                          : { backgroundColor: Brand.surfaceElevated, borderColor: Brand.border },
                      ]}
                    >
                      <ThemedText style={{ ...Type.bodyM, color: active ? Brand.accent : Brand.textSecondary, fontWeight: active ? '700' : '500' }}>
                        {key === 'male' ? t('profile.genderMale') : t('profile.genderFemale')}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.aiEditGroup}>
              <ThemedText style={styles.aiEditLabel}>{t('profile.editBmiLabel')}</ThemedText>
              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                {([t('profile.bmiNormal'), t('profile.bmiOverweight'), t('profile.bmiObese')] as const).map((label, i) => {
                  const active = tempBmi === i;
                  return (
                    <Pressable
                      key={i}
                      onPress={() => setTempBmi(active ? null : (i as 0 | 1 | 2))}
                      style={[
                        styles.chipBtn,
                        { flex: 1 },
                        active
                          ? { backgroundColor: Brand.accentSoft, borderColor: Brand.accentBorder }
                          : { backgroundColor: Brand.surfaceElevated, borderColor: Brand.border },
                      ]}
                    >
                      <ThemedText style={{ ...Type.bodyS, color: active ? Brand.accent : Brand.textSecondary, fontWeight: active ? '700' : '500', fontSize: 13 }}>
                        {label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.modalActions}>
              <Btn label={t('common.cancel')} variant="secondary" onPress={() => setEditingAiProfile(false)} fullWidth />
              <Btn label={t('common.save')} onPress={saveAiProfile} fullWidth />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.background },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 8,
    paddingBottom: 12,
    alignItems: 'center',
  },
  headerTitle: { ...Type.titleL, color: Brand.textPrimary },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.md, paddingBottom: 32 },

  // Hero
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Brand.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...Type.titleL, color: Brand.textInverse, fontSize: 22 },
  streakBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: tonal(Brand.flame),
    borderWidth: 1,
    borderColor: tonalBorder(Brand.flame),
  },
  streakBadgeText: { ...Type.monoS, color: Brand.flame, fontSize: 10 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nameText: { ...Type.titleM, color: Brand.textPrimary },
  nameEditRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nameInput: {
    flex: 1,
    color: Brand.textPrimary,
    fontFamily: Type.titleS.fontFamily,
    fontSize: 16,
    fontWeight: '600',
    borderBottomWidth: 1,
    borderBottomColor: Brand.accent,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  nameEditBtn: { padding: 4 },
  emailText: { ...Type.bodyS, color: Brand.textSecondary, fontSize: 12 },
  levelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginTop: 2,
  },
  levelText: { ...Type.monoS, fontSize: 11, letterSpacing: 0.4 },

  // Stats grid (4-up)
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statBoxPressable: { width: '48%' },
  statBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  statBoxIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statBoxValue: { ...Type.monoL, color: Brand.textPrimary, fontSize: 22 },
  statBoxSub: { ...Type.monoS, fontSize: 11, marginTop: -2 },
  statBoxLabel: { ...Type.bodyS, color: Brand.textSecondary, fontSize: 11, textAlign: 'center', marginTop: 2 },

  // Summary card
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center', gap: 6 },
  summaryDivider: { width: 1, height: 36, backgroundColor: Brand.borderSoft },
  summaryLabel: { ...Type.section, color: Brand.textMuted, fontSize: 10 },
  summaryValue: { ...Type.monoM, color: Brand.textPrimary, fontSize: 16 },

  goalSection: { marginTop: 16, gap: 8 },
  goalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  goalLabel: { ...Type.bodyS, color: Brand.textSecondary, fontSize: 12 },
  goalPct: { ...Type.monoS, color: Brand.accent, fontSize: 12, fontWeight: '700' },
  goalTrack: { height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: Brand.borderSoft },
  goalBar: { height: '100%', borderRadius: 3 },

  // AI data card
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  aiHint: { ...Type.bodyS, color: Brand.textSecondary, fontSize: 12, flex: 1 },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  editBtnText: { ...Type.bodyS, fontSize: 11, fontWeight: '600' },

  aiProfileRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  aiProfileItem: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 4 },
  aiProfileLabel: { ...Type.section, color: Brand.textMuted, fontSize: 10 },
  aiProfileValue: { ...Type.monoM, color: Brand.textPrimary, fontSize: 14 },

  // Achievements
  achievementsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'flex-start' },
  achievement: { alignItems: 'center', gap: 6 },
  achievementIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievementLabel: { ...Type.bodyS, fontSize: 10, fontWeight: '500', textAlign: 'center' },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Brand.surface,
    borderRadius: BorderRadius.card,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Brand.border,
  },
  modalTitle: { ...Type.titleM, color: Brand.textPrimary, marginBottom: 4 },
  modalSub: { ...Type.bodyS, color: Brand.textSecondary, marginBottom: Spacing.md },

  aiEditGroup: { marginTop: Spacing.sm, gap: 8 },
  aiEditLabel: { ...Type.section, color: Brand.textMuted, fontSize: 10 },
  aiEditInputWrap: {
    backgroundColor: Brand.surfaceElevated,
    borderColor: Brand.border,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
  },
  aiEditInput: {
    color: Brand.textPrimary,
    fontFamily: Type.bodyM.fontFamily,
    fontSize: 16,
    height: 48,
    padding: 0,
  },
  chipBtn: {
    minHeight: Spacing.hitArea,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
});
