package temp.app.sleepbackend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import temp.app.sleepbackend.model.Recommendation;
import temp.app.sleepbackend.service.RecommendationService;

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
                "message", "Пока нет рекомендаций. Добавьте записи сна для получения персонализированных советов."
        ));
    }

    /**
     * Получить рекомендацию по ID сессии сна
     * GET /api/recommendations/session/{sessionId}
     */
    @GetMapping("/session/{sessionId}")
    public ResponseEntity<?> getBySessionId(@PathVariable Long sessionId) {
        return recommendationService.getBySessionId(sessionId)
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
                        "title", "Регулярный режим",
                        "description", "Ложитесь и вставайте в одно время каждый день, даже в выходные"
                ),
                Map.of(
                        "title", "Ограничьте кофеин",
                        "description", "Избегайте кофе и чая за 6 часов до сна"
                ),
                Map.of(
                        "title", "Создайте ритуал",
                        "description", "Теплая ванна, чтение книги или медитация помогут расслабиться"
                ),
                Map.of(
                        "title", "Оптимальная температура",
                        "description", "Поддерживайте температуру в спальне 18-22°C"
                ),
                Map.of(
                        "title", "Темнота и тишина",
                        "description", "Используйте шторы блэкаут и убирайте источники шума"
                ),
                Map.of(
                        "title", "Без экранов",
                        "description", "Отложите телефон и компьютер за час до сна"
                ),
                Map.of(
                        "title", "Физическая активность",
                        "description", "Регулярные упражнения улучшают сон, но не перед сном"
                ),
                Map.of(
                        "title", "Легкий ужин",
                        "description", "Избегайте тяжелой пищи за 2-3 часа до сна"
                )
        );

        return ResponseEntity.ok(Map.of("tips", tips));
    }
}
