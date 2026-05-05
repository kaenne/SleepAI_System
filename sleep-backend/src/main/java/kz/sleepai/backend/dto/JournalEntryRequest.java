package kz.sleepai.backend.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;

@Data
public class JournalEntryRequest {
    private LocalDate date;

    // Поля для совместимости с фронтендом
    private String createdAt;  // ISO datetime string
    
    @Min(value = 0, message = "Sleep hours cannot be negative")
    @Max(value = 24, message = "Sleep hours cannot exceed 24")
    private Double sleepHours;

    @Min(value = 1, message = "Stress level must be between 1 and 10")
    @Max(value = 10, message = "Stress level must be between 1 and 10")
    private Integer stressLevel;
    
    @Pattern(
        regexp = "^(HAPPY|NEUTRAL|SAD|STRESSED|RELAXED)?$",
        message = "moodTag must be one of: HAPPY, NEUTRAL, SAD, STRESSED, RELAXED"
    )
    private String moodTag;

    // Caffeine intake in milligrams (one cup of coffee ≈ 80–120 mg).
    @Min(value = 0, message = "Caffeine intake cannot be negative")
    @Max(value = 2000, message = "Caffeine intake cannot exceed 2000 mg")
    private Integer caffeineIntake;

    // Alcohol intake in standard drinks (one drink ≈ 14 g ethanol).
    @Min(value = 0, message = "Alcohol intake cannot be negative")
    @Max(value = 50, message = "Alcohol intake cannot exceed 50 drinks")
    private Integer alcoholIntake;

    @Pattern(
        regexp = "^(LOW|MEDIUM|HIGH)?$",
        message = "activityLevel must be one of: LOW, MEDIUM, HIGH"
    )
    private String activityLevel;

    @Min(value = 0, message = "Last meal time cannot be negative")
    @Max(value = 1440, message = "Last meal time cannot exceed 1440 minutes")
    private Integer lastMealBeforeSleep;

    @Min(value = 0, message = "Screen time cannot be negative")
    @Max(value = 1440, message = "Screen time cannot exceed 1440 minutes")
    private Integer screenTimeBeforeSleep;
    // Mobile clients send "note", web/legacy send "notes" — accept both via JsonAlias.
    @JsonAlias({"note"})
    @Size(max = 2000, message = "Notes must not exceed 2000 characters")
    private String notes;
}

