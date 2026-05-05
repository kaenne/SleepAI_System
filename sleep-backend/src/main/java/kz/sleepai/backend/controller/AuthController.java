package kz.sleepai.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import kz.sleepai.backend.config.JwtCore;
import kz.sleepai.backend.dto.*;
import kz.sleepai.backend.dto.ResetPasswordRequest;
import kz.sleepai.backend.model.User;
import kz.sleepai.backend.repository.UserRepository;
import kz.sleepai.backend.service.AuthService;

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
            
            // Получаем пользователя
            User user = userRepository.findByEmail(request.getEmail()).orElseThrow();

            // Генерируем токены с текущей версией
            String accessToken = jwtCore.generateToken(user.getEmail(), user.getTokenVersion());
            String refreshToken = jwtCore.generateRefreshToken(user.getEmail(), user.getTokenVersion());

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

            User user = userRepository.findByEmail(request.getEmail()).orElseThrow();

            String accessToken = jwtCore.generateToken(user.getEmail(), user.getTokenVersion());
            String refreshToken = jwtCore.generateRefreshToken(user.getEmail(), user.getTokenVersion());

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
            if (!jwtCore.validateToken(request.getRefreshToken())) {
                return ResponseEntity.status(401).body(Map.of("message", "Invalid refresh token"));
            }

            String email = jwtCore.getNameFromJwt(request.getRefreshToken());
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Reject refresh tokens issued before the last logout
            long jwtVersion = jwtCore.getTokenVersion(request.getRefreshToken());
            if (jwtVersion < user.getTokenVersion()) {
                return ResponseEntity.status(401).body(Map.of("message", "Refresh token has been invalidated"));
            }

            String newAccessToken = jwtCore.generateToken(email, user.getTokenVersion());
            String newRefreshToken = jwtCore.generateRefreshToken(email, user.getTokenVersion());

            return ResponseEntity.ok(new TokensDto(newAccessToken, newRefreshToken, jwtCore.getExpirationInSeconds()));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("message", "Invalid refresh token"));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(Principal principal) {
        if (principal != null) {
            userRepository.findByEmail(principal.getName()).ifPresent(user -> {
                user.setTokenVersion(user.getTokenVersion() + 1);
                userRepository.save(user);
            });
        }
        SecurityContextHolder.clearContext();
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
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
    public ResponseEntity<?> updateProfile(@Valid @RequestBody UpdateProfileRequest request, Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
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
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        }

        User user = userRepository.findByEmail(principal.getName()).orElse(null);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }

        // Проверяем текущий пароль
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Current password is incorrect"));
        }

        // Устанавливаем новый пароль
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        return ResponseEntity.noContent().build();
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.generatePasswordResetToken(request.getEmail());
        // Always return 200 — don't reveal if email exists
        return ResponseEntity.ok(Map.of("message", "If this email is registered, a reset link has been sent"));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        try {
            authService.resetPassword(request.getToken(), request.getNewPassword());
            return ResponseEntity.ok(Map.of("message", "Password reset successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/google")
    public ResponseEntity<?> googleAuth(@Valid @RequestBody GoogleAuthRequest request) {
        try {
            User user = authService.googleLogin(request.getAccessToken());

            String accessToken = jwtCore.generateToken(user.getEmail(), user.getTokenVersion());
            String refreshToken = jwtCore.generateRefreshToken(user.getEmail(), user.getTokenVersion());

            AuthResponse response = new AuthResponse(
                    new UserDto(user.getId(), user.getFullName(), user.getEmail(), null, user.getCreatedAt()),
                    new TokensDto(accessToken, refreshToken, jwtCore.getExpirationInSeconds())
            );
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.status(401).body(error);
        }
    }
}
