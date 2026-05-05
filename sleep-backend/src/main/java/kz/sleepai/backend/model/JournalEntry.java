package kz.sleepai.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "journal_entries", indexes = {
    @Index(name = "idx_journal_user_id", columnList = "user_id"),
    @Index(name = "idx_journal_date",    columnList = "date")
})
@Data
@EntityListeners(AuditingEntityListener.class)
public class JournalEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private LocalDate date;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
    
    // Часы сна
    private Double sleepHours;
    
    // Уровень стресса (1-10)
    private Integer stressLevel;

    @Enumerated(EnumType.STRING)
    private MoodTag moodTag;

    private Integer caffeineIntake;

    private Integer alcoholIntake;

    @Enumerated(EnumType.STRING)
    private ActivityLevel activityLevel;

    // Время последнего приема пищи (часов до сна)
    private Integer lastMealBeforeSleep;

    // Использование экранов перед сном (минуты)
    private Integer screenTimeBeforeSleep;

    // Заметки пользователя
    @Column(columnDefinition = "TEXT")
    private String notes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private User user;
    
    // Получить userId для сериализации
    public Long getUserId() {
        return user != null ? user.getId() : null;
    }
}

