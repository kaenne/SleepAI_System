package kz.sleepai.backend.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateProfileRequest {
    @Size(max = 100, message = "Name must not exceed 100 characters")
    private String name;

    @Size(max = 512, message = "Avatar URL must not exceed 512 characters")
    private String avatar;
}
