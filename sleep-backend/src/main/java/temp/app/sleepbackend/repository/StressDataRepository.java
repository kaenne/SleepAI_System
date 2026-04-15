package temp.app.sleepbackend.repository;

import temp.app.sleepbackend.model.StressData;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface StressDataRepository extends JpaRepository<StressData, Long> {
    List<StressData> findByUserId(Long userId);
    List<StressData> findByUserIdOrderByTimestampDesc(Long userId);
    List<StressData> findByUserIdAndTimestampBetween(Long userId, LocalDateTime from, LocalDateTime to);
}