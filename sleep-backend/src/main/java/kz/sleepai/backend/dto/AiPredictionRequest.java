package kz.sleepai.backend.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AiPredictionRequest {

    @NotNull
    @DecimalMin("0.0") @DecimalMax("16.0")
    private Double sleepDuration;

    @NotNull
    @DecimalMin("1.0") @DecimalMax("10.0")
    private Double stressLevel;

    @NotNull
    @DecimalMin("20.0") @DecimalMax("250.0")
    private Double heartRate;

    @DecimalMin("0.0") @DecimalMax("1440.0")
    private Double physicalActivity = 30.0;

    @DecimalMin("0.0") @DecimalMax("2000.0")
    private Double caffeineIntake = 0.0;

    @DecimalMin("0.0") @DecimalMax("50.0")
    private Double alcoholIntake = 0.0;

    @DecimalMin("0.0") @DecimalMax("7.0")
    private Double exerciseFrequency = 3.0;

    // age / gender / bmiCategory may be null when the user hasn't filled the AI
    // Profile editor. The Python service treats null as NaN and lets the model
    // handle missingness directly (HistGradientBoosting supports NaN natively).
    @DecimalMin("10.0") @DecimalMax("120.0")
    private Double age;

    @Min(0) @Max(1)
    private Double gender;

    @Min(0) @Max(2)
    private Double bmiCategory;

    @DecimalMin("0.0") @DecimalMax("23.0")
    private Double bedtimeHour = 23.0;

    // UI language for the localized AI message ("ru" | "en" | "kz"). Optional —
    // the AI service falls back to Russian when not provided.
    private String language;
}
