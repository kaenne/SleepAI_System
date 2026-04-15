import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import {
  useStressMonitor,
  getStressColor,
  getStressEmoji,
  interpretHrv,
  StressLevel,
} from '@/hooks/use-stress-monitor';

export function StressMonitor() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[colorScheme ?? 'light'];

  const {
    latestStress,
    history,
    recordStress,
    measureHrv,
  } = useStressMonitor();

  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measurementResult, setMeasurementResult] = useState<{
    hrv: number;
    level: StressLevel;
    description: string;
  } | null>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Pulse animation during measurement
  useEffect(() => {
    if (isMeasuring) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isMeasuring, pulseAnim]);

  // Fade in result
  useEffect(() => {
    if (measurementResult) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [measurementResult, fadeAnim]);

  const handleMeasure = async () => {
    setIsMeasuring(true);
    setMeasurementResult(null);

    try {
      // Simulate HRV measurement
      const hrvValue = await measureHrv();
      const interpretation = interpretHrv(hrvValue);

      // Record to backend
      await recordStress(hrvValue);

      setMeasurementResult({
        hrv: hrvValue,
        level: interpretation.level,
        description: interpretation.description,
      });
    } catch (e) {
      console.error('Measurement failed:', e);
    } finally {
      setIsMeasuring(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBackground }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Мониторинг стресса
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Измерьте уровень стресса по вариабельности пульса
        </Text>
      </View>

      {/* Measurement Button */}
      <View style={styles.measureSection}>
        <Text style={[styles.measureHint, { color: colors.textSecondary, marginBottom: 12 }]}>
          Включите вспышку и приложите палец к камере
        </Text>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={[
              styles.measureButton,
              {
                backgroundColor: isMeasuring
                  ? colors.tint + '80'
                  : colors.tint,
              },
            ]}
            onPress={handleMeasure}
            disabled={isMeasuring}
          >
            {isMeasuring ? (
              <>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.measureButtonText}>Измерение...</Text>
              </>
            ) : (
              <>
                <Text style={styles.heartIcon}>❤️</Text>
                <Text style={styles.measureButtonText}>Измерить HRV</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>

        {isMeasuring && (
          <Text style={[styles.measureHint, { color: colors.textSecondary }]}>
            Оставайтесь неподвижны...
          </Text>
        )}
      </View>

      {/* Measurement Result */}
      {measurementResult && (
        <Animated.View
          style={[
            styles.resultCard,
            {
              backgroundColor: getStressColor(measurementResult.level) + '20',
              borderColor: getStressColor(measurementResult.level),
              opacity: fadeAnim,
            },
          ]}
        >
          <View style={styles.resultHeader}>
            <Text style={styles.resultEmoji}>
              {getStressEmoji(measurementResult.level)}
            </Text>
            <View style={styles.resultValues}>
              <Text style={[styles.hrvValue, { color: colors.text }]}>
                HRV: {measurementResult.hrv}
              </Text>
              <View
                style={[
                  styles.levelBadge,
                  { backgroundColor: getStressColor(measurementResult.level) },
                ]}
              >
                <Text style={styles.levelText}>
                  {measurementResult.level === 'LOW'
                    ? 'Низкий'
                    : measurementResult.level === 'MEDIUM'
                    ? 'Средний'
                    : 'Высокий'}{' '}
                  стресс
                </Text>
              </View>
            </View>
          </View>
          <Text style={[styles.resultDescription, { color: colors.text }]}>
            {measurementResult.description}
          </Text>
        </Animated.View>
      )}

      {/* Latest Reading */}
      {latestStress && !measurementResult && (
        <View
          style={[
            styles.latestReading,
            { backgroundColor: isDark ? '#1a1a2e' : '#f5f5f5' },
          ]}
        >
          <Text style={[styles.latestLabel, { color: colors.textSecondary }]}>
            Последнее измерение
          </Text>
          <View style={styles.latestData}>
            <Text style={[styles.latestHrv, { color: colors.text }]}>
              HRV: {latestStress.hrvScore}
            </Text>
            <Text style={[styles.latestTime, { color: colors.textSecondary }]}>
              {formatDate(latestStress.timestamp)} в{' '}
              {formatTime(latestStress.timestamp)}
            </Text>
          </View>
          <View
            style={[
              styles.latestLevel,
              { backgroundColor: getStressColor(latestStress.stressLevel) },
            ]}
          >
            <Text style={styles.levelText}>
              {getStressEmoji(latestStress.stressLevel)}{' '}
              {latestStress.stressLevel === 'LOW'
                ? 'Низкий'
                : latestStress.stressLevel === 'MEDIUM'
                ? 'Средний'
                : 'Высокий'}
            </Text>
          </View>
        </View>
      )}

      {/* History */}
      {history.length > 0 && (
        <View style={styles.historySection}>
          <Text style={[styles.historyTitle, { color: colors.text }]}>
            История измерений
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {history.slice(0, 7).map((item, index) => (
              <View
                // @ts-ignore - key is a React list prop handled by JSX
                key={item.id || index}
                style={[
                  styles.historyItem,
                  {
                    backgroundColor: isDark ? '#1a1a2e' : '#f5f5f5',
                    borderLeftColor: getStressColor(item.stressLevel),
                  },
                ]}
              >
                <Text style={[styles.historyHrv, { color: colors.text }]}>
                  {item.hrvScore}
                </Text>
                <Text
                  style={[styles.historyTime, { color: colors.textSecondary }]}
                >
                  {formatTime(item.timestamp)}
                </Text>
                <Text style={styles.historyEmoji}>
                  {getStressEmoji(item.stressLevel)}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Tips */}
      <View
        style={[
          styles.tipsSection,
          { backgroundColor: isDark ? '#1a1a2e' : '#e8f5e9' },
        ]}
      >
        <Text style={[styles.tipsTitle, { color: colors.text }]}>
          💡 Советы по снижению стресса
        </Text>
        <Text style={[styles.tipText, { color: colors.textSecondary }]}>
          • Попробуйте дыхательную технику 4-7-8
        </Text>
        <Text style={[styles.tipText, { color: colors.textSecondary }]}>
          • Прогуляйтесь на свежем воздухе 15 минут
        </Text>
        <Text style={[styles.tipText, { color: colors.textSecondary }]}>
          • Сделайте короткую медитацию
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  measureSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  measureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 50,
    gap: 8,
    minWidth: 200,
  },
  heartIcon: {
    fontSize: 24,
  },
  measureButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  measureHint: {
    fontSize: 12,
    marginTop: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  resultCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultEmoji: {
    fontSize: 40,
    marginRight: 12,
  },
  resultValues: {
    flex: 1,
  },
  hrvValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  levelText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  resultDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  latestReading: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  latestLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  latestData: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  latestHrv: {
    fontSize: 18,
    fontWeight: '600',
  },
  latestTime: {
    fontSize: 12,
  },
  latestLevel: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  historySection: {
    marginBottom: 16,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  historyItem: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginRight: 8,
    borderLeftWidth: 3,
    minWidth: 70,
  },
  historyHrv: {
    fontSize: 18,
    fontWeight: '700',
  },
  historyTime: {
    fontSize: 10,
    marginTop: 2,
  },
  historyEmoji: {
    fontSize: 16,
    marginTop: 4,
  },
  tipsSection: {
    padding: 12,
    borderRadius: 12,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 13,
    marginBottom: 4,
  },
});
