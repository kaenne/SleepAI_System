package kz.sleepai.backend.repository;

import kz.sleepai.backend.model.Recommendation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RecommendationRepository extends JpaRepository<Recommendation, Long> {
    Optional<Recommendation> findBySessionId(Long sessionId);
    Optional<Recommendation> findBySessionIdAndSession_User_Email(Long sessionId, String email);
    List<Recommendation> findAllBySession_User_Email(String email);
    Optional<Recommendation> findTopBySession_User_EmailOrderByCreatedAtDesc(String email);
}