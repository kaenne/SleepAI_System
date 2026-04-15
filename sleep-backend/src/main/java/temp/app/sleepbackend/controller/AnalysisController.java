package temp.app.sleepbackend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import temp.app.sleepbackend.model.JournalEntry;
import temp.app.sleepbackend.repository.JournalEntryRepository;
import temp.app.sleepbackend.repository.SleepSessionRepository;
import temp.app.sleepbackend.service.StressDataService;

import java.security.Principal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/analysis")
@RequiredArgsConstructor
public class AnalysisController {

    private final JournalEntryRepository journalEntryRepository;
    private final SleepSessionRepository sleepSessionRepository;
    private final StressDataService stressDataService;

    /**
     * Анализ сна
     * GET /api/analysis/sleep?days=7
     */
    @GetMapping("/sleep")
    public ResponseEntity<?> getSleepAnalysis(
            @RequestParam(defaultValue = "7") int days,
            Principal principal
    ) {
        String email = principal.getName();
        LocalDate from = LocalDate.now().minusDays(days);
        LocalDate to = LocalDate.now();

        List<JournalEntry> entries = journalEntryRepository.findAllByUser_EmailAndDateBetween(email, from, to);

        // Расчет статистики
        double averageSleep = entries.stream()
                .filter(e -> e.getSleepHours() != null)
                .mapToDouble(JournalEntry::getSleepHours)
                .average()
                .orElse(0.0);

        int sleepQuality = calculateSleepQuality(entries);

        // Генерируем инсайты
        List<String> insights = generateSleepInsights(entries, averageSleep);
        List<String> recommendations = generateSleepRecommendations(entries, averageSleep);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("sleepQuality", sleepQuality);
        response.put("averageSleep", Math.round(averageSleep * 10) / 10.0);
        response.put("deepSleepPercent", 20); // Заглушка - нужны данные с датчиков
        response.put("remSleepPercent", 25);  // Заглушка - нужны данные с датчиков
        response.put("insights", insights);
        response.put("recommendations", recommendations);

        return ResponseEntity.ok(response);
    }

    /**
     * Анализ стресса
     * GET /api/analysis/stress?days=7
     */
    @GetMapping("/stress")
    public ResponseEntity<?> getStressAnalysis(
            @RequestParam(defaultValue = "7") int days,
            Principal principal
    ) {
        String email = principal.getName();
        LocalDate from = LocalDate.now().minusDays(days);
        LocalDate to = LocalDate.now();

        List<JournalEntry> entries = journalEntryRepository.findAllByUser_EmailAndDateBetween(email, from, to);

        // Расчет среднего стресса
        double averageStress = entries.stream()
                .filter(e -> e.getStressLevel() != null)
                .mapToInt(JournalEntry::getStressLevel)
                .average()
                .orElse(5.0);

        // Определяем тренд
        String trend = calculateStressTrend(entries);

        // Генерируем инсайты
        List<String> insights = generateStressInsights(entries, averageStress);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("averageStress", Math.round(averageStress * 10) / 10.0);
        response.put("trend", trend);
        response.put("insights", insights);

        return ResponseEntity.ok(response);
    }

    private int calculateSleepQuality(List<JournalEntry> entries) {
        if (entries.isEmpty()) return 70;

        double avgSleep = entries.stream()
                .filter(e -> e.getSleepHours() != null)
                .mapToDouble(JournalEntry::getSleepHours)
                .average()
                .orElse(7.0);

        double avgStress = entries.stream()
                .filter(e -> e.getStressLevel() != null)
                .mapToInt(JournalEntry::getStressLevel)
                .average()
                .orElse(5.0);

        // Простая формула: качество зависит от часов сна и уровня стресса
        int quality = (int) (avgSleep * 10 - avgStress * 2 + 20);
        return Math.min(100, Math.max(0, quality));
    }

    private List<String> generateSleepInsights(List<JournalEntry> entries, double avgSleep) {
        List<String> insights = new ArrayList<>();

        if (avgSleep >= 7 && avgSleep <= 9) {
            insights.add("Отличная продолжительность сна! Вы спите рекомендуемые 7-9 часов.");
        } else if (avgSleep < 7) {
            insights.add("Вы спите меньше рекомендуемых 7 часов. Попробуйте ложиться раньше.");
        } else {
            insights.add("Вы спите больше 9 часов. Возможно, стоит установить будильник.");
        }

        // Анализ кофеина
        double avgCaffeine = entries.stream()
                .filter(e -> e.getCaffeineIntake() != null)
                .mapToInt(JournalEntry::getCaffeineIntake)
                .average()
                .orElse(0);

        if (avgCaffeine > 3) {
            insights.add("Высокое потребление кофеина может влиять на качество сна.");
        }

        return insights;
    }

    private List<String> generateSleepRecommendations(List<JournalEntry> entries, double avgSleep) {
        List<String> recommendations = new ArrayList<>();

        if (avgSleep < 7) {
            recommendations.add("Попробуйте ложиться на 30 минут раньше");
        }

        double avgScreenTime = entries.stream()
                .filter(e -> e.getScreenTimeBeforeSleep() != null)
                .mapToInt(JournalEntry::getScreenTimeBeforeSleep)
                .average()
                .orElse(0);

        if (avgScreenTime > 30) {
            recommendations.add("Сократите время использования экранов перед сном");
        }

        recommendations.add("Поддерживайте регулярный режим сна");

        return recommendations;
    }

    private String calculateStressTrend(List<JournalEntry> entries) {
        if (entries.size() < 2) return "stable";

        // Сравниваем первую и вторую половину периода
        int mid = entries.size() / 2;
        
        double firstHalfAvg = entries.subList(0, mid).stream()
                .filter(e -> e.getStressLevel() != null)
                .mapToInt(JournalEntry::getStressLevel)
                .average()
                .orElse(5.0);

        double secondHalfAvg = entries.subList(mid, entries.size()).stream()
                .filter(e -> e.getStressLevel() != null)
                .mapToInt(JournalEntry::getStressLevel)
                .average()
                .orElse(5.0);

        if (secondHalfAvg < firstHalfAvg - 0.5) return "decreasing";
        if (secondHalfAvg > firstHalfAvg + 0.5) return "increasing";
        return "stable";
    }

    private List<String> generateStressInsights(List<JournalEntry> entries, double avgStress) {
        List<String> insights = new ArrayList<>();

        if (avgStress <= 3) {
            insights.add("Отлично! Ваш уровень стресса низкий.");
        } else if (avgStress <= 5) {
            insights.add("Умеренный уровень стресса. Продолжайте заботиться о себе.");
        } else if (avgStress <= 7) {
            insights.add("Повышенный уровень стресса. Рекомендуем техники расслабления.");
        } else {
            insights.add("Высокий уровень стресса. Обратите внимание на свое состояние.");
        }

        return insights;
    }
}
