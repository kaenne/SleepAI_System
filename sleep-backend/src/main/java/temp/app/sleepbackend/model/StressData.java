package temp.app.sleepbackend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "stress_data")
public class StressData {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Время замера
    private LocalDateTime timestamp;

    // HRV (Heart Rate Variability) - главный показатель стресса
    // Придет от Python-сервиса
    private Double hrvScore;

    // Уровень стресса текстом (LOW, MEDIUM, HIGH)
    private String stressLevel;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
}