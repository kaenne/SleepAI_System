package temp.app.sleepbackend.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class JournalEntryRequest {
    private LocalDate date;

    // Поля для совместимости с фронтендом
    private String createdAt;  // ISO datetime string
    
    @Min(value = 0, message = "Часы сна не могут быть отрицательными")
    @Max(value = 24, message = "Часы сна не могут превышать 24")
    private Double sleepHours;
    
    @Min(value = 1, message = "Уровень стресса от 1 до 10")
    @Max(value = 10, message = "Уровень стресса от 1 до 10")
    private Integer stressLevel;
    
    private String note;  // Короткая заметка

    // HAPPY, NEUTRAL, SAD, STRESSED, RELAXED
    private String moodTag;

    @Min(value = 0, message = "Потребление кофеина не может быть отрицательным")
    @Max(value = 20, message = "Слишком большое значение кофеина")
    private Integer caffeineIntake;

    @Min(value = 0, message = "Потребление алкоголя не может быть отрицательным")
    private Integer alcoholIntake;

    // LOW, MEDIUM, HIGH
    private String activityLevel;

    private Integer lastMealBeforeSleep;
    private Integer screenTimeBeforeSleep;
    private String notes;  // Расширенные заметки
}

