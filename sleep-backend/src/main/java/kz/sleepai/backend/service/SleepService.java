package kz.sleepai.backend.service;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import kz.sleepai.backend.model.SleepSession;
import kz.sleepai.backend.model.User;
import kz.sleepai.backend.repository.SleepSessionRepository;
import kz.sleepai.backend.repository.UserRepository;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SleepService {

    private static final Logger log = LoggerFactory.getLogger(SleepService.class);

    private final SleepSessionRepository sleepSessionRepository;
    private final UserRepository userRepository;
    private final RecommendationService recommendationService;

    @Value("${app.upload-dir:./uploads}")
    private String uploadDir;

    @Value("${app.python-script:}")
    private String pythonScriptPath;

    /**
     * Начать новую сессию сна
     */
    public SleepSession startSession(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));

        SleepSession session = new SleepSession();
        session.setUser(user);
        session.setStartTime(LocalDateTime.now());

        return sleepSessionRepository.save(session);
    }

    /**
     * Завершить сессию сна и запустить AI анализ
     */
    public SleepSession endSession(String email, Long sessionId) {
        SleepSession session = sleepSessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found: " + sessionId));

        // Проверяем, что сессия принадлежит пользователю
        if (!session.getUser().getEmail().equals(email)) {
            throw new RuntimeException("Access denied for this session");
        }

        session.setEndTime(LocalDateTime.now());

        // Запускаем AI анализ если есть данные
        if (session.getRawDataPath() != null) {
            int aiScore = runPythonScript(session.getRawDataPath());
            session.setQualityScore(aiScore);
        } else {
            // Если данных нет, генерируем базовую оценку на основе длительности
            long durationMinutes = java.time.Duration.between(
                    session.getStartTime(), session.getEndTime()).toMinutes();
            session.setQualityScore(calculateBasicScore(durationMinutes));
        }

        SleepSession savedSession = sleepSessionRepository.save(session);

        // Генерируем рекомендацию на основе анализа
        recommendationService.generateRecommendation(savedSession);

        return savedSession;
    }

    /**
     * Базовая оценка качества сна на основе продолжительности
     */
    private int calculateBasicScore(long durationMinutes) {
        // Оптимальный сон 7-9 часов (420-540 минут)
        if (durationMinutes >= 420 && durationMinutes <= 540) {
            return 85;
        } else if (durationMinutes >= 360 && durationMinutes < 420) {
            return 70;
        } else if (durationMinutes >= 540 && durationMinutes <= 600) {
            return 75;
        } else if (durationMinutes < 360) {
            return 50;
        } else {
            return 60; // Слишком долгий сон тоже не оптимален
        }
    }

    /**
     * Сохранить сессию с файлом данных
     */
    public void saveSleepSession(String email, MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Uploaded file is empty");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));

        Path uploadRoot = Paths.get(uploadDir).toAbsolutePath().normalize();
        Files.createDirectories(uploadRoot);

        // Generate a safe server-side filename — never trust client-supplied names
        String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "";
        String extension = originalName.contains(".")
                ? originalName.substring(originalName.lastIndexOf(".")).replaceAll("[^.a-zA-Z0-9]", "")
                : ".bin";
        if (extension.length() > 11) extension = ".bin";
        String safeFileName = UUID.randomUUID() + extension;
        Path filePath = uploadRoot.resolve(safeFileName).toAbsolutePath().normalize();

        // Boundary check: resolved path must stay within the upload root
        if (!filePath.startsWith(uploadRoot)) {
            throw new SecurityException("Resolved path escapes upload directory");
        }

        Files.write(filePath, file.getBytes());

        log.info("Running Python analysis for uploaded file: {}", safeFileName);
        int aiScore = runPythonScript(filePath.toString());
        log.info("Python analysis returned score: {}", aiScore);

        SleepSession session = new SleepSession();
        session.setUser(user);
        session.setStartTime(LocalDateTime.now().minusHours(8));
        session.setEndTime(LocalDateTime.now());
        session.setRawDataPath(filePath.toString());
        session.setQualityScore(aiScore);

        SleepSession savedSession = sleepSessionRepository.save(session);

        // Генерируем рекомендацию
        recommendationService.generateRecommendation(savedSession);
    }

    private int runPythonScript(String targetFilePath) {
        if (pythonScriptPath == null || pythonScriptPath.isBlank()) {
            log.warn("Python script path not configured (app.python-script), skipping AI analysis");
            return 0;
        }
        try {
            ProcessBuilder pb = new ProcessBuilder("python", pythonScriptPath, targetFilePath);
            pb.redirectErrorStream(true);

            Process process = pb.start();

            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            String line = reader.readLine();

            process.waitFor();

            if (line != null) {
                return Integer.parseInt(line.trim());
            }
        } catch (Exception e) {
            log.error("Python analysis script failed: {}", e.getMessage(), e);
        }
        return 0;
    }

    /**
     * Получить историю сна пользователя (последние limit записей).
     * Использует LIMIT в SQL — не тянет все строки в память.
     */
    public List<SleepSession> getUserHistory(String email, int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 500));
        return sleepSessionRepository.findAllByUser_EmailOrderByStartTimeDesc(
                email, PageRequest.of(0, safeLimit, Sort.by("startTime").descending()));
    }

    /**
     * Получить сессию по ID
     */
    public Optional<SleepSession> getSessionById(String email, Long sessionId) {
        return sleepSessionRepository.findById(sessionId)
                .filter(session -> session.getUser().getEmail().equals(email));
    }

    /**
     * Получить последнюю сессию (LIMIT 1 в SQL).
     */
    public Optional<SleepSession> getLatestSession(String email) {
        return sleepSessionRepository.findFirstByUser_EmailOrderByStartTimeDesc(email);
    }
}