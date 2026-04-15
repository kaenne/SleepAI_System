package temp.app.sleepbackend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import temp.app.sleepbackend.dto.AiPredictionRequest;
import temp.app.sleepbackend.dto.AiPredictionResponse;
import temp.app.sleepbackend.service.AiPredictionService;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiPredictionService aiPredictionService;

    @PostMapping("/predict")
    public ResponseEntity<AiPredictionResponse> predict(@RequestBody AiPredictionRequest request) {
        AiPredictionResponse response = aiPredictionService.predictSleepQuality(request);
        
        if (response.getPredictedQuality() == 0.0 && response.getMessage().contains("Ошибка")) {
            return ResponseEntity.status(503).body(response);
        }
        
        return ResponseEntity.ok(response);
    }

    @PostMapping("/chat")
    public ResponseEntity<java.util.Map<String, String>> chat(@RequestBody java.util.Map<String, String> request) {
        String message = request.getOrDefault("message", "");
        String reply = aiPredictionService.chat(message);
        return ResponseEntity.ok(java.util.Map.of("reply", reply));
    }
}
