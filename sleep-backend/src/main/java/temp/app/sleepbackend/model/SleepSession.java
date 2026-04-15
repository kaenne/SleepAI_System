package temp.app.sleepbackend.model;

import com.fasterxml.jackson.annotation.JsonIgnore; // <--- ОБЯЗАТЕЛЬНО добавь этот импорт
import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "sleep_sessions")
@Data
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
}