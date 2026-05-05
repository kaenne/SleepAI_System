package kz.sleepai.backend.service; // Поменяй на свой пакет

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import kz.sleepai.backend.model.PasswordResetToken;
import kz.sleepai.backend.model.User;
import kz.sleepai.backend.repository.PasswordResetTokenRepository;
import kz.sleepai.backend.repository.UserRepository;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final PasswordResetTokenRepository resetTokenRepository;

    public void registerUser(String fullName, String email, String password) {
        // 1. Проверяем дубликаты
        if (userRepository.existsByEmail(email)) {
            throw new RuntimeException("Email is already taken!");
        }

        // 2. Создаем юзера
        User user = new User();
        user.setFullName(fullName);
        user.setEmail(email);

        // 3. Шифруем пароль (обязательно!)
        user.setPasswordHash(passwordEncoder.encode(password));

        // 4. Сохраняем
        userRepository.save(user);
    }

    /**
     * Finds or creates a user by verifying the Google OAuth access token
     * against Google's userinfo endpoint, then returns the User.
     */
    @Transactional
    public User googleLogin(String accessToken) {
        // 1. Fetch user info from Google
        GoogleUserInfo info = fetchGoogleUserInfo(accessToken);
        return findOrCreateGoogleUser(info);
    }

    private User findOrCreateGoogleUser(GoogleUserInfo info) {
        // Look up by Google ID first, then by email
        Optional<User> existing = userRepository.findByGoogleId(info.sub());
        if (existing.isEmpty()) {
            existing = userRepository.findByEmail(info.email());
        }

        if (existing.isPresent()) {
            User user = existing.get();
            // Link Google ID if not already set
            if (user.getGoogleId() == null) {
                user.setGoogleId(info.sub());
                userRepository.save(user);
            }
            return user;
        }

        // Create new user — no password (random unguessable hash)
        User user = new User();
        user.setEmail(info.email());
        user.setFullName(info.name() != null ? info.name() : info.email().split("@")[0]);
        user.setGoogleId(info.sub());
        user.setPasswordHash(passwordEncoder.encode(UUID.randomUUID().toString()));
        try {
            return userRepository.save(user);
        } catch (DataIntegrityViolationException e) {
            // Concurrent first-login for the same email — another transaction won the
            // unique-constraint race. Re-fetch the row that the winner just created.
            log.info("Race detected creating Google user for {} — fetching existing row", info.email());
            return userRepository.findByGoogleId(info.sub())
                    .or(() -> userRepository.findByEmail(info.email()))
                    .orElseThrow(() -> new RuntimeException("Failed to resolve user after concurrent insert"));
        }
    }

    /**
     * Генерирует токен сброса пароля и сохраняет его.
     * В production здесь должна быть отправка email.
     * Не раскрывает, существует ли email (security best practice).
     */
    public void generatePasswordResetToken(String email) {
        userRepository.findByEmail(email).ifPresent(user -> {
            String token = UUID.randomUUID().toString();
            PasswordResetToken prt = new PasswordResetToken();
            prt.setEmail(email);
            prt.setToken(token);
            prt.setExpiresAt(LocalDateTime.now().plusHours(1));
            prt.setUsed(false);
            resetTokenRepository.save(prt);
            // In production: send email with link /reset-password?token=<token>
            log.info("Password reset token generated for {} (send via email in production)", email);
        });
    }

    /**
     * Проверяет токен сброса и меняет пароль.
     */
    public void resetPassword(String token, String newPassword) {
        PasswordResetToken prt = resetTokenRepository.findByTokenAndUsedFalse(token)
                .orElseThrow(() -> new RuntimeException("Invalid or expired reset token"));

        if (prt.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Reset token has expired");
        }

        User user = userRepository.findByEmail(prt.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        prt.setUsed(true);
        resetTokenRepository.save(prt);
    }

    // ---- Private helpers ----

    private record GoogleUserInfo(String sub, String email, String name) {}

    private GoogleUserInfo fetchGoogleUserInfo(String accessToken) {
        try {
            HttpClient client = HttpClient.newHttpClient();
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create("https://www.googleapis.com/oauth2/v3/userinfo"))
                    .header("Authorization", "Bearer " + accessToken)
                    .GET()
                    .build();

            HttpResponse<String> response = client.send(req, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                throw new RuntimeException("Invalid Google access token (status " + response.statusCode() + ")");
            }

            ObjectMapper mapper = new ObjectMapper();
            JsonNode node = mapper.readTree(response.body());

            String sub = node.path("sub").asText(null);
            String email = node.path("email").asText(null);
            String name = node.path("name").asText(null);

            if (sub == null || email == null) {
                throw new RuntimeException("Google userinfo missing required fields");
            }
            return new GoogleUserInfo(sub, email, name);

        } catch (IOException | InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Failed to fetch Google user info: " + e.getMessage(), e);
        }
    }
}
