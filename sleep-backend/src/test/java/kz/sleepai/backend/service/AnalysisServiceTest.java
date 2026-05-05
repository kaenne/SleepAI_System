package kz.sleepai.backend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import kz.sleepai.backend.model.JournalEntry;
import kz.sleepai.backend.repository.JournalEntryRepository;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("AnalysisService Unit Tests")
class AnalysisServiceTest {

    @Mock
    private JournalEntryRepository journalEntryRepository;

    @Mock
    private StressDataService stressDataService;

    @InjectMocks
    private AnalysisService analysisService;

    private static final String EMAIL = "test@example.com";

    private JournalEntry entry(double sleepHours, int stressLevel) {
        JournalEntry e = new JournalEntry();
        e.setSleepHours(sleepHours);
        e.setStressLevel(stressLevel);
        e.setDate(LocalDate.now());
        return e;
    }

    @BeforeEach
    void stub() {
        // lenient — pure-input tests (calculateStressTrend, calculateSleepQuality) don't hit the repo.
        lenient().when(journalEntryRepository.findAllByUser_EmailAndDateBetween(eq(EMAIL), any(), any()))
                .thenReturn(Collections.emptyList());
    }

    // ── getSleepAnalysis ─────────────────────────────────────────────────────

    @Test
    @DisplayName("getSleepAnalysis: contains required keys")
    void getSleepAnalysis_ContainsRequiredKeys() {
        Map<String, Object> result = analysisService.getSleepAnalysis(EMAIL, 7);
        assertTrue(result.containsKey("sleepQuality"));
        assertTrue(result.containsKey("averageSleep"));
        assertTrue(result.containsKey("insights"));
        assertTrue(result.containsKey("recommendations"));
    }

    @Test
    @DisplayName("getSleepAnalysis: correct average sleep")
    void getSleepAnalysis_CorrectAverageSleep() {
        when(journalEntryRepository.findAllByUser_EmailAndDateBetween(eq(EMAIL), any(), any()))
                .thenReturn(List.of(entry(6.0, 5), entry(8.0, 5)));

        Map<String, Object> result = analysisService.getSleepAnalysis(EMAIL, 7);
        assertEquals(7.0, result.get("averageSleep"));
    }

    @Test
    @DisplayName("getSleepAnalysis: no entries returns zero average")
    void getSleepAnalysis_NoEntries_ReturnsZeroAverage() {
        Map<String, Object> result = analysisService.getSleepAnalysis(EMAIL, 7);
        assertEquals(0.0, result.get("averageSleep"));
    }

    @Test
    @DisplayName("getSleepAnalysis: good sleep produces positive insight")
    void getSleepAnalysis_GoodSleep_PositiveInsight() {
        when(journalEntryRepository.findAllByUser_EmailAndDateBetween(eq(EMAIL), any(), any()))
                .thenReturn(List.of(entry(8.0, 2)));

        Map<String, Object> result = analysisService.getSleepAnalysis(EMAIL, 7);
        @SuppressWarnings("unchecked")
        List<String> insights = (List<String>) result.get("insights");
        assertTrue(insights.get(0).contains("7-9 hours"));
    }

    @Test
    @DisplayName("getSleepAnalysis: short sleep produces warning insight")
    void getSleepAnalysis_ShortSleep_WarningInsight() {
        when(journalEntryRepository.findAllByUser_EmailAndDateBetween(eq(EMAIL), any(), any()))
                .thenReturn(List.of(entry(5.5, 3)));

        Map<String, Object> result = analysisService.getSleepAnalysis(EMAIL, 7);
        @SuppressWarnings("unchecked")
        List<String> insights = (List<String>) result.get("insights");
        assertTrue(insights.get(0).contains("less than"));
    }

    // ── getStressAnalysis ────────────────────────────────────────────────────

    @Test
    @DisplayName("getStressAnalysis: contains required keys")
    void getStressAnalysis_ContainsRequiredKeys() {
        Map<String, Object> result = analysisService.getStressAnalysis(EMAIL, 7);
        assertTrue(result.containsKey("averageStress"));
        assertTrue(result.containsKey("trend"));
        assertTrue(result.containsKey("insights"));
    }

    @Test
    @DisplayName("getStressAnalysis: low stress insight")
    void getStressAnalysis_LowStress_ProducesLowInsight() {
        when(journalEntryRepository.findAllByUser_EmailAndDateBetween(eq(EMAIL), any(), any()))
                .thenReturn(List.of(entry(8.0, 2)));

        Map<String, Object> result = analysisService.getStressAnalysis(EMAIL, 7);
        @SuppressWarnings("unchecked")
        List<String> insights = (List<String>) result.get("insights");
        assertTrue(insights.get(0).contains("low"));
    }

    @Test
    @DisplayName("getStressAnalysis: high stress insight")
    void getStressAnalysis_HighStress_ProducesHighInsight() {
        when(journalEntryRepository.findAllByUser_EmailAndDateBetween(eq(EMAIL), any(), any()))
                .thenReturn(List.of(entry(6.0, 9)));

        Map<String, Object> result = analysisService.getStressAnalysis(EMAIL, 7);
        @SuppressWarnings("unchecked")
        List<String> insights = (List<String>) result.get("insights");
        assertTrue(insights.get(0).contains("High"));
    }

    // ── calculateSleepQuality ────────────────────────────────────────────────

    @Test
    @DisplayName("calculateSleepQuality: empty list returns 70")
    void calculateSleepQuality_EmptyList_Returns70() {
        assertEquals(70, analysisService.calculateSleepQuality(Collections.emptyList()));
    }

    @Test
    @DisplayName("calculateSleepQuality: result is clamped to 0-100")
    void calculateSleepQuality_IsClamped() {
        int quality = analysisService.calculateSleepQuality(List.of(entry(0.0, 10)));
        assertTrue(quality >= 0 && quality <= 100);
    }

    // ── calculateStressTrend ─────────────────────────────────────────────────

    @Test
    @DisplayName("calculateStressTrend: single entry returns stable")
    void calculateStressTrend_SingleEntry_Stable() {
        assertEquals("stable", analysisService.calculateStressTrend(List.of(entry(7.0, 5))));
    }

    @Test
    @DisplayName("calculateStressTrend: decreasing stress returns decreasing")
    void calculateStressTrend_StressDecreasing() {
        List<JournalEntry> entries = List.of(
                entry(7.0, 8), entry(7.0, 8),
                entry(7.0, 2), entry(7.0, 2));
        assertEquals("decreasing", analysisService.calculateStressTrend(entries));
    }

    @Test
    @DisplayName("calculateStressTrend: increasing stress returns increasing")
    void calculateStressTrend_StressIncreasing() {
        List<JournalEntry> entries = List.of(
                entry(7.0, 2), entry(7.0, 2),
                entry(7.0, 8), entry(7.0, 8));
        assertEquals("increasing", analysisService.calculateStressTrend(entries));
    }
}
