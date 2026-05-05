package kz.sleepai.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import kz.sleepai.backend.service.ChatService;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("ChatController Integration Tests")
class ChatControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ChatService chatService;

    // ─── GET /api/chat/history ───────────────────────────────────────────────

    @Test
    @WithMockUser(username = "test@example.com")
    @DisplayName("GET /api/chat/history: returns empty list")
    void getChatHistory_ShouldReturnEmptyList() throws Exception {
        when(chatService.getHistory(eq("test@example.com"), any(), anyInt())).thenReturn(List.of());
        mockMvc.perform(get("/api/chat/history"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    @WithMockUser(username = "test@example.com")
    @DisplayName("GET /api/chat/history: ignores conversationId param")
    void getChatHistory_WithConversationId_ShouldStillReturnEmptyList() throws Exception {
        when(chatService.getHistory(eq("test@example.com"), eq("some-uuid"), anyInt())).thenReturn(List.of());
        mockMvc.perform(get("/api/chat/history").param("conversationId", "some-uuid"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    @DisplayName("GET /api/chat/history: 401 when unauthenticated")
    void getChatHistory_ShouldReturn401_WhenNotAuthenticated() throws Exception {
        mockMvc.perform(get("/api/chat/history"))
                .andExpect(status().isUnauthorized());
    }

    // ─── POST /api/chat/message ──────────────────────────────────────────────

    @Test
    @WithMockUser(username = "test@example.com")
    @DisplayName("POST /api/chat/message: returns assistant message")
    void sendMessage_ShouldReturnAssistantMessage() throws Exception {
        Map<String, Object> aiMsgMap = Map.of(
                "id", "uuid-1",
                "role", "assistant",
                "content", "Try sleeping earlier.",
                "timestamp", "2024-01-01T00:00:00"
        );
        when(chatService.processMessage(eq("test@example.com"), eq("How can I sleep better?"), any()))
                .thenReturn(Map.of(
                        "message", aiMsgMap,
                        "suggestions", List.of("Tell me more", "What about caffeine?"),
                        "conversationId", "conv-1"
                ));

        Map<String, String> body = Map.of("content", "How can I sleep better?");

        mockMvc.perform(post("/api/chat/message")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message.role").value("assistant"))
                .andExpect(jsonPath("$.message.content").value("Try sleeping earlier."))
                .andExpect(jsonPath("$.message.id").value("uuid-1"))
                .andExpect(jsonPath("$.suggestions").isArray())
                .andExpect(jsonPath("$.conversationId").value("conv-1"));
    }

    @Test
    @WithMockUser(username = "test@example.com")
    @DisplayName("POST /api/chat/message: returns 400 for empty content")
    void sendMessage_WithEmptyContent_ShouldReturn400() throws Exception {
        Map<String, String> body = Map.of("content", "");

        mockMvc.perform(post("/api/chat/message")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Message content is required"));
    }

    @Test
    @DisplayName("POST /api/chat/message: 401 when unauthenticated")
    void sendMessage_ShouldReturn401_WhenNotAuthenticated() throws Exception {
        Map<String, String> body = Map.of("content", "Hello");

        mockMvc.perform(post("/api/chat/message")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isUnauthorized());
    }

    // ─── DELETE /api/chat/history ────────────────────────────────────────────

    @Test
    @WithMockUser(username = "test@example.com")
    @DisplayName("DELETE /api/chat/history: clears history for authenticated user")
    void clearHistory_ShouldReturn200_WhenAuthenticated() throws Exception {
        mockMvc.perform(delete("/api/chat/history"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Chat history cleared"));
    }

    @Test
    @DisplayName("DELETE /api/chat/history: 401 when unauthenticated")
    void clearHistory_ShouldReturn401_WhenNotAuthenticated() throws Exception {
        mockMvc.perform(delete("/api/chat/history"))
                .andExpect(status().isUnauthorized());
    }
}
