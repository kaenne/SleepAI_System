package kz.sleepai.backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import kz.sleepai.backend.model.ChatMessage;
import kz.sleepai.backend.model.JournalEntry;
import kz.sleepai.backend.model.MessageRole;
import kz.sleepai.backend.model.StressData;
import kz.sleepai.backend.model.User;
import kz.sleepai.backend.repository.ChatMessageRepository;
import kz.sleepai.backend.repository.JournalEntryRepository;
import kz.sleepai.backend.repository.StressDataRepository;
import kz.sleepai.backend.repository.UserRepository;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;
    private final JournalEntryRepository journalEntryRepository;
    private final StressDataRepository stressDataRepository;
    private final AiPredictionService aiPredictionService;

    /**
     * Process a chat message: persist both sides, call Python AI with user context.
     * Returns the assistant reply text and suggested follow-up questions.
     */
    @Transactional
    public Map<String, Object> processMessage(String email, String content, String conversationId) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));

        String convId = (conversationId != null && !conversationId.isBlank())
                ? conversationId
                : UUID.randomUUID().toString();

        // 1. Save user message
        ChatMessage userMsg = new ChatMessage();
        userMsg.setUser(user);
        userMsg.setConversationId(convId);
        userMsg.setRole(MessageRole.USER);
        userMsg.setContent(content);
        chatMessageRepository.save(userMsg);

        // 2. Build user context from recent data
        String userContext = buildUserContext(email);

        // 3. Call Python AI
        String reply = aiPredictionService.chat(content, userContext);

        // 4. Save AI response
        ChatMessage aiMsg = new ChatMessage();
        aiMsg.setUser(user);
        aiMsg.setConversationId(convId);
        aiMsg.setRole(MessageRole.ASSISTANT);
        aiMsg.setContent(reply);
        chatMessageRepository.save(aiMsg);

        // 5. Build message DTO
        Map<String, Object> messageDto = Map.of(
                "id", aiMsg.getId() != null ? aiMsg.getId().toString() : UUID.randomUUID().toString(),
                "role", MessageRole.ASSISTANT.getValue(),
                "content", reply,
                "timestamp", aiMsg.getTimestamp().toString(),
                "conversationId", convId
        );

        // 6. Generate contextual suggestions
        List<String> suggestions = generateSuggestions(reply, content);

        return Map.of(
                "message", messageDto,
                "suggestions", suggestions,
                "conversationId", convId
        );
    }

    /**
     * Retrieve chat history for a user (optionally filtered by conversationId).
     */
    public List<Map<String, Object>> getHistory(String email, String conversationId, int limit) {
        List<ChatMessage> messages;
        if (conversationId != null && !conversationId.isBlank()) {
            messages = chatMessageRepository
                    .findByUser_EmailAndConversationIdOrderByTimestampAsc(email, conversationId);
        } else {
            messages = chatMessageRepository.findByUser_EmailOrderByTimestampDesc(email);
        }
        if (messages.size() > limit) {
            messages = messages.subList(0, limit);
        }
        return messages.stream().map(m -> {
            Map<String, Object> entry = new java.util.HashMap<>();
            entry.put("id", m.getId().toString());
            entry.put("role", m.getRole().getValue());
            entry.put("content", m.getContent());
            entry.put("timestamp", m.getTimestamp().toString());
            entry.put("conversationId", m.getConversationId());
            return entry;
        }).toList();
    }

    /**
     * Delete all chat history for a user (GDPR / clear chat).
     */
    @Transactional
    public void clearHistory(String email) {
        chatMessageRepository.deleteByUser_Email(email);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Private helpers
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Build a short natural-language summary of the user's recent sleep & stress
     * data so the Python AI can give personalised responses.
     */
    private String buildUserContext(String email) {
        StringBuilder ctx = new StringBuilder();

        // Last 7 journal entries
        List<JournalEntry> entries = journalEntryRepository
                .findAllByUser_EmailAndDateBetween(email,
                        LocalDate.now().minusDays(7), LocalDate.now());

        if (!entries.isEmpty()) {
            double avgSleep = entries.stream()
                    .filter(e -> e.getSleepHours() != null)
                    .mapToDouble(JournalEntry::getSleepHours)
                    .average().orElse(0);
            double avgStress = entries.stream()
                    .filter(e -> e.getStressLevel() != null)
                    .mapToDouble(JournalEntry::getStressLevel)
                    .average().orElse(0);
            if (avgSleep > 0) {
                ctx.append(String.format("Average sleep last 7 days: %.1f hours. ", avgSleep));
            }
            if (avgStress > 0) {
                ctx.append(String.format("Average stress level: %.1f/10. ", avgStress));
            }
        }

        // Latest HRV
        User user = userRepository.findByEmail(email).orElse(null);
        if (user != null) {
            List<StressData> stressHistory = stressDataRepository
                    .findByUserIdOrderByTimestampDesc(user.getId());
            if (!stressHistory.isEmpty()) {
                StressData latest = stressHistory.get(0);
                if (latest.getHrvScore() != null) {
                    ctx.append(String.format("Latest HRV score: %.0f. Stress level: %s. ",
                            latest.getHrvScore(), latest.getStressLevel()));
                }
            }
        }

        return ctx.toString().trim();
    }

    /**
     * Generate 3 follow-up suggestion questions based on the reply content.
     */
    private List<String> generateSuggestions(String reply, String originalMessage) {
        List<String> suggestions = new ArrayList<>();
        String replyLower = reply.toLowerCase();
        String msgLower = originalMessage.toLowerCase();

        if (replyLower.contains("4-7-8") || replyLower.contains("дыхани")) {
            suggestions.add("Show me more breathing techniques");
        }
        if (replyLower.contains("режим") || replyLower.contains("расписани") || msgLower.contains("режим")) {
            suggestions.add("How do I build a consistent sleep schedule?");
        }
        if (replyLower.contains("стресс") || replyLower.contains("тревог")) {
            suggestions.add("How does stress affect sleep quality?");
        }
        if (replyLower.contains("кофе") || replyLower.contains("кофеин")) {
            suggestions.add("What drinks are good before bed?");
        }
        if (replyLower.contains("экран") || replyLower.contains("телефон") || replyLower.contains("синий свет")) {
            suggestions.add("What can I do instead of phone before bed?");
        }
        if (replyLower.contains("мелатонин")) {
            suggestions.add("Is melatonin safe to take every night?");
        }
        if (replyLower.contains("глубокий сон") || replyLower.contains("rem")) {
            suggestions.add("How can I increase my deep sleep?");
        }

        // Always add generic fallbacks if we have fewer than 3
        List<String> fallbacks = List.of(
                "What's the ideal sleep duration for adults?",
                "Tell me about sleep cycles",
                "How does diet affect sleep?"
        );
        for (String fb : fallbacks) {
            if (suggestions.size() >= 3) break;
            suggestions.add(fb);
        }

        return suggestions.subList(0, Math.min(3, suggestions.size()));
    }
}
