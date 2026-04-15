package temp.app.sleepbackend.dto;

import lombok.Data;

@Data
public class AiPredictionResponse {
    private double predictedQuality;
    private String message;
}
