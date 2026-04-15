package temp.app.sleepbackend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import temp.app.sleepbackend.dto.JournalEntryRequest;
import temp.app.sleepbackend.model.JournalEntry;
import temp.app.sleepbackend.model.User;
import temp.app.sleepbackend.repository.JournalEntryRepository;
import temp.app.sleepbackend.repository.UserRepository;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("JournalService Unit Tests")
class JournalServiceTest {

    @Mock
    private JournalEntryRepository journalEntryRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private JournalService journalService;

    private User testUser;
    private JournalEntry testEntry;
    private final String TEST_EMAIL = "test@example.com";

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1L);
        testUser.setEmail(TEST_EMAIL);
        testUser.setFullName("Test User");

        testEntry = new JournalEntry();
        testEntry.setId(1L);
        testEntry.setUser(testUser);
        testEntry.setDate(LocalDate.now());
        testEntry.setSleepHours(7.5);
        testEntry.setStressLevel(3);
        testEntry.setNotes("Хорошо выспался");
    }

    @Test
    @DisplayName("saveEntry: должен создать новую запись дневника")
    void saveEntry_ShouldCreateNewEntry() {
        // Arrange
        JournalEntryRequest request = new JournalEntryRequest();
        request.setSleepHours(8.0);
        request.setStressLevel(2);
        request.setNote("Отличный сон!");
        request.setDate(LocalDate.now());

        when(userRepository.findByEmail(TEST_EMAIL)).thenReturn(Optional.of(testUser));
        when(journalEntryRepository.findByUser_EmailAndDate(TEST_EMAIL, request.getDate()))
                .thenReturn(Optional.empty());
        when(journalEntryRepository.save(any(JournalEntry.class))).thenAnswer(invocation -> {
            JournalEntry saved = invocation.getArgument(0);
            saved.setId(1L);
            return saved;
        });

        // Act
        JournalEntry result = journalService.saveEntry(TEST_EMAIL, request);

        // Assert
        assertNotNull(result);
        assertEquals(8.0, result.getSleepHours());
        assertEquals(2, result.getStressLevel());
        assertEquals("Отличный сон!", result.getNotes());
        verify(journalEntryRepository).save(any(JournalEntry.class));
    }

    @Test
    @DisplayName("saveEntry: должен обновить существующую запись")
    void saveEntry_ShouldUpdateExistingEntry() {
        // Arrange
        JournalEntryRequest request = new JournalEntryRequest();
        request.setSleepHours(6.5);
        request.setDate(LocalDate.now());

        when(userRepository.findByEmail(TEST_EMAIL)).thenReturn(Optional.of(testUser));
        when(journalEntryRepository.findByUser_EmailAndDate(TEST_EMAIL, request.getDate()))
                .thenReturn(Optional.of(testEntry));
        when(journalEntryRepository.save(any(JournalEntry.class))).thenReturn(testEntry);

        // Act
        JournalEntry result = journalService.saveEntry(TEST_EMAIL, request);

        // Assert
        assertNotNull(result);
        assertEquals(6.5, result.getSleepHours());
        verify(journalEntryRepository).save(testEntry);
    }

    @Test
    @DisplayName("saveEntry: должен выбросить исключение если пользователь не найден")
    void saveEntry_ShouldThrowWhenUserNotFound() {
        // Arrange
        JournalEntryRequest request = new JournalEntryRequest();
        when(userRepository.findByEmail(TEST_EMAIL)).thenReturn(Optional.empty());

        // Act & Assert
        RuntimeException exception = assertThrows(RuntimeException.class,
                () -> journalService.saveEntry(TEST_EMAIL, request));
        assertTrue(exception.getMessage().contains("Пользователь не найден"));
    }

    @Test
    @DisplayName("getAllEntries: должен вернуть все записи пользователя")
    void getAllEntries_ShouldReturnAllUserEntries() {
        // Arrange
        JournalEntry entry2 = new JournalEntry();
        entry2.setId(2L);
        entry2.setUser(testUser);
        entry2.setDate(LocalDate.now().minusDays(1));

        when(journalEntryRepository.findAllByUser_EmailOrderByDateDesc(TEST_EMAIL))
                .thenReturn(Arrays.asList(testEntry, entry2));

        // Act
        List<JournalEntry> result = journalService.getAllEntries(TEST_EMAIL);

        // Assert
        assertEquals(2, result.size());
        verify(journalEntryRepository).findAllByUser_EmailOrderByDateDesc(TEST_EMAIL);
    }

    @Test
    @DisplayName("getEntryByDate: должен вернуть запись за указанную дату")
    void getEntryByDate_ShouldReturnEntryForDate() {
        // Arrange
        LocalDate date = LocalDate.now();
        when(journalEntryRepository.findByUser_EmailAndDate(TEST_EMAIL, date))
                .thenReturn(Optional.of(testEntry));

        // Act
        Optional<JournalEntry> result = journalService.getEntryByDate(TEST_EMAIL, date);

        // Assert
        assertTrue(result.isPresent());
        assertEquals(testEntry.getId(), result.get().getId());
    }

    @Test
    @DisplayName("getEntriesBetween: должен вернуть записи за период")
    void getEntriesBetween_ShouldReturnEntriesInDateRange() {
        // Arrange
        LocalDate from = LocalDate.now().minusDays(7);
        LocalDate to = LocalDate.now();
        
        when(journalEntryRepository.findAllByUser_EmailAndDateBetween(TEST_EMAIL, from, to))
                .thenReturn(Arrays.asList(testEntry));

        // Act
        List<JournalEntry> result = journalService.getEntriesBetween(TEST_EMAIL, from, to);

        // Assert
        assertEquals(1, result.size());
        verify(journalEntryRepository).findAllByUser_EmailAndDateBetween(TEST_EMAIL, from, to);
    }
}
