package kz.sleepai.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import kz.sleepai.backend.dto.AiPredictionRequest;
import kz.sleepai.backend.dto.AiPredictionResponse;
import kz.sleepai.backend.dto.ChatRequest;
import kz.sleepai.backend.service.AiPredictionService;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiPredictionService aiPredictionService;

    @PostMapping("/predict")
    public ResponseEntity<AiPredictionResponse> predict(@Valid @RequestBody AiPredictionRequest request) {
        AiPredictionResponse response = aiPredictionService.predictSleepQuality(request);
        
        if (response.getPredictedQuality() == 0.0 && response.getMessage() != null && response.getMessage().startsWith("AI service unavailable")) {
            return ResponseEntity.status(503).body(response);
        }
        
        return ResponseEntity.ok(response);
    }

    @PostMapping("/chat")
    public ResponseEntity<java.util.Map<String, String>> chat(@Valid @RequestBody ChatRequest request) {
        String reply = aiPredictionService.chat(request.getMessage(), request.getUserContext());
        return ResponseEntity.ok(java.util.Map.of("reply", reply));
    }
}
