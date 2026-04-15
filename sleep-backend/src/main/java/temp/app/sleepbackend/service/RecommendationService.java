package temp.app.sleepbackend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import temp.app.sleepbackend.model.Recommendation;
import temp.app.sleepbackend.model.SleepSession;
import temp.app.sleepbackend.repository.RecommendationRepository;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class RecommendationService {

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

        return recommendationRepository.save(recommendation);
    }

    /**
     * Генерирует текст рекомендации на основе оценки качества сна
     */
    private String generateMessage(Integer qualityScore) {
        if (qualityScore == null) {
            return "Недостаточно данных для анализа. Попробуйте загрузить больше данных о сне.";
        }

        if (qualityScore >= 80) {
            return "Отличное качество сна! Продолжайте соблюдать текущий режим. " +
                   "Рекомендации: поддерживайте регулярный график сна, избегайте кофеина за 6 часов до сна.";
        } else if (qualityScore >= 60) {
            return "Хорошее качество сна, но есть потенциал для улучшения. " +
                   "Рекомендации: попробуйте ложиться спать в одно и то же время, " +
                   "ограничьте использование экранов за час до сна.";
        } else if (qualityScore >= 40) {
            return "Среднее качество сна. Обратите внимание на факторы, влияющие на сон. " +
                   "Рекомендации: проветривайте комнату перед сном, избегайте тяжелой пищи вечером, " +
                   "попробуйте медитацию или дыхательные упражнения.";
        } else if (qualityScore >= 20) {
            return "Качество сна ниже среднего. Необходимо принять меры. " +
                   "Рекомендации: исключите алкоголь и никотин, обеспечьте темноту и тишину в спальне, " +
                   "рассмотрите возможность использования маски для сна или берушей.";
        } else {
            return "Низкое качество сна. Рекомендуется консультация со специалистом. " +
                   "Срочные рекомендации: проверьте условия сна (температура 18-22°C), " +
                   "исключите стрессовые факторы, обратитесь к врачу при продолжении проблем.";
        }
    }

    /**
     * Получить рекомендацию по ID сессии
     */
    public Optional<Recommendation> getBySessionId(Long sessionId) {
        return recommendationRepository.findBySessionId(sessionId);
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
        List<Recommendation> recommendations = recommendationRepository
                .findAllBySession_User_EmailOrderByCreatedAtDesc(email);
        return recommendations.isEmpty() ? Optional.empty() : Optional.of(recommendations.get(0));
    }
}
