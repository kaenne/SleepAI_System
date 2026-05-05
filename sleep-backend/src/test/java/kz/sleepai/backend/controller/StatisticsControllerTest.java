package kz.sleepai.backend.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import kz.sleepai.backend.model.SleepSession;
import kz.sleepai.backend.repository.SleepSessionRepository;
import kz.sleepai.backend.service.StressDataService;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("StatisticsController Integration Tests")
class StatisticsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SleepSessionRepository sleepSessionRepository;

    @MockBean
    private StressDataService stressDataService;

    private static final String TEST_EMAIL = "test@example.com";

    private SleepSession buildSession(int qualityScore) {
        SleepSession s = new SleepSession();
        s.setId(1L);
        s.setQualityScore(qualityScore);
        s.setStartTime(LocalDateTime.now().minusHours(8));
        s.setEndTime(LocalDateTime.now());
        return s;
    }

    @BeforeEach
    void setUp() {
        when(stressDataService.getAverageHrv(anyString(), any(), any())).thenReturn(60.0);
    }

    // ─── GET /api/statistics/summary ─────────────────────────────────────────

    @Test
    @WithMockUser(username = TEST_EMAIL)
    @DisplayName("GET /api/statistics/summary: returns summary with all fields")
    void getSummary_ShouldReturnSummary() throws Exception {
        when(sleepSessionRepository.countByUser_Email(TEST_EMAIL)).thenReturn(5L);
        when(sleepSessionRepository.getAverageQualityScore(eq(TEST_EMAIL), any(), any())).thenReturn(78.5);
        when(sleepSessionRepository.findAllByUser_EmailOrderByStartTimeDesc(TEST_EMAIL))
                .thenReturn(List.of(buildSession(80)));

        mockMvc.perform(get("/api/statistics/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalSessions").value(5))
                .andExpect(jsonPath("$.weeklyAverageQuality").isNumber())
                .andExpect(jsonPath("$.monthlyAverageQuality").isNumber())
                .andExpect(jsonPath("$.weeklyAverageHrv").isNumber())
                .andExpect(jsonPath("$.lastSessionQuality").value(80));
    }

    @Test
    @WithMockUser(username = TEST_EMAIL)
    @DisplayName("GET /api/statistics/summary: handles empty sessions")
    void getSummary_NoSessions_ShouldReturnBasicFields() throws Exception {
        when(sleepSessionRepository.countByUser_Email(TEST_EMAIL)).thenReturn(0L);
        when(sleepSessionRepository.getAverageQualityScore(anyString(), any(), any())).thenReturn(null);
        when(sleepSessionRepository.findAllByUser_EmailOrderByStartTimeDesc(TEST_EMAIL))
                .thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/statistics/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalSessions").value(0));
    }

    @Test
    @DisplayName("GET /api/statistics/summary: 401 when unauthenticated")
    void getSummary_ShouldReturn401_WhenNotAuthenticated() throws Exception {
        mockMvc.perform(get("/api/statistics/summary"))
                .andExpect(status().isUnauthorized());
    }

    // ─── GET /api/statistics/weekly ──────────────────────────────────────────

    @Test
    @WithMockUser(username = TEST_EMAIL)
    @DisplayName("GET /api/statistics/weekly: returns weekly stats")
    void getWeeklyStats_ShouldReturnStats() throws Exception {
        when(sleepSessionRepository.findAllByUser_EmailAndStartTimeBetween(
                eq(TEST_EMAIL), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(List.of(buildSession(75), buildSession(85)));
        when(sleepSessionRepository.getAverageQualityScore(anyString(), any(), any())).thenReturn(70.0);

        mockMvc.perform(get("/api/statistics/weekly"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.period").value("7 days"))
                .andExpect(jsonPath("$.sessionsCount").value(2))
                .andExpect(jsonPath("$.averageQuality").isNumber())
                .andExpect(jsonPath("$.maxQuality").value(85))
                .andExpect(jsonPath("$.minQuality").value(75));
    }

    @Test
    @WithMockUser(username = TEST_EMAIL)
    @DisplayName("GET /api/statistics/weekly: returns empty when no sessions")
    void getWeeklyStats_NoSessions_ShouldReturnZeroCount() throws Exception {
        when(sleepSessionRepository.findAllByUser_EmailAndStartTimeBetween(
                eq(TEST_EMAIL), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/statistics/weekly"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessionsCount").value(0));
    }

    // ─── GET /api/statistics/chart/quality ──────────────────────────────────

    @Test
    @WithMockUser(username = TEST_EMAIL)
    @DisplayName("GET /api/statistics/chart/quality: returns chart data")
    void getQualityChart_ShouldReturnChartData() throws Exception {
        when(sleepSessionRepository.findAllByUser_EmailAndStartTimeBetween(
                eq(TEST_EMAIL), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(List.of(buildSession(80)));

        mockMvc.perform(get("/api/statistics/chart/quality")
                        .param("from", "2026-01-01T00:00:00")
                        .param("to", "2026-01-31T23:59:59"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].quality").value(80))
                .andExpect(jsonPath("$[0].date").isString());
    }
}
