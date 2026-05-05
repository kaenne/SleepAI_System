package kz.sleepai.backend.repository;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import kz.sleepai.backend.model.SleepSession;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface SleepSessionRepository extends JpaRepository<SleepSession, Long> {

    List<SleepSession> findAllByUser_Email(String email);

    List<SleepSession> findAllByUser_EmailOrderByStartTimeDesc(String email);

    // Page-bounded variant for /api/sleep/history — caps memory regardless of how many sessions a user has.
    List<SleepSession> findAllByUser_EmailOrderByStartTimeDesc(String email, Pageable pageable);

    Optional<SleepSession> findFirstByUser_EmailOrderByStartTimeDesc(String email);

    List<SleepSession> findAllByUser_EmailAndStartTimeBetween(String email, LocalDateTime from, LocalDateTime to);

    @Query("SELECT AVG(s.qualityScore) FROM SleepSession s WHERE s.user.email = :email AND s.startTime BETWEEN :from AND :to")
    Double getAverageQualityScore(@Param("email") String email, @Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    Long countByUser_Email(String email);
}