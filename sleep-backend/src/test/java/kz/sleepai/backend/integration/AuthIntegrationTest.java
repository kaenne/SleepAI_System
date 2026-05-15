package kz.sleepai.backend.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.testcontainers.DockerClientFactory;
import org.junit.jupiter.api.condition.EnabledIf;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests — run against a real PostgreSQL instance via Testcontainers.
 * Requires Docker to be running. Skipped automatically if Docker is unavailable.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@Testcontainers
@EnabledIf("isDockerAvailable")
class AuthIntegrationTest {

    @SuppressWarnings("unused")
    static boolean isDockerAvailable() {
        try {
            return DockerClientFactory.instance().isDockerAvailable();
        } catch (Throwable t) {
            return false;
        }
    }

    @Container
    static final PostgreSQLContainer<?> postgres =
            new PostgreSQLContainer<>("postgres:15-alpine")
                    .withDatabaseName("sleep_db_test")
                    .withUsername("test")
                    .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop");
        registry.add("jwt.secret", () -> "dGhpcy1pcy1hLXZlcnktbG9uZy1zZWNyZXQta2V5LWZvci10ZXN0aW5n");
        registry.add("jwt.expiration", () -> "86400000");
        registry.add("jwt.refresh-expiration", () -> "604800000");
        registry.add("ai.service.url", () -> "http://localhost:8000");
        registry.add("app.upload-dir", () -> "./test-uploads");
        registry.add("app.python-script", () -> "");
    }

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    private static final String EMAIL = "integration@test.com";
    private static final String PASSWORD = "password123";
    private static final String NAME = "Integration User";

    @BeforeEach
    void cleanState() {
        // Nothing — DDL create-drop resets between test class runs
    }

    // ─── Registration ────────────────────────────────────────────────────────

    @Test
    void register_returns_tokens_and_user() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "fullName", NAME,
                                "email", EMAIL,
                                "password", PASSWORD
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tokens.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.tokens.refreshToken").isNotEmpty())
                .andExpect(jsonPath("$.user.email").value(EMAIL));
    }

    @Test
    void register_duplicate_email_returns_400() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "fullName", NAME, "email", EMAIL + ".dup", "password", PASSWORD));

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk());

        // Second attempt with same email
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest());
    }

    // ─── Login ───────────────────────────────────────────────────────────────

    @Test
    void login_valid_credentials_returns_tokens() throws Exception {
        // Register first
        register_user(EMAIL + ".login", PASSWORD);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", EMAIL + ".login",
                                "password", PASSWORD
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tokens.accessToken").isNotEmpty());
    }

    @Test
    void login_wrong_password_returns_401() throws Exception {
        register_user(EMAIL + ".wrongpw", PASSWORD);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", EMAIL + ".wrongpw",
                                "password", "wrongpassword"
                        ))))
                .andExpect(status().isUnauthorized());
    }

    // ─── Protected endpoint ───────────────────────────────────────────────────

    @Test
    void get_me_with_valid_token_returns_profile() throws Exception {
        String token = register_user(EMAIL + ".me", PASSWORD);

        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(EMAIL + ".me"));
    }

    @Test
    void get_me_without_token_returns_401() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized());
    }

    // ─── Logout + token invalidation ─────────────────────────────────────────

    @Test
    void logout_invalidates_token() throws Exception {
        String token = register_user(EMAIL + ".logout", PASSWORD);

        // Logout
        mockMvc.perform(post("/api/auth/logout")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        // Old token should now be rejected
        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }

    // ─── Password reset ───────────────────────────────────────────────────────

    @Test
    void forgot_password_always_returns_200() throws Exception {
        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", "nonexistent@example.com"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    void reset_password_invalid_token_returns_400() throws Exception {
        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "token", "00000000-0000-0000-0000-000000000000",
                                "newPassword", "newpassword123"
                        ))))
                .andExpect(status().isBadRequest());
    }

    // ─── Journal CRUD via real DB ─────────────────────────────────────────────

    @Test
    void create_and_fetch_journal_entry() throws Exception {
        String token = register_user(EMAIL + ".journal", PASSWORD);

        // Create entry
        MvcResult result = mockMvc.perform(post("/api/journal/entries")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "sleepHours", 7.5,
                                "stressLevel", 4
                        ))))
                .andExpect(status().isCreated())
                .andReturn();

        String responseBody = result.getResponse().getContentAsString();
        String id = objectMapper.readTree(responseBody).get("id").asText();

        // Fetch by ID
        mockMvc.perform(get("/api/journal/entries/" + id)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sleepHours").value(7.5));
    }

    // ─── GDPR delete: wipes every user-linked table ──────────────────────────

    @Test
    void delete_user_data_wipes_journal_and_stress() throws Exception {
        String token = register_user(EMAIL + ".gdpr", PASSWORD);
        String auth = "Bearer " + token;

        // Seed journal entry
        mockMvc.perform(post("/api/journal/entries")
                        .header("Authorization", auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "sleepHours", 8.0,
                                "stressLevel", 3
                        ))))
                .andExpect(status().isCreated());

        // Seed stress measurement
        mockMvc.perform(post("/api/stress")
                        .header("Authorization", auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("hrvScore", 55.0))))
                .andExpect(status().isCreated());

        // Confirm data is present before deletion
        mockMvc.perform(get("/api/journal/entries")
                        .header("Authorization", auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(org.hamcrest.Matchers.greaterThan(0)));

        mockMvc.perform(get("/api/stress/latest")
                        .header("Authorization", auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hrvScore").value(55.0));

        // Wipe
        mockMvc.perform(delete("/api/user/data")
                        .header("Authorization", auth))
                .andExpect(status().isNoContent());

        // Everything user-owned must be gone — account row itself stays.
        mockMvc.perform(get("/api/journal/entries")
                        .header("Authorization", auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        // Stress "latest" returns a placeholder message when no data exists
        mockMvc.perform(get("/api/stress/latest")
                        .header("Authorization", auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").isNotEmpty());

        // Account row must survive
        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(EMAIL + ".gdpr"));
    }

    // ─── Helper ──────────────────────────────────────────────────────────────

    private String register_user(String email, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "fullName", "Test User",
                                "email", email,
                                "password", password
                        ))))
                .andReturn();

        return objectMapper.readTree(result.getResponse().getContentAsString())
                .path("tokens").path("accessToken").asText();
    }
}
