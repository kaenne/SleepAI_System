package kz.sleepai.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import java.time.LocalDateTime;

@Entity
@Table(name = "sleep_sessions", indexes = {
    @Index(name = "idx_sleep_user_id",   columnList = "user_id"),
    @Index(name = "idx_sleep_start_time", columnList = "start_time")
})
@Data
@EntityListeners(AuditingEntityListener.class)
public class SleepSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private LocalDateTime startTime;
    private LocalDateTime endTime;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private User user;

    private String rawDataPath;
    private Integer qualityScore;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}