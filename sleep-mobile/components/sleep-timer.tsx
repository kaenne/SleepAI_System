import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Pressable, Vibration, Modal, Platform } from 'react-native';
import Animated, { 
  FadeIn, 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withTiming,
  Easing 
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Brand, BorderRadius, Spacing } from '@/constants/theme';
import { scheduleWakeUpAlarm, cancelWakeUpAlarm } from '@/hooks/use-notifications';
import { api } from '@/services/api';
import { useTranslation } from '@/contexts/i18n-context';
import { StorageKeys } from '@/constants/storage';

const SLEEP_SESSION_KEY = StorageKeys.ACTIVE_SESSION;

type SleepSession = {
  startTime: string;
  isActive: boolean;
  wakeUpHour?: number;
  wakeUpMinute?: number;
};

export function SleepTimer() {
  const { t } = useTranslation();
  
  const [session, setSession] = useState<SleepSession | null>(null);
  const [elapsed, setElapsed] = useState('00:00:00');
  const [isLoading, setIsLoading] = useState(false);

  // Alarm picker state
  const [showAlarmPicker, setShowAlarmPicker] = useState(false);
  const [alarmHour, setAlarmHour] = useState(7);
  const [alarmMinute, setAlarmMinute] = useState(0);

  // Morning feedback state
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState<number | null>(null);
  const [pendingStop, setPendingStop] = useState<{ endTime: Date; durationHours: number } | null>(null);
  
  const pulseScale = useSharedValue(1);
  
  // Load session from storage
  useEffect(() => {
    loadSession();
  }, []);
  
  // Update elapsed time
  useEffect(() => {
    if (!session?.isActive) return;
    
    const interval = setInterval(() => {
      const start = new Date(session.startTime).getTime();
      const now = Date.now();
      const diff = now - start;
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setElapsed(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    }, 1000);
    
    return () => clearInterval(interval);
  }, [session]);
  
  // Subtle breathing animation on the moon icon when sleeping
  useEffect(() => {
    if (session?.isActive) {
      pulseScale.value = withRepeat(
        withTiming(1.06, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      pulseScale.value = withTiming(1);
    }
  }, [session?.isActive, pulseScale]);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));
  
  const loadSession = async () => {
    try {
      const stored = await AsyncStorage.getItem(SLEEP_SESSION_KEY);
      if (stored) {
        setSession(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Failed to load session:', e);
    }
  };
  
  const startSleep = useCallback(async (withAlarm: boolean) => {
    Vibration.vibrate(100);
    setIsLoading(true);
    
    const newSession: SleepSession = {
      startTime: new Date().toISOString(),
      isActive: true,
      ...(withAlarm ? { wakeUpHour: alarmHour, wakeUpMinute: alarmMinute } : {}),
    };
    
    try {
      await AsyncStorage.setItem(SLEEP_SESSION_KEY, JSON.stringify(newSession));
      setSession(newSession);
      if (withAlarm && Platform.OS !== 'web') {
        await scheduleWakeUpAlarm(alarmHour, alarmMinute, t('notifications.wakeupTitle'), t('notifications.wakeupBody'));
      }
    } catch (e) {
      console.warn('Failed to start session:', e);
    } finally {
      setIsLoading(false);
    }
  }, [alarmHour, alarmMinute, t]);

  const handleStartPress = useCallback(() => {
    setShowAlarmPicker(true);
  }, []);

  const stopSleep = useCallback(async (rating: number | null) => {
    if (!session) return;
    
    Vibration.vibrate([100, 100, 100]);
    setIsLoading(true);

    const endTime = pendingStop?.endTime ?? new Date();
    const durationHours = pendingStop?.durationHours ??
      (endTime.getTime() - new Date(session.startTime).getTime()) / (1000 * 60 * 60);
    const startTime = new Date(session.startTime);
    
    try {
      await cancelWakeUpAlarm();
      if (api.getBaseUrl()) {
        await api.createJournalEntry({
          createdAt: startTime.toISOString(),
          sleepHours: Math.round(durationHours * 10) / 10,
          stressLevel: rating ? Math.round((11 - rating * 2)) : 5, // rating 1-5 → stress 9-1
          note: rating
            ? t('timer.sessionNoteRating').replace('{{elapsed}}', elapsed).replace('{{rating}}', String(rating))
            : t('timer.sessionNote').replace('{{elapsed}}', elapsed),
        });
      }
    } catch (e) {
      console.warn('Failed to save session to backend:', e);
    } finally {
      await AsyncStorage.removeItem(SLEEP_SESSION_KEY);
      setSession(null);
      setElapsed('00:00:00');
      setIsLoading(false);
      setShowFeedback(false);
      setPendingStop(null);
      setFeedbackRating(null);
    }
  }, [session, elapsed, pendingStop, t]);

  const handleWakeUp = useCallback(() => {
    if (!session) return;
    const endTime = new Date();
    const durationHours = (endTime.getTime() - new Date(session.startTime).getTime()) / (1000 * 60 * 60);
    setPendingStop({ endTime, durationHours });
    setFeedbackRating(null);
    setShowFeedback(true);
  }, [session]);
  
  const formatStartTime = () => {
    if (!session) return '';
    const date = new Date(session.startTime);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  return (
    <View style={styles.container}>
      {session?.isActive ? (
        <Animated.View entering={FadeIn.duration(350)} style={styles.activeSession}>
          {/* Breathing moon icon */}
          <Animated.View style={[styles.moonHalo, animatedStyle]}>
            <IconSymbol name="moon.fill" size={44} color={Brand.accent} />
          </Animated.View>

          {/* Huge elapsed timer */}
          <ThemedText style={styles.timer}>{elapsed}</ThemedText>

          {/* Meta line — start + alarm */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <ThemedText style={styles.metaLabel}>{t('timer.startedLabel')}</ThemedText>
              <ThemedText style={styles.metaValue}>{formatStartTime()}</ThemedText>
            </View>
            {session.wakeUpHour !== undefined && (
              <>
                <View style={styles.metaDivider} />
                <View style={styles.metaItem}>
                  <ThemedText style={styles.metaLabel}>{t('timer.alarm')}</ThemedText>
                  <ThemedText style={styles.metaValue}>
                    {String(session.wakeUpHour).padStart(2,'0')}:{String(session.wakeUpMinute ?? 0).padStart(2,'0')}
                  </ThemedText>
                </View>
              </>
            )}
          </View>

          {/* Wake up CTA */}
          <Pressable
            onPress={handleWakeUp}
            disabled={isLoading}
            style={[styles.wakeBtn, isLoading && { opacity: 0.6 }]}
          >
            <IconSymbol name="sun.max.fill" size={18} color={Brand.textInverse} />
            <ThemedText style={styles.wakeBtnText}>
              {isLoading ? t('timer.saving') : t('timer.wakeUp')}
            </ThemedText>
          </Pressable>
        </Animated.View>
      ) : (
        <Animated.View entering={FadeIn.duration(350)} style={styles.inactiveSession}>
          <View style={styles.moonHaloIdle}>
            <IconSymbol name="moon.fill" size={36} color={Brand.accent} />
          </View>

          <ThemedText style={styles.idleTitle}>{t('timer.titleInactive')}</ThemedText>
          <ThemedText style={styles.idleSubtitle}>{t('timer.startManually')}</ThemedText>

          <Pressable
            onPress={handleStartPress}
            disabled={isLoading}
            style={[styles.startBtn, isLoading && { opacity: 0.6 }]}
          >
            <IconSymbol name="moon.fill" size={16} color={Brand.textInverse} />
            <ThemedText style={styles.startBtnText}>
              {isLoading ? t('timer.starting') : t('timer.startSession')}
            </ThemedText>
          </Pressable>
        </Animated.View>
      )}

      {/* ── Будильник модалка ── */}
      <Modal visible={showAlarmPicker} transparent animationType="fade" onRequestClose={() => setShowAlarmPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ThemedText style={styles.modalTitle}>{t('timer.alarmTitle')}</ThemedText>
            <ThemedText style={styles.modalHint}>{t('timer.alarmHint')}</ThemedText>

            <View style={styles.timeRow}>
              <View style={styles.timeColumn}>
                <Pressable style={styles.timeBtn} onPress={() => setAlarmHour(h => (h + 1) % 24)}>
                  <IconSymbol name="chevron.up" size={20} color={Brand.accent} />
                </Pressable>
                <View style={styles.timeDisplay}>
                  <ThemedText style={styles.timeValue}>{String(alarmHour).padStart(2,'0')}</ThemedText>
                </View>
                <Pressable style={styles.timeBtn} onPress={() => setAlarmHour(h => (h - 1 + 24) % 24)}>
                  <IconSymbol name="chevron.down" size={20} color={Brand.accent} />
                </Pressable>
              </View>
              <ThemedText style={styles.timeColon}>:</ThemedText>
              <View style={styles.timeColumn}>
                <Pressable style={styles.timeBtn} onPress={() => setAlarmMinute(m => (m + 5) % 60)}>
                  <IconSymbol name="chevron.up" size={20} color={Brand.accent} />
                </Pressable>
                <View style={styles.timeDisplay}>
                  <ThemedText style={styles.timeValue}>{String(alarmMinute).padStart(2,'0')}</ThemedText>
                </View>
                <Pressable style={styles.timeBtn} onPress={() => setAlarmMinute(m => (m - 5 + 60) % 60)}>
                  <IconSymbol name="chevron.down" size={20} color={Brand.accent} />
                </Pressable>
              </View>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnSecondary]}
                onPress={() => { setShowAlarmPicker(false); startSleep(false); }}
              >
                <ThemedText style={styles.modalBtnSecondaryText}>{t('timer.noAlarm')}</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={() => { setShowAlarmPicker(false); startSleep(true); }}
              >
                <ThemedText style={styles.modalBtnPrimaryText}>{t('timer.setAlarm')}</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Утренняя обратная связь ── */}
      <Modal visible={showFeedback} transparent animationType="fade" onRequestClose={() => stopSleep(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ThemedText style={styles.modalTitle}>{t('timer.goodMorning')}</ThemedText>
            <ThemedText style={styles.modalHint}>{t('timer.feedbackPrompt')}</ThemedText>

            <View style={styles.starsRow}>
              {[1,2,3,4,5].map(star => (
                <Pressable key={star} onPress={() => setFeedbackRating(star)} style={styles.starBtn}>
                  <IconSymbol
                    name="star.fill"
                    size={32}
                    color={feedbackRating !== null && star <= feedbackRating ? Brand.warn : Brand.border}
                  />
                </Pressable>
              ))}
            </View>

            {feedbackRating !== null && (
              <ThemedText style={styles.ratingLabel}>
                {feedbackRating <= 2 ? t('timer.rating_bad') : feedbackRating === 3 ? t('timer.rating_ok') : feedbackRating === 4 ? t('timer.rating_good') : t('timer.rating_great')}
              </ThemedText>
            )}

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnSecondary]}
                onPress={() => stopSleep(null)}
              >
                <ThemedText style={styles.modalBtnSecondaryText}>{t('timer.skip')}</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, feedbackRating ? styles.modalBtnPrimary : styles.modalBtnDisabled]}
                disabled={!feedbackRating}
                onPress={() => stopSleep(feedbackRating)}
              >
                <ThemedText style={feedbackRating ? styles.modalBtnPrimaryText : styles.modalBtnSecondaryText}>
                  {t('common.save')}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    padding: Spacing.lg,
    paddingVertical: 28,
    borderWidth: 1,
    backgroundColor: Brand.surface,
    borderColor: Brand.border,
    marginVertical: Spacing.sm,
  },
  // Active session
  activeSession: {
    alignItems: 'center',
    gap: 18,
  },
  moonHalo: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Brand.accentSoft,
    borderWidth: 1,
    borderColor: Brand.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timer: {
    // System font is intentional — JetBrainsMono failed to load on some Android
    // builds and digits rendered as tofu/box glyphs.
    fontSize: 56,
    fontWeight: '300',
    fontVariant: ['tabular-nums'],
    color: Brand.textPrimary,
    textAlign: 'center',
    lineHeight: 64,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: Brand.surfaceElevated,
    borderWidth: 1,
    borderColor: Brand.borderSoft,
  },
  metaItem: {
    alignItems: 'center',
    gap: 2,
  },
  metaDivider: {
    width: 1,
    height: 22,
    backgroundColor: Brand.borderSoft,
  },
  metaLabel: {
    fontSize: 10,
    color: Brand.textMuted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Brand.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  wakeBtn: {
    width: '100%',
    height: 52,
    borderRadius: 16,
    backgroundColor: Brand.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  wakeBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: Brand.textInverse,
    letterSpacing: 0.3,
  },
  // Inactive session
  inactiveSession: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  moonHaloIdle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Brand.accentSoft,
    borderWidth: 1,
    borderColor: Brand.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  idleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Brand.textPrimary,
    textAlign: 'center',
  },
  idleSubtitle: {
    fontSize: 13,
    color: Brand.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 28,
    height: 48,
    borderRadius: 14,
    backgroundColor: Brand.accent,
  },
  startBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Brand.textInverse,
    letterSpacing: 0.3,
  },
  // Modal shared
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Brand.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Brand.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Brand.textPrimary,
    marginBottom: 6,
  },
  modalHint: {
    fontSize: 13,
    color: Brand.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    width: '100%',
  },
  modalBtn: {
    flex: 1,
    height: 48,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnPrimary: {
    backgroundColor: Brand.accent,
  },
  modalBtnPrimaryText: {
    color: Brand.textInverse,
    fontSize: 15,
    fontWeight: '700',
  },
  modalBtnSecondary: {
    backgroundColor: Brand.surfaceElevated,
    borderWidth: 1,
    borderColor: Brand.border,
  },
  modalBtnSecondaryText: {
    color: Brand.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  modalBtnDisabled: {
    backgroundColor: Brand.surfaceElevated,
    borderWidth: 1,
    borderColor: Brand.borderSoft,
    opacity: 0.6,
  },
  // Time picker
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginVertical: Spacing.md,
  },
  timeColumn: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  timeBtn: {
    width: 44,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: Brand.accentSoft,
    borderWidth: 1,
    borderColor: Brand.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeDisplay: {
    width: 72,
    height: 60,
    borderRadius: BorderRadius.md,
    backgroundColor: Brand.surfaceElevated,
    borderWidth: 1,
    borderColor: Brand.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeValue: {
    fontSize: 30,
    fontWeight: '700',
    color: Brand.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  timeColon: {
    fontSize: 30,
    fontWeight: '700',
    color: Brand.textMuted,
    marginBottom: 4,
  },
  // Stars feedback
  starsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  starBtn: {
    padding: 4,
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Brand.accent,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
});
