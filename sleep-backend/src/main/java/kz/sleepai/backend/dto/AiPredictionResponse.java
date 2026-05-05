package kz.sleepai.backend.dto;

import lombok.Data;

@Data
public class AiPredictionResponse {
    private double predictedQuality;
    private double remPercentage;
    private double deepSleepPercentage;
    private double expectedAwakenings;
    private String message;
}
