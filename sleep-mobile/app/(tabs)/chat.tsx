import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BorderRadius, Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { api } from '@/services/api';

type Message = {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
};

// Fallback ответы когда backend недоступен
const FALLBACK_RESPONSES = [
  "Для хорошего сна важны три вещи: режим, среда и привычки перед сном. Какую тему хотите обсудить?",
  "Оптимальная температура в спальне — 18-20°C. Тёмная комната и тишина помогают глубже спать.",
  "Попробуйте вести дневник сна: записывайте время засыпания, пробуждения и ощущения утром.",
  "Синий свет от экрана подавляет мелатонин. Используйте «ночной режим» за час до сна.",
  "Регулярный режим сна — главный фактор качества. Даже по выходным не сдвигайте время больше чем на 30 мин.",
];

export default function ChatScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const scrollRef = React.useRef<ScrollView>(null);

  const [messages, setMessages] = React.useState<Message[]>([
    {
      id: '1',
      text: `Привет! Я ваш персональный ИИ-тренер по сну. 🌙\n\nЯ помогу вам понять ваши паттерны сна и дам индивидуальные советы. Чем могу помочь сегодня?`,
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = React.useState('');
  const [isTyping, setIsTyping] = React.useState(false);

  const sendMessage = React.useCallback(async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const messageText = inputText.trim();
    setInputText('');
    setIsTyping(true);

    // Отправляем запрос на бэкенд → Python AI
    try {
      const response = await api.sendChatMessage(messageText);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.reply,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch {
      // Fallback при недоступности бэкенда
      const idx = Math.floor(Math.random() * FALLBACK_RESPONSES.length);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: FALLBACK_RESPONSES[idx],
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);
    } finally {
      setIsTyping(false);
    }
  }, [inputText]);

  // Auto scroll to bottom
  React.useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
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
                <ThemedText style={styles.headerTitle}>AI Тренер 💬</ThemedText>
                <ThemedText style={styles.headerSubtitle}>Ваш персональный ИИ-тренер по сну 💤</ThemedText>
              </View>
            </View>
            <View style={styles.onlineIndicator}>
              <View style={styles.onlineDot} />
            </View>
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>

      {/* Chat Messages */}
      <KeyboardAvoidingView 
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((message, index) => (
            <Animated.View
              key={message.id}
              entering={FadeInUp.delay(index * 50).duration(300)}
              style={[
                styles.messageBubble,
                message.isUser ? styles.userBubble : styles.aiBubble,
                {
                  backgroundColor: message.isUser 
                    ? colors.tint 
                    : colors.cardBackground,
                  borderColor: message.isUser ? 'transparent' : colors.cardBorder,
                }
              ]}
            >
              <ThemedText 
                style={[
                  styles.messageText,
                  { color: message.isUser ? '#FFFFFF' : colors.text }
                ]}
              >
                {message.isUser ? message.text : `🤖 ${message.text}`}
              </ThemedText>
              <ThemedText 
                style={[
                  styles.messageTime,
                  { color: message.isUser ? 'rgba(255,255,255,0.7)' : colors.muted }
                ]}
              >
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </ThemedText>
            </Animated.View>
          ))}

          {isTyping && (
            <Animated.View 
              entering={FadeIn.duration(200)}
              style={[styles.typingIndicator, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}
            >
              <View style={styles.typingDots}>
                <View style={[styles.typingDot, { backgroundColor: colors.muted }]} />
                <View style={[styles.typingDot, { backgroundColor: colors.muted }]} />
                <View style={[styles.typingDot, { backgroundColor: colors.muted }]} />
              </View>
            </Animated.View>
          )}
        </ScrollView>

        {/* Quick Replies */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.quickReplies}
          contentContainerStyle={styles.quickRepliesContent}
        >
          {[
            "Я плохо спал сегодня ночью 😴",
            "Советы для лучшего сна 🌙",
            "Мой уровень стресса 😬"
          ].map((reply) => (
            <Pressable
              key={reply}
              onPress={() => setInputText(reply)}
              style={[styles.quickReply, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}
            >
              <ThemedText style={styles.quickReplyText}>{reply}</ThemedText>
            </Pressable>
          ))}
        </ScrollView>

        {/* Input Area */}
        <View style={[styles.inputContainer, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}>
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Введите сообщение..."
            placeholderTextColor={colors.muted}
            style={[styles.input, { color: colors.text }]}
            multiline
            maxLength={500}
          />
          <Pressable 
            onPress={sendMessage}
            style={[styles.sendButton, { backgroundColor: colors.tint }]}
          >
            <IconSymbol name="arrow.up" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: Spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 40,
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
  avatarEmoji: {
    fontSize: 24,
  },
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
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: Spacing.md,
    paddingBottom: 8,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 14,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
  },
  userBubble: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 6,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 6,
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
    padding: 14,
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.5,
  },
  quickReplies: {
    maxHeight: 50,
    marginBottom: 8,
  },
  quickRepliesContent: {
    paddingHorizontal: Spacing.md,
    gap: 8,
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
    marginBottom: Spacing.md,
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
