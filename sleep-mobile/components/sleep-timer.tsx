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
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { scheduleWakeUpAlarm, cancelWakeUpAlarm } from '@/hooks/use-notifications';
import { api } from '@/services/api';
import { useTranslation } from '@/contexts/i18n-context';

const SLEEP_SESSION_KEY = 'sleepMind.activeSession';

type SleepSession = {
  startTime: string;
  isActive: boolean;
  wakeUpHour?: number;
  wakeUpMinute?: number;
};

export function SleepTimer() {
  const colorScheme = useColorScheme() ?? 'light';
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
    <Card variant="elevated" style={styles.container}>
      <View style={styles.header}>
        <IconSymbol 
          name={session?.isActive ? "moon.zzz.fill" : "moon.fill"} 
          size={28} 
          color={session?.isActive ? colors.accent : colors.tint} 
        />
        <ThemedText type="subtitle" style={styles.title} numberOfLines={1}>
          {session?.isActive ? t('timer.titleActive') : t('timer.titleInactive')}
        </ThemedText>
      </View>
      
      {session?.isActive ? (
        <Animated.View entering={FadeIn} style={styles.activeSession}>
          <ThemedText style={styles.startedAt}>
            {t('timer.startedAt').replace('{{time}}', formatStartTime())}
            {session.wakeUpHour !== undefined
              ? t('timer.alarmSet').replace('{{time}}', `${String(session.wakeUpHour).padStart(2,'0')}:${String(session.wakeUpMinute).padStart(2,'0')}`)
              : ''}
          </ThemedText>
          
          <Animated.View style={[styles.timerContainer, animatedStyle]}>
            <ThemedText style={[styles.timer, { color: colors.accent }]}>
              {elapsed}
            </ThemedText>
          </Animated.View>
          
          <Button 
            title={isLoading ? t('timer.saving') : t('timer.wakeUp')} 
            onPress={handleWakeUp}
            variant="secondary"
            disabled={isLoading}
          />
          
          <ThemedText style={[styles.hint, { color: colors.textSecondary }]}>
            {t('timer.wakeHint')}
          </ThemedText>
        </Animated.View>
      ) : (
        <Animated.View entering={FadeIn} style={styles.inactiveSession}>
          <ThemedText style={[styles.description, { color: colors.textSecondary }]}>
            {t('timer.startManually')}
          </ThemedText>
          
          <View style={{ minWidth: 200 }}>
            <Button 
              title={isLoading ? t('timer.starting') : t('timer.startSession')} 
              onPress={handleStartPress}
              variant="primary"
              disabled={isLoading}
            />
          </View>
        </Animated.View>
      )}

      {/* ── Будильник модалка ── */}
      <Modal visible={showAlarmPicker} transparent animationType="fade" onRequestClose={() => setShowAlarmPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.cardBackground }]}>
            <ThemedText type="subtitle" style={{ marginBottom: Spacing.xs }}>{t('timer.alarmTitle')}</ThemedText>
            <ThemedText style={[styles.hint, { color: colors.textSecondary, marginBottom: Spacing.md }]}>
              {t('timer.alarmHint')}
            </ThemedText>

            <View style={styles.timeRow}>
              <View style={styles.timeColumn}>
                <Pressable style={[styles.timeBtn, { backgroundColor: colors.tint + '20' }]} onPress={() => setAlarmHour(h => (h + 1) % 24)}>
                  <IconSymbol name="chevron.up" size={20} color={colors.tint} />
                </Pressable>
                <View style={[styles.timeDisplay, { backgroundColor: colors.cardBorder }]}>
                  <ThemedText style={[styles.timeValue, { color: colors.text }]}>{String(alarmHour).padStart(2,'0')}</ThemedText>
                </View>
                <Pressable style={[styles.timeBtn, { backgroundColor: colors.tint + '20' }]} onPress={() => setAlarmHour(h => (h - 1 + 24) % 24)}>
                  <IconSymbol name="chevron.down" size={20} color={colors.tint} />
                </Pressable>
              </View>
              <ThemedText style={[styles.timeColon, { color: colors.text }]}>:</ThemedText>
              <View style={styles.timeColumn}>
                <Pressable style={[styles.timeBtn, { backgroundColor: colors.tint + '20' }]} onPress={() => setAlarmMinute(m => (m + 5) % 60)}>
                  <IconSymbol name="chevron.up" size={20} color={colors.tint} />
                </Pressable>
                <View style={[styles.timeDisplay, { backgroundColor: colors.cardBorder }]}>
                  <ThemedText style={[styles.timeValue, { color: colors.text }]}>{String(alarmMinute).padStart(2,'0')}</ThemedText>
                </View>
                <Pressable style={[styles.timeBtn, { backgroundColor: colors.tint + '20' }]} onPress={() => setAlarmMinute(m => (m - 5 + 60) % 60)}>
                  <IconSymbol name="chevron.down" size={20} color={colors.tint} />
                </Pressable>
              </View>
            </View>

            <View style={styles.modalActions}>
              <Pressable style={[styles.modalBtn, { backgroundColor: colors.cardBorder }]}
                onPress={() => { setShowAlarmPicker(false); startSleep(false); }}>
                <ThemedText style={{ color: colors.text, fontWeight: '600' }}>{t('timer.noAlarm')}</ThemedText>
              </Pressable>
              <Pressable style={[styles.modalBtn, { backgroundColor: colors.tint }]}
                onPress={() => { setShowAlarmPicker(false); startSleep(true); }}>
                <ThemedText style={{ color: '#fff', fontWeight: '700' }}>{t('timer.setAlarm')}</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Утренняя обратная связь ── */}
      <Modal visible={showFeedback} transparent animationType="fade" onRequestClose={() => stopSleep(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.cardBackground }]}>
            <ThemedText type="subtitle" style={{ marginBottom: Spacing.xs }}>{t('timer.goodMorning')}</ThemedText>
            <ThemedText style={[styles.hint, { color: colors.textSecondary, marginBottom: Spacing.lg }]}>
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
              <Pressable style={[styles.modalBtn, { backgroundColor: colors.cardBorder }]}
                onPress={() => stopSleep(null)}>
                <ThemedText style={{ color: colors.text, fontWeight: '600' }}>{t('timer.skip')}</ThemedText>
              </Pressable>
              <Pressable style={[styles.modalBtn, { backgroundColor: feedbackRating ? colors.tint : colors.muted }]}
                disabled={!feedbackRating}
                onPress={() => stopSleep(feedbackRating)}>
                <ThemedText style={{ color: '#fff', fontWeight: '700' }}>{t('common.save')}</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  title: {
    flex: 1,
  },
  activeSession: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  inactiveSession: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  startedAt: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
  },
  timerContainer: {
    paddingVertical: Spacing.lg,
  },
  timer: {
    fontSize: 42,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  description: {
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  hint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  // Modal shared
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
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
