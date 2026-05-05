package kz.sleepai.backend.service;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import kz.sleepai.backend.model.JournalEntry;
import kz.sleepai.backend.repository.JournalEntryRepository;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AnalysisService {

    private static final Logger log = LoggerFactory.getLogger(AnalysisService.class);

    private final JournalEntryRepository journalEntryRepository;
    private final StressDataService stressDataService;

    public Map<String, Object> getSleepAnalysis(String email, int days) {
        List<JournalEntry> entries = journalEntryRepository.findAllByUser_EmailAndDateBetween(
                email, LocalDate.now().minusDays(days), LocalDate.now());

        double averageSleep = entries.stream()
                .filter(e -> e.getSleepHours() != null)
                .mapToDouble(JournalEntry::getSleepHours)
                .average()
                .orElse(0.0);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("sleepQuality", calculateSleepQuality(entries));
        result.put("averageSleep", Math.round(averageSleep * 10) / 10.0);
        // deepSleepPercent / remSleepPercent are only meaningful when AI prediction or wearable
        // data is available — return null instead of fabricated constants.
        result.put("deepSleepPercent", null);
        result.put("remSleepPercent", null);
        result.put("insights", generateSleepInsights(entries, averageSleep));
        result.put("recommendations", generateSleepRecommendations(entries, averageSleep));

        log.debug("Sleep analysis for {}: avgSleep={}, entries={}", email, averageSleep, entries.size());
        return result;
    }

    public Map<String, Object> getStressAnalysis(String email, int days) {
        List<JournalEntry> entries = journalEntryRepository.findAllByUser_EmailAndDateBetween(
                email, LocalDate.now().minusDays(days), LocalDate.now());

        double averageStress = entries.stream()
                .filter(e -> e.getStressLevel() != null)
                .mapToInt(JournalEntry::getStressLevel)
                .average()
                .orElse(5.0);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("averageStress", Math.round(averageStress * 10) / 10.0);
        result.put("trend", calculateStressTrend(entries));
        result.put("insights", generateStressInsights(averageStress));

        log.debug("Stress analysis for {}: avgStress={}, entries={}", email, averageStress, entries.size());
        return result;
    }

    int calculateSleepQuality(List<JournalEntry> entries) {
        if (entries.isEmpty()) return 70;
        double avgSleep = entries.stream()
                .filter(e -> e.getSleepHours() != null)
                .mapToDouble(JournalEntry::getSleepHours)
                .average().orElse(7.0);
        double avgStress = entries.stream()
                .filter(e -> e.getStressLevel() != null)
                .mapToInt(JournalEntry::getStressLevel)
                .average().orElse(5.0);
        int quality = (int) (avgSleep * 10 - avgStress * 2 + 20);
        return Math.min(100, Math.max(0, quality));
    }

    String calculateStressTrend(List<JournalEntry> entries) {
        if (entries.size() < 2) return "stable";
        // Repository query has no ORDER BY — sort here so older=first, newer=second.
        List<JournalEntry> sorted = entries.stream()
                .sorted(java.util.Comparator.comparing(
                        JournalEntry::getDate, java.util.Comparator.nullsFirst(java.util.Comparator.naturalOrder())))
                .toList();
        int mid = sorted.size() / 2;
        double older = sorted.subList(0, mid).stream()
                .filter(e -> e.getStressLevel() != null)
                .mapToInt(JournalEntry::getStressLevel)
                .average().orElse(5.0);
        double newer = sorted.subList(mid, sorted.size()).stream()
                .filter(e -> e.getStressLevel() != null)
                .mapToInt(JournalEntry::getStressLevel)
                .average().orElse(5.0);
        if (newer < older - 0.5) return "decreasing";
        if (newer > older + 0.5) return "increasing";
        return "stable";
    }

    private List<String> generateSleepInsights(List<JournalEntry> entries, double avgSleep) {
        List<String> insights = new ArrayList<>();
        if (avgSleep >= 7 && avgSleep <= 9) {
            insights.add("Great sleep duration! You are getting the recommended 7-9 hours.");
        } else if (avgSleep < 7) {
            insights.add("You are sleeping less than the recommended 7 hours. Try going to bed earlier.");
        } else {
            insights.add("You are sleeping more than 9 hours. Consider setting an alarm.");
        }
        // Caffeine is stored in mg. ~200 mg/day ≈ 2 cups of coffee — past that, sleep impact is well-documented.
        double avgCaffeineMg = entries.stream()
                .filter(e -> e.getCaffeineIntake() != null)
                .mapToInt(JournalEntry::getCaffeineIntake)
                .average().orElse(0);
        if (avgCaffeineMg > 200) {
            insights.add("High caffeine intake may be affecting your sleep quality.");
        }
        return insights;
    }

    private List<String> generateSleepRecommendations(List<JournalEntry> entries, double avgSleep) {
        List<String> recommendations = new ArrayList<>();
        if (avgSleep < 7) recommendations.add("Try going to bed 30 minutes earlier");
        double avgScreenTime = entries.stream()
                .filter(e -> e.getScreenTimeBeforeSleep() != null)
                .mapToInt(JournalEntry::getScreenTimeBeforeSleep)
                .average().orElse(0);
        if (avgScreenTime > 30) recommendations.add("Reduce screen time before bed");
        recommendations.add("Maintain a consistent sleep schedule");
        return recommendations;
    }

    private List<String> generateStressInsights(double avgStress) {
        List<String> insights = new ArrayList<>();
        if (avgStress <= 3) {
            insights.add("Great! Your stress level is low.");
        } else if (avgStress <= 5) {
            insights.add("Moderate stress level. Keep taking care of yourself.");
        } else if (avgStress <= 7) {
            insights.add("Elevated stress level. We recommend relaxation techniques.");
        } else {
            insights.add("High stress level. Please pay attention to your well-being.");
        }
        return insights;
    }
}
