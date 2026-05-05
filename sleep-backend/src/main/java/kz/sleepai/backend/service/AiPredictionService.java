package kz.sleepai.backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import kz.sleepai.backend.dto.AiPredictionRequest;
import kz.sleepai.backend.dto.AiPredictionResponse;

@Service
@RequiredArgsConstructor
public class AiPredictionService {

    private final RestTemplate restTemplate;

    @Value("${ai.service.url:http://localhost:8000}")
    private String aiServiceUrl;

    @Value("${ai.service.token:}")
    private String aiServiceToken;

    private HttpHeaders internalHeaders() {
        HttpHeaders headers = new HttpHeaders();
        if (aiServiceToken != null && !aiServiceToken.isBlank()) {
            headers.set("X-Internal-Token", aiServiceToken);
        }
        return headers;
    }

    public AiPredictionResponse predictSleepQuality(AiPredictionRequest request) {
        String url = aiServiceUrl + "/predict";
        try {
            HttpEntity<AiPredictionRequest> entity = new HttpEntity<>(request, internalHeaders());
            ResponseEntity<AiPredictionResponse> response = restTemplate.exchange(
                    url, HttpMethod.POST, entity, AiPredictionResponse.class);
            return response.getBody();
        } catch (Exception e) {
            // В случае, если Питон-сервер лежит или выдает ошибку, возвращаем дефолтик
            AiPredictionResponse fallback = new AiPredictionResponse();
            fallback.setPredictedQuality(0.0);
            fallback.setMessage("AI service unavailable: " + e.getMessage());
            return fallback;
        }
    }

    public String chat(String message, String userContext) {
        String url = aiServiceUrl + "/chat";
        try {
            java.util.Map<String, String> body = new java.util.HashMap<>();
            body.put("message", message);
            body.put("user_context", userContext != null ? userContext : "");

            HttpEntity<java.util.Map<String, String>> entity = new HttpEntity<>(body, internalHeaders());
            @SuppressWarnings("unchecked")
            ResponseEntity<java.util.Map<String, String>> response = restTemplate.exchange(
                    url, HttpMethod.POST, entity, (Class<java.util.Map<String, String>>) (Class<?>) java.util.Map.class);
            java.util.Map<String, String> bodyOut = response.getBody();
            if (bodyOut != null && bodyOut.containsKey("reply")) {
                return bodyOut.get("reply");
            }
            return "No response from AI service.";
        } catch (Exception e) {
            return "AI service unavailable. Please try again later.";
        }
    }
}
