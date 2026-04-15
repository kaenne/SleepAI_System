package temp.app.sleepbackend.repository;

import temp.app.sleepbackend.model.Recommendation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RecommendationRepository extends JpaRepository<Recommendation, Long> {
    Optional<Recommendation> findBySessionId(Long sessionId);
    List<Recommendation> findAllBySession_User_Email(String email);
    List<Recommendation> findAllBySession_User_EmailOrderByCreatedAtDesc(String email);
}