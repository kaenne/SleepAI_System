package temp.app.sleepbackend.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class SleepSessionDTO {
    private Long id;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private Integer qualityScore;
    private String rawDataPath;

    // Вычисляемое поле - продолжительность сна в часах
    private Double durationHours;
}

