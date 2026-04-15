package temp.app.sleepbackend.dto;

import lombok.Data;

@Data
public class AiPredictionRequest {
    private double sleepDuration;
    private double stressLevel;
    private double heartRate;
}
