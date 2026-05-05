package kz.sleepai.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class GoogleAuthRequest {

    @NotBlank(message = "accessToken is required")
    private String accessToken;
}
