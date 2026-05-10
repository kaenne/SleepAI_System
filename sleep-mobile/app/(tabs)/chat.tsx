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
import Animated, {
  FadeIn,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Ico } from '@/components/ui/ico';
import { BorderRadius, Brand, Spacing, Type, tonal, tonalBorder } from '@/constants/theme';
import { useTranslation } from '@/contexts/i18n-context';
import { useSleepJournal } from '@/hooks/use-sleep-journal';
import { useStressMonitor } from '@/hooks/use-stress-monitor';
import { api } from '@/services/api';

// ── Types ────────────────────────────────────────────────────────────────────
type Message = {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  /** True when user data context was sent — drives AiDataCard render. */
  hasDataContext?: boolean;
};

type Tone = 'good' | 'avg' | 'bad' | 'unknown';

type AiDataSnapshot = {
  hrv: number | null;
  stressLabel: string | null;
  stressTone: Tone;
  sleepScore: number | null;
  sleepTone: Tone;
};

const QUICK_REPLY_KEYS = [
  'qr_insomnia',
  'qr_stress',
  'qr_caffeine',
  'qr_quality',
  'qr_schedule',
  'qr_snoring',
  'qr_melatonin',
] as const;

// Tone colours mapped to the Brand palette — dark surface + accent overlays.
const TONE: Record<Tone, { bg: string; fg: string }> = {
  good:    { bg: tonal(Brand.good),       fg: Brand.good },
  avg:     { bg: tonal(Brand.accent),     fg: Brand.accent },
  bad:     { bg: tonal('#ff6b6b'),        fg: '#ff6b6b' },
  unknown: { bg: Brand.surfaceElevated,   fg: Brand.textMuted },
};

// ── Animated typing dot ──────────────────────────────────────────────────────
function TypingDot({ delay, color }: { delay: number; color: string }) {
  const translateY = useSharedValue(0);

  React.useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-5, { duration: 300 }),
          withTiming(0, { duration: 300 }),
        ),
        -1,
        false,
      ),
    );
  }, [delay, translateY]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={[styles.typingDot, { backgroundColor: color }, style]} />;
}

// ── Send button ──────────────────────────────────────────────────────────────
function SendButton({ onPress, disabled }: { onPress: () => void; disabled: boolean }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      onPress={() => {
        scale.value = withSequence(withSpring(0.88, { damping: 10 }), withSpring(1, { damping: 10 }));
        onPress();
      }}
      disabled={disabled}
    >
      <Animated.View
        style={[
          styles.sendButton,
          {
            backgroundColor: disabled ? Brand.surfaceElevated : Brand.accent,
            opacity: disabled ? 0.6 : 1,
          },
          animStyle,
        ]}
      >
        <Ico.ArrowUp size={18} color={disabled ? Brand.textMuted : Brand.textInverse} />
      </Animated.View>
    </Pressable>
  );
}

// ── Markdown-ish message renderer (supports **bold** + lists) ────────────────
function FormattedMessageText({ text, color, isUser }: { text: string; color: string; isUser: boolean }) {
  const blocks = text.split('\n');
  return (
    <View style={{ flexShrink: 1, alignSelf: 'stretch' }}>
      {blocks.map((block, index) => {
        const bullet = block.match(/^[*|-]\s+(.*)/);
        const numbered = block.match(/^(\d+\.)\s+(.*)/);

        let content = block;
        let prefix: string | null = null;
        let isList = false;

        if (bullet) {
          prefix = '•';
          content = bullet[1];
          isList = true;
        } else if (numbered) {
          prefix = numbered[1];
          content = numbered[2];
          isList = true;
        }

        const renderInline = (str: string) => {
          const parts = str.split(/(\*\*.*?\*\*)/g);
          return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <ThemedText key={i} style={{ ...Type.bodyM, color, fontSize: 15, lineHeight: 22, fontWeight: '700' }}>
                  {part.slice(2, -2)}
                </ThemedText>
              );
            }
            return <ThemedText key={i} style={{ ...Type.bodyM, color, fontSize: 15, lineHeight: 22 }}>{part}</ThemedText>;
          });
        };

        if (block.trim() === '' && index === blocks.length - 1) return null;

        if (isList && !isUser) {
          return (
            <View key={index} style={{ flexDirection: 'row', marginBottom: 4, marginLeft: 4, alignItems: 'flex-start' }}>
              <ThemedText style={{ ...Type.bodyM, color, fontSize: 15, lineHeight: 22, width: prefix === '•' ? 14 : 22, fontWeight: '700' }}>
                {prefix}
              </ThemedText>
              <ThemedText style={{ flex: 1, color, fontSize: 15, lineHeight: 22 }}>
                {renderInline(content)}
              </ThemedText>
            </View>
          );
        }

        if (block.trim() === '') return <View key={index} style={{ height: 6 }} />;

        return (
          <ThemedText key={index} style={{ ...Type.bodyM, color, fontSize: 15, lineHeight: 22, marginBottom: 3 }}>
            {renderInline(block)}
          </ThemedText>
        );
      })}
    </View>
  );
}

// ── Tone badge — pill with mono uppercase text ───────────────────────────────
function ToneBadge({ tone, label }: { tone: Tone; label: string }) {
  const c = TONE[tone];
  return (
    <View style={[styles.aiBadge, { backgroundColor: c.bg, borderColor: tonalBorder(c.fg) }]}>
      <ThemedText style={[styles.aiBadgeText, { color: c.fg }]}>{label}</ThemedText>
    </View>
  );
}

// ── AI data card — derived from local journal/HRV state ──────────────────────
function AiDataCard({ snapshot, t }: { snapshot: AiDataSnapshot | null; t: (k: string) => string }) {
  if (!snapshot) return null;

  const noData = t('common.noData');
  const signalsCount = [snapshot.hrv, snapshot.stressLabel, snapshot.sleepScore].filter((v) => v != null).length;

  return (
    <View style={styles.aiDataOuter}>
      <View style={styles.aiDataHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ico.Sparkles size={14} color={Brand.accent} />
          <ThemedText style={styles.aiDataHeaderText}>{t('chat.basedOnData')}</ThemedText>
        </View>
        <ThemedText style={styles.aiDataCount}>
          {t('chat.signalsCount').replace('{{n}}', String(signalsCount))}
        </ThemedText>
      </View>

      <View style={styles.aiDataGrid}>
        <View style={[styles.aiDataCell, { borderRightWidth: 1, borderBottomWidth: 1, borderColor: Brand.borderSoft }]}>
          <ThemedText style={styles.aiDataLabel}>{t('chat.hrvLabel')}</ThemedText>
          <View style={styles.aiDataValueRow}>
            <ThemedText style={styles.aiDataValue}>
              {snapshot.hrv != null ? Math.round(snapshot.hrv) : noData}
              {snapshot.hrv != null && <ThemedText style={styles.aiDataUnit}> ms</ThemedText>}
            </ThemedText>
            {snapshot.hrv != null && (
              <ToneBadge tone={snapshot.stressTone} label={t(`chat.tone_${snapshot.stressTone}`)} />
            )}
          </View>
        </View>

        <View style={[styles.aiDataCell, { borderBottomWidth: 1, borderColor: Brand.borderSoft }]}>
          <ThemedText style={styles.aiDataLabel}>{t('chat.stressLabel')}</ThemedText>
          <View style={styles.aiDataValueRow}>
            <ThemedText style={[styles.aiDataValue, { fontSize: 14 }]} numberOfLines={1}>
              {snapshot.stressLabel ?? noData}
            </ThemedText>
            {snapshot.stressLabel && (
              <ToneBadge tone={snapshot.stressTone} label={t(`chat.tone_${snapshot.stressTone}`)} />
            )}
          </View>
        </View>

        <View style={[styles.aiDataCell, { borderRightWidth: 1, borderColor: Brand.borderSoft }]}>
          <ThemedText style={styles.aiDataLabel}>{t('chat.sleepScoreLabel')}</ThemedText>
          <View style={styles.aiDataValueRow}>
            <ThemedText style={styles.aiDataValue}>
              {snapshot.sleepScore != null ? snapshot.sleepScore : noData}
              {snapshot.sleepScore != null && <ThemedText style={styles.aiDataUnit}> /100</ThemedText>}
            </ThemedText>
            {snapshot.sleepScore != null && (
              <ToneBadge tone={snapshot.sleepTone} label={t(`chat.tone_${snapshot.sleepTone}`)} />
            )}
          </View>
        </View>

        <View style={styles.aiDataCell}>
          <ThemedText style={styles.aiDataLabel}>{t('chat.dataSourceLabel')}</ThemedText>
          <View style={styles.aiDataValueRow}>
            <ThemedText style={[styles.aiDataValue, { fontSize: 13 }]}>{t('chat.dataSourceValue')}</ThemedText>
          </View>
        </View>
      </View>
    </View>
  );
}

// ── Screen ───────────────────────────────────────────────────────────────────
export default function ChatScreen() {
  const scrollRef = React.useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const { entries } = useSleepJournal();
  const { latestStress } = useStressMonitor();

  // Derive AiDataCard data from local state — the backend reply stays clean
  // (no English data prefix), and the labels can be localised independently.
  const dataSnapshot = React.useMemo<AiDataSnapshot | null>(() => {
    const e = entries[0];
    const hrv = latestStress?.hrvScore ?? null;

    let stressLabel: string | null = null;
    let stressTone: Tone = 'unknown';
    if (latestStress?.stressLevel && latestStress.stressLevel !== 'UNKNOWN') {
      stressLabel = t(`stress.level_${latestStress.stressLevel.toLowerCase()}`);
      stressTone = latestStress.stressLevel === 'LOW' ? 'good'
        : latestStress.stressLevel === 'MEDIUM' ? 'avg' : 'bad';
    } else if (e?.stressLevel != null) {
      stressLabel = e.stressLevel <= 3 ? t('stress.level_low')
        : e.stressLevel <= 6 ? t('stress.level_medium') : t('stress.level_high');
      stressTone = e.stressLevel <= 3 ? 'good' : e.stressLevel <= 6 ? 'avg' : 'bad';
    }

    let sleepScore: number | null = null;
    let sleepTone: Tone = 'unknown';
    if (e?.sleepHours != null) {
      sleepScore = Math.max(0, Math.min(100, Math.round((e.sleepHours / 8) * 100)));
      sleepTone = sleepScore >= 80 ? 'good' : sleepScore >= 60 ? 'avg' : 'bad';
    }

    if (hrv == null && stressLabel == null && sleepScore == null) return null;
    return { hrv, stressLabel, stressTone, sleepScore, sleepTone };
  }, [entries, latestStress, t]);

  const userContext = React.useMemo(() => {
    const e = entries[0];
    const bits: string[] = [];
    if (e) {
      bits.push(`сон ${e.sleepHours}ч`);
      bits.push(`стресс ${e.stressLevel}/10`);
    }
    if (latestStress?.hrvScore != null) bits.push(`HRV ${Math.round(latestStress.hrvScore)}`);
    return bits.join(', ');
  }, [entries, latestStress]);

  const [messages, setMessages] = React.useState<Message[]>(() => [
    { id: 'welcome', text: t('chat.initial'), isUser: false, timestamp: new Date() },
  ]);
  const [inputText, setInputText] = React.useState('');
  const [isTyping, setIsTyping] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [conversationId, setConversationId] = React.useState<string | undefined>(undefined);

  const newMessageIds = React.useRef(new Set<string>(['welcome']));
  const isMounted = React.useRef(false);

  React.useEffect(() => {
    api.getChatHistory().then((history) => {
      if (history.length > 0) {
        const loaded: Message[] = history.map((m) => ({
          id: m.id,
          text: m.content,
          isUser: m.role === 'user',
          timestamp: new Date(m.timestamp),
        }));
        setMessages(loaded);
        const last = history[history.length - 1] as (typeof history[0] & { conversationId?: string });
        if (last?.conversationId) setConversationId(last.conversationId);
      }
    }).catch(() => {});
    isMounted.current = true;
  }, []);

  const clearHistory = React.useCallback(() => {
    Alert.alert(
      t('chat.clearTitle'),
      t('chat.clearMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('chat.clearBtn'),
          style: 'destructive',
          onPress: async () => {
            try { await api.clearChatHistory(); } catch {}
            const welcomeId = Date.now().toString();
            newMessageIds.current = new Set([welcomeId]);
            setMessages([{ id: welcomeId, text: t('chat.initial'), isUser: false, timestamp: new Date() }]);
            setSuggestions([]);
            setConversationId(undefined);
          },
        },
      ],
    );
  }, [t]);

  const sendMessage = React.useCallback(async (text?: string) => {
    const content = (text ?? inputText).trim();
    if (!content) return;

    const userId = Date.now().toString();
    newMessageIds.current.add(userId);

    setMessages((prev) => [...prev, {
      id: userId,
      text: content,
      isUser: true,
      timestamp: new Date(),
    }]);
    setInputText('');
    setSuggestions([]);
    setIsTyping(true);

    const hasContext = userContext.length > 0;

    try {
      const response = await api.sendChatMessage(content, conversationId, userContext);
      const aiId = response.message.id;
      newMessageIds.current.add(aiId);
      setMessages((prev) => [...prev, {
        id: aiId,
        text: response.message.content,
        isUser: false,
        timestamp: new Date(response.message.timestamp),
        hasDataContext: hasContext,
      }]);
      setSuggestions(response.suggestions ?? []);
      if (!conversationId && response.conversationId) setConversationId(response.conversationId);
    } catch {
      const fallbackKeys = ['fallback1', 'fallback2', 'fallback3', 'fallback4', 'fallback5'] as const;
      const aiId = (Date.now() + 1).toString();
      newMessageIds.current.add(aiId);
      setMessages((prev) => [...prev, {
        id: aiId,
        text: t(`chat.${fallbackKeys[Math.floor(Math.random() * fallbackKeys.length)]}`),
        isUser: false,
        timestamp: new Date(),
        hasDataContext: hasContext,
      }]);
    } finally {
      setIsTyping(false);
    }
  }, [inputText, conversationId, userContext, t]);

  const handleContentSizeChange = React.useCallback(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, []);

  return (
    <View style={styles.container}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: Brand.background }}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.avatarChip, { backgroundColor: tonal(Brand.accent), borderColor: tonalBorder(Brand.accent) }]}>
              <Ico.Sparkles size={18} color={Brand.accent} />
            </View>
            <View>
              <ThemedText style={styles.headerTitle}>{t('chat.title')}</ThemedText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <View style={styles.onlineDot} />
                <ThemedText style={styles.headerSubtitle}>{t('chat.subtitle')}</ThemedText>
              </View>
            </View>
          </View>
          <Pressable
            onPress={clearHistory}
            style={[styles.clearBtn, { backgroundColor: Brand.surface, borderColor: Brand.border }]}
            hitSlop={6}
          >
            <Ico.Trash size={16} color={Brand.textSecondary} />
          </Pressable>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ── Messages list ─────────────────────────────────────────── */}
        <ScrollView
          ref={scrollRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={handleContentSizeChange}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((message) => {
            const isNew = newMessageIds.current.has(message.id);
            let displayMessage = message.text;
            // Strip legacy English context prefix (KB-fallback replies from old backends).
            if (!message.isUser && displayMessage.startsWith('📊 *Based on your data:')) {
              displayMessage = displayMessage.replace(/📊 \*Based on your data: [^*]+\*\n\n/, '');
              displayMessage = displayMessage.replace(/^\n/, '');
            } else if (!message.isUser && displayMessage.startsWith('*Based on your data:')) {
              displayMessage = displayMessage.replace(/\*Based on your data: [^*]+\*\n\n/, '');
              displayMessage = displayMessage.replace(/^\n/, '');
            }
            const hasDataBox = !message.isUser && message.hasDataContext === true && dataSnapshot != null;
            const timeString = message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <View key={message.id} style={{ marginBottom: 14 }}>
                {!message.isUser && (
                  <Animated.View
                    entering={isNew ? FadeInUp.duration(280).springify() : undefined}
                    style={styles.coachLabelRow}
                  >
                    <ThemedText style={styles.coachLabel}>{t('stress.coachLabel')}</ThemedText>
                    <ThemedText style={styles.coachSeparator}>·</ThemedText>
                    <ThemedText style={styles.coachTime}>{timeString}</ThemedText>
                  </Animated.View>
                )}

                <Animated.View
                  entering={isNew ? FadeInUp.duration(280).springify() : undefined}
                  style={[
                    styles.messageBubble,
                    message.isUser ? styles.userBubble : styles.aiBubble,
                    {
                      backgroundColor: message.isUser ? Brand.accent : Brand.surface,
                      borderColor: message.isUser ? 'transparent' : Brand.border,
                    },
                  ]}
                >
                  <FormattedMessageText
                    text={displayMessage}
                    color={message.isUser ? Brand.textInverse : Brand.textPrimary}
                    isUser={message.isUser}
                  />
                  {hasDataBox && (
                    <View style={{ marginTop: 12 }}>
                      <AiDataCard snapshot={dataSnapshot} t={t} />
                    </View>
                  )}
                </Animated.View>

                {message.isUser && (
                  <Animated.View
                    entering={isNew ? FadeInUp.duration(280).springify() : undefined}
                    style={{ alignSelf: 'flex-end', marginTop: 4, marginRight: 6 }}
                  >
                    <ThemedText style={styles.coachTime}>{timeString}</ThemedText>
                  </Animated.View>
                )}
              </View>
            );
          })}

          {isTyping && (
            <Animated.View
              entering={FadeIn.duration(200)}
              style={[styles.typingIndicator, { backgroundColor: Brand.surface, borderColor: Brand.border }]}
            >
              <View style={styles.typingDots}>
                <TypingDot delay={0} color={Brand.accent} />
                <TypingDot delay={150} color={Brand.accent} />
                <TypingDot delay={300} color={Brand.accent} />
              </View>
            </Animated.View>
          )}
        </ScrollView>

        {/* ── Quick replies ─────────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.quickReplies}
          contentContainerStyle={styles.quickRepliesContent}
          keyboardShouldPersistTaps="handled"
        >
          {(suggestions.length > 0 ? suggestions : QUICK_REPLY_KEYS.map((k) => k as string)).map((entry, i) => {
            const isSuggestion = suggestions.length > 0;
            const label = isSuggestion ? entry : t(`chat.${entry}` as any);
            const onTap = () => sendMessage(isSuggestion ? entry : t(`chat.${entry}_text` as any));
            return (
              <Pressable
                key={`chip-${i}-${entry}`}
                onPress={onTap}
                style={[styles.quickReply, { backgroundColor: Brand.surface, borderColor: Brand.border }]}
              >
                <ThemedText style={styles.quickReplyText}>{label}</ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── Input ─────────────────────────────────────────────────── */}
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: Brand.surface,
              borderColor: Brand.border,
              marginBottom: Math.max(insets.bottom, Spacing.md),
            },
          ]}
        >
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder={t('chat.placeholder')}
            placeholderTextColor={Brand.textMuted}
            style={styles.input}
            multiline
            maxLength={500}
            returnKeyType="default"
          />
          <SendButton onPress={() => sendMessage()} disabled={inputText.trim().length === 0} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.background },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Brand.borderSoft,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarChip: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { ...Type.titleS, color: Brand.textPrimary },
  headerSubtitle: { ...Type.bodyS, color: Brand.textSecondary, fontSize: 12 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Brand.good },
  clearBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Chat
  chatContainer: { flex: 1 },
  messagesContainer: { flex: 1 },
  messagesContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    padding: Spacing.md,
    paddingBottom: 8,
  },

  // COACH label
  coachLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, marginLeft: 6 },
  coachLabel: { ...Type.section, color: Brand.accent, fontSize: 10 },
  coachSeparator: { ...Type.monoS, color: Brand.textMuted, marginHorizontal: 4 },
  coachTime: { ...Type.monoS, color: Brand.textMuted, fontSize: 10 },

  // Message bubbles
  messageBubble: {
    maxWidth: '88%',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  userBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 6 },
  aiBubble:   { alignSelf: 'flex-start', borderBottomLeftRadius: 6 },

  // AI data card (within AI bubble)
  aiDataOuter: {
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 12,
    overflow: 'hidden',
  },
  aiDataHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Brand.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: Brand.borderSoft,
  },
  aiDataHeaderText: { ...Type.bodyS, color: Brand.accent, fontSize: 12, fontWeight: '600' },
  aiDataCount: { ...Type.monoS, color: Brand.textMuted, fontSize: 11 },
  aiDataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: Brand.background,
  },
  aiDataCell: { width: '50%', padding: 12 },
  aiDataLabel: { ...Type.section, color: Brand.textMuted, fontSize: 10, marginBottom: 6 },
  aiDataValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  aiDataValue: { ...Type.monoL, color: Brand.textPrimary, fontSize: 16, fontWeight: '700' },
  aiDataUnit: { ...Type.monoS, color: Brand.textMuted, fontSize: 11, fontWeight: '500' },

  aiBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  aiBadgeText: { ...Type.section, fontSize: 9, letterSpacing: 0.6 },

  // Typing indicator
  typingIndicator: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    marginBottom: 10,
  },
  typingDots: { flexDirection: 'row', gap: 5, alignItems: 'center', height: 16 },
  typingDot: { width: 7, height: 7, borderRadius: 4 },

  // Quick replies
  quickReplies: { maxHeight: 50, marginBottom: 8 },
  quickRepliesContent: {
    paddingLeft: Spacing.md,
    paddingRight: Spacing.md * 2,
    gap: 8,
    alignItems: 'center',
  },
  quickReply: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickReplyText: { ...Type.bodyS, color: Brand.textSecondary, fontSize: 13 },

  // Input
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 8,
    marginHorizontal: Spacing.md,
    borderRadius: 22,
    borderWidth: 1,
    gap: 8,
    minHeight: 52,
  },
  input: {
    flex: 1,
    fontFamily: Type.bodyM.fontFamily,
    color: Brand.textPrimary,
    fontSize: 15,
    maxHeight: 120,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
