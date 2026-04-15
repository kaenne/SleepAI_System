package temp.app.sleepbackend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import temp.app.sleepbackend.model.SleepSession;
import temp.app.sleepbackend.model.User;
import temp.app.sleepbackend.repository.SleepSessionRepository;
import temp.app.sleepbackend.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("SleepService Unit Tests")
class SleepServiceTest {

    @Mock
    private SleepSessionRepository sleepSessionRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private RecommendationService recommendationService;

    @InjectMocks
    private SleepService sleepService;

    private User testUser;
    private SleepSession testSession;
    private final String TEST_EMAIL = "test@example.com";

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1L);
        testUser.setEmail(TEST_EMAIL);
        testUser.setFullName("Test User");

        testSession = new SleepSession();
        testSession.setId(1L);
        testSession.setUser(testUser);
        testSession.setStartTime(LocalDateTime.now().minusHours(8));
    }

    @Test
    @DisplayName("startSession: должен создать новую сессию сна")
    void startSession_ShouldCreateNewSession() {
        // Arrange
        when(userRepository.findByEmail(TEST_EMAIL)).thenReturn(Optional.of(testUser));
        when(sleepSessionRepository.save(any(SleepSession.class))).thenAnswer(invocation -> {
            SleepSession saved = invocation.getArgument(0);
            saved.setId(1L);
            return saved;
        });

        // Act
        SleepSession result = sleepService.startSession(TEST_EMAIL);

        // Assert
        assertNotNull(result);
        assertNotNull(result.getStartTime());
        assertEquals(testUser, result.getUser());
        verify(sleepSessionRepository).save(any(SleepSession.class));
    }

    @Test
    @DisplayName("startSession: должен выбросить исключение если пользователь не найден")
    void startSession_ShouldThrowWhenUserNotFound() {
        // Arrange
        when(userRepository.findByEmail(TEST_EMAIL)).thenReturn(Optional.empty());

        // Act & Assert
        RuntimeException exception = assertThrows(RuntimeException.class,
                () -> sleepService.startSession(TEST_EMAIL));
        assertTrue(exception.getMessage().contains("Пользователь не найден"));
    }

    @Test
    @DisplayName("endSession: должен завершить сессию и рассчитать оценку")
    void endSession_ShouldEndSessionAndCalculateScore() {
        // Arrange
        testSession.setStartTime(LocalDateTime.now().minusHours(8)); // 8 часов сна
        
        when(sleepSessionRepository.findById(1L)).thenReturn(Optional.of(testSession));
        when(sleepSessionRepository.save(any(SleepSession.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        SleepSession result = sleepService.endSession(TEST_EMAIL, 1L);

        // Assert
        assertNotNull(result);
        assertNotNull(result.getEndTime());
        assertNotNull(result.getQualityScore());
        verify(recommendationService).generateRecommendation(any(SleepSession.class));
    }

    @Test
    @DisplayName("endSession: должен выбросить исключение если сессия не найдена")
    void endSession_ShouldThrowWhenSessionNotFound() {
        // Arrange
        when(sleepSessionRepository.findById(1L)).thenReturn(Optional.empty());

        // Act & Assert
        RuntimeException exception = assertThrows(RuntimeException.class,
                () -> sleepService.endSession(TEST_EMAIL, 1L));
        assertTrue(exception.getMessage().contains("Сессия не найдена"));
    }

    @Test
    @DisplayName("endSession: должен выбросить исключение если сессия принадлежит другому пользователю")
    void endSession_ShouldThrowWhenSessionBelongsToOtherUser() {
        // Arrange
        User otherUser = new User();
        otherUser.setEmail("other@example.com");
        testSession.setUser(otherUser);
        
        when(sleepSessionRepository.findById(1L)).thenReturn(Optional.of(testSession));

        // Act & Assert
        RuntimeException exception = assertThrows(RuntimeException.class,
                () -> sleepService.endSession(TEST_EMAIL, 1L));
        assertTrue(exception.getMessage().contains("Нет доступа"));
    }

    @ParameterizedTest
    @DisplayName("calculateBasicScore: правильно рассчитывает оценку на основе длительности")
    @CsvSource({
            "480, 85",  // 8 часов - оптимально
            "420, 85",  // 7 часов - оптимально
            "540, 85",  // 9 часов - оптимально
            "390, 70",  // 6.5 часов - немного меньше
            "570, 75",  // 9.5 часов - немного больше
            "300, 50",  // 5 часов - мало
            "660, 60"   // 11 часов - слишком много
    })
    void calculateBasicScore_ShouldReturnCorrectScore(long durationMinutes, int expectedScore) {
        // Используем ReflectionTestUtils для тестирования private метода
        int result = (int) ReflectionTestUtils.invokeMethod(sleepService, 
                "calculateBasicScore", durationMinutes);
        
        assertEquals(expectedScore, result);
    }

    @Test
    @DisplayName("getUserHistory: должен вернуть историю сессий")
    void getUserHistory_ShouldReturnSessionHistory() {
        // Arrange
        SleepSession session2 = new SleepSession();
        session2.setId(2L);
        session2.setUser(testUser);
        
        when(sleepSessionRepository.findAllByUser_EmailOrderByStartTimeDesc(TEST_EMAIL))
                .thenReturn(Arrays.asList(testSession, session2));

        // Act
        List<SleepSession> result = sleepService.getUserHistory(TEST_EMAIL);

        // Assert
        assertEquals(2, result.size());
    }

    @Test
    @DisplayName("getSessionById: должен вернуть сессию если она принадлежит пользователю")
    void getSessionById_ShouldReturnSessionWhenOwned() {
        // Arrange
        when(sleepSessionRepository.findById(1L)).thenReturn(Optional.of(testSession));

        // Act
        Optional<SleepSession> result = sleepService.getSessionById(TEST_EMAIL, 1L);

        // Assert
        assertTrue(result.isPresent());
        assertEquals(1L, result.get().getId());
    }

    @Test
    @DisplayName("getSessionById: должен вернуть пустой Optional если сессия принадлежит другому пользователю")
    void getSessionById_ShouldReturnEmptyWhenNotOwned() {
        // Arrange
        User otherUser = new User();
        otherUser.setEmail("other@example.com");
        testSession.setUser(otherUser);
        
        when(sleepSessionRepository.findById(1L)).thenReturn(Optional.of(testSession));

        // Act
        Optional<SleepSession> result = sleepService.getSessionById(TEST_EMAIL, 1L);

        // Assert
        assertTrue(result.isEmpty());
    }

    @Test
    @DisplayName("getLatestSession: должен вернуть последнюю сессию")
    void getLatestSession_ShouldReturnLatest() {
        // Arrange
        when(sleepSessionRepository.findAllByUser_EmailOrderByStartTimeDesc(TEST_EMAIL))
                .thenReturn(Collections.singletonList(testSession));

        // Act
        Optional<SleepSession> result = sleepService.getLatestSession(TEST_EMAIL);

        // Assert
        assertTrue(result.isPresent());
        assertEquals(testSession.getId(), result.get().getId());
    }

    @Test
    @DisplayName("getLatestSession: должен вернуть пустой Optional если сессий нет")
    void getLatestSession_ShouldReturnEmptyWhenNoSessions() {
        // Arrange
        when(sleepSessionRepository.findAllByUser_EmailOrderByStartTimeDesc(TEST_EMAIL))
                .thenReturn(Collections.emptyList());

        // Act
        Optional<SleepSession> result = sleepService.getLatestSession(TEST_EMAIL);

        // Assert
        assertTrue(result.isEmpty());
    }
}
