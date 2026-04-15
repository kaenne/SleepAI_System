package temp.app.sleepbackend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "recommendations")
public class Recommendation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private LocalDateTime createdAt = LocalDateTime.now();

    // Текст совета: "Сегодня у вас мало глубокого сна, попробуйте медитацию."
    @Column(columnDefinition = "TEXT")
    private String message;

    // Привязываем к конкретному сну, по которому дали совет
    @OneToOne
    @JoinColumn(name = "session_id")
    private SleepSession session;
}