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

export default function ChatScreen() {
  const colorScheme = useColorScheme() ?? 'light';
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
                <ThemedText style={styles.avatarEmoji}>🧠</ThemedText>
              </View>
              <View>
                <ThemedText style={styles.headerTitle}>{t('chat.title')}</ThemedText>
                <ThemedText style={styles.headerSubtitle}>{t('chat.subtitle')}</ThemedText>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Pressable onPress={clearHistory} style={styles.clearBtn}>
                <IconSymbol name="trash" size={16} color="rgba(255,255,255,0.8)" />
              </Pressable>
              <View style={styles.onlineIndicator}>
                <View style={styles.onlineDot} />
              </View>
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
            return (
              <Animated.View
                key={message.id}
                entering={isNew ? FadeInUp.duration(280).springify() : undefined}
                style={[
                  styles.messageBubble,
                  message.isUser ? styles.userBubble : styles.aiBubble,
                  {
                    backgroundColor: message.isUser ? 'transparent' : colors.cardBackground,
                    borderColor: message.isUser ? 'transparent' : colors.cardBorder,
                    overflow: 'hidden',
                  },
                ]}
              >
                {message.isUser && (
                  <LinearGradient
                    colors={[colors.headerGradientStart, colors.tint]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                )}
                <ThemedText
                  style={[
                    styles.messageText,
                    { color: message.isUser ? '#FFFFFF' : colors.text },
                  ]}
                >
                  {message.isUser ? message.text : `🤖 ${message.text}`}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.messageTime,
                    { color: message.isUser ? 'rgba(255,255,255,0.7)' : colors.muted },
                  ]}
                >
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </ThemedText>
              </Animated.View>
            );
          })}

          {isTyping && (
            <Animated.View
              entering={FadeIn.duration(200)}
              style={[styles.typingIndicator, {
                backgroundColor: colors.cardBackground,
                borderColor: colors.cardBorder,
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
                    backgroundColor: `${colors.tint}15`,
                    borderColor: colors.tint,
                  }]}
                >
                  <ThemedText style={[styles.quickReplyText, { color: colors.tint }]}>
                    ✨ {s}
                  </ThemedText>
                </Pressable>
              ))
            : QUICK_REPLY_KEYS.map((key) => (
                <Pressable
                  key={key}
                  onPress={() => sendMessage(t(`chat.${key}_text` as any))}
                  style={[styles.quickReply, {
                    backgroundColor: colors.cardBackground,
                    borderColor: colors.cardBorder,
                  }]}
                >
                  <ThemedText style={styles.quickReplyText}>
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
              backgroundColor: colors.cardBackground,
              borderColor: colors.cardBorder,
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
    maxWidth: '82%',
    padding: 14,
    borderRadius: 22,
    marginBottom: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
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
    fontSize: 15,
    lineHeight: 22,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  typingIndicator: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
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
    paddingHorizontal: Spacing.md,
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    marginHorizontal: Spacing.md,
    borderRadius: 28,
    borderWidth: 1,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    maxHeight: 100,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
