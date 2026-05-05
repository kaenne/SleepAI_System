package kz.sleepai.backend.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class StressDataRequest {
    
    @NotNull(message = "HRV score is required")
    @Min(value = 0, message = "HRV cannot be negative")
    @Max(value = 200, message = "HRV cannot exceed 200")
    private Double hrvScore;
}
