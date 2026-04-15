package temp.app.sleepbackend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import temp.app.sleepbackend.model.SleepSession;
import temp.app.sleepbackend.repository.SleepSessionRepository;
import temp.app.sleepbackend.service.StressDataService;

import java.security.Principal;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/statistics")
@RequiredArgsConstructor
public class StatisticsController {

    private final SleepSessionRepository sleepSessionRepository;
    private final StressDataService stressDataService;

    /**
     * Получить общую статистику пользователя
     * GET /api/statistics/summary
     */
    @GetMapping("/summary")
    public ResponseEntity<?> getSummary(Principal principal) {
        String email = principal.getName();

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime weekAgo = now.minusDays(7);
        LocalDateTime monthAgo = now.minusDays(30);

        Map<String, Object> summary = new HashMap<>();

        // Общее количество сессий
        Long totalSessions = sleepSessionRepository.countByUser_Email(email);
        summary.put("totalSessions", totalSessions);

        // Средняя оценка за неделю
        Double weeklyAvg = sleepSessionRepository.getAverageQualityScore(email, weekAgo, now);
        summary.put("weeklyAverageQuality", weeklyAvg != null ? Math.round(weeklyAvg * 10) / 10.0 : null);

        // Средняя оценка за месяц
        Double monthlyAvg = sleepSessionRepository.getAverageQualityScore(email, monthAgo, now);
        summary.put("monthlyAverageQuality", monthlyAvg != null ? Math.round(monthlyAvg * 10) / 10.0 : null);

        // Средний HRV за неделю
        Double weeklyHrv = stressDataService.getAverageHrv(email, weekAgo, now);
        summary.put("weeklyAverageHrv", Math.round(weeklyHrv * 10) / 10.0);

        // Последние сессии
        List<SleepSession> recentSessions = sleepSessionRepository
                .findAllByUser_EmailOrderByStartTimeDesc(email);

        if (!recentSessions.isEmpty()) {
            SleepSession lastSession = recentSessions.get(0);
            summary.put("lastSessionDate", lastSession.getStartTime());
            summary.put("lastSessionQuality", lastSession.getQualityScore());

            // Средняя продолжительность сна (в часах)
            double avgDuration = recentSessions.stream()
                    .filter(s -> s.getStartTime() != null && s.getEndTime() != null)
                    .mapToDouble(s -> ChronoUnit.MINUTES.between(s.getStartTime(), s.getEndTime()) / 60.0)
                    .average()
                    .orElse(0);
            summary.put("averageSleepDurationHours", Math.round(avgDuration * 10) / 10.0);
        }

        return ResponseEntity.ok(summary);
    }

    /**
     * Получить данные для графика качества сна за период
     * GET /api/statistics/chart/quality?from=2026-01-01T00:00:00&to=2026-01-25T23:59:59
     */
    @GetMapping("/chart/quality")
    public ResponseEntity<?> getQualityChart(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            Principal principal
    ) {
        List<SleepSession> sessions = sleepSessionRepository
                .findAllByUser_EmailAndStartTimeBetween(principal.getName(), from, to);

        // Формируем данные для графика
        List<Map<String, Object>> chartData = sessions.stream()
                .map(session -> {
                    Map<String, Object> point = new HashMap<>();
                    point.put("date", session.getStartTime().toLocalDate());
                    point.put("quality", session.getQualityScore());
                    point.put("durationHours", session.getEndTime() != null && session.getStartTime() != null
                            ? ChronoUnit.MINUTES.between(session.getStartTime(), session.getEndTime()) / 60.0
                            : null);
                    return point;
                })
                .toList();

        return ResponseEntity.ok(chartData);
    }

    /**
     * Получить статистику за последние 7 дней
     * GET /api/statistics/weekly
     */
    @GetMapping("/weekly")
    public ResponseEntity<?> getWeeklyStats(Principal principal) {
        String email = principal.getName();
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime weekAgo = now.minusDays(7);

        List<SleepSession> sessions = sleepSessionRepository
                .findAllByUser_EmailAndStartTimeBetween(email, weekAgo, now);

        Map<String, Object> stats = new HashMap<>();
        stats.put("period", "7 days");
        stats.put("from", weekAgo);
        stats.put("to", now);
        stats.put("sessionsCount", sessions.size());

        if (!sessions.isEmpty()) {
            double avgQuality = sessions.stream()
                    .filter(s -> s.getQualityScore() != null)
                    .mapToInt(SleepSession::getQualityScore)
                    .average()
                    .orElse(0);

            int maxQuality = sessions.stream()
                    .filter(s -> s.getQualityScore() != null)
                    .mapToInt(SleepSession::getQualityScore)
                    .max()
                    .orElse(0);

            int minQuality = sessions.stream()
                    .filter(s -> s.getQualityScore() != null)
                    .mapToInt(SleepSession::getQualityScore)
                    .min()
                    .orElse(0);

            stats.put("averageQuality", Math.round(avgQuality * 10) / 10.0);
            stats.put("maxQuality", maxQuality);
            stats.put("minQuality", minQuality);

            // Тренд (сравнение с предыдущей неделей)
            LocalDateTime twoWeeksAgo = now.minusDays(14);
            Double prevWeekAvg = sleepSessionRepository.getAverageQualityScore(email, twoWeeksAgo, weekAgo);

            if (prevWeekAvg != null && prevWeekAvg > 0) {
                double trend = ((avgQuality - prevWeekAvg) / prevWeekAvg) * 100;
                stats.put("trendPercent", Math.round(trend * 10) / 10.0);
                stats.put("trendDirection", trend > 0 ? "UP" : trend < 0 ? "DOWN" : "STABLE");
            }
        }

        return ResponseEntity.ok(stats);
    }
}

