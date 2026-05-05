package kz.sleepai.backend.service;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import kz.sleepai.backend.model.StressData;
import kz.sleepai.backend.model.StressLevel;
import kz.sleepai.backend.model.User;
import kz.sleepai.backend.repository.StressDataRepository;
import kz.sleepai.backend.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class StressDataService {

    private static final Logger log = LoggerFactory.getLogger(StressDataService.class);

    private final StressDataRepository stressDataRepository;
    private final UserRepository userRepository;

    /**
     * Сохранить данные о стрессе
     */
    public StressData saveStressData(String email, Double hrvScore) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));

        StressData stressData = new StressData();
        stressData.setUser(user);
        stressData.setTimestamp(LocalDateTime.now());
        stressData.setHrvScore(hrvScore);
        stressData.setStressLevel(calculateStressLevel(hrvScore));

        StressData saved = stressDataRepository.save(stressData);
        log.debug("Stress data saved: id={}, user={}, hrv={}, level={}", saved.getId(), email, hrvScore, saved.getStressLevel());
        return saved;
    }

    /**
     * Определяет уровень стресса на основе HRV
     */
    private StressLevel calculateStressLevel(Double hrvScore) {
        if (hrvScore == null || hrvScore < 40) return StressLevel.HIGH;
        if (hrvScore < 60) return StressLevel.MEDIUM;
        return StressLevel.LOW;
    }

    /**
     * Получить историю стресса пользователя (с пагинацией)
     */
    public Page<StressData> getUserStressHistory(String email, Pageable pageable) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));
        return stressDataRepository.findByUserIdOrderByTimestampDesc(user.getId(), pageable);
    }

    /**
     * Получить историю стресса без пагинации
     */
    public List<StressData> getUserStressHistory(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));
        return stressDataRepository.findByUserIdOrderByTimestampDesc(user.getId());
    }

    /**
     * Получить последние данные о стрессе
     */
    public Optional<StressData> getLatestStressData(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));
        List<StressData> data = stressDataRepository.findByUserIdOrderByTimestampDesc(user.getId());
        return data.isEmpty() ? Optional.empty() : Optional.of(data.get(0));
    }

    /**
     * Получить средний уровень HRV за период
     */
    public Double getAverageHrv(String email, LocalDateTime from, LocalDateTime to) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));

        List<StressData> data = stressDataRepository
                .findByUserIdAndTimestampBetween(user.getId(), from, to);

        return data.stream()
                .filter(s -> s.getHrvScore() != null)
                .mapToDouble(StressData::getHrvScore)
                .average()
                .orElse(0.0);
    }
}
