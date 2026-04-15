package temp.app.sleepbackend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RefreshTokenRequest {
    @NotBlank(message = "Refresh token не может быть пустым")
    private String refreshToken;
}
