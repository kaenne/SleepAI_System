package temp.app.sleepbackend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "journal_entries")
@Data
public class JournalEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Дата записи
    private LocalDate date;
    
    // Время создания записи
    private LocalDateTime createdAt;
    
    // Часы сна
    private Double sleepHours;
    
    // Уровень стресса (1-10)
    private Integer stressLevel;

    // Тег настроения (HAPPY, NEUTRAL, SAD, STRESSED, RELAXED)
    private String moodTag;

    // Потребление кофеина (количество чашек или мг)
    private Integer caffeineIntake;

    // Потребление алкоголя (количество порций)
    private Integer alcoholIntake;

    // Уровень физической активности (LOW, MEDIUM, HIGH)
    private String activityLevel;

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

