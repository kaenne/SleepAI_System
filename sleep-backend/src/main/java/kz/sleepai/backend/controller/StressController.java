package kz.sleepai.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import kz.sleepai.backend.dto.StressDataRequest;
import kz.sleepai.backend.model.StressData;
import kz.sleepai.backend.model.StressLevel;
import kz.sleepai.backend.service.StressDataService;

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
     * Получить историю измерений стресса (с пагинацией)
     * GET /api/stress/history?page=0&size=50
     */
    @GetMapping("/history")
    public ResponseEntity<List<StressData>> getStressHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            Principal principal
    ) {
        PageRequest pageable = PageRequest.of(page, Math.min(size, 200), Sort.by("timestamp").descending());
        return ResponseEntity.ok(stressDataService.getUserStressHistory(principal.getName(), pageable).getContent());
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
                        "message", "No stress data found. Please perform an HRV measurement."
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

        String stressLevelName;
        if (averageHrv >= 60) {
            stressLevelName = StressLevel.LOW.name();
        } else if (averageHrv >= 40) {
            stressLevelName = StressLevel.MEDIUM.name();
        } else if (averageHrv > 0) {
            stressLevelName = StressLevel.HIGH.name();
        } else {
            stressLevelName = "NO_DATA";
        }

        return ResponseEntity.ok(Map.of(
                "averageHrv", Math.round(averageHrv * 10) / 10.0,
                "stressLevel", stressLevelName,
                "period", days + " days"
        ));
    }

    /**
     * Получить интерпретацию уровня стресса
     * GET /api/stress/interpret/{level}
     */
    @GetMapping("/interpret/{level}")
    public ResponseEntity<?> interpretStressLevel(@PathVariable String level) {
        StressLevel stressLevel;
        try {
            stressLevel = StressLevel.valueOf(level.toUpperCase());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Unknown stress level: " + level + ". Valid values: LOW, MEDIUM, HIGH"
            ));
        }

        String interpretation;
        List<String> recommendations;

        switch (stressLevel) {
            case LOW -> {
                interpretation = "Low stress level. You are in great shape!";
                recommendations = List.of(
                        "Keep maintaining your current lifestyle",
                        "Regular sleep helps sustain low stress"
                );
            }
            case MEDIUM -> {
                interpretation = "Moderate stress level. Worth paying attention to.";
                recommendations = List.of(
                        "Try breathing exercises",
                        "Take a break and go for a walk",
                        "Spend time on a hobby or rest"
                );
            }
            case HIGH -> {
                interpretation = "High stress level. Action is needed.";
                recommendations = List.of(
                        "Practice meditation or yoga",
                        "Ensure quality sleep",
                        "Limit caffeine and alcohol",
                        "Consider consulting a specialist"
                );
            }
            default -> {
                interpretation = "Unknown stress level";
                recommendations = List.of("Perform an HRV measurement to determine your stress level");
            }
        }

        return ResponseEntity.ok(Map.of(
                "level", stressLevel.name(),
                "interpretation", interpretation,
                "recommendations", recommendations
        ));
    }
}

