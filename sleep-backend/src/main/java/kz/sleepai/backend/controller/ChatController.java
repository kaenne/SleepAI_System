package kz.sleepai.backend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import kz.sleepai.backend.service.ChatService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    /**
     * POST /api/chat/message
     * Body: { "content": "...", "conversationId": "optional-uuid" }
     * Response: { "message": { id, role, content, timestamp, conversationId },
     *             "suggestions": [...], "conversationId": "..." }
     */
    @PostMapping("/message")
    public ResponseEntity<Map<String, Object>> sendMessage(
            @AuthenticationPrincipal UserDetails user,
            @RequestBody Map<String, String> body) {

        String content = body.getOrDefault("content", "").trim();
        if (content.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Message content is required"));
        }

        String conversationId = body.get("conversationId");
        Map<String, Object> result = chatService.processMessage(user.getUsername(), content, conversationId);
        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/chat/history?conversationId=...
     * Returns list of messages for the authenticated user.
     */
    @GetMapping("/history")
    public ResponseEntity<List<Map<String, Object>>> getChatHistory(
            @AuthenticationPrincipal UserDetails user,
            @RequestParam(required = false) String conversationId,
            @RequestParam(defaultValue = "50") int limit) {

        List<Map<String, Object>> history = chatService.getHistory(
                user.getUsername(), conversationId, Math.min(limit, 500));
        return ResponseEntity.ok(history);
    }

    /**
     * DELETE /api/chat/history — clear all chat history for the user.
     */
    @DeleteMapping("/history")
    public ResponseEntity<Map<String, String>> clearHistory(
            @AuthenticationPrincipal UserDetails user) {

        chatService.clearHistory(user.getUsername());
        return ResponseEntity.ok(Map.of("message", "Chat history cleared"));
    }
}

