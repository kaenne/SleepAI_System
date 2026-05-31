import { router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as React from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Btn } from '@/components/ui/btn';
import { Ico } from '@/components/ui/ico';
import { Brand, Spacing, Type } from '@/constants/theme';
import { useTranslation } from '@/contexts/i18n-context';
import { useStressMonitor } from '@/hooks/use-stress-monitor';
import {
  averageRedFromPng,
  computeHrv,
  HRV_CAPTURE_DURATION_MS,
  HRV_SAMPLE_INTERVAL_MS,
  type RedSample,
} from '@/lib/hrv-capture';

type Phase = 'permission' | 'idle' | 'capturing' | 'done';

const TOTAL_SECONDS = HRV_CAPTURE_DURATION_MS / 1000;
const CHART_WIDTH = 300;
const CHART_HEIGHT = 80;
const CHART_WINDOW_SAMPLES = 45; // ~15 seconds at 3 FPS

// ── Live PPG waveform chart ──────────────────────────────────────────────────
function PpgChart({ samples, peakIndices }: { samples: RedSample[]; peakIndices: number[] }) {
  if (samples.length < 2) {
    return (
      <View style={[chartStyles.empty, { width: CHART_WIDTH, height: CHART_HEIGHT }]}>
        <View style={chartStyles.emptyLine} />
      </View>
    );
  }

  // Use a rolling window of the latest N samples
  const visible = samples.slice(-CHART_WINDOW_SAMPLES);
  const reds = visible.map((s) => s.r);
  const min = Math.min(...reds);
  const max = Math.max(...reds);
  const range = Math.max(1, max - min);

  const offsetIdx = samples.length - visible.length;
  const points = visible.map((s, i) => {
    const x = (i / Math.max(1, visible.length - 1)) * CHART_WIDTH;
    const y = CHART_HEIGHT - ((s.r - min) / range) * (CHART_HEIGHT - 10) - 5;
    return { x, y };
  });

  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');

  const visiblePeaks = peakIndices
    .filter((idx) => idx >= offsetIdx)
    .map((idx) => points[idx - offsetIdx])
    .filter(Boolean);

  return (
    <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
      <Path d={path} stroke={Brand.accent} strokeWidth={1.8} fill="none" />
      {visiblePeaks.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={3} fill={Brand.good} />
      ))}
    </Svg>
  );
}

const chartStyles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyLine: {
    width: '90%',
    height: 1,
    backgroundColor: Brand.borderSoft,
  },
});

export default function HrvCaptureScreen() {
  const { t } = useTranslation();
  const { recordStress } = useStressMonitor();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = React.useRef<CameraView | null>(null);

  const [phase, setPhase] = React.useState<Phase>('idle');
  const [secondsLeft, setSecondsLeft] = React.useState(TOTAL_SECONDS);
  const [samples, setSamples] = React.useState<RedSample[]>([]);
  const [peakIndices, setPeakIndices] = React.useState<number[]>([]);
  const [liveBpm, setLiveBpm] = React.useState(0);
  const [signalQuality, setSignalQuality] = React.useState<'unknown' | 'ok' | 'weak'>('unknown');

  const samplesRef = React.useRef<RedSample[]>([]);
  const captureStartRef = React.useRef<number>(0);
  const tickHandleRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const inFlightRef = React.useRef(false);

  // Heart breathing animation while capturing
  const scale = useSharedValue(1);
  React.useEffect(() => {
    if (phase === 'capturing') {
      scale.value = withRepeat(
        withTiming(1.06, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    } else {
      scale.value = withTiming(1);
    }
  }, [phase, scale]);
  const breatheStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  React.useEffect(() => {
    if (!permission) return;
    if (!permission.granted) {
      setPhase('permission');
    } else if (phase === 'permission') {
      setPhase('idle');
    }
  }, [permission, phase]);

  React.useEffect(() => {
    return () => {
      if (tickHandleRef.current) clearInterval(tickHandleRef.current);
    };
  }, []);

  const captureFrame = React.useCallback(async (): Promise<RedSample | null> => {
    const cam = cameraRef.current;
    if (!cam) return null;
    if (inFlightRef.current) return null; // skip if previous capture still running
    inFlightRef.current = true;
    try {
      const photo = await cam.takePictureAsync({
        base64: false,
        quality: 0.1,
        skipProcessing: true,
        shutterSound: false,
        exif: false,
      });
      if (!photo?.uri) return null;
      // Resize to 16×16 — small enough to decode in <5ms, large enough that
      // averaging across pixels suppresses sensor noise.
      const manipulated = await manipulateAsync(
        photo.uri,
        [{ resize: { width: 16, height: 16 } }],
        { base64: true, compress: 1, format: SaveFormat.PNG },
      );
      const b64 = manipulated.base64;
      if (!b64) return null;
      const red = averageRedFromPng(b64);
      if (red == null) return null;
      return { t: Date.now() - captureStartRef.current, r: red };
    } catch (e) {
      console.warn('PPG frame capture failed:', e);
      return null;
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  const finish = React.useCallback(async () => {
    if (tickHandleRef.current) {
      clearInterval(tickHandleRef.current);
      tickHandleRef.current = null;
    }
    const result = computeHrv(samplesRef.current);
    setSignalQuality(result.validContact ? 'ok' : 'weak');
    setPhase('done');
    try {
      await recordStress(result.hrv);
    } catch (e) {
      console.warn('save HRV failed:', e);
    }
    const message = result.validContact
      ? t('hrv.doneOk')
          .replace('{{hrv}}', String(result.hrv))
          .replace('{{bpm}}', String(result.bpm || '—'))
      : t('hrv.doneWeak').replace('{{hrv}}', String(result.hrv));
    Alert.alert(t('hrv.doneTitle'), message, [
      { text: t('common.ok'), onPress: () => router.back() },
    ]);
  }, [recordStress, t]);

  const startCapture = React.useCallback(() => {
    samplesRef.current = [];
    setSamples([]);
    setPeakIndices([]);
    setLiveBpm(0);
    captureStartRef.current = Date.now();
    setSecondsLeft(TOTAL_SECONDS);
    setSignalQuality('unknown');
    setPhase('capturing');

    tickHandleRef.current = setInterval(async () => {
      const elapsed = Date.now() - captureStartRef.current;
      const left = Math.max(0, TOTAL_SECONDS - Math.floor(elapsed / 1000));
      setSecondsLeft(left);

      const sample = await captureFrame();
      if (sample) {
        samplesRef.current.push(sample);
        setSamples([...samplesRef.current]);

        if (samplesRef.current.length >= 6) {
          const partial = computeHrv(samplesRef.current);
          setSignalQuality(partial.validContact ? 'ok' : 'weak');
          setLiveBpm(partial.bpm);
          // Recompute peak indices for chart overlay
          // (cheap enough at <100 samples)
          const reds = samplesRef.current.map((s) => s.r);
          const mean = reds.reduce((a, b) => a + b, 0) / reds.length;
          const std = Math.sqrt(
            reds.reduce((s, r) => s + (r - mean) ** 2, 0) / reds.length,
          );
          const threshold = mean + std * 0.4;
          const minDist = Math.max(1, Math.round(400 / HRV_SAMPLE_INTERVAL_MS));
          const peaks: number[] = [];
          let lastPeak = -minDist;
          for (let i = 1; i < reds.length - 1; i++) {
            if (
              reds[i] > threshold &&
              reds[i] > reds[i - 1] &&
              reds[i] >= reds[i + 1] &&
              i - lastPeak >= minDist
            ) {
              peaks.push(i);
              lastPeak = i;
            }
          }
          setPeakIndices(peaks);
        }
      }

      if (elapsed >= HRV_CAPTURE_DURATION_MS) {
        void finish();
      }
    }, HRV_SAMPLE_INTERVAL_MS);
  }, [captureFrame, finish]);

  const cancel = React.useCallback(() => {
    if (tickHandleRef.current) {
      clearInterval(tickHandleRef.current);
      tickHandleRef.current = null;
    }
    router.back();
  }, []);

  // ── Permission gate ───────────────────────────────────────────────────────
  if (!permission || phase === 'permission') {
    return (
      <SafeAreaView style={styles.gateRoot}>
        <View style={styles.gateInner}>
          <View style={styles.gateIconWrap}>
            <Ico.Heart size={40} color={Brand.accent} />
          </View>
          <ThemedText style={styles.gateTitle}>{t('hrv.permTitle')}</ThemedText>
          <ThemedText style={styles.gateBody}>{t('hrv.permBody')}</ThemedText>
          <View style={styles.gateButtons}>
            <Btn label={t('common.cancel')} variant="secondary" onPress={() => router.back()} fullWidth />
            <Btn label={t('hrv.permGrant')} onPress={requestPermission} fullWidth />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const progress = (TOTAL_SECONDS - secondsLeft) / TOTAL_SECONDS;
  const qualityLabel =
    phase !== 'capturing'
      ? null
      : signalQuality === 'ok'
        ? t('hrv.signalOk')
        : signalQuality === 'weak'
          ? t('hrv.signalWeak')
          : t('hrv.signalUnknown');
  const qualityColor =
    signalQuality === 'ok' ? Brand.good : signalQuality === 'weak' ? '#ff6b6b' : Brand.textMuted;

  return (
    <View style={styles.root}>
      <CameraView
        ref={cameraRef}
        style={styles.hiddenCamera}
        facing="back"
        flash="on"
        enableTorch
        autofocus="off"
      />

      <SafeAreaView edges={['top', 'bottom']} style={styles.overlay}>
        <View style={styles.header}>
          <Pressable onPress={cancel} hitSlop={10} style={styles.closeBtn}>
            <Ico.Close size={20} color={Brand.textPrimary} />
          </Pressable>
          <ThemedText style={styles.title}>{t('hrv.title')}</ThemedText>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.center}>
          <Animated.View style={[styles.heartHalo, breatheStyle]}>
            <Ico.Heart size={56} color={Brand.accent} />
          </Animated.View>

          {/* Live BPM readout — only shows when we have a reading */}
          {phase === 'capturing' && liveBpm > 0 && (
            <Animated.View entering={FadeIn.duration(200)} style={styles.bpmRow}>
              <ThemedText style={styles.bpmValue}>{liveBpm}</ThemedText>
              <ThemedText style={styles.bpmUnit}>{t('hrv.bpmUnit')}</ThemedText>
            </Animated.View>
          )}

          {/* Live PPG waveform */}
          <View style={styles.chartCard}>
            <PpgChart samples={samples} peakIndices={peakIndices} />
            <ThemedText style={styles.chartCaption}>{t('hrv.chartCaption')}</ThemedText>
          </View>

          {/* Countdown */}
          <View style={styles.countdownRow}>
            <ThemedText style={styles.countdown}>
              {phase === 'capturing' ? `${secondsLeft}` : TOTAL_SECONDS}
            </ThemedText>
            <ThemedText style={styles.countdownUnit}>{t('hrv.seconds')}</ThemedText>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>

          {qualityLabel && (
            <Animated.View
              entering={FadeIn.duration(200)}
              style={[styles.qualityBadge, { borderColor: qualityColor }]}
            >
              <View style={[styles.qualityDot, { backgroundColor: qualityColor }]} />
              <ThemedText style={[styles.qualityText, { color: qualityColor }]}>
                {qualityLabel}
              </ThemedText>
            </Animated.View>
          )}

          <ThemedText style={styles.hint}>
            {phase === 'capturing' ? t('hrv.hintActive') : t('hrv.hintIdle')}
          </ThemedText>
        </View>

        <View style={styles.footer}>
          {phase === 'idle' && (
            <Btn
              label={t('hrv.startBtn')}
              onPress={startCapture}
              fullWidth
              leading={<Ico.Pulse size={18} color={Brand.textInverse} />}
            />
          )}
          {phase === 'capturing' && (
            <Btn label={t('common.cancel')} variant="secondary" onPress={cancel} fullWidth />
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.background },
  hiddenCamera: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0.01,
    bottom: 0,
    right: 0,
  },
  overlay: { flex: 1, paddingHorizontal: Spacing.lg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
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
  title: { ...Type.titleM, color: Brand.textPrimary },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  heartHalo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Brand.accentSoft,
    borderWidth: 1,
    borderColor: Brand.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bpmRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  bpmValue: {
    fontSize: 36,
    fontWeight: '300',
    color: Brand.accent,
    fontVariant: ['tabular-nums'],
    lineHeight: 44,
  },
  bpmUnit: {
    fontSize: 12,
    color: Brand.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  chartCard: {
    width: CHART_WIDTH + 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.borderSoft,
    borderRadius: 14,
    alignItems: 'center',
  },
  chartCaption: {
    fontSize: 10,
    color: Brand.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    marginTop: 4,
  },
  countdown: {
    fontSize: 44,
    fontWeight: '300',
    color: Brand.textPrimary,
    fontVariant: ['tabular-nums'],
    lineHeight: 52,
  },
  countdownUnit: {
    fontSize: 12,
    color: Brand.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  progressTrack: {
    width: '80%',
    height: 6,
    backgroundColor: Brand.surfaceElevated,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Brand.accent,
  },
  qualityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: Brand.surface,
  },
  qualityDot: { width: 6, height: 6, borderRadius: 3 },
  qualityText: { fontSize: 12, fontWeight: '600' },

  hint: {
    fontSize: 13,
    color: Brand.textSecondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
    lineHeight: 18,
  },

  footer: {
    paddingVertical: Spacing.md,
  },

  gateRoot: { flex: 1, backgroundColor: Brand.background },
  gateInner: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  gateIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Brand.accentSoft,
    borderWidth: 1,
    borderColor: Brand.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  gateTitle: { ...Type.titleL, color: Brand.textPrimary, textAlign: 'center' },
  gateBody: { fontSize: 14, color: Brand.textSecondary, textAlign: 'center', lineHeight: 20 },
  gateButtons: { flexDirection: 'row', gap: 10, marginTop: 16, width: '100%' },
});
