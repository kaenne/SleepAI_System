package temp.app.sleepbackend.dto;

import lombok.Data;

@Data
public class UpdateProfileRequest {
    private String name;
    private String avatar;
}
