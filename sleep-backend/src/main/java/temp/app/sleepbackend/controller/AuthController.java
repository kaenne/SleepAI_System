package temp.app.sleepbackend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import temp.app.sleepbackend.config.JwtCore;
import temp.app.sleepbackend.dto.*;
import temp.app.sleepbackend.model.User;
import temp.app.sleepbackend.repository.UserRepository;
import temp.app.sleepbackend.service.AuthService;

import java.security.Principal;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final AuthenticationManager authenticationManager;
    private final JwtCore jwtCore;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        try {
            // Регистрация пользователя
            authService.registerUser(request.getFullName(), request.getEmail(), request.getPassword());
            
            // Автоматический логин после регистрации
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );
            SecurityContextHolder.getContext().setAuthentication(authentication);
            
            // Генерируем токены
            String accessToken = jwtCore.generateToken(authentication);
            String refreshToken = jwtCore.generateRefreshToken(request.getEmail());
            
            // Получаем пользователя
            User user = userRepository.findByEmail(request.getEmail()).orElseThrow();
            
            // Формируем ответ
            AuthResponse response = new AuthResponse(
                    new UserDto(user.getId(), user.getFullName(), user.getEmail(), null, user.getCreatedAt()),
                    new TokensDto(accessToken, refreshToken, jwtCore.getExpirationInSeconds())
            );
            
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );
            SecurityContextHolder.getContext().setAuthentication(authentication);

            String accessToken = jwtCore.generateToken(authentication);
            String refreshToken = jwtCore.generateRefreshToken(request.getEmail());

            User user = userRepository.findByEmail(request.getEmail()).orElseThrow();
            
            AuthResponse response = new AuthResponse(
                    new UserDto(user.getId(), user.getFullName(), user.getEmail(), null, user.getCreatedAt()),
                    new TokensDto(accessToken, refreshToken, jwtCore.getExpirationInSeconds())
            );

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Invalid email or password");
            return ResponseEntity.status(401).body(error);
        }
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        try {
            // Валидируем refresh token
            if (!jwtCore.validateToken(request.getRefreshToken())) {
                return ResponseEntity.status(401).body(Map.of("message", "Invalid refresh token"));
            }
            
            String email = jwtCore.getNameFromJwt(request.getRefreshToken());
            
            // Генерируем новые токены
            String newAccessToken = jwtCore.generateToken(email);
            String newRefreshToken = jwtCore.generateRefreshToken(email);
            
            TokensDto tokens = new TokensDto(newAccessToken, newRefreshToken, jwtCore.getExpirationInSeconds());
            
            return ResponseEntity.ok(tokens);
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("message", "Invalid refresh token"));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout() {
        // В stateless JWT просто очищаем контекст на сервере
        // Клиент должен удалить токены
        SecurityContextHolder.clearContext();
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Не авторизован"));
        }

        User user = userRepository.findByEmail(principal.getName()).orElse(null);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }

        UserDto userDto = new UserDto(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                null, // avatar
                user.getCreatedAt()
        );

        return ResponseEntity.ok(userDto);
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@RequestBody UpdateProfileRequest request, Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Не авторизован"));
        }

        User user = userRepository.findByEmail(principal.getName()).orElse(null);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }

        if (request.getName() != null && !request.getName().isBlank()) {
            user.setFullName(request.getName());
        }
        // avatar можно сохранять в отдельное поле, если добавить в модель

        userRepository.save(user);

        UserDto userDto = new UserDto(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                request.getAvatar(),
                user.getCreatedAt()
        );

        return ResponseEntity.ok(userDto);
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@Valid @RequestBody ChangePasswordRequest request, Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Не авторизован"));
        }

        User user = userRepository.findByEmail(principal.getName()).orElse(null);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }

        // Проверяем текущий пароль
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Неверный текущий пароль"));
        }

        // Устанавливаем новый пароль
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        return ResponseEntity.noContent().build();
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        // В реальном приложении здесь нужно отправить email с ссылкой на сброс пароля
        // Пока просто возвращаем успех (чтобы не раскрывать существование email)
        return ResponseEntity.noContent().build();
    }
}
