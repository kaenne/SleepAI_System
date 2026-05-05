package kz.sleepai.backend.controller;

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
import kz.sleepai.backend.model.User;
import kz.sleepai.backend.repository.JournalEntryRepository;
import kz.sleepai.backend.repository.SleepSessionRepository;
import kz.sleepai.backend.repository.StressDataRepository;
import kz.sleepai.backend.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Map;
import java.util.Optional;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("UserController Integration Tests")
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private JournalEntryRepository journalEntryRepository;

    @MockBean
    private SleepSessionRepository sleepSessionRepository;

    @MockBean
    private StressDataRepository stressDataRepository;

    private User testUser;
    private final String TEST_EMAIL = "test@example.com";

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1L);
        testUser.setEmail(TEST_EMAIL);
        testUser.setFullName("Test User");
        testUser.setCreatedAt(LocalDateTime.now());
        testUser.setNotificationsEnabled(true);
        testUser.setDarkModeEnabled(false);
        testUser.setReminderTime("22:00");
        testUser.setDataSyncEnabled(true);
    }

    // ─── GET /api/user/settings ──────────────────────────────────────────────

    @Test
    @WithMockUser(username = TEST_EMAIL)
    @DisplayName("GET /api/user/settings: returns user settings")
    void getSettings_ShouldReturnSettings() throws Exception {
        when(userRepository.findByEmail(TEST_EMAIL)).thenReturn(Optional.of(testUser));

        mockMvc.perform(get("/api/user/settings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.notifications").value(true))
                .andExpect(jsonPath("$.darkMode").value(false))
                .andExpect(jsonPath("$.reminderTime").value("22:00"))
                .andExpect(jsonPath("$.dataSync").value(true));
    }

    @Test
    @DisplayName("GET /api/user/settings: 401 when unauthenticated")
    void getSettings_ShouldReturn401_WhenNotAuthenticated() throws Exception {
        mockMvc.perform(get("/api/user/settings"))
                .andExpect(status().isUnauthorized());
    }

    // ─── PUT /api/user/settings ──────────────────────────────────────────────

    @Test
    @WithMockUser(username = TEST_EMAIL)
    @DisplayName("PUT /api/user/settings: updates settings")
    void updateSettings_ShouldUpdateAndReturnSettings() throws Exception {
        when(userRepository.findByEmail(TEST_EMAIL)).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        Map<String, Object> body = Map.of(
                "notifications", false,
                "darkMode", true,
                "reminderTime", "23:30",
                "dataSync", false
        );

        mockMvc.perform(put("/api/user/settings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reminderTime").value("23:30"));

        verify(userRepository).save(any(User.class));
    }

    // ─── GET /api/user/export ────────────────────────────────────────────────

    @Test
    @WithMockUser(username = TEST_EMAIL)
    @DisplayName("GET /api/user/export: returns export data")
    void exportData_ShouldReturnAllUserData() throws Exception {
        when(userRepository.findByEmail(TEST_EMAIL)).thenReturn(Optional.of(testUser));
        when(journalEntryRepository.findAllByUser_EmailOrderByDateDesc(TEST_EMAIL))
                .thenReturn(Collections.emptyList());
        when(sleepSessionRepository.findAllByUser_EmailOrderByStartTimeDesc(TEST_EMAIL))
                .thenReturn(Collections.emptyList());
        when(stressDataRepository.findByUserIdOrderByTimestampDesc(1L))
                .thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/user/export"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.email").value(TEST_EMAIL))
                .andExpect(jsonPath("$.journalEntries").isArray())
                .andExpect(jsonPath("$.sleepSessions").isArray())
                .andExpect(jsonPath("$.stressData").isArray());
    }

    // ─── DELETE /api/user/data ───────────────────────────────────────────────

    @Test
    @WithMockUser(username = TEST_EMAIL)
    @DisplayName("DELETE /api/user/data: deletes all user data")
    void deleteData_ShouldReturn204() throws Exception {
        when(userRepository.findByEmail(TEST_EMAIL)).thenReturn(Optional.of(testUser));
        when(journalEntryRepository.findAllByUser_EmailOrderByDateDesc(TEST_EMAIL))
                .thenReturn(Collections.emptyList());
        when(sleepSessionRepository.findAllByUser_EmailOrderByStartTimeDesc(TEST_EMAIL))
                .thenReturn(Collections.emptyList());
        when(stressDataRepository.findByUserIdOrderByTimestampDesc(1L))
                .thenReturn(Collections.emptyList());

        mockMvc.perform(delete("/api/user/data"))
                .andExpect(status().isNoContent());

        verify(journalEntryRepository).deleteAll(anyList());
        verify(sleepSessionRepository).deleteAll(anyList());
        verify(stressDataRepository).deleteAll(anyList());
    }

    @Test
    @DisplayName("DELETE /api/user/data: 401 when unauthenticated")
    void deleteData_ShouldReturn401_WhenNotAuthenticated() throws Exception {
        mockMvc.perform(delete("/api/user/data"))
                .andExpect(status().isUnauthorized());
    }
}
