package temp.app.sleepbackend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import temp.app.sleepbackend.model.StressData;
import temp.app.sleepbackend.model.User;
import temp.app.sleepbackend.repository.StressDataRepository;
import temp.app.sleepbackend.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class StressDataService {

    private final StressDataRepository stressDataRepository;
    private final UserRepository userRepository;

    /**
     * Сохранить данные о стрессе
     */
    public StressData saveStressData(String email, Double hrvScore) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Пользователь не найден: " + email));

        StressData stressData = new StressData();
        stressData.setUser(user);
        stressData.setTimestamp(LocalDateTime.now());
        stressData.setHrvScore(hrvScore);
        stressData.setStressLevel(calculateStressLevel(hrvScore));

        return stressDataRepository.save(stressData);
    }

    /**
     * Определяет уровень стресса на основе HRV
     */
    private String calculateStressLevel(Double hrvScore) {
        if (hrvScore == null) {
            return "UNKNOWN";
        }
        if (hrvScore >= 60) {
            return "LOW";
        } else if (hrvScore >= 40) {
            return "MEDIUM";
        } else {
            return "HIGH";
        }
    }

    /**
     * Получить историю стресса пользователя
     */
    public List<StressData> getUserStressHistory(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Пользователь не найден: " + email));
        return stressDataRepository.findByUserIdOrderByTimestampDesc(user.getId());
    }

    /**
     * Получить последние данные о стрессе
     */
    public Optional<StressData> getLatestStressData(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Пользователь не найден: " + email));
        List<StressData> data = stressDataRepository.findByUserIdOrderByTimestampDesc(user.getId());
        return data.isEmpty() ? Optional.empty() : Optional.of(data.get(0));
    }

    /**
     * Получить средний уровень HRV за период
     */
    public Double getAverageHrv(String email, LocalDateTime from, LocalDateTime to) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Пользователь не найден: " + email));

        List<StressData> data = stressDataRepository
                .findByUserIdAndTimestampBetween(user.getId(), from, to);

        return data.stream()
                .filter(s -> s.getHrvScore() != null)
                .mapToDouble(StressData::getHrvScore)
                .average()
                .orElse(0.0);
    }
}
