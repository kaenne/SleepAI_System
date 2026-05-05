package kz.sleepai.backend.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import kz.sleepai.backend.service.AnalysisService;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("AnalysisController Tests")
class AnalysisControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AnalysisService analysisService;

    private static final String EMAIL = "test@example.com";

    // ─── GET /api/analysis/sleep ─────────────────────────────────────────────

    @Test
    @WithMockUser(username = EMAIL)
    @DisplayName("GET /api/analysis/sleep: 200 with expected fields")
    void getSleepAnalysis_Returns200WithFields() throws Exception {
        when(analysisService.getSleepAnalysis(eq(EMAIL), anyInt())).thenReturn(Map.of(
                "sleepQuality", 78,
                "averageSleep", 7.5,
                "deepSleepPercent", 20,
                "remSleepPercent", 25,
                "insights", List.of("Great sleep duration!"),
                "recommendations", List.of("Maintain a consistent sleep schedule")
        ));

        mockMvc.perform(get("/api/analysis/sleep").param("days", "7"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sleepQuality").value(78))
                .andExpect(jsonPath("$.averageSleep").value(7.5))
                .andExpect(jsonPath("$.insights").isArray())
                .andExpect(jsonPath("$.recommendations").isArray());
    }

    @Test
    @DisplayName("GET /api/analysis/sleep: 401 when unauthenticated")
    void getSleepAnalysis_Returns401_WhenUnauthenticated() throws Exception {
        mockMvc.perform(get("/api/analysis/sleep"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = EMAIL)
    @DisplayName("GET /api/analysis/sleep: default days param works")
    void getSleepAnalysis_DefaultDays() throws Exception {
        when(analysisService.getSleepAnalysis(eq(EMAIL), eq(7))).thenReturn(Map.of(
                "sleepQuality", 70, "averageSleep", 7.0,
                "deepSleepPercent", 20, "remSleepPercent", 25,
                "insights", List.of(), "recommendations", List.of()
        ));

        mockMvc.perform(get("/api/analysis/sleep"))
                .andExpect(status().isOk());
    }

    // ─── GET /api/analysis/stress ────────────────────────────────────────────

    @Test
    @WithMockUser(username = EMAIL)
    @DisplayName("GET /api/analysis/stress: 200 with expected fields")
    void getStressAnalysis_Returns200WithFields() throws Exception {
        when(analysisService.getStressAnalysis(eq(EMAIL), anyInt())).thenReturn(Map.of(
                "averageStress", 4.2,
                "trend", "stable",
                "insights", List.of("Moderate stress level.")
        ));

        mockMvc.perform(get("/api/analysis/stress").param("days", "7"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.averageStress").value(4.2))
                .andExpect(jsonPath("$.trend").value("stable"))
                .andExpect(jsonPath("$.insights").isArray());
    }

    @Test
    @DisplayName("GET /api/analysis/stress: 401 when unauthenticated")
    void getStressAnalysis_Returns401_WhenUnauthenticated() throws Exception {
        mockMvc.perform(get("/api/analysis/stress"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = EMAIL)
    @DisplayName("GET /api/analysis/stress: trend can be decreasing")
    void getStressAnalysis_DecreasingTrend() throws Exception {
        when(analysisService.getStressAnalysis(eq(EMAIL), anyInt())).thenReturn(Map.of(
                "averageStress", 3.0,
                "trend", "decreasing",
                "insights", List.of("Great! Your stress level is low.")
        ));

        mockMvc.perform(get("/api/analysis/stress"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.trend").value("decreasing"));
    }
}
