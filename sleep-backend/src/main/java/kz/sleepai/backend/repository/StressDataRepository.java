package kz.sleepai.backend.repository;

import kz.sleepai.backend.model.StressData;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface StressDataRepository extends JpaRepository<StressData, Long> {
    List<StressData> findByUserId(Long userId);
    Page<StressData> findByUserIdOrderByTimestampDesc(Long userId, Pageable pageable);
    List<StressData> findByUserIdOrderByTimestampDesc(Long userId);
    List<StressData> findByUserIdAndTimestampBetween(Long userId, LocalDateTime from, LocalDateTime to);
}