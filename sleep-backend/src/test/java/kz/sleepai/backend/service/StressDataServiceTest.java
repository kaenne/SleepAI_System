package kz.sleepai.backend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import kz.sleepai.backend.model.StressData;
import kz.sleepai.backend.model.StressLevel;
import kz.sleepai.backend.model.User;
import kz.sleepai.backend.repository.StressDataRepository;
import kz.sleepai.backend.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("StressDataService Unit Tests")
class StressDataServiceTest {

    @Mock
    private StressDataRepository stressDataRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private StressDataService stressDataService;

    private User testUser;
    private final String TEST_EMAIL = "test@example.com";

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1L);
        testUser.setEmail(TEST_EMAIL);
        testUser.setFullName("Test User");
    }

    @Test
    @DisplayName("saveStressData: должен сохранить данные о стрессе с уровнем LOW")
    void saveStressData_ShouldSaveWithLowStressLevel() {
        // Arrange
        Double hrvScore = 75.0;
        when(userRepository.findByEmail(TEST_EMAIL)).thenReturn(Optional.of(testUser));
        when(stressDataRepository.save(any(StressData.class))).thenAnswer(invocation -> {
            StressData saved = invocation.getArgument(0);
            saved.setId(1L);
            return saved;
        });

        // Act
        StressData result = stressDataService.saveStressData(TEST_EMAIL, hrvScore);

        // Assert
        assertNotNull(result);
        assertEquals(hrvScore, result.getHrvScore());
        assertEquals(StressLevel.LOW, result.getStressLevel());
        assertNotNull(result.getTimestamp());
        verify(stressDataRepository).save(any(StressData.class));
    }

    @ParameterizedTest
    @DisplayName("saveStressData: правильно определяет уровень стресса")
    @CsvSource({
            "75.0, LOW",
            "60.0, LOW",
            "55.0, MEDIUM",
            "40.0, MEDIUM",
            "35.0, HIGH",
            "20.0, HIGH"
    })
    void saveStressData_ShouldCalculateCorrectStressLevel(Double hrvScore, String expectedLevel) {
        // Arrange
        when(userRepository.findByEmail(TEST_EMAIL)).thenReturn(Optional.of(testUser));
        when(stressDataRepository.save(any(StressData.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        StressData result = stressDataService.saveStressData(TEST_EMAIL, hrvScore);

        // Assert
        assertEquals(StressLevel.valueOf(expectedLevel), result.getStressLevel());
    }

    @Test
    @DisplayName("saveStressData: должен выбросить исключение если пользователь не найден")
    void saveStressData_ShouldThrowWhenUserNotFound() {
        // Arrange
        when(userRepository.findByEmail(TEST_EMAIL)).thenReturn(Optional.empty());

        // Act & Assert
        RuntimeException exception = assertThrows(RuntimeException.class,
                () -> stressDataService.saveStressData(TEST_EMAIL, 70.0));
        assertTrue(exception.getMessage().contains("User not found"));
    }

    @Test
    @DisplayName("getUserStressHistory: должен вернуть историю стресса")
    void getUserStressHistory_ShouldReturnHistory() {
        // Arrange
        StressData data1 = createStressData(1L, 70.0, StressLevel.LOW);
        StressData data2 = createStressData(2L, 45.0, StressLevel.MEDIUM);
        
        when(userRepository.findByEmail(TEST_EMAIL)).thenReturn(Optional.of(testUser));
        when(stressDataRepository.findByUserIdOrderByTimestampDesc(testUser.getId()))
                .thenReturn(Arrays.asList(data1, data2));

        // Act
        List<StressData> result = stressDataService.getUserStressHistory(TEST_EMAIL);

        // Assert
        assertEquals(2, result.size());
        assertEquals(StressLevel.LOW, result.get(0).getStressLevel());
    }

    @Test
    @DisplayName("getLatestStressData: должен вернуть последние данные о стрессе")
    void getLatestStressData_ShouldReturnLatest() {
        // Arrange
        StressData latestData = createStressData(1L, 65.0, StressLevel.LOW);
        
        when(userRepository.findByEmail(TEST_EMAIL)).thenReturn(Optional.of(testUser));
        when(stressDataRepository.findByUserIdOrderByTimestampDesc(testUser.getId()))
                .thenReturn(Collections.singletonList(latestData));

        // Act
        Optional<StressData> result = stressDataService.getLatestStressData(TEST_EMAIL);

        // Assert
        assertTrue(result.isPresent());
        assertEquals(65.0, result.get().getHrvScore());
    }

    @Test
    @DisplayName("getLatestStressData: должен вернуть пустой Optional если данных нет")
    void getLatestStressData_ShouldReturnEmptyWhenNoData() {
        // Arrange
        when(userRepository.findByEmail(TEST_EMAIL)).thenReturn(Optional.of(testUser));
        when(stressDataRepository.findByUserIdOrderByTimestampDesc(testUser.getId()))
                .thenReturn(Collections.emptyList());

        // Act
        Optional<StressData> result = stressDataService.getLatestStressData(TEST_EMAIL);

        // Assert
        assertTrue(result.isEmpty());
    }

    @Test
    @DisplayName("getAverageHrv: должен вернуть средний HRV за период")
    void getAverageHrv_ShouldReturnAverageForPeriod() {
        // Arrange
        LocalDateTime from = LocalDateTime.now().minusDays(7);
        LocalDateTime to = LocalDateTime.now();
        
        StressData data1 = createStressData(1L, 60.0, StressLevel.LOW);
        StressData data2 = createStressData(2L, 80.0, StressLevel.LOW);
        
        when(userRepository.findByEmail(TEST_EMAIL)).thenReturn(Optional.of(testUser));
        when(stressDataRepository.findByUserIdAndTimestampBetween(testUser.getId(), from, to))
                .thenReturn(Arrays.asList(data1, data2));

        // Act
        Double result = stressDataService.getAverageHrv(TEST_EMAIL, from, to);

        // Assert
        assertEquals(70.0, result);
    }

    @Test
    @DisplayName("getAverageHrv: должен вернуть 0 если данных нет")
    void getAverageHrv_ShouldReturnZeroWhenNoData() {
        // Arrange
        LocalDateTime from = LocalDateTime.now().minusDays(7);
        LocalDateTime to = LocalDateTime.now();
        
        when(userRepository.findByEmail(TEST_EMAIL)).thenReturn(Optional.of(testUser));
        when(stressDataRepository.findByUserIdAndTimestampBetween(testUser.getId(), from, to))
                .thenReturn(Collections.emptyList());

        // Act
        Double result = stressDataService.getAverageHrv(TEST_EMAIL, from, to);

        // Assert
        assertEquals(0.0, result);
    }

    private StressData createStressData(Long id, Double hrvScore, StressLevel stressLevel) {
        StressData data = new StressData();
        data.setId(id);
        data.setUser(testUser);
        data.setHrvScore(hrvScore);
        data.setStressLevel(stressLevel);
        data.setTimestamp(LocalDateTime.now());
        return data;
    }
}
