package kz.sleepai.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import kz.sleepai.backend.model.Recommendation;
import kz.sleepai.backend.service.RecommendationService;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("RecommendationController Integration Tests")
class RecommendationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private RecommendationService recommendationService;

    private Recommendation testRecommendation;
    private static final String TEST_EMAIL = "test@example.com";

    @BeforeEach
    void setUp() {
        testRecommendation = new Recommendation();
        testRecommendation.setId(1L);
        testRecommendation.setMessage("Great sleep quality! Keep your current schedule.");
        testRecommendation.setCreatedAt(LocalDateTime.now());
    }

    // ─── GET /api/recommendations ────────────────────────────────────────────

    @Test
    @WithMockUser(username = TEST_EMAIL)
    @DisplayName("GET /api/recommendations: returns list")
    void getAllRecommendations_ShouldReturnList() throws Exception {
        when(recommendationService.getAllByUserEmail(TEST_EMAIL))
                .thenReturn(List.of(testRecommendation));

        mockMvc.perform(get("/api/recommendations"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    @DisplayName("GET /api/recommendations: 401 when unauthenticated")
    void getAllRecommendations_ShouldReturn401_WhenNotAuthenticated() throws Exception {
        mockMvc.perform(get("/api/recommendations"))
                .andExpect(status().isUnauthorized());
    }

    // ─── GET /api/recommendations/latest ────────────────────────────────────

    @Test
    @WithMockUser(username = TEST_EMAIL)
    @DisplayName("GET /api/recommendations/latest: returns recommendation when present")
    void getLatest_ShouldReturnRecommendation_WhenPresent() throws Exception {
        when(recommendationService.getLatestByUserEmail(TEST_EMAIL))
                .thenReturn(Optional.of(testRecommendation));

        mockMvc.perform(get("/api/recommendations/latest"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.message").value("Great sleep quality! Keep your current schedule."));
    }

    @Test
    @WithMockUser(username = TEST_EMAIL)
    @DisplayName("GET /api/recommendations/latest: returns message when none present")
    void getLatest_ShouldReturnMessage_WhenNonePresent() throws Exception {
        when(recommendationService.getLatestByUserEmail(anyString()))
                .thenReturn(Optional.empty());

        mockMvc.perform(get("/api/recommendations/latest"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").isString());
    }

    // ─── GET /api/recommendations/session/{id} ────────────────────────────────

    @Test
    @WithMockUser(username = TEST_EMAIL)
    @DisplayName("GET /api/recommendations/session/{id}: returns 404 when not found")
    void getBySessionId_ShouldReturn404_WhenNotFound() throws Exception {
        when(recommendationService.getBySessionId(anyLong(), eq(TEST_EMAIL)))
                .thenReturn(Optional.empty());

        mockMvc.perform(get("/api/recommendations/session/999"))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(username = TEST_EMAIL)
    @DisplayName("GET /api/recommendations/session/{id}: returns recommendation when found")
    void getBySessionId_ShouldReturnRecommendation_WhenFound() throws Exception {
        when(recommendationService.getBySessionId(1L, TEST_EMAIL))
                .thenReturn(Optional.of(testRecommendation));

        mockMvc.perform(get("/api/recommendations/session/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1));
    }

    // ─── GET /api/recommendations/tips ──────────────────────────────────────

    @Test
    @WithMockUser(username = TEST_EMAIL)
    @DisplayName("GET /api/recommendations/tips: returns tips list in English")
    void getTips_ShouldReturnEnglishTips() throws Exception {
        mockMvc.perform(get("/api/recommendations/tips"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tips").isArray())
                .andExpect(jsonPath("$.tips.length()").value(8))
                .andExpect(jsonPath("$.tips[0].title").value("Consistent schedule"))
                .andExpect(jsonPath("$.tips[0].description").isString());
    }
}
