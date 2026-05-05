package kz.sleepai.backend.service;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import kz.sleepai.backend.model.Recommendation;
import kz.sleepai.backend.model.SleepSession;
import kz.sleepai.backend.repository.RecommendationRepository;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class RecommendationService {

    private static final Logger log = LoggerFactory.getLogger(RecommendationService.class);

    private final RecommendationRepository recommendationRepository;

    /**
     * Генерирует рекомендацию на основе качества сна
     */
    public Recommendation generateRecommendation(SleepSession session) {
        Recommendation recommendation = new Recommendation();
        recommendation.setSession(session);

        Integer score = session.getQualityScore();
        String message = generateMessage(score);
        recommendation.setMessage(message);

        Recommendation saved = recommendationRepository.save(recommendation);
        log.debug("Recommendation saved: id={}, sessionId={}, score={}", saved.getId(), session.getId(), score);
        return saved;
    }

    /**
     * Генерирует текст рекомендации на основе оценки качества сна
     */
    private String generateMessage(Integer qualityScore) {
        if (qualityScore == null) {
            return "Insufficient data for analysis. Try adding more sleep records.";
        }

        if (qualityScore >= 80) {
            return "Excellent sleep quality! Keep your current routine. " +
                   "Tips: maintain a regular sleep schedule and avoid caffeine 6 hours before bed.";
        } else if (qualityScore >= 60) {
            return "Good sleep quality, but there is room for improvement. " +
                   "Tips: try going to bed at the same time each night, " +
                   "limit screen use an hour before sleep.";
        } else if (qualityScore >= 40) {
            return "Average sleep quality. Pay attention to factors affecting your sleep. " +
                   "Tips: ventilate your room before bed, avoid heavy meals in the evening, " +
                   "try meditation or breathing exercises.";
        } else if (qualityScore >= 20) {
            return "Below-average sleep quality. Action is needed. " +
                   "Tips: eliminate alcohol and nicotine, ensure darkness and quiet in your bedroom, " +
                   "consider using a sleep mask or earplugs.";
        } else {
            return "Poor sleep quality. A specialist consultation is recommended. " +
                   "Urgent tips: check sleep conditions (temperature 18-22\u00b0C), " +
                   "eliminate stressors, see a doctor if problems persist.";
        }
    }

    /**
     * Получить рекомендацию по ID сессии — только если она принадлежит данному пользователю.
     */
    public Optional<Recommendation> getBySessionId(Long sessionId, String email) {
        return recommendationRepository.findBySessionIdAndSession_User_Email(sessionId, email);
    }

    /**
     * Получить все рекомендации пользователя
     */
    public List<Recommendation> getAllByUserEmail(String email) {
        return recommendationRepository.findAllBySession_User_Email(email);
    }

    /**
     * Получить последнюю рекомендацию пользователя
     */
    public Optional<Recommendation> getLatestByUserEmail(String email) {
        return recommendationRepository.findTopBySession_User_EmailOrderByCreatedAtDesc(email);
    }
}
