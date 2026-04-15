package temp.app.sleepbackend.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class StressDataRequest {
    
    @NotNull(message = "HRV score обязателен")
    @Min(value = 0, message = "HRV не может быть отрицательным")
    @Max(value = 200, message = "HRV не может превышать 200")
    private Double hrvScore;
}
