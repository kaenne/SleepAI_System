package temp.app.sleepbackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import temp.app.sleepbackend.model.SleepSession;

import java.time.LocalDateTime;
import java.util.List;

public interface SleepSessionRepository extends JpaRepository<SleepSession, Long> {

    List<SleepSession> findAllByUser_Email(String email);

    List<SleepSession> findAllByUser_EmailOrderByStartTimeDesc(String email);

    List<SleepSession> findAllByUser_EmailAndStartTimeBetween(String email, LocalDateTime from, LocalDateTime to);

    @Query("SELECT AVG(s.qualityScore) FROM SleepSession s WHERE s.user.email = :email AND s.startTime BETWEEN :from AND :to")
    Double getAverageQualityScore(@Param("email") String email, @Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    Long countByUser_Email(String email);
}