package kz.sleepai.backend.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class AiPredictionResponse {
    private double predictedQuality;
    private double remPercentage;
    private double deepSleepPercentage;
    private int awakeningsCategory;     // 0 = норма (0-2), 1 = нарушен (3+)
    private String awakeningsLabel;
    private List<Map<String, Object>> topFactors;
    private String message;
    private String modelVersion;
}
