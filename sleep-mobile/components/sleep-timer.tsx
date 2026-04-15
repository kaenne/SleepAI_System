import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Pressable, Vibration } from 'react-native';
import Animated, { 
  FadeIn, 
  FadeOut, 
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
import { api } from '@/services/api';

const SLEEP_SESSION_KEY = 'sleepMind.activeSession';

type SleepSession = {
  startTime: string;
  isActive: boolean;
};

export function SleepTimer() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  
  const [session, setSession] = useState<SleepSession | null>(null);
  const [elapsed, setElapsed] = useState('00:00:00');
  const [isLoading, setIsLoading] = useState(false);
  
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
  }, [session?.isActive]);
  
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
  
  const startSleep = useCallback(async () => {
    Vibration.vibrate(100);
    setIsLoading(true);
    
    const newSession: SleepSession = {
      startTime: new Date().toISOString(),
      isActive: true,
    };
    
    try {
      await AsyncStorage.setItem(SLEEP_SESSION_KEY, JSON.stringify(newSession));
      setSession(newSession);
    } catch (e) {
      console.error('Failed to start session:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const stopSleep = useCallback(async () => {
    if (!session) return;
    
    Vibration.vibrate([100, 100, 100]);
    setIsLoading(true);
    
    const endTime = new Date();
    const startTime = new Date(session.startTime);
    const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    
    try {
      // Save to backend
      if (api.getBaseUrl()) {
        await api.createJournalEntry({
          createdAt: startTime.toISOString(),
          sleepHours: Math.round(durationHours * 10) / 10,
          stressLevel: 5, // Default, user can edit later
          note: `Sleep session: ${elapsed}`,
        });
      }
      
      // Clear session
      await AsyncStorage.removeItem(SLEEP_SESSION_KEY);
      setSession(null);
      setElapsed('00:00:00');
    } catch (e) {
      console.error('Failed to save session:', e);
    } finally {
      setIsLoading(false);
    }
  }, [session, elapsed]);
  
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
        <ThemedText type="subtitle" style={styles.title}>
          {session?.isActive ? 'Сон...' : 'Таймер сна'}
        </ThemedText>
      </View>
      
      {session?.isActive ? (
        <Animated.View entering={FadeIn} style={styles.activeSession}>
          <ThemedText style={styles.startedAt}>
            Начато в {formatStartTime()}
          </ThemedText>
          
          <Animated.View style={[styles.timerContainer, animatedStyle]}>
            <ThemedText style={[styles.timer, { color: colors.accent }]}>
              {elapsed}
            </ThemedText>
          </Animated.View>
          
          <Button 
            title={isLoading ? "Сохранение..." : "🌅 Проснуться"} 
            onPress={stopSleep}
            variant="secondary"
            disabled={isLoading}
          />
          
          <ThemedText style={[styles.hint, { color: colors.textSecondary }]}>
            Нажмите когда проснетесь, чтобы записать данные
          </ThemedText>
        </Animated.View>
      ) : (
        <Animated.View entering={FadeIn} style={styles.inactiveSession}>
          <ThemedText style={[styles.description, { color: colors.textSecondary }]}>
            Запустите сеанс сна вручную
          </ThemedText>
          
          <View style={{ minWidth: 200 }}>
            <Button 
              title={isLoading ? "Запуск..." : "🌙 Начать сеанс сна"} 
              onPress={startSleep}
              variant="primary"
              disabled={isLoading}
            />
          </View>
        </Animated.View>
      )}
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
  },
  timerContainer: {
    paddingVertical: Spacing.lg,
  },
  timer: {
    fontSize: 48,
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
});
