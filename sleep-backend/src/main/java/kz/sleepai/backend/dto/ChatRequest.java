package kz.sleepai.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ChatRequest {

    @NotBlank(message = "Message must not be blank")
    @Size(max = 2000, message = "Message must not exceed 2000 characters")
    private String message;

    @Size(max = 500, message = "User context must not exceed 500 characters")
    private String userContext = "";
}
