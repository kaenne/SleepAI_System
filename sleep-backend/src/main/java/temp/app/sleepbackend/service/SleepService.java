package temp.app.sleepbackend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import temp.app.sleepbackend.model.SleepSession;
import temp.app.sleepbackend.model.User;
import temp.app.sleepbackend.repository.SleepSessionRepository;
import temp.app.sleepbackend.repository.UserRepository;

import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class SleepService {

    private final SleepSessionRepository sleepSessionRepository;
    private final UserRepository userRepository;
    private final RecommendationService recommendationService;

    @Value("${app.upload-dir:C:/uploads/}")
    private String uploadDir;

    @Value("${app.python-script:C:/Users/77077/PycharmProjects/sleep_analysis/main.py}")
    private String pythonScriptPath;

    /**
     * Начать новую сессию сна
     */
    public SleepSession startSession(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Пользователь не найден: " + email));

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
                .orElseThrow(() -> new RuntimeException("Сессия не найдена: " + sessionId));

        // Проверяем, что сессия принадлежит пользователю
        if (!session.getUser().getEmail().equals(email)) {
            throw new RuntimeException("Нет доступа к этой сессии");
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
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Пользователь не найден: " + email));

        File uploadDirectory = new File(uploadDir);
        if (!uploadDirectory.exists()) uploadDirectory.mkdirs();

        String fileName = System.currentTimeMillis() + "_" + file.getOriginalFilename();
        Path filePath = Paths.get(uploadDir + fileName);
        Files.write(filePath, file.getBytes());

        // Вызов Python AI сервиса
        System.out.println("Запускаем Python для файла: " + filePath);
        int aiScore = runPythonScript(filePath.toString());
        System.out.println("Python вернул оценку: " + aiScore);

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
        try {
            ProcessBuilder pb = new ProcessBuilder("py", pythonScriptPath, targetFilePath);
            pb.redirectErrorStream(true);

            Process process = pb.start();

            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            String line = reader.readLine();

            process.waitFor();

            if (line != null) {
                return Integer.parseInt(line.trim());
            }
        } catch (Exception e) {
            System.err.println("Ошибка Python: " + e.getMessage());
            e.printStackTrace();
        }
        return 0;
    }

    /**
     * Получить историю сна пользователя
     */
    public List<SleepSession> getUserHistory(String email) {
        return sleepSessionRepository.findAllByUser_EmailOrderByStartTimeDesc(email);
    }

    /**
     * Получить сессию по ID
     */
    public Optional<SleepSession> getSessionById(String email, Long sessionId) {
        return sleepSessionRepository.findById(sessionId)
                .filter(session -> session.getUser().getEmail().equals(email));
    }

    /**
     * Получить последнюю сессию
     */
    public Optional<SleepSession> getLatestSession(String email) {
        List<SleepSession> sessions = sleepSessionRepository.findAllByUser_EmailOrderByStartTimeDesc(email);
        return sessions.isEmpty() ? Optional.empty() : Optional.of(sessions.get(0));
    }
}