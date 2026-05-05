package kz.sleepai.backend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import kz.sleepai.backend.model.Recommendation;
import kz.sleepai.backend.model.SleepSession;
import kz.sleepai.backend.model.User;
import kz.sleepai.backend.repository.RecommendationRepository;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("RecommendationService Unit Tests")
class RecommendationServiceTest {

    @Mock
    private RecommendationRepository recommendationRepository;

    @InjectMocks
    private RecommendationService recommendationService;

    private User testUser;
    private SleepSession testSession;
    private static final String EMAIL = "test@example.com";

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1L);
        testUser.setEmail(EMAIL);

        testSession = new SleepSession();
        testSession.setId(1L);
        testSession.setUser(testUser);
    }

    // ── generateRecommendation ───────────────────────────────────────────────

    @Test
    @DisplayName("generateRecommendation: saves and returns recommendation")
    void generateRecommendation_SavesRecommendation() {
        testSession.setQualityScore(80);
        when(recommendationRepository.save(any())).thenAnswer(i -> {
            Recommendation r = i.getArgument(0);
            r.setId(1L);
            return r;
        });

        Recommendation result = recommendationService.generateRecommendation(testSession);

        assertNotNull(result);
        assertNotNull(result.getMessage());
        verify(recommendationRepository).save(any(Recommendation.class));
    }

    @Test
    @DisplayName("generateRecommendation: null qualityScore returns fallback message")
    void generateRecommendation_NullScore_ReturnsFallback() {
        testSession.setQualityScore(null);
        when(recommendationRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        Recommendation result = recommendationService.generateRecommendation(testSession);

        assertTrue(result.getMessage().contains("Insufficient data"));
    }

    @ParameterizedTest
    @DisplayName("generateRecommendation: message reflects quality band")
    @CsvSource({
            "90, Excellent",
            "70, Good",
            "50, Average",
            "30, Below-average",
            "10, Poor"
    })
    void generateRecommendation_MessageMatchesQualityBand(int score, String expectedKeyword) {
        testSession.setQualityScore(score);
        when(recommendationRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        Recommendation result = recommendationService.generateRecommendation(testSession);

        assertTrue(result.getMessage().contains(expectedKeyword),
                "Expected keyword '" + expectedKeyword + "' in: " + result.getMessage());
    }

    // ── getBySessionId ───────────────────────────────────────────────────────

    @Test
    @DisplayName("getBySessionId: returns recommendation for correct owner")
    void getBySessionId_ReturnsForCorrectOwner() {
        Recommendation rec = new Recommendation();
        rec.setId(1L);
        when(recommendationRepository.findBySessionIdAndSession_User_Email(1L, EMAIL))
                .thenReturn(Optional.of(rec));

        Optional<Recommendation> result = recommendationService.getBySessionId(1L, EMAIL);

        assertTrue(result.isPresent());
        assertEquals(1L, result.get().getId());
    }

    @Test
    @DisplayName("getBySessionId: returns empty for wrong owner (IDOR protection)")
    void getBySessionId_ReturnsEmptyForWrongOwner() {
        when(recommendationRepository.findBySessionIdAndSession_User_Email(1L, "other@example.com"))
                .thenReturn(Optional.empty());

        Optional<Recommendation> result = recommendationService.getBySessionId(1L, "other@example.com");

        assertTrue(result.isEmpty());
    }

    // ── getLatestByUserEmail ─────────────────────────────────────────────────

    @Test
    @DisplayName("getLatestByUserEmail: delegates to findTop repository method")
    void getLatestByUserEmail_UsesTopQuery() {
        Recommendation latest = new Recommendation();
        latest.setId(5L);
        when(recommendationRepository.findTopBySession_User_EmailOrderByCreatedAtDesc(EMAIL))
                .thenReturn(Optional.of(latest));

        Optional<Recommendation> result = recommendationService.getLatestByUserEmail(EMAIL);

        assertTrue(result.isPresent());
        assertEquals(5L, result.get().getId());
        verify(recommendationRepository, never()).findAllBySession_User_Email(any());
    }

    @Test
    @DisplayName("getLatestByUserEmail: returns empty when no recommendations")
    void getLatestByUserEmail_ReturnsEmptyWhenNone() {
        when(recommendationRepository.findTopBySession_User_EmailOrderByCreatedAtDesc(EMAIL))
                .thenReturn(Optional.empty());

        assertTrue(recommendationService.getLatestByUserEmail(EMAIL).isEmpty());
    }

    // ── getAllByUserEmail ─────────────────────────────────────────────────────

    @Test
    @DisplayName("getAllByUserEmail: returns all recommendations for user")
    void getAllByUserEmail_ReturnsAll() {
        Recommendation r1 = new Recommendation(); r1.setId(1L);
        Recommendation r2 = new Recommendation(); r2.setId(2L);
        when(recommendationRepository.findAllBySession_User_Email(EMAIL))
                .thenReturn(List.of(r1, r2));

        List<Recommendation> result = recommendationService.getAllByUserEmail(EMAIL);

        assertEquals(2, result.size());
    }
}
