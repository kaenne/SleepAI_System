package temp.app.sleepbackend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import temp.app.sleepbackend.model.SleepSession;
import temp.app.sleepbackend.service.SleepService;

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
            return ResponseEntity.status(401).body("Вы не авторизованы");
        }

        SleepSession session = sleepService.startSession(principal.getName());
        return ResponseEntity.ok(Map.of(
                "message", "Сессия сна начата",
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
            return ResponseEntity.status(401).body("Вы не авторизованы");
        }

        try {
            SleepSession session = sleepService.endSession(principal.getName(), sessionId);
            return ResponseEntity.ok(Map.of(
                    "message", "Сессия завершена. AI анализ выполнен.",
                    "sessionId", session.getId(),
                    "startTime", session.getStartTime(),
                    "endTime", session.getEndTime(),
                    "qualityScore", session.getQualityScore() != null ? session.getQualityScore() : 0
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Ошибка: " + e.getMessage());
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
            return ResponseEntity.status(401).body("Вы не авторизованы");
        }

        try {
            String userEmail = principal.getName();
            sleepService.saveSleepSession(userEmail, file);
            return ResponseEntity.ok("Файл загружен! AI проанализировал данные для пользователя: " + userEmail);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Ошибка: " + e.getMessage());
        }
    }

    /**
     * Получить историю сна
     * GET /api/sleep/history
     */
    @GetMapping("/history")
    public ResponseEntity<List<SleepSession>> getHistory(Principal principal) {
        String email = principal.getName();
        List<SleepSession> history = sleepService.getUserHistory(email);
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