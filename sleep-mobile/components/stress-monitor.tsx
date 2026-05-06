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
import { useTranslation } from '@/contexts/i18n-context';

export function StressMonitor() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[colorScheme ?? 'light'];
  const { t } = useTranslation();

  const getStressBgColor = (level: StressLevel) => {
    switch (level) {
      case 'LOW': return '#1A3B2E';
      case 'MEDIUM': return '#2D234A';
      case 'HIGH': return '#4A1D2E';
    }
  };

  const getStressTextColor = (level: StressLevel) => {
    switch (level) {
      case 'LOW': return '#4ADE80';
      case 'MEDIUM': return '#A78BFA';
      case 'HIGH': return '#F87171';
    }
  };

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
    descriptionKey: string;
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
        descriptionKey: interpretation.descriptionKey,
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
          {t('stress.title')}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('stress.subtitle')}
        </Text>
      </View>

      {/* Measurement Button */}
      <View style={styles.measureSection}>
        <Text style={[styles.measureHint, { color: colors.textSecondary, marginBottom: 12 }]}>
          {t('stress.measureHint')}
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
                <Text style={styles.measureButtonText}>{t('stress.measuring')}</Text>
              </>
            ) : (
              <>
                <Text style={styles.measureButtonText}>{t('stress.measureBtn')}</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>

        {isMeasuring && (
          <Text style={[styles.measureHint, { color: colors.textSecondary }]}>
            {t('stress.stillHint')}
          </Text>
        )}
      </View>

      {/* Measurement Result */}
      {measurementResult && (
        <Animated.View
          style={[
            styles.resultCard,
            {
              backgroundColor: isDark ? getStressBgColor(measurementResult.level) : getStressColor(measurementResult.level) + '20',
              borderColor: isDark ? getStressTextColor(measurementResult.level) + '40' : getStressColor(measurementResult.level),
              opacity: fadeAnim,
            },
          ]}
        >
          <View style={styles.resultHeader}>
            <View style={styles.resultValues}>
              <Text style={[styles.hrvValue, { color: colors.text }]}>
                HRV: {measurementResult.hrv}
              </Text>
              <View
                style={[
                  styles.levelBadge,
                  { backgroundColor: isDark ? getStressBgColor(measurementResult.level) : getStressColor(measurementResult.level) },
                ]}
              >
                <Text style={[styles.levelText, isDark && { color: getStressTextColor(measurementResult.level) }]}>
                  {measurementResult.level === 'LOW'
                    ? t('stress.level_low')
                    : measurementResult.level === 'MEDIUM'
                    ? t('stress.level_medium')
                    : t('stress.level_high')}{t('stress.stressSuffix')}
                </Text>
              </View>
            </View>
          </View>
          <Text style={[styles.resultDescription, { color: colors.text }]}>
            {t(measurementResult.descriptionKey as any)}
          </Text>
        </Animated.View>
      )}

      {/* Latest Reading */}
      {latestStress && !measurementResult && (
        <View
          style={[
            styles.latestReading,
            { backgroundColor: isDark ? '#151522' : '#f5f5f5', borderWidth: 1, borderColor: isDark ? '#2C2C3E' : 'transparent' },
          ]}
        >
          <Text style={[styles.latestLabel, { color: colors.textSecondary }]}>
            {t('stress.latestLabel')}
          </Text>
          <View style={styles.latestData}>
            <Text style={[styles.latestHrv, { color: colors.text }]}>
              HRV: {latestStress.hrvScore}
            </Text>
            <Text style={[styles.latestTime, { color: colors.textSecondary }]}>
              {formatDate(latestStress.timestamp)}{' '}
              {formatTime(latestStress.timestamp)}
            </Text>
          </View>
          <View
            style={[
              styles.latestLevel,
              { backgroundColor: isDark ? getStressBgColor(latestStress.stressLevel) : getStressColor(latestStress.stressLevel) },
            ]}
          >
            <Text style={[styles.levelText, isDark && { color: getStressTextColor(latestStress.stressLevel) }]}>
              {latestStress.stressLevel === 'LOW'
                ? t('stress.level_low')
                : latestStress.stressLevel === 'MEDIUM'
                ? t('stress.level_medium')
                : t('stress.level_high')}
            </Text>
          </View>
        </View>
      )}

      {/* History */}
      {history.length > 0 && (
        <View style={styles.historySection}>
          <Text style={[styles.historyTitle, { color: colors.text }]}>
            {t('stress.historyTitle')}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {history.slice(0, 7).map((item, index) => (
              <View
                // @ts-ignore - key is a React list prop handled by JSX
                key={item.id || index}
                style={[
                  styles.historyItem,
                  {
                    backgroundColor: isDark ? '#151522' : '#f5f5f5',
                    borderWidth: isDark ? 1 : 0,
                    borderColor: isDark ? '#2C2C3E' : 'transparent',
                    borderLeftWidth: 4,
                    borderLeftColor: isDark ? getStressTextColor(item.stressLevel) : getStressColor(item.stressLevel),
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
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Tips */}
      <View
        style={[
          styles.tipsSection,
          { backgroundColor: isDark ? '#151522' : '#e8f5e9', borderWidth: isDark ? 1 : 0, borderColor: isDark ? '#2C2C3E' : 'transparent' },
        ]}
      >
        <Text style={[styles.tipsTitle, { color: colors.text }]}>
          {t('stress.tipsTitle')}
        </Text>
        <Text style={[styles.tipText, { color: colors.textSecondary }]}>
          {t('stress.tip1')}
        </Text>
        <Text style={[styles.tipText, { color: colors.textSecondary }]}>
          {t('stress.tip2')}
        </Text>
        <Text style={[styles.tipText, { color: colors.textSecondary }]}>
          {t('stress.tip3')}
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
