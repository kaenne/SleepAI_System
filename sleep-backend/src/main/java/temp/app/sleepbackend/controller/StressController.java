package temp.app.sleepbackend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import temp.app.sleepbackend.dto.StressDataRequest;
import temp.app.sleepbackend.model.StressData;
import temp.app.sleepbackend.service.StressDataService;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/stress")
@RequiredArgsConstructor
public class StressController {

    private final StressDataService stressDataService;

    /**
     * Сохранить данные о стрессе (HRV измерение)
     * POST /api/stress
     */
    @PostMapping
    public ResponseEntity<?> saveStressData(
            @Valid @RequestBody StressDataRequest request,
            Principal principal
    ) {
        StressData saved = stressDataService.saveStressData(principal.getName(), request.getHrvScore());
        return ResponseEntity.status(201).body(Map.of(
                "id", saved.getId(),
                "stressLevel", saved.getStressLevel(),
                "hrvScore", saved.getHrvScore(),
                "timestamp", saved.getTimestamp()
        ));
    }

    /**
     * Получить историю измерений стресса
     * GET /api/stress/history
     */
    @GetMapping("/history")
    public ResponseEntity<List<StressData>> getStressHistory(Principal principal) {
        List<StressData> history = stressDataService.getUserStressHistory(principal.getName());
        return ResponseEntity.ok(history);
    }

    /**
     * Получить последнее измерение стресса
     * GET /api/stress/latest
     */
    @GetMapping("/latest")
    public ResponseEntity<?> getLatestStress(Principal principal) {
        return stressDataService.getLatestStressData(principal.getName())
                .map(data -> ResponseEntity.ok(Map.of(
                        "id", data.getId(),
                        "stressLevel", data.getStressLevel(),
                        "hrvScore", data.getHrvScore(),
                        "timestamp", data.getTimestamp()
                )))
                .orElse(ResponseEntity.ok().body(Map.of(
                        "message", "Нет данных о стрессе. Проведите измерение HRV."
                )));
    }

    /**
     * Получить средний уровень стресса за период
     * GET /api/stress/average?days=7
     */
    @GetMapping("/average")
    public ResponseEntity<?> getAverageStress(
            @RequestParam(defaultValue = "7") int days,
            Principal principal
    ) {
        LocalDateTime from = LocalDateTime.now().minusDays(days);
        LocalDateTime to = LocalDateTime.now();

        Double averageHrv = stressDataService.getAverageHrv(principal.getName(), from, to);

        String stressLevel;
        if (averageHrv >= 60) {
            stressLevel = "LOW";
        } else if (averageHrv >= 40) {
            stressLevel = "MEDIUM";
        } else if (averageHrv > 0) {
            stressLevel = "HIGH";
        } else {
            stressLevel = "NO_DATA";
        }

        return ResponseEntity.ok(Map.of(
                "averageHrv", Math.round(averageHrv * 10) / 10.0,
                "stressLevel", stressLevel,
                "period", days + " days"
        ));
    }

    /**
     * Получить интерпретацию уровня стресса
     * GET /api/stress/interpret/{level}
     */
    @GetMapping("/interpret/{level}")
    public ResponseEntity<?> interpretStressLevel(@PathVariable String level) {
        String interpretation;
        List<String> recommendations;

        switch (level.toUpperCase()) {
            case "LOW":
                interpretation = "Низкий уровень стресса. Вы в отличном состоянии!";
                recommendations = List.of(
                        "Продолжайте поддерживать текущий образ жизни",
                        "Регулярный сон помогает сохранять низкий стресс"
                );
                break;
            case "MEDIUM":
                interpretation = "Умеренный уровень стресса. Стоит обратить внимание.";
                recommendations = List.of(
                        "Попробуйте дыхательные упражнения",
                        "Сделайте перерыв и прогуляйтесь",
                        "Уделите время хобби или отдыху"
                );
                break;
            case "HIGH":
                interpretation = "Высокий уровень стресса. Необходимо принять меры.";
                recommendations = List.of(
                        "Практикуйте медитацию или йогу",
                        "Обеспечьте полноценный сон",
                        "Ограничьте кофеин и алкоголь",
                        "Рассмотрите консультацию со специалистом"
                );
                break;
            default:
                interpretation = "Неизвестный уровень стресса";
                recommendations = List.of("Проведите измерение HRV для определения уровня стресса");
        }

        return ResponseEntity.ok(Map.of(
                "level", level.toUpperCase(),
                "interpretation", interpretation,
                "recommendations", recommendations
        ));
    }
}

