package kz.sleepai.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "stress_data", indexes = {
    @Index(name = "idx_stress_user_id",  columnList = "user_id"),
    @Index(name = "idx_stress_timestamp", columnList = "timestamp")
})
@EntityListeners(AuditingEntityListener.class)
public class StressData {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Время замера
    private LocalDateTime timestamp;

    // HRV (Heart Rate Variability) - главный показатель стресса
    // Придет от Python-сервиса
    private Double hrvScore;

    @Enumerated(EnumType.STRING)
    private StressLevel stressLevel;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}