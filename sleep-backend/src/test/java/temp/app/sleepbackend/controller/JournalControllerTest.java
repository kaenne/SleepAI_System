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
import temp.app.sleepbackend.dto.JournalEntryRequest;
import temp.app.sleepbackend.model.JournalEntry;
import temp.app.sleepbackend.model.User;
import temp.app.sleepbackend.service.JournalService;

import java.time.LocalDate;
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
@DisplayName("JournalController Integration Tests")
class JournalControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
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
        testEntry.setNotes("Хороший сон");
        testEntry.setCreatedAt(LocalDateTime.now());
    }

    @Test
    @WithMockUser(username = TEST_EMAIL)
    @DisplayName("POST /api/journal/entries: создание новой записи")
    void createEntry_ShouldCreateAndReturnEntry() throws Exception {
        // Arrange
        JournalEntryRequest request = new JournalEntryRequest();
        request.setSleepHours(8.0);
        request.setStressLevel(2);
        request.setNote("Отличный сон!");

        when(journalService.saveEntry(eq(TEST_EMAIL), any(JournalEntryRequest.class)))
                .thenReturn(testEntry);

        // Act & Assert
        mockMvc.perform(post("/api/journal/entries")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("1"));

        verify(journalService).saveEntry(eq(TEST_EMAIL), any(JournalEntryRequest.class));
    }

    @Test
    @WithMockUser(username = TEST_EMAIL)
    @DisplayName("GET /api/journal/entries: получение всех записей")
    void getEntries_ShouldReturnAllEntries() throws Exception {
        // Arrange
        JournalEntry entry2 = new JournalEntry();
        entry2.setId(2L);
        entry2.setUser(testUser);
        entry2.setDate(LocalDate.now().minusDays(1));
        entry2.setSleepHours(6.5);
        entry2.setCreatedAt(LocalDateTime.now().minusDays(1));

        List<JournalEntry> entries = Arrays.asList(testEntry, entry2);
        when(journalService.getAllEntries(TEST_EMAIL)).thenReturn(entries);

        // Act & Assert
        mockMvc.perform(get("/api/journal/entries"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[1].id").value(2));
    }

    @Test
    @WithMockUser(username = TEST_EMAIL)
    @DisplayName("GET /api/journal/date/{date}: получение записи за дату")
    void getEntryByDate_ShouldReturnEntry() throws Exception {
        // Arrange
        LocalDate today = LocalDate.now();
        when(journalService.getEntryByDate(TEST_EMAIL, today))
                .thenReturn(Optional.of(testEntry));

        // Act & Assert
        mockMvc.perform(get("/api/journal/date/" + today))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.sleepHours").value(7.5));
    }

    @Test
    @WithMockUser(username = TEST_EMAIL)
    @DisplayName("GET /api/journal/date/{date}: вернёт 404 если записи нет")
    void getEntryByDate_ShouldReturn404WhenNoEntry() throws Exception {
        // Arrange
        LocalDate today = LocalDate.now();
        when(journalService.getEntryByDate(TEST_EMAIL, today))
                .thenReturn(Optional.empty());

        // Act & Assert
        mockMvc.perform(get("/api/journal/date/" + today))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("GET /api/journal/entries: должен вернуть 401 без авторизации")
    void getEntries_ShouldReturn401WhenNotAuthenticated() throws Exception {
        mockMvc.perform(get("/api/journal/entries"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = TEST_EMAIL)
    @DisplayName("POST /api/journal: создание записи через старый endpoint")
    void saveEntry_ShouldWorkWithLegacyEndpoint() throws Exception {
        // Arrange
        JournalEntryRequest request = new JournalEntryRequest();
        request.setSleepHours(7.0);

        when(journalService.saveEntry(eq(TEST_EMAIL), any(JournalEntryRequest.class)))
                .thenReturn(testEntry);

        // Act & Assert
        mockMvc.perform(post("/api/journal")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }
}
