import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BorderRadius, Colors, Spacing } from '@/constants/theme';
import { useTranslation } from '@/contexts/i18n-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSleepJournal } from '@/hooks/use-sleep-journal';
import { api } from '@/services/api';

type Message = {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
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

// Animated typing dot — each dot pulses with offset delay
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

  return (
    <Animated.View
      style={[styles.typingDot, { backgroundColor: color }, style]}
    />
  );
}

// Send button with press scale animation
function SendButton({
  onPress,
  color,
}: {
  onPress: () => void;
  color: string;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={() => {
        scale.value = withSequence(
          withSpring(0.88, { damping: 10 }),
          withSpring(1, { damping: 10 }),
        );
        onPress();
      }}
    >
      <Animated.View style={[styles.sendButton, { backgroundColor: color }, animStyle]}>
        <IconSymbol name="arrow.up" size={20} color="#FFFFFF" />
      </Animated.View>
    </Pressable>
  );
}

function FormattedMessageText({ text, color, isUser }: { text: string; color: string; isUser: boolean }) {
  const blocks = text.split('\n');

  return (
    <View style={{ flexShrink: 1, alignSelf: 'stretch' }}>
      {blocks.map((block, index) => {
        // match bulleted or numbered list items
        const isBullet = block.match(/^[*|-]\s+(.*)/);
        const isNumber = block.match(/^(\d+\.)\s+(.*)/);

        let content = block;
        let prefix = null;
        let isList = false;

        if (isBullet) {
          prefix = '•';
          content = isBullet[1];
          isList = true;
        } else if (isNumber) {
          prefix = isNumber[1];
          content = isNumber[2];
          isList = true;
        }

        const renderInline = (str: string) => {
          const parts = str.split(/(\*\*.*?\*\*)/g);
          return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <ThemedText key={i} style={{ color, fontSize: 16, lineHeight: 24, fontWeight: '700' }}>
                  {part.slice(2, -2)}
                </ThemedText>
              );
            }
            return <ThemedText key={i} style={{ color, fontSize: 16, lineHeight: 24 }}>{part}</ThemedText>;
          });
        };

        if (block.trim() === '' && index === blocks.length - 1) return null;

        if (isList && !isUser) {
          return (
            <View key={index} style={{ flexDirection: 'row', marginBottom: 4, marginLeft: 4, alignItems: 'flex-start' }}>
              <ThemedText style={{ color, fontSize: 16, lineHeight: 24, width: prefix === '•' ? 14 : 22, fontWeight: '700' }}>
                {prefix}
              </ThemedText>
              <ThemedText style={{ flex: 1, color, fontSize: 16, lineHeight: 24 }}>
                {renderInline(content)}
              </ThemedText>
            </View>
          );
        }

        if (block.trim() === '') {
          return <View key={index} style={{ height: 8 }} />;
        }

        return (
          <ThemedText key={index} style={{ color, fontSize: 16, lineHeight: 24, marginBottom: 4 }}>
            {renderInline(block)}
          </ThemedText>
        );
      })}
    </View>
  );
}

function AiDataCard({ hasData }: { hasData: boolean }) {
  if (!hasData) return null;
  return (
    <View style={styles.aiDataOuter}>
      <View style={styles.aiDataHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <IconSymbol name="sparkles" size={14} color="#A78BFA" />
          <ThemedText style={{ color: '#A78BFA', fontSize: 13, fontWeight: '600' }}>Based on your data</ThemedText>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <ThemedText style={{ color: '#888', fontSize: 12 }}>4 signals</ThemedText>
          <IconSymbol name="chevron.up" size={14} color="#888" />
        </View>
      </View>
      
      <View style={styles.aiDataGrid}>
        <View style={[styles.aiDataCell, { borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#2C2C3E' }]}>
          <ThemedText style={styles.aiDataLabel}>HRV (LAST NIGHT)</ThemedText>
          <View style={styles.aiDataValueRow}>
            <ThemedText style={styles.aiDataValue}>60<ThemedText style={styles.aiDataUnit}> ms</ThemedText></ThemedText>
            <View style={[styles.aiBadge, { backgroundColor: '#1A3B2E' }]}><ThemedText style={[styles.aiBadgeText, { color: '#4ADE80' }]}>GOOD</ThemedText></View>
          </View>
        </View>
        <View style={[styles.aiDataCell, { borderBottomWidth: 1, borderColor: '#2C2C3E' }]}>
          <ThemedText style={styles.aiDataLabel}>STRESS LEVEL</ThemedText>
          <View style={styles.aiDataValueRow}>
            <ThemedText style={styles.aiDataValue}>Low</ThemedText>
            <View style={[styles.aiBadge, { backgroundColor: '#1A3B2E' }]}><ThemedText style={[styles.aiBadgeText, { color: '#4ADE80' }]}>LOW</ThemedText></View>
          </View>
        </View>
        <View style={[styles.aiDataCell, { borderRightWidth: 1, borderColor: '#2C2C3E' }]}>
          <ThemedText style={styles.aiDataLabel}>SLEEP SCORE</ThemedText>
          <View style={styles.aiDataValueRow}>
            <ThemedText style={styles.aiDataValue}>78<ThemedText style={styles.aiDataUnit}> /100</ThemedText></ThemedText>
            <View style={[styles.aiBadge, { backgroundColor: '#2D234A' }]}><ThemedText style={[styles.aiBadgeText, { color: '#A78BFA' }]}>AVG</ThemedText></View>
          </View>
        </View>
        <View style={styles.aiDataCell}>
          <ThemedText style={styles.aiDataLabel}>RESTING HR</ThemedText>
          <View style={styles.aiDataValueRow}>
            <ThemedText style={styles.aiDataValue}>54<ThemedText style={styles.aiDataUnit}> bpm</ThemedText></ThemedText>
            <View style={[styles.aiBadge, { backgroundColor: '#1A3B2E' }]}><ThemedText style={[styles.aiBadgeText, { color: '#4ADE80' }]}>GOOD</ThemedText></View>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const colors = Colors[colorScheme];
  const scrollRef = React.useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const { entries } = useSleepJournal();

  // Build personalised context string from the latest journal entry
  const userContext = React.useMemo(() => {
    const e = entries[0];
    if (!e) return '';
    const parts = [`сон ${e.sleepHours}ч`, `стресс ${e.stressLevel}/10`];
    return parts.join(', ');
  }, [entries]);

  const [messages, setMessages] = React.useState<Message[]>(() => [
    { id: 'welcome', text: t('chat.initial'), isUser: false, timestamp: new Date() },
  ]);
  const [inputText, setInputText] = React.useState('');
  const [isTyping, setIsTyping] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [conversationId, setConversationId] = React.useState<string | undefined>(undefined);

  // Track IDs of messages that should animate (only newly added ones)
  const newMessageIds = React.useRef(new Set<string>(['welcome']));
  const isMounted = React.useRef(false);

  React.useEffect(() => {
    api.getChatHistory().then(history => {
      if (history.length > 0) {
        const loaded: Message[] = history.map(m => ({
          id: m.id,
          text: m.content,
          isUser: m.role === 'user',
          timestamp: new Date(m.timestamp),
        }));
        // History messages do NOT animate — they appear instantly
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

    setMessages(prev => [...prev, {
      id: userId,
      text: content,
      isUser: true,
      timestamp: new Date(),
    }]);
    setInputText('');
    setSuggestions([]);
    setIsTyping(true);

    try {
      const response = await api.sendChatMessage(content, conversationId, userContext);
      const aiId = response.message.id;
      newMessageIds.current.add(aiId);
      setMessages(prev => [...prev, {
        id: aiId,
        text: response.message.content,
        isUser: false,
        timestamp: new Date(response.message.timestamp),
      }]);
      setSuggestions(response.suggestions ?? []);
      if (!conversationId && response.conversationId) {
        setConversationId(response.conversationId);
      }
    } catch {
      const fallbackKeys = ['fallback1', 'fallback2', 'fallback3', 'fallback4', 'fallback5'] as const;
      const aiId = (Date.now() + 1).toString();
      newMessageIds.current.add(aiId);
      setMessages(prev => [...prev, {
        id: aiId,
        text: t(`chat.${fallbackKeys[Math.floor(Math.random() * fallbackKeys.length)]}`),
        isUser: false,
        timestamp: new Date(),
      }]);
    } finally {
      setIsTyping(false);
    }
  }, [inputText, conversationId, userContext, t]);

  // Scroll on content change (more reliable than setTimeout)
  const handleContentSizeChange = React.useCallback(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientMid, colors.headerGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <View style={styles.avatarContainer}>
                <IconSymbol name="moon.fill" size={26} color="#FBBF24" />
              </View>
              <View>
                <ThemedText style={styles.headerTitle}>{t('chat.title')}</ThemedText>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <View style={styles.onlineDot} />
                  <ThemedText style={[styles.headerSubtitle, { color: 'rgba(255,255,255,0.7)' }]}>{t('chat.subtitle')}</ThemedText>
                </View>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Pressable onPress={clearHistory} style={styles.clearBtn}>
                <IconSymbol name="trash" size={18} color="rgba(255,255,255,0.8)" />
              </Pressable>
            </View>
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Messages list */}
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
            let hasDataBox = false;

            if (!message.isUser && displayMessage.startsWith('*Based on your data:')) {
               hasDataBox = true;
               displayMessage = displayMessage.replace(/\*Based on your data: [^*]+\*\n\n/, '');
               displayMessage = displayMessage.replace(/^\n/, '');
            }

            const timeString = message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <View key={message.id} style={{ marginBottom: 16 }}>
                {!message.isUser && (
                  <Animated.View entering={isNew ? FadeInUp.duration(280).springify() : undefined} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, marginLeft: 6 }}>
                    <ThemedText style={{ color: colors.tint, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 }}>COACH</ThemedText>
                    <ThemedText style={{ color: colors.muted, fontSize: 10, marginHorizontal: 4 }}>·</ThemedText>
                    <ThemedText style={{ color: colors.muted, fontSize: 10 }}>{timeString}</ThemedText>
                  </Animated.View>
                )}
                
                <Animated.View
                  entering={isNew ? FadeInUp.duration(280).springify() : undefined}
                  style={[
                    styles.messageBubble,
                    message.isUser ? styles.userBubble : styles.aiBubble,
                    {
                      backgroundColor: message.isUser ? (isDark ? '#362C5A' : colors.tint) : (isDark ? '#1C1C28' : '#F5F5F5'),
                      borderColor: isDark && !message.isUser ? '#222230' : 'transparent',
                      overflow: 'hidden',
                    },
                  ]}
                >
                  <FormattedMessageText
                    text={displayMessage}
                    color={message.isUser ? '#FFFFFF' : colors.text}
                    isUser={message.isUser}
                  />
                  {!message.isUser && hasDataBox && (
                    <View style={{ marginTop: 12 }}>
                      <AiDataCard hasData={hasDataBox} />
                    </View>
                  )}
                </Animated.View>

                {message.isUser && (
                  <Animated.View entering={isNew ? FadeInUp.duration(280).springify() : undefined} style={{ alignSelf: 'flex-end', marginTop: 4, marginRight: 6 }}>
                    <ThemedText style={{ color: colors.muted, fontSize: 10 }}>
                      {timeString}
                    </ThemedText>
                  </Animated.View>
                )}
              </View>
            );
          })}

          {isTyping && (
            <Animated.View
              entering={FadeIn.duration(200)}
              style={[styles.typingIndicator, {
                backgroundColor: isDark ? '#2C2C3E' : '#F5F5F5',
                borderColor: 'transparent',
              }]}
            >
              <View style={styles.typingDots}>
                <TypingDot delay={0} color={colors.tint} />
                <TypingDot delay={150} color={colors.tint} />
                <TypingDot delay={300} color={colors.tint} />
              </View>
            </Animated.View>
          )}
        </ScrollView>

        {/* Quick replies */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.quickReplies}
          contentContainerStyle={styles.quickRepliesContent}
          keyboardShouldPersistTaps="handled"
        >
          {suggestions.length > 0
            ? suggestions.map((s, i) => (
                <Pressable
                  key={`sug-${i}`}
                  onPress={() => sendMessage(s)}
                  style={[styles.quickReply, {
                    backgroundColor: isDark ? '#1A182E' : '#F5F5F5',
                    borderColor: isDark ? '#362C5A' : '#E5E7EB',
                  }]}
                >
                  <IconSymbol name="sparkles" size={14} color={isDark ? '#A78BFA' : colors.tint} />
                  <ThemedText style={[styles.quickReplyText, { color: isDark ? '#E2D8F0' : colors.text }]}>
                    {s}
                  </ThemedText>
                </Pressable>
              ))
            : QUICK_REPLY_KEYS.map((key) => (
                <Pressable
                  key={key}
                  onPress={() => sendMessage(t(`chat.${key}_text` as any))}
                  style={[styles.quickReply, {
                    backgroundColor: isDark ? '#1A182E' : '#F5F5F5',
                    borderColor: isDark ? '#362C5A' : '#E5E7EB',
                  }]}
                >
                  <IconSymbol name="sparkles" size={14} color={isDark ? '#A78BFA' : colors.tint} />
                  <ThemedText style={[styles.quickReplyText, { color: isDark ? '#E2D8F0' : colors.text }]}>
                    {t(`chat.${key}` as any)}
                  </ThemedText>
                </Pressable>
              ))
          }
        </ScrollView>

        {/* Input area */}
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: isDark ? '#1E1E2D' : '#FFFFFF',
              borderColor: isDark ? '#2C2C3E' : '#E5E7EB',
              marginBottom: Math.max(insets.bottom, Spacing.md),
            },
          ]}
        >
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder={t('chat.placeholder')}
            placeholderTextColor={colors.muted}
            style={[styles.input, { color: colors.text }]}
            multiline
            maxLength={500}
            returnKeyType="default"
          />
          <SendButton onPress={() => sendMessage()} color={colors.tint} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: Spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2D234A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 24 },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  onlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
  },
  clearBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  chatContainer: { flex: 1 },
  messagesContainer: { flex: 1 },
  messagesContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    padding: Spacing.md,
    paddingBottom: 8,
  },
  messageBubble: {
    maxWidth: '86%',
    padding: 14,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  userBubble: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
  },
  aiDataOuter: {
    borderWidth: 1,
    borderColor: '#2C2C3E',
    borderRadius: 12,
    overflow: 'hidden',
  },
  aiDataHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#1E1E2D',
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C3E',
  },
  aiDataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#151522',
  },
  aiDataCell: {
    width: '50%',
    padding: 12,
  },
  aiDataLabel: {
    fontSize: 10,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    fontWeight: '600',
  },
  aiDataValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiDataValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  aiDataUnit: {
    fontSize: 12,
    fontWeight: '500',
    color: '#888',
  },
  aiBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  aiBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  typingIndicator: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    marginBottom: 10,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
    height: 16,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  quickReplies: {
    maxHeight: 50,
    marginBottom: 8,
  },
  quickRepliesContent: {
    paddingLeft: Spacing.md,
    // Extra trailing space so the last chip never appears clipped at the edge.
    // Cloudflare-tunneled bundles render slowly — visual hints matter for first impression.
    paddingRight: Spacing.md * 2,
    gap: 8,
    alignItems: 'center',
  },
  quickReply: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  quickReplyText: {
    fontSize: 13,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    marginHorizontal: Spacing.md,
    borderRadius: 24,
    borderWidth: 1,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    maxHeight: 120,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
