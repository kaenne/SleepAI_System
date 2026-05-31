import { router } from 'expo-router';
import * as React from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Btn } from '@/components/ui/btn';
import { Card } from '@/components/ui/card';
import { Ico, type IcoName } from '@/components/ui/ico';
import { BorderRadius, Brand, Spacing, Type, tonal, tonalBorder } from '@/constants/theme';
import { useTranslation } from '@/contexts/i18n-context';
import { useSleepJournal } from '@/hooks/use-sleep-journal';

// ── Helpers ──────────────────────────────────────────────────────────────────
import {
  SLEEP_MAX_HOURS as SLEEP_MAX,
  SLEEP_MIN_HOURS as SLEEP_MIN,
  SLEEP_NORM_FROM as NORM_FROM,
  SLEEP_NORM_TO as NORM_TO,
} from '@/constants/sleep';

function feelingForSleep(hours: number): { key: string; tone: string } {
  if (hours < 4) return { key: 'modal.feeling_exhausted', tone: '#ff6b6b' };
  if (hours < 6) return { key: 'modal.feeling_tired', tone: Brand.warn };
  if (hours <= 9) return { key: 'modal.feeling_rested', tone: Brand.good };
  if (hours <= 10) return { key: 'modal.feeling_neutral', tone: Brand.info };
  return { key: 'modal.feeling_great', tone: Brand.info };
}

function stateForStress(level: number): { key: string; tone: string } {
  if (level <= 2) return { key: 'modal.state_calm', tone: Brand.good };
  if (level <= 4) return { key: 'modal.state_neutral', tone: Brand.good };
  if (level <= 6) return { key: 'modal.state_neutral', tone: Brand.warn };
  if (level <= 8) return { key: 'modal.state_tense', tone: Brand.warn };
  return { key: 'modal.state_overwhelmed', tone: '#ff6b6b' };
}

function todayLabel(): string {
  const d = new Date();
  // Always use the user's locale through Intl — week-day and short month auto.
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
}

// ── Card pieces ──────────────────────────────────────────────────────────────
function SectionTitle({ icon, iconColor, title, value }: { icon: IcoName; iconColor: string; title: string; value: React.ReactNode }) {
  const Icon = Ico[icon];
  return (
    <View style={styles.sectionTitleRow}>
      <View style={[styles.iconChip, { backgroundColor: tonal(iconColor), borderColor: tonalBorder(iconColor) }]}>
        <Icon size={20} color={iconColor} />
      </View>
      <ThemedText style={styles.sectionTitleText}>{title}</ThemedText>
      <View style={styles.valuePill}>
        <ThemedText style={styles.valuePillText}>{value}</ThemedText>
      </View>
    </View>
  );
}

function StatusChip({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <View style={[styles.statusChip, { backgroundColor: tonal(tone), borderColor: tonalBorder(tone) }]}>
      <View style={[styles.statusDot, { backgroundColor: tone }]} />
      <ThemedText style={styles.statusLabel}>{label}</ThemedText>
      <ThemedText style={styles.statusSeparator}>·</ThemedText>
      <ThemedText style={[styles.statusValue, { color: tone }]}>{value}</ThemedText>
    </View>
  );
}

// ── Sleep slider — pressable track with thumb. No external dep. ──────────────
function SleepSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const trackRef = React.useRef<View>(null);
  const [trackWidth, setTrackWidth] = React.useState(0);

  const pct = ((value - SLEEP_MIN) / (SLEEP_MAX - SLEEP_MIN)) * 100;
  const normStartPct = ((NORM_FROM - SLEEP_MIN) / (SLEEP_MAX - SLEEP_MIN)) * 100;
  const normEndPct = ((NORM_TO - SLEEP_MIN) / (SLEEP_MAX - SLEEP_MIN)) * 100;

  const handleTouch = (locationX: number) => {
    if (trackWidth === 0) return;
    const rawHours = (locationX / trackWidth) * (SLEEP_MAX - SLEEP_MIN) + SLEEP_MIN;
    const rounded = Math.round(rawHours * 2) / 2; // 0.5h step
    onChange(Math.max(SLEEP_MIN, Math.min(SLEEP_MAX, rounded)));
  };

  return (
    <View
      ref={trackRef}
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onResponderGrant={(e) => handleTouch(e.nativeEvent.locationX)}
      onResponderMove={(e) => handleTouch(e.nativeEvent.locationX)}
      style={styles.sliderTrack}
    >
      {/* Inactive base track — always visible across full range */}
      <View pointerEvents="none" style={styles.sliderBaseTrack} />
      {/* Norm zone overlay */}
      <View
        pointerEvents="none"
        style={[
          styles.sliderNormZone,
          {
            left: `${normStartPct}%`,
            width: `${normEndPct - normStartPct}%`,
          },
        ]}
      />
      {/* Active fill */}
      <View pointerEvents="none" style={[styles.sliderFill, { width: `${pct}%` }]} />
      {/* Thumb */}
      <View
        pointerEvents="none"
        style={[
          styles.sliderThumb,
          // Subtract half the thumb width so the centre lines up with the value.
          { left: `${pct}%`, marginLeft: -10 },
        ]}
      />
    </View>
  );
}

// ── Stress dots — discrete 1..10 ─────────────────────────────────────────────
function StressDots({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <View style={styles.stressRow}>
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
        const filled = n <= value;
        const color = n <= 4 ? Brand.good : n <= 7 ? Brand.warn : '#ff6b6b';
        return (
          <Pressable
            key={n}
            onPress={() => onChange(n)}
            hitSlop={6}
            style={[
              styles.stressDot,
              {
                backgroundColor: filled ? color : Brand.surfaceElevated,
                borderColor: filled ? color : Brand.border,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

// ── Note chips — toggleable suggestion tags ──────────────────────────────────
const CHIP_KEYS = ['chip_dreams', 'chip_tired', 'chip_caffeine', 'chip_sport', 'chip_stress'] as const;

function NoteChips({ noteText, onToggle, t }: { noteText: string; onToggle: (text: string) => void; t: (k: string) => string }) {
  return (
    <View style={styles.chipsRow}>
      {CHIP_KEYS.map((key) => {
        const label = t(`modal.${key}`);
        // A chip is "on" when its label appears in the note text as a whole word.
        const isOn = new RegExp(`(^|[\\s,])${escapeRegExp(label)}([\\s,]|$)`, 'i').test(noteText);
        return (
          <Pressable
            key={key}
            onPress={() => onToggle(label)}
            style={[
              styles.chip,
              isOn
                ? { backgroundColor: Brand.accentSoft, borderColor: Brand.accentBorder }
                : { backgroundColor: 'transparent', borderColor: Brand.border },
            ]}
          >
            <ThemedText style={[styles.chipText, isOn && { color: Brand.accent }]}>
              {label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ── Screen ───────────────────────────────────────────────────────────────────
export default function AddSleepEntryModal() {
  const { addEntry } = useSleepJournal();
  const { t } = useTranslation();

  const [sleepHours, setSleepHours] = React.useState(7);
  const [stressLevel, setStressLevel] = React.useState(5);
  const [note, setNote] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const feeling = feelingForSleep(sleepHours);
  const stressState = stateForStress(stressLevel);

  // Format `7 h`, `7.5 h` — keep mono spacing tight.
  const sleepDisplay = Number.isInteger(sleepHours) ? `${sleepHours} h` : `${sleepHours} h`;

  // Tapping a chip toggles its label inside the note text directly.
  // If already present, remove it; otherwise append (comma-separated).
  const toggleChip = React.useCallback((label: string) => {
    setNote((prev) => {
      const re = new RegExp(`(^|[\\s,])${escapeRegExp(label)}([\\s,]|$)`, 'i');
      if (re.test(prev)) {
        return prev.replace(re, (_, before, after) => (before && after && after !== '' ? `${before}` : '')).replace(/\s*,\s*,\s*/g, ', ').replace(/^[\s,]+|[\s,]+$/g, '').trim();
      }
      const trimmed = prev.trim();
      return trimmed ? `${trimmed}, ${label}` : label;
    });
  }, []);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const finalNote = note.trim();
      await addEntry({
        sleepHours,
        stressLevel,
        note: finalNote || undefined,
      });
      Alert.alert(t('modal.savedTitle'), t('modal.savedMsg'), [
        { text: t('common.ok'), onPress: () => router.back() },
      ]);
    } catch (e: unknown) {
      const err = e as { message?: string };
      Alert.alert(t('common.error'), err?.message || t('modal.errorMsg'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Brand.background }}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.closeBtn} hitSlop={8}>
            <Ico.Close size={20} color={Brand.textSecondary} />
          </Pressable>
          <View style={styles.headerCenter}>
            <ThemedText style={styles.headerTitle}>{t('modal.title')}</ThemedText>
            <ThemedText style={styles.headerDate}>{todayLabel()}</ThemedText>
          </View>
          <ThemedText style={styles.pageIndicator}>
            {t('modal.pageIndicator', { n: 1, total: 1 })}
          </ThemedText>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Sleep duration ─────────────────────────────────────────── */}
          <Card variant="bordered" animated={false}>
            <SectionTitle
              icon="Moon"
              iconColor={Brand.accent}
              title={t('modal.sleepDuration')}
              value={sleepDisplay}
            />

            <View style={{ marginTop: 8 }}>
              <SleepSlider value={sleepHours} onChange={setSleepHours} />
            </View>

            <View style={styles.sliderLabelsRow}>
              <ThemedText style={styles.sliderEdgeLabel}>{SLEEP_MIN}h</ThemedText>
              <ThemedText style={styles.sliderCenterLabel}>
                {t('modal.normHint', { from: NORM_FROM, to: NORM_TO })}
              </ThemedText>
              <ThemedText style={styles.sliderEdgeLabel}>{SLEEP_MAX}h</ThemedText>
            </View>

            <StatusChip label={t('modal.feelingLabel')} value={t(feeling.key)} tone={feeling.tone} />
          </Card>

          {/* ── Stress level ───────────────────────────────────────────── */}
          <Card variant="bordered" animated={false}>
            <SectionTitle
              icon="Smile"
              iconColor={Brand.warn}
              title={t('modal.stressLevel')}
              value={`${stressLevel} /10`}
            />

            <View style={{ marginTop: 8 }}>
              <StressDots value={stressLevel} onChange={setStressLevel} />
            </View>

            <View style={styles.sliderLabelsRow}>
              <ThemedText style={styles.sliderEdgeLabel}>{t('modal.low')}</ThemedText>
              <ThemedText style={styles.sliderCenterLabel}>{t('modal.medium')}</ThemedText>
              <ThemedText style={styles.sliderEdgeLabel}>{t('modal.high')}</ThemedText>
            </View>

            <StatusChip label={t('modal.stateLabel')} value={t(stressState.key)} tone={stressState.tone} />
          </Card>

          {/* ── Notes ──────────────────────────────────────────────────── */}
          <Card variant="bordered" animated={false}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.iconChip, { backgroundColor: tonal(Brand.info), borderColor: tonalBorder(Brand.info) }]}>
                <Ico.Note size={20} color={Brand.info} />
              </View>
              <ThemedText style={styles.sectionTitleText}>
                {t('modal.notesLabel')}{' '}
                <ThemedText style={styles.sectionTitleHint}>· {t('modal.notesOptional')}</ThemedText>
              </ThemedText>
              <ThemedText style={styles.counterText}>
                {t('modal.notesCounter', { n: note.length })}
              </ThemedText>
            </View>

            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder={t('modal.notesPlaceholder')}
              placeholderTextColor={Brand.textMuted}
              multiline
              maxLength={500}
              style={styles.noteInput}
            />

            <NoteChips noteText={note} onToggle={toggleChip} t={t} />
          </Card>

          <View style={{ height: 80 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <SafeAreaView edges={['bottom']} style={{ backgroundColor: Brand.background }}>
        <View style={styles.footer}>
          <Btn
            label={t('modal.cancelBtn')}
            variant="secondary"
            onPress={() => router.back()}
            fullWidth
          />
          <Btn
            label={isSubmitting ? t('modal.saving') : t('modal.saveBtn')}
            onPress={handleSubmit}
            disabled={isSubmitting}
            leading={<Ico.Plus size={18} color={Brand.textInverse} />}
            fullWidth
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.background },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    gap: 12,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1 },
  headerTitle: { ...Type.titleM, color: Brand.textPrimary },
  headerDate: { ...Type.bodyS, color: Brand.textSecondary, marginTop: 2 },
  pageIndicator: { ...Type.monoS, color: Brand.textMuted },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.md, paddingTop: 4, gap: Spacing.md },

  // Section title row (used inside each card)
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconChip: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitleText: { ...Type.titleS, color: Brand.textPrimary, flex: 1, fontSize: 15 },
  sectionTitleHint: { ...Type.bodyS, color: Brand.textMuted, fontWeight: '400' },
  valuePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: Brand.accentSoft,
    borderColor: Brand.accentBorder,
    borderWidth: 1,
    borderRadius: BorderRadius.full,
  },
  valuePillText: { ...Type.monoM, color: Brand.accent, fontSize: 13 },
  counterText: { ...Type.monoS, color: Brand.textMuted },

  // Sleep slider
  sliderTrack: {
    height: 28,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  // Inactive track always visible across the full range
  sliderBaseTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: 6,
    marginTop: -3,
    backgroundColor: Brand.surfaceElevated,
    borderRadius: 3,
  },
  sliderNormZone: {
    position: 'absolute',
    top: '50%',
    height: 6,
    marginTop: -3,
    backgroundColor: Brand.accentSoft,
    borderRadius: 3,
  },
  sliderFill: {
    position: 'absolute',
    top: '50%',
    height: 6,
    marginTop: -3,
    backgroundColor: Brand.accent,
    borderRadius: 3,
  },
  sliderThumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: Brand.accent,
    top: '50%',
    marginTop: -10,
  },
  sliderLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  sliderEdgeLabel: { ...Type.monoS, color: Brand.textMuted, fontSize: 11 },
  sliderCenterLabel: { ...Type.monoS, color: Brand.textSecondary, fontSize: 11, letterSpacing: 0.4 },

  // Stress dots
  stressRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 6,
  },
  stressDot: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 28,
    borderRadius: 6,
    borderWidth: 1,
  },

  // Status chip (under each section)
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginTop: 12,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusLabel: { ...Type.bodyS, color: Brand.textSecondary, fontSize: 12 },
  statusSeparator: { ...Type.bodyS, color: Brand.textMuted, fontSize: 12 },
  statusValue: { ...Type.bodyS, fontSize: 12, fontWeight: '600' },

  // Notes
  noteInput: {
    marginTop: 8,
    minHeight: 90,
    backgroundColor: Brand.surfaceElevated,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Brand.border,
    padding: 14,
    color: Brand.textPrimary,
    fontFamily: Type.bodyM.fontFamily,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { ...Type.bodyS, color: Brand.textSecondary, fontSize: 13 },

  // Footer
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Brand.borderSoft,
  },
});
