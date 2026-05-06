import * as React from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { BorderRadius, Colors, Spacing } from '@/constants/theme';
import { useTranslation } from '@/contexts/i18n-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { api } from '@/services/api';
import { generateInsight, useSleepJournal } from '@/hooks/use-sleep-journal';

type AiPrediction = {
  quality: number;
  remPercentage: number;
  deepSleepPercentage: number;
  awakeningsCategory: number;
  topFactors: Array<{ feature: string; impact: number }>;
  message: string;
};

type Props = {
  onEntrySaved: (insight: string) => void;
};

export function QuickEntryForm({ onEntrySaved }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const colors = Colors[colorScheme];
  const textColor = useThemeColor({}, 'text');
  const { t } = useTranslation();
  const { addEntry } = useSleepJournal();

  const [sleepHoursText, setSleepHoursText] = React.useState('7.5');
  const [stressLevelText, setStressLevelText] = React.useState('4');
  const [bedtimeHourText, setBedtimeHourText] = React.useState(
    String(new Date().getHours()),
  );
  const [activityText, setActivityText] = React.useState('30');

  const [isPredicting, setIsPredicting] = React.useState(false);
  const [aiPrediction, setAiPrediction] = React.useState<AiPrediction | null>(null);

  const [showFeedback, setShowFeedback] = React.useState(false);
  const [feedbackRating, setFeedbackRating] = React.useState<number | null>(null);

  const handlePredictSleep = async () => {
    setIsPredicting(true);
    try {
      const sleepHours = Number(sleepHoursText.replace(',', '.')) || 7.5;
      const stressLevelNum = Number(stressLevelText) || 4;
      const bedtimeHour = Number(bedtimeHourText) || new Date().getHours();
      const activity = Number(activityText) || 30;

      const response = await api.predictSleepQuality({
        sleepDuration: sleepHours,
        stressLevel: stressLevelNum,
        heartRate: 65,
        physicalActivity: activity,
        bedtimeHour,
      });
      setAiPrediction({
        quality: response.predictedQuality,
        remPercentage: response.remPercentage,
        deepSleepPercentage: response.deepSleepPercentage,
        awakeningsCategory: response.awakeningsCategory ?? 0,
        topFactors: response.topFactors ?? [],
        message: response.message,
      });
    } catch {
      setAiPrediction({
        quality: 0,
        remPercentage: 0,
        deepSleepPercentage: 0,
        awakeningsCategory: 0,
        topFactors: [],
        message: t('modal.errorMsg'),
      });
    } finally {
      setIsPredicting(false);
    }
  };

  const onSave = async () => {
    const sleepHours = Number(sleepHoursText.replace(',', '.'));
    const stressLevelNum = Number(stressLevelText);
    if (!Number.isFinite(sleepHours) || sleepHours < 0 || sleepHours > 24) return;
    if (!Number.isFinite(stressLevelNum) || stressLevelNum < 1 || stressLevelNum > 10) return;

    const saved = await addEntry({ sleepHours, stressLevel: stressLevelNum, note: '' });
    onEntrySaved(generateInsight(saved, t));

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
  };

  return (
    <Animated.View entering={FadeIn.duration(300)}>
      <View style={[styles.card, { backgroundColor: isDark ? '#1E1E2D' : '#FFFFFF', borderColor: isDark ? '#2C2C3E' : '#E5E7EB' }]}>
        {/* Card header */}
        <View style={styles.headerRow}>
          <View style={[styles.iconWrapper, { backgroundColor: isDark ? '#2D234A' : `${colors.tint}18` }]}>
            <IconSymbol name="moon.stars.fill" size={18} color={colors.tint} />
          </View>
          <ThemedText style={styles.cardTitle}>{t('home.sleepRecord')}</ThemedText>
        </View>

        {/* 2x2 Input Grid */}
        <View style={styles.inputRow}>
          <InputField
            icon="moon.fill"
            iconColor="#FBBF24"
            label={t('home.sleepHours')}
            value={sleepHoursText}
            onChangeText={setSleepHoursText}
            keyboardType="decimal-pad"
            placeholder="7.5"
            suffix="h"
            textColor={textColor}
            colors={colors}
            isDark={isDark}
          />
          <InputField
            icon="bolt.heart.fill"
            iconColor="#F87171"
            label={t('home.stress')}
            value={stressLevelText}
            onChangeText={setStressLevelText}
            keyboardType="number-pad"
            placeholder="4"
            suffix="/10"
            textColor={textColor}
            colors={colors}
            isDark={isDark}
          />
        </View>

        <View style={styles.inputRow}>
          <InputField
            icon="clock.fill"
            iconColor="#60A5FA"
            label={t('home.bedtime')}
            value={bedtimeHourText}
            onChangeText={setBedtimeHourText}
            keyboardType="number-pad"
            placeholder="23"
            suffix=":00"
            textColor={textColor}
            colors={colors}
            isDark={isDark}
          />
          <InputField
            icon="bolt.fill"
            iconColor="#4ADE80"
            label={t('home.activity')}
            value={activityText}
            onChangeText={setActivityText}
            keyboardType="number-pad"
            placeholder="30"
            suffix="m"
            textColor={textColor}
            colors={colors}
            isDark={isDark}
          />
        </View>

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <Pressable
            onPress={onSave}
            style={[styles.btnSecondary, { borderColor: isDark ? '#2C2C3E' : '#E5E7EB', backgroundColor: 'transparent' }]}
          >
            <ThemedText style={[styles.btnText, { color: isDark ? '#E2D8F0' : colors.text }]}>
              {t('common.save')}
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={handlePredictSleep}
            disabled={isPredicting}
            style={[styles.btnPrimary, { backgroundColor: colors.tint, opacity: isPredicting ? 0.7 : 1 }]}
          >
            <IconSymbol name="sparkles" size={15} color="#1a1228" />
            <ThemedText style={styles.btnPrimaryText}>
              {isPredicting ? t('home.analyzing') : t('home.aiAnalysis')}
            </ThemedText>
          </Pressable>
        </View>

        {aiPrediction !== null && (
          <AiPredictionResult
            prediction={aiPrediction}
            sleepHoursText={sleepHoursText}
            stressLevelText={stressLevelText}
            showFeedback={showFeedback}
            setShowFeedback={setShowFeedback}
            feedbackRating={feedbackRating}
            setFeedbackRating={setFeedbackRating}
            onFeedbackSelect={(n) => {
              setFeedbackRating(n);
              setShowFeedback(false);
              addEntry({
                sleepHours: Number(sleepHoursText) || 7.5,
                stressLevel: Number(stressLevelText) || 4,
                note: `feedback:${n}`,
              });
            }}
            colors={colors}
            t={t}
          />
        )}
      </View>
    </Animated.View>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

type InputFieldProps = {
  icon: string;
  iconColor: string;
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType: 'decimal-pad' | 'number-pad';
  placeholder: string;
  suffix?: string;
  textColor: string;
  colors: any;
  isDark: boolean;
};

function InputField({
  icon, iconColor, label, value, onChangeText, keyboardType,
  placeholder, suffix, textColor, colors, isDark,
}: InputFieldProps) {
  return (
    <View style={styles.inputField}>
      {/* Icon + label */}
      <View style={styles.inputLabelRow}>
        <View style={[styles.inputIconBadge, { backgroundColor: `${iconColor}22` }]}>
          <IconSymbol name={icon as any} size={12} color={iconColor} />
        </View>
        <ThemedText style={[styles.inputLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>{label}</ThemedText>
      </View>
      <View style={[styles.inputContainer, {
        backgroundColor: isDark ? '#151522' : colors.inputBackground,
        borderColor: isDark ? '#2C2C3E' : colors.inputBorder,
      }]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          placeholder={placeholder}
          placeholderTextColor={isDark ? '#4B5563' : '#9CA3AF'}
          style={[styles.input, { color: textColor, fontWeight: '600', fontSize: 18 }]}
        />
        {suffix && (
          <ThemedText style={[styles.inputSuffix, { color: isDark ? '#6B7280' : '#9CA3AF' }]}>{suffix}</ThemedText>
        )}
      </View>
    </View>
  );
}

type AiPredictionResultProps = {
  prediction: AiPrediction;
  sleepHoursText: string;
  stressLevelText: string;
  showFeedback: boolean;
  setShowFeedback: (v: boolean) => void;
  feedbackRating: number | null;
  setFeedbackRating: (n: number) => void;
  onFeedbackSelect: (n: number) => void;
  colors: any;
  t: (key: string) => string;
};

function AiPredictionResult({
  prediction, showFeedback, setShowFeedback, feedbackRating, onFeedbackSelect, colors, t,
}: AiPredictionResultProps) {
  return (
    <Animated.View
      entering={FadeInDown.springify()}
      style={[styles.predictionBox, {
        borderColor: `${colors.tint}50`,
        backgroundColor: `${colors.tint}10`,
      }]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 6 }}>
        <IconSymbol name="sparkles" size={16} color={colors.tint} />
        <ThemedText style={{ fontSize: 15, fontWeight: 'bold', color: colors.tint }}>
          {t('home.aiAnalysisTitle')}
        </ThemedText>
      </View>

      <View style={styles.metricsRow}>
        {[
          { value: `${prediction.quality}%`, label: t('home.qualityLabel'), color: colors.tint },
          { value: `${prediction.remPercentage}%`, label: t('home.remLabel'), color: colors.remSleep },
          { value: `${prediction.deepSleepPercentage}%`, label: t('home.deepLabel'), color: colors.deepSleep },
          {
            value: prediction.awakeningsCategory === 0
              ? t('home.awakeningsNormal')
              : t('home.awakeningsDisturbed'),
            label: t('home.awakeningsLabel'),
            color: prediction.awakeningsCategory === 0 ? '#10B981' : colors.warning,
          },
        ].map((m) => (
          <View key={m.label} style={styles.metric}>
            <ThemedText style={[styles.metricValue, { color: m.color }]} numberOfLines={1}>{m.value}</ThemedText>
            <ThemedText style={styles.metricLabel}>{m.label}</ThemedText>
          </View>
        ))}
      </View>

      {prediction.topFactors.length > 0 && (
        <View style={[styles.factorsBox, { backgroundColor: `${colors.tint}08`, borderColor: `${colors.tint}20` }]}>
          <ThemedText style={[styles.factorsTitle, { color: colors.textSecondary }]}>
            {t('home.topFactorsTitle')}
          </ThemedText>
          {prediction.topFactors.map((f, i) => {
            const positive = f.impact >= 0;
            const impactColor = positive ? '#10B981' : '#EF4444';
            return (
              <View key={i} style={styles.factorRow}>
                <IconSymbol
                  name={positive ? 'arrow.up.circle.fill' : 'arrow.down.circle.fill'}
                  size={14}
                  color={impactColor}
                />
                <ThemedText style={[styles.factorName, { color: colors.text }]} numberOfLines={1}>
                  {f.feature}
                </ThemedText>
                <ThemedText style={[styles.factorImpact, { color: impactColor }]}>
                  {positive ? '+' : ''}{f.impact}%
                </ThemedText>
              </View>
            );
          })}
        </View>
      )}

      <ThemedText style={{ fontSize: 13, opacity: 0.9, lineHeight: 18 }}>
        {prediction.message}
      </ThemedText>

      {!showFeedback ? (
        <Pressable
          onPress={() => setShowFeedback(true)}
          style={[styles.feedbackPrompt, {
            borderColor: `${colors.accent}40`,
            backgroundColor: `${colors.accent}08`,
          }]}
        >
          <IconSymbol name="sun.horizon.fill" size={14} color={colors.accent} />
          <ThemedText style={{ fontSize: 12, color: colors.accent, marginLeft: 6 }}>
            {t('home.morningQuestion')}
          </ThemedText>
        </Pressable>
      ) : (
        <Animated.View
          entering={FadeInDown.springify()}
          style={[styles.feedbackBox, {
            backgroundColor: `${colors.accent}08`,
            borderColor: `${colors.accent}30`,
          }]}
        >
          <ThemedText style={{ fontSize: 13, fontWeight: '600', marginBottom: 8, color: colors.accent }}>
            {t('home.nightRating')}
          </ThemedText>
          <View style={styles.feedbackStars}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <Pressable
                key={n}
                onPress={() => onFeedbackSelect(n)}
                style={[styles.feedbackBtn, {
                  backgroundColor: feedbackRating === n ? colors.accent : `${colors.accent}20`,
                }]}
              >
                <ThemedText style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: feedbackRating === n ? '#fff' : colors.accent,
                }}>
                  {n}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </Animated.View>
      )}

      {feedbackRating !== null && !showFeedback && (
        <ThemedText style={{ fontSize: 12, opacity: 0.7, marginTop: 4, textAlign: 'center' }}>
          {t('home.ratingSaved').replace('{{n}}', String(feedbackRating))}
        </ThemedText>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: Spacing.lg,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  iconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  inputField: { flex: 1 },
  inputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  inputIconBadge: {
    width: 20,
    height: 20,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '500',
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
    height: 52,
    paddingHorizontal: Spacing.md,
  },
  inputSuffix: {
    fontSize: 14,
    fontWeight: '500',
    paddingRight: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  btnSecondary: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  btnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  btnPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1228',
  },
  predictionBox: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  metric: {
    alignItems: 'center',
    flex: 1,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  metricLabel: {
    fontSize: 11,
    opacity: 0.7,
    marginTop: 2,
  },
  factorsBox: {
    marginTop: 10,
    marginBottom: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  factorsTitle: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  factorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  factorName: {
    flex: 1,
    fontSize: 13,
  },
  factorImpact: {
    fontSize: 13,
    fontWeight: '700',
    minWidth: 46,
    textAlign: 'right',
  },
  feedbackPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  feedbackBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  feedbackStars: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
  },
  feedbackBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
