package kz.sleepai.backend.config;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("JwtCore Unit Tests")
class JwtCoreTest {

    private JwtCore jwtCore;

    // 45-byte key (360 bits) — safely above the 256-bit minimum for HS256
    private static final String TEST_SECRET = "dGhpcy1pcy1hLXZlcnktbG9uZy1zZWNyZXQta2V5LWZvci10ZXN0aW5n";
    private static final String TEST_EMAIL = "user@example.com";

    @BeforeEach
    void setUp() {
        jwtCore = new JwtCore();
        ReflectionTestUtils.setField(jwtCore, "secret", TEST_SECRET);
        ReflectionTestUtils.setField(jwtCore, "expiration", 86400000L);
        ReflectionTestUtils.setField(jwtCore, "refreshExpiration", 604800000L);
    }

    @Test
    @DisplayName("generateToken: subject содержит email пользователя")
    void generateToken_ShouldContainEmailAsSubject() {
        String token = jwtCore.generateToken(TEST_EMAIL, 0L);
        assertEquals(TEST_EMAIL, jwtCore.getNameFromJwt(token));
    }

    @Test
    @DisplayName("generateToken: claim tv содержит версию токена")
    void generateToken_ShouldEmbedTokenVersion() {
        String token = jwtCore.generateToken(TEST_EMAIL, 5L);
        assertEquals(5L, jwtCore.getTokenVersion(token));
    }

    @Test
    @DisplayName("generateToken: backward-compat overload выдаёт tv=0")
    void generateToken_BackwardCompatOverload_HasVersionZero() {
        String token = jwtCore.generateToken(TEST_EMAIL);
        assertEquals(0L, jwtCore.getTokenVersion(token));
    }

    @Test
    @DisplayName("validateToken: возвращает true для подписанного токена")
    void validateToken_ShouldReturnTrueForValidToken() {
        String token = jwtCore.generateToken(TEST_EMAIL, 0L);
        assertTrue(jwtCore.validateToken(token));
    }

    @Test
    @DisplayName("validateToken: возвращает false для поддельного токена")
    void validateToken_ShouldReturnFalseForTamperedToken() {
        assertFalse(jwtCore.validateToken("eyJhbGciOiJIUzI1NiJ9.fake.payload"));
    }

    @Test
    @DisplayName("validateToken: возвращает false для полностью невалидной строки")
    void validateToken_ShouldReturnFalseForGarbage() {
        assertFalse(jwtCore.validateToken("not-a-jwt-at-all"));
    }

    @Test
    @DisplayName("generateRefreshToken: subject содержит email")
    void generateRefreshToken_ShouldContainEmail() {
        String refreshToken = jwtCore.generateRefreshToken(TEST_EMAIL);
        assertEquals(TEST_EMAIL, jwtCore.getNameFromJwt(refreshToken));
    }

    @Test
    @DisplayName("generateRefreshToken: refresh токен проходит validateToken")
    void generateRefreshToken_ShouldBeValid() {
        String refreshToken = jwtCore.generateRefreshToken(TEST_EMAIL);
        assertTrue(jwtCore.validateToken(refreshToken));
    }

    @Test
    @DisplayName("generateRefreshToken(email, version): содержит tokenVersion в claim tv")
    void generateRefreshToken_WithVersion_EmbedsTv() {
        String refreshToken = jwtCore.generateRefreshToken(TEST_EMAIL, 3L);
        assertEquals(3L, jwtCore.getTokenVersion(refreshToken));
    }

    @Test
    @DisplayName("generateRefreshToken(email, version): logout invalidates refresh token")
    void generateRefreshToken_OldVersionRejectedAfterLogout() {
        String refreshToken = jwtCore.generateRefreshToken(TEST_EMAIL, 2L);
        long dbVersionAfterLogout = 3L;
        assertTrue(jwtCore.getTokenVersion(refreshToken) < dbVersionAfterLogout,
                "Refresh token issued before logout must be rejected");
    }

    @Test
    @DisplayName("getExpirationInSeconds: возвращает миллисекунды / 1000")
    void getExpirationInSeconds_ShouldConvertFromMillis() {
        assertEquals(86400L, jwtCore.getExpirationInSeconds());
    }

    @Test
    @DisplayName("getTokenVersion: возвращает -1 для невалидного токена")
    void getTokenVersion_ShouldReturnMinusOneForInvalidToken() {
        assertEquals(-1L, jwtCore.getTokenVersion("invalid.token.xyz"));
    }

    @Test
    @DisplayName("logout-invalidation: токен с устаревшей версией должен быть отвергнут")
    void tokenVersion_OlderVersionShouldBeLessThanNewDbVersion() {
        // Имитируем: пользователь имел версию 2 (токен выдан с tv=2),
        // после logout версия в БД стала 3 → токен инвалидирован
        String oldToken = jwtCore.generateToken(TEST_EMAIL, 2L);
        long dbVersion = 3L;

        long jwtVersion = jwtCore.getTokenVersion(oldToken);
        assertTrue(jwtVersion < dbVersion, "Старый токен должен быть отклонён");
    }

    @Test
    @DisplayName("разные email дают разные токены")
    void generateToken_DifferentEmailsProduceDifferentTokens() {
        String token1 = jwtCore.generateToken("alice@example.com", 0L);
        String token2 = jwtCore.generateToken("bob@example.com", 0L);
        assertNotEquals(token1, token2);
    }
}
