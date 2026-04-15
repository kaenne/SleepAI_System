package temp.app.sleepbackend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import temp.app.sleepbackend.dto.StressDataRequest;
import temp.app.sleepbackend.model.StressData;
import temp.app.sleepbackend.model.User;
import temp.app.sleepbackend.service.StressDataService;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("StressController Integration Tests")
class StressControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private StressDataService stressDataService;

    private User testUser;
    private StressData testStressData;
    private final String TEST_EMAIL = "test@example.com";

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1L);
        testUser.setEmail(TEST_EMAIL);
        testUser.setFullName("Test User");

        testStressData = new StressData();
        testStressData.setId(1L);
        testStressData.setUser(testUser);
        testStressData.setHrvScore(65.0);
        testStressData.setStressLevel("LOW");
        testStressData.setTimestamp(LocalDateTime.now());
    }

    @Test
    @WithMockUser(username = TEST_EMAIL)
    @DisplayName("POST /api/stress: запись данных о стрессе")
    void recordStress_ShouldSaveAndReturnData() throws Exception {
        // Arrange
        StressDataRequest request = new StressDataRequest();
        request.setHrvScore(70.0);

        when(stressDataService.saveStressData(eq(TEST_EMAIL), eq(70.0)))
                .thenReturn(testStressData);

        // Act & Assert
        mockMvc.perform(post("/api/stress")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.hrvScore").value(65.0))
                .andExpect(jsonPath("$.stressLevel").value("LOW"));

        verify(stressDataService).saveStressData(TEST_EMAIL, 70.0);
    }

    @Test
    @WithMockUser(username = TEST_EMAIL)
    @DisplayName("GET /api/stress/history: получение истории измерений")
    void getHistory_ShouldReturnAllStressData() throws Exception {
        // Arrange
        StressData data2 = new StressData();
        data2.setId(2L);
        data2.setUser(testUser);
        data2.setHrvScore(45.0);
        data2.setStressLevel("MEDIUM");
        data2.setTimestamp(LocalDateTime.now().minusHours(2));

        List<StressData> history = Arrays.asList(testStressData, data2);
        when(stressDataService.getUserStressHistory(TEST_EMAIL)).thenReturn(history);

        // Act & Assert
        mockMvc.perform(get("/api/stress/history"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].stressLevel").value("LOW"))
                .andExpect(jsonPath("$[1].stressLevel").value("MEDIUM"));
    }

    @Test
    @WithMockUser(username = TEST_EMAIL)
    @DisplayName("GET /api/stress/latest: получение последнего измерения")
    void getLatest_ShouldReturnLatestData() throws Exception {
        // Arrange
        when(stressDataService.getLatestStressData(TEST_EMAIL))
                .thenReturn(Optional.of(testStressData));

        // Act & Assert
        mockMvc.perform(get("/api/stress/latest"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hrvScore").value(65.0))
                .andExpect(jsonPath("$.stressLevel").value("LOW"));
    }

    @Test
    @WithMockUser(username = TEST_EMAIL)
    @DisplayName("GET /api/stress/latest: возвращает пустой объект если данных нет")
    void getLatest_ShouldReturnEmptyWhenNoData() throws Exception {
        // Arrange
        when(stressDataService.getLatestStressData(TEST_EMAIL))
                .thenReturn(Optional.empty());

        // Act & Assert
        mockMvc.perform(get("/api/stress/latest"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = TEST_EMAIL)
    @DisplayName("GET /api/stress/average: получение средних значений")
    void getAverage_ShouldReturnAverageStats() throws Exception {
        // Arrange
        when(stressDataService.getAverageHrv(eq(TEST_EMAIL), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(55.0);

        // Act & Assert
        mockMvc.perform(get("/api/stress/average")
                        .param("days", "7"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.averageHrv").value(55.0))
                .andExpect(jsonPath("$.period").value("7 days"));
    }

    @Test
    @DisplayName("POST /api/stress: должен вернуть 401 без авторизации")
    void recordStress_ShouldReturn401WhenNotAuthenticated() throws Exception {
        StressDataRequest request = new StressDataRequest();
        request.setHrvScore(70.0);

        mockMvc.perform(post("/api/stress")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }
}
