package kz.sleepai.backend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import kz.sleepai.backend.model.SleepSession;
import kz.sleepai.backend.service.SleepService;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/sleep")
@RequiredArgsConstructor
public class SleepController {

    private final SleepService sleepService;

    /**
     * Начать сессию сна
     * POST /api/sleep/start
     */
    @PostMapping("/start")
    public ResponseEntity<?> startSession(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        }

        SleepSession session = sleepService.startSession(principal.getName());
        return ResponseEntity.ok(Map.of(
                "message", "Sleep session started",
                "sessionId", session.getId(),
                "startTime", session.getStartTime()
        ));
    }

    /**
     * Завершить сессию сна и запустить AI анализ
     * POST /api/sleep/end
     */
    @PostMapping("/end")
    public ResponseEntity<?> endSession(
            @RequestParam Long sessionId,
            Principal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        }

        try {
            SleepSession session = sleepService.endSession(principal.getName(), sessionId);
            return ResponseEntity.ok(Map.of(
                    "message", "Session ended. AI analysis complete.",
                    "sessionId", session.getId(),
                    "startTime", session.getStartTime(),
                    "endTime", session.getEndTime(),
                    "qualityScore", session.getQualityScore() != null ? session.getQualityScore() : 0
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage() != null ? e.getMessage() : "Bad request"));
        }
    }

    /**
     * Загрузить данные сна (аудио/акселерометр) для активной сессии
     * POST /api/sleep/upload
     */
    @PostMapping("/upload")
    public ResponseEntity<?> uploadSleepData(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "sessionId", required = false) Long sessionId,
            Principal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        }

        try {
            String userEmail = principal.getName();
            sleepService.saveSleepSession(userEmail, file);
            return ResponseEntity.ok(Map.of("message", "File uploaded and processed for user: " + userEmail));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage() != null ? e.getMessage() : "Upload failed"));
        }
    }

    /**
     * Получить историю сна
     * GET /api/sleep/history
     */
    @GetMapping("/history")
    public ResponseEntity<List<SleepSession>> getHistory(
            @RequestParam(defaultValue = "50") int limit,
            Principal principal
    ) {
        String email = principal.getName();
        List<SleepSession> history = sleepService.getUserHistory(email, Math.min(limit, 200));
        return ResponseEntity.ok(history);
    }

    /**
     * Получить детали конкретной сессии
     * GET /api/sleep/session/{id}
     */
    @GetMapping("/session/{id}")
    public ResponseEntity<?> getSessionById(@PathVariable Long id, Principal principal) {
        return sleepService.getSessionById(principal.getName(), id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Получить последнюю сессию сна
     * GET /api/sleep/latest
     */
    @GetMapping("/latest")
    public ResponseEntity<?> getLatestSession(Principal principal) {
        return sleepService.getLatestSession(principal.getName())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}