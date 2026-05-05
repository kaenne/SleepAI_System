package kz.sleepai.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "recommendations")
@EntityListeners(AuditingEntityListener.class)
public class Recommendation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    // Текст совета: "Сегодня у вас мало глубокого сна, попробуйте медитацию."
    @Column(columnDefinition = "TEXT")
    private String message;

    // Привязываем к конкретному сну, по которому дали совет
    @OneToOne
    @JoinColumn(name = "session_id")
    private SleepSession session;
}