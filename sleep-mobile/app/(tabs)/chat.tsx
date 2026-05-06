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
    <View style={[styles.container, { backgroundColor: isDark ? '#11121C' : colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: isDark ? '#161724' : colors.cardBackground }]}>
        <SafeAreaView style={{ flex: 1 }}>
          <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <View style={[styles.avatarContainer, { backgroundColor: isDark ? '#2D294D' : '#EDE9FE' }]}>
                <IconSymbol name="moon.fill" size={24} color="#FBBF24" />
              </View>
              <View>
                <ThemedText style={[styles.headerTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>{t('chat.title')}</ThemedText>
                <View style={styles.onlineIndicator}>
                  <View style={styles.onlineDot} />
                  <ThemedText style={[styles.headerSubtitle, { color: colors.muted, marginLeft: 6 }]}>Online · syncs with Health</ThemedText>
                </View>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Pressable onPress={clearHistory} style={styles.clearBtn}>
                <IconSymbol name="trash" size={18} color={isDark ? '#6B7280' : '#9CA3AF'} />
              </Pressable>
            </View>
          </Animated.View>
        </SafeAreaView>
      </View>

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
            // Remove the hardcoded English prefix if it exists in the message content
            let displayMessage = message.text;
            let hasDataSignal = false;
            
            const regexResult = displayMessage.match(/\*Based on your data:?([^*]*)\*/);
            if (regexResult) {
               hasDataSignal = true;
               displayMessage = displayMessage.replace(/\*Based on your data:?([^*]*)\*/, '');
               displayMessage = displayMessage.replace(/^\n+/, '');
            }

            return (
              <Animated.View
                key={message.id}
                entering={isNew ? FadeInUp.duration(280).springify() : undefined}
                style={{ width: '100%', marginBottom: 16 }}
              >
                {!message.isUser && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, marginLeft: 4 }}>
                    <ThemedText style={{ color: colors.tint, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>
                      COACH
                    </ThemedText>
                    <ThemedText style={{ color: colors.muted, fontSize: 11, marginLeft: 6 }}>
                      · {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </ThemedText>
                  </View>
                )}

                <View
                  style={[
                    styles.messageBubble,
                    message.isUser ? styles.userBubble : styles.aiBubble,
                    {
                      backgroundColor: message.isUser 
                        ? (isDark ? '#2D294D' : colors.tint) 
                        : (isDark ? '#1C1D2C' : '#F4F5F8'),
                    },
                  ]}
                >
                  <FormattedMessageText
                    text={displayMessage.trim()}
                    color={message.isUser ? '#FFFFFF' : (isDark ? '#FFFFFF' : colors.text)}
                    isUser={message.isUser}
                  />
                  {hasDataSignal && !message.isUser && (
                    <View style={styles.dataSignalContainer}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <IconSymbol name="waveform.path.ecg" size={14} color={colors.tint} />
                        <ThemedText style={{ color: colors.tint, fontSize: 12, fontWeight: '600', marginLeft: 6 }}>
                          Based on your data
                        </ThemedText>
                      </View>
                      <ThemedText style={{ color: colors.muted, fontSize: 12 }}>
                        4 signals ⌄
                      </ThemedText>
                    </View>
                  )}
                </View>

                {message.isUser && (
                  <ThemedText style={{ color: colors.muted, fontSize: 11, alignSelf: 'flex-end', marginTop: 4, marginRight: 4 }}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </ThemedText>
                )}
              </Animated.View>
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
                    backgroundColor: isDark ? '#1C1635' : '#F5F5F5',
                    borderColor: isDark ? '#3E326E' : 'transparent',
                    borderWidth: 1,
                  }]}
                >
                  <ThemedText style={[styles.quickReplyText, { color: isDark ? '#FFFFFF' : colors.text }]}>
                    ✦ {s}
                  </ThemedText>
                </Pressable>
              ))
            : QUICK_REPLY_KEYS.map((key) => (
                <Pressable
                  key={key}
                  onPress={() => sendMessage(t(`chat.${key}_text` as any))}
                  style={[styles.quickReply, {
                    backgroundColor: isDark ? '#1C1635' : '#F5F5F5',
                    borderColor: isDark ? '#3E326E' : 'transparent',
                    borderWidth: 1,
                  }]}
                >
                  <ThemedText style={[styles.quickReplyText, { color: isDark ? '#FFFFFF' : colors.text }]}>
                    ✦ {t(`chat.${key}` as any)}
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
              backgroundColor: isDark ? '#171826' : '#FFFFFF',
              borderColor: isDark ? '#27283B' : '#E5E7EB',
              marginBottom: Math.max(insets.bottom + 8, Spacing.md + 8),
            },
          ]}
        >
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder={t('chat.placeholder')}
            placeholderTextColor={isDark ? '#8F90A6' : colors.muted}
            style={[styles.input, { color: isDark ? '#FFFFFF' : colors.text }]}
            multiline
            maxLength={500}
            returnKeyType="default"
          />
          <SendButton onPress={() => sendMessage()} color={isDark ? '#4D3C7B' : colors.tint} />
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
    backgroundColor: 'rgba(255,255,255,0.2)',
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
  messageTime: {
    fontSize: 11,
    marginTop: 6,
    alignSelf: 'flex-end',
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
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  quickReplyText: {
    fontSize: 13,
    fontWeight: '500',
  },
  dataSignalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.2)',
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
