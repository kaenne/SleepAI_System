package temp.app.sleepbackend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import temp.app.sleepbackend.dto.AiPredictionRequest;
import temp.app.sleepbackend.dto.AiPredictionResponse;

@Service
@RequiredArgsConstructor
public class AiPredictionService {

    private final RestTemplate restTemplate;

    @Value("${ai.service.url:http://localhost:8000}")
    private String aiServiceUrl;

    public AiPredictionResponse predictSleepQuality(AiPredictionRequest request) {
        String url = aiServiceUrl + "/predict";
        
        try {
            return restTemplate.postForObject(url, request, AiPredictionResponse.class);
        } catch (Exception e) {
            // В случае, если Питон-сервер лежит или выдает ошибку, возвращаем дефолтик
            AiPredictionResponse fallback = new AiPredictionResponse();
            fallback.setPredictedQuality(0.0);
            fallback.setMessage("Ошибка связи с ИИ-сервером: " + e.getMessage());
            return fallback;
        }
    }

    public String chat(String message) {
        String url = aiServiceUrl + "/chat";
        
        try {
            java.util.Map<String, String> body = new java.util.HashMap<>();
            body.put("message", message);
            
            @SuppressWarnings("unchecked")
            java.util.Map<String, String> response = restTemplate.postForObject(url, body, java.util.Map.class);
            if (response != null && response.containsKey("reply")) {
                return response.get("reply");
            }
            return "Не удалось получить ответ от ИИ.";
        } catch (Exception e) {
            return "ИИ-сервер недоступен. Попробуйте позже.";
        }
    }
}
