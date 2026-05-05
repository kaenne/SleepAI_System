package kz.sleepai.backend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import kz.sleepai.backend.model.Recommendation;
import kz.sleepai.backend.service.RecommendationService;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/recommendations")
@RequiredArgsConstructor
public class RecommendationController {

    private final RecommendationService recommendationService;

    /**
     * Получить все рекомендации пользователя
     * GET /api/recommendations
     */
    @GetMapping
    public ResponseEntity<List<Recommendation>> getAllRecommendations(Principal principal) {
        List<Recommendation> recommendations = recommendationService.getAllByUserEmail(principal.getName());
        return ResponseEntity.ok(recommendations);
    }

    /**
     * Получить последнюю рекомендацию
     * GET /api/recommendations/latest
     */
    @GetMapping("/latest")
    public ResponseEntity<?> getLatestRecommendation(Principal principal) {
        var recommendation = recommendationService.getLatestByUserEmail(principal.getName());
        if (recommendation.isPresent()) {
            return ResponseEntity.ok(recommendation.get());
        }
        return ResponseEntity.ok(Map.of(
                "message", "No recommendations yet. Add sleep entries to receive personalized advice."
        ));
    }

    /**
     * Получить рекомендацию по ID сессии сна
     * GET /api/recommendations/session/{sessionId}
     */
    @GetMapping("/session/{sessionId}")
    public ResponseEntity<?> getBySessionId(@PathVariable Long sessionId, Principal principal) {
        return recommendationService.getBySessionId(sessionId, principal.getName())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Получить общие советы по улучшению сна
     * GET /api/recommendations/tips
     */
    @GetMapping("/tips")
    public ResponseEntity<?> getSleepTips() {
        List<Map<String, String>> tips = List.of(
                Map.of(
                        "title", "Consistent schedule",
                        "description", "Go to bed and wake up at the same time every day, even on weekends"
                ),
                Map.of(
                        "title", "Limit caffeine",
                        "description", "Avoid coffee and tea at least 6 hours before bedtime"
                ),
                Map.of(
                        "title", "Wind-down ritual",
                        "description", "A warm bath, reading, or meditation can help you relax before sleep"
                ),
                Map.of(
                        "title", "Optimal temperature",
                        "description", "Keep your bedroom temperature between 18-22°C"
                ),
                Map.of(
                        "title", "Darkness and silence",
                        "description", "Use blackout curtains and remove sources of noise"
                ),
                Map.of(
                        "title", "No screens",
                        "description", "Put away your phone and computer at least an hour before bed"
                ),
                Map.of(
                        "title", "Physical activity",
                        "description", "Regular exercise improves sleep quality, but avoid it right before bed"
                ),
                Map.of(
                        "title", "Light dinner",
                        "description", "Avoid heavy meals 2-3 hours before bedtime"
                )
        );

        return ResponseEntity.ok(Map.of("tips", tips));
    }
}
