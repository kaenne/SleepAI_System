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
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.test.web.servlet.MockMvc;
import temp.app.sleepbackend.config.JwtCore;
import temp.app.sleepbackend.dto.LoginRequest;
import temp.app.sleepbackend.dto.RegisterRequest;
import temp.app.sleepbackend.model.User;
import temp.app.sleepbackend.repository.UserRepository;
import temp.app.sleepbackend.service.AuthService;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("AuthController Integration Tests")
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthService authService;

    @MockBean
    private AuthenticationManager authenticationManager;

    @MockBean
    private JwtCore jwtCore;

    @MockBean
    private UserRepository userRepository;

    private User testUser;
    private final String TEST_EMAIL = "test@example.com";
    private final String TEST_PASSWORD = "password123";

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1L);
        testUser.setEmail(TEST_EMAIL);
        testUser.setFullName("Test User");
        testUser.setCreatedAt(LocalDateTime.now());
    }

    @Test
    @DisplayName("POST /api/auth/register: успешная регистрация")
    void register_ShouldReturnOkWithTokens() throws Exception {
        // Arrange
        RegisterRequest request = new RegisterRequest();
        request.setEmail(TEST_EMAIL);
        request.setPassword(TEST_PASSWORD);
        request.setFullName("Test User");

        Authentication mockAuth = mock(Authentication.class);
        when(mockAuth.getName()).thenReturn(TEST_EMAIL);

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(mockAuth);
        when(jwtCore.generateToken(any(Authentication.class))).thenReturn("access-token");
        when(jwtCore.generateRefreshToken(anyString())).thenReturn("refresh-token");
        when(jwtCore.getExpirationInSeconds()).thenReturn(86400L);
        when(userRepository.findByEmail(TEST_EMAIL)).thenReturn(Optional.of(testUser));

        // Act & Assert
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.email").value(TEST_EMAIL))
                .andExpect(jsonPath("$.tokens.accessToken").value("access-token"))
                .andExpect(jsonPath("$.tokens.refreshToken").value("refresh-token"));

        verify(authService).registerUser("Test User", TEST_EMAIL, TEST_PASSWORD);
    }

    @Test
    @DisplayName("POST /api/auth/register: ошибка при существующем email")
    void register_ShouldReturnBadRequestWhenEmailExists() throws Exception {
        // Arrange
        RegisterRequest request = new RegisterRequest();
        request.setEmail(TEST_EMAIL);
        request.setPassword(TEST_PASSWORD);
        request.setFullName("Test User");

        doThrow(new RuntimeException("Пользователь с таким email уже существует"))
                .when(authService).registerUser(anyString(), anyString(), anyString());

        // Act & Assert
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    @DisplayName("POST /api/auth/login: успешный логин")
    void login_ShouldReturnOkWithTokens() throws Exception {
        // Arrange
        LoginRequest request = new LoginRequest();
        request.setEmail(TEST_EMAIL);
        request.setPassword(TEST_PASSWORD);

        Authentication mockAuth = mock(Authentication.class);
        when(mockAuth.getName()).thenReturn(TEST_EMAIL);

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(mockAuth);
        when(jwtCore.generateToken(any(Authentication.class))).thenReturn("access-token");
        when(jwtCore.generateRefreshToken(anyString())).thenReturn("refresh-token");
        when(jwtCore.getExpirationInSeconds()).thenReturn(86400L);
        when(userRepository.findByEmail(TEST_EMAIL)).thenReturn(Optional.of(testUser));

        // Act & Assert
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.email").value(TEST_EMAIL))
                .andExpect(jsonPath("$.tokens.accessToken").value("access-token"));
    }

    @Test
    @DisplayName("POST /api/auth/login: неверный пароль")
    void login_ShouldReturnUnauthorizedWhenInvalidCredentials() throws Exception {
        // Arrange
        LoginRequest request = new LoginRequest();
        request.setEmail(TEST_EMAIL);
        request.setPassword("wrongpassword");

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new RuntimeException("Bad credentials"));

        // Act & Assert
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid email or password"));
    }

    @Test
    @DisplayName("POST /api/auth/register: валидация пустого email")
    void register_ShouldReturnBadRequestWhenEmailEmpty() throws Exception {
        // Arrange
        RegisterRequest request = new RegisterRequest();
        request.setEmail("");
        request.setPassword(TEST_PASSWORD);
        request.setFullName("Test User");

        // Act & Assert
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }
}
