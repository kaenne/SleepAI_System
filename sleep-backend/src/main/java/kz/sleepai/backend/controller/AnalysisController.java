package kz.sleepai.backend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import kz.sleepai.backend.service.AnalysisService;

import java.security.Principal;

@RestController
@RequestMapping("/api/analysis")
@RequiredArgsConstructor
public class AnalysisController {

    private final AnalysisService analysisService;

    @GetMapping("/sleep")
    public ResponseEntity<?> getSleepAnalysis(
            @RequestParam(defaultValue = "7") int days,
            Principal principal
    ) {
        return ResponseEntity.ok(analysisService.getSleepAnalysis(principal.getName(), days));
    }

    @GetMapping("/stress")
    public ResponseEntity<?> getStressAnalysis(
            @RequestParam(defaultValue = "7") int days,
            Principal principal
    ) {
        return ResponseEntity.ok(analysisService.getStressAnalysis(principal.getName(), days));
    }
}
