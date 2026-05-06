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
import { Colors, BorderRadius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
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
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const colors = Colors[colorScheme];
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
  
  // Pulse animation when active
  useEffect(() => {
    if (session?.isActive) {
      pulseScale.value = withRepeat(
        withTiming(1.1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
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
      console.error('Failed to load session:', e);
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
      console.error('Failed to start session:', e);
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
    <View style={[styles.container, { backgroundColor: isDark ? '#1E1E2D' : '#FFFFFF', borderColor: isDark ? '#2C2C3E' : '#E5E7EB' }]}>
      {/* Header row */}
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: isDark ? '#1A2A4A' : '#EFF6FF' }]}>
          <ThemedText style={{ fontSize: 18 }}>🌙</ThemedText>
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText style={[styles.title, { color: isDark ? '#E2D8F0' : '#1F2937' }]}>
            {session?.isActive ? t('timer.titleActive') : t('timer.titleInactive')}
          </ThemedText>
          {session?.isActive && (
            <ThemedText style={[styles.subtitle, { color: isDark ? '#6B7280' : '#9CA3AF' }]}>
              {t('timer.startedAt').replace('{{time}}', formatStartTime())}
              {session.wakeUpHour !== undefined
                ? `  ·  ${t('timer.alarm')} ${String(session.wakeUpHour).padStart(2,'0')}:${String(session.wakeUpMinute ?? 0).padStart(2,'0')}`
                : ''}
            </ThemedText>
          )}
        </View>
        {session?.isActive && (
          <View style={[styles.liveBadge, { backgroundColor: '#1A3B2E' }]}>
            <View style={styles.liveDot} />
            <ThemedText style={styles.liveText}>LIVE</ThemedText>
          </View>
        )}
      </View>

      {session?.isActive ? (
        <Animated.View entering={FadeIn} style={styles.activeSession}>
          {/* Big blue timer */}
          <Animated.View style={[styles.timerContainer, animatedStyle]}>
            <ThemedText style={[styles.timer, { color: '#7eb6ff' }]}>
              {elapsed}
            </ThemedText>
          </Animated.View>

          {/* Wake up button — full width, solid blue */}
          <Pressable
            onPress={handleWakeUp}
            disabled={isLoading}
            style={[styles.wakeBtn, { backgroundColor: '#7eb6ff', opacity: isLoading ? 0.7 : 1 }]}
          >
            <ThemedText style={{ fontSize: 20, marginRight: 8 }}>⏰</ThemedText>
            <ThemedText style={styles.wakeBtnText}>
              {isLoading ? t('timer.saving') : t('timer.wakeUp')}
            </ThemedText>
          </Pressable>
        </Animated.View>
      ) : (
        <Animated.View entering={FadeIn} style={styles.inactiveSession}>
          <ThemedText style={[styles.description, { color: isDark ? '#6B7280' : '#9CA3AF' }]}>
            {t('timer.startManually')}
          </ThemedText>

          <Pressable
            onPress={handleStartPress}
            disabled={isLoading}
            style={[styles.startBtn, { backgroundColor: isDark ? '#1E3A2E' : '#DCFCE7', opacity: isLoading ? 0.7 : 1 }]}
          >
            <IconSymbol name="moon.fill" size={18} color="#4ADE80" />
            <ThemedText style={[styles.startBtnText, { color: '#4ADE80' }]}>
              {isLoading ? t('timer.starting') : t('timer.startSession')}
            </ThemedText>
          </Pressable>
        </Animated.View>
      )}

      {/* ── Будильник модалка ── */}
      <Modal visible={showAlarmPicker} transparent animationType="fade" onRequestClose={() => setShowAlarmPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: isDark ? '#1E1E2D' : '#FFFFFF', borderColor: isDark ? '#2C2C3E' : '#E5E7EB' }]}>
            <ThemedText style={[styles.modalTitle, { color: isDark ? '#E2D8F0' : '#1F2937' }]}>{t('timer.alarmTitle')}</ThemedText>
            <ThemedText style={[styles.hint, { color: isDark ? '#6B7280' : '#9CA3AF', marginBottom: Spacing.md }]}>
              {t('timer.alarmHint')}
            </ThemedText>

            <View style={styles.timeRow}>
              <View style={styles.timeColumn}>
                <Pressable style={[styles.timeBtn, { backgroundColor: isDark ? '#2C2C3E' : '#F3F4F6' }]} onPress={() => setAlarmHour(h => (h + 1) % 24)}>
                  <IconSymbol name="chevron.up" size={20} color={colors.tint} />
                </Pressable>
                <View style={[styles.timeDisplay, { backgroundColor: isDark ? '#151522' : '#F9FAFB', borderColor: isDark ? '#2C2C3E' : '#E5E7EB' }]}>
                  <ThemedText style={[styles.timeValue, { color: '#7eb6ff' }]}>{String(alarmHour).padStart(2,'0')}</ThemedText>
                </View>
                <Pressable style={[styles.timeBtn, { backgroundColor: isDark ? '#2C2C3E' : '#F3F4F6' }]} onPress={() => setAlarmHour(h => (h - 1 + 24) % 24)}>
                  <IconSymbol name="chevron.down" size={20} color={colors.tint} />
                </Pressable>
              </View>
              <ThemedText style={[styles.timeColon, { color: '#7eb6ff' }]}>:</ThemedText>
              <View style={styles.timeColumn}>
                <Pressable style={[styles.timeBtn, { backgroundColor: isDark ? '#2C2C3E' : '#F3F4F6' }]} onPress={() => setAlarmMinute(m => (m + 5) % 60)}>
                  <IconSymbol name="chevron.up" size={20} color={colors.tint} />
                </Pressable>
                <View style={[styles.timeDisplay, { backgroundColor: isDark ? '#151522' : '#F9FAFB', borderColor: isDark ? '#2C2C3E' : '#E5E7EB' }]}>
                  <ThemedText style={[styles.timeValue, { color: '#7eb6ff' }]}>{String(alarmMinute).padStart(2,'0')}</ThemedText>
                </View>
                <Pressable style={[styles.timeBtn, { backgroundColor: isDark ? '#2C2C3E' : '#F3F4F6' }]} onPress={() => setAlarmMinute(m => (m - 5 + 60) % 60)}>
                  <IconSymbol name="chevron.down" size={20} color={colors.tint} />
                </Pressable>
              </View>
            </View>

            <View style={styles.modalActions}>
              <Pressable style={[styles.modalBtn, { backgroundColor: isDark ? '#2C2C3E' : '#F3F4F6' }]}
                onPress={() => { setShowAlarmPicker(false); startSleep(false); }}>
                <ThemedText style={{ color: isDark ? '#E2D8F0' : '#374151', fontWeight: '600' }}>{t('timer.noAlarm')}</ThemedText>
              </Pressable>
              <Pressable style={[styles.modalBtn, { backgroundColor: '#7eb6ff' }]}
                onPress={() => { setShowAlarmPicker(false); startSleep(true); }}>
                <ThemedText style={{ color: '#0a1628', fontWeight: '700' }}>{t('timer.setAlarm')}</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Утренняя обратная связь ── */}
      <Modal visible={showFeedback} transparent animationType="fade" onRequestClose={() => stopSleep(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: isDark ? '#1E1E2D' : '#FFFFFF', borderColor: isDark ? '#2C2C3E' : '#E5E7EB' }]}>
            <ThemedText style={[styles.modalTitle, { color: isDark ? '#E2D8F0' : '#1F2937' }]}>{t('timer.goodMorning')}</ThemedText>
            <ThemedText style={[styles.hint, { color: isDark ? '#6B7280' : '#9CA3AF', marginBottom: Spacing.lg }]}>
              {t('timer.feedbackPrompt')}
            </ThemedText>

            <View style={styles.starsRow}>
              {[1,2,3,4,5].map(star => (
                <Pressable key={star} onPress={() => setFeedbackRating(star)} style={styles.starBtn}>
                  <ThemedText style={[styles.starText, { opacity: feedbackRating !== null && star <= feedbackRating ? 1 : 0.3 }]}>
                    ⭐
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            {feedbackRating !== null && (
              <ThemedText style={[{ color: colors.tint, textAlign: 'center', marginBottom: Spacing.md }]}>
                {feedbackRating <= 2 ? t('timer.rating_bad') : feedbackRating === 3 ? t('timer.rating_ok') : feedbackRating === 4 ? t('timer.rating_good') : t('timer.rating_great')}
              </ThemedText>
            )}

            <View style={styles.modalActions}>
              <Pressable style={[styles.modalBtn, { backgroundColor: isDark ? '#2C2C3E' : '#F3F4F6' }]}
                onPress={() => stopSleep(null)}>
                <ThemedText style={{ color: isDark ? '#E2D8F0' : '#374151', fontWeight: '600' }}>{t('timer.skip')}</ThemedText>
              </Pressable>
              <Pressable style={[styles.modalBtn, { backgroundColor: feedbackRating ? colors.tint : (isDark ? '#2C2C3E' : '#E5E7EB') }]}
                disabled={!feedbackRating}
                onPress={() => stopSleep(feedbackRating)}>
                <ThemedText style={{ color: '#fff', fontWeight: '700' }}>{t('common.save')}</ThemedText>
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
    borderRadius: 20,
    padding: Spacing.lg,
    borderWidth: 1,
    marginVertical: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ADE80',
  },
  liveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4ADE80',
    letterSpacing: 0.5,
  },
  activeSession: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  inactiveSession: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  timerContainer: {
    paddingVertical: Spacing.lg,
  },
  timer: {
    fontSize: 64,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
  },
  wakeBtn: {
    width: '100%',
    height: 54,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wakeBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0a1628',
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  startBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  description: {
    textAlign: 'center',
    marginBottom: Spacing.sm,
    fontSize: 14,
  },
  hint: {
    fontSize: 12,
    textAlign: 'center',
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
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    width: '100%',
  },
  modalBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeDisplay: {
    width: 64,
    height: 56,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  timeValue: {
    fontSize: 28,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  timeColon: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  // Stars feedback
  starsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  starBtn: {
    padding: Spacing.xs,
  },
  starText: {
    fontSize: 36,
  },
});
