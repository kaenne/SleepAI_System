package kz.sleepai.backend.config;

import io.jsonwebtoken.ExpiredJwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import kz.sleepai.backend.repository.UserRepository;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class TokenFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(TokenFilter.class);

    private final JwtCore jwtCore;
    private final UserDetailsService userDetailsService;
    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String jwt = null;
        String email = null;
        UserDetails userDetails = null;
        UsernamePasswordAuthenticationToken auth = null;

        try {
            String headerAuth = request.getHeader("Authorization");

            // Ищем заголовок: Authorization: Bearer <token>
            if (headerAuth != null && headerAuth.startsWith("Bearer ")) {
                jwt = headerAuth.substring(7); // Отрезаем "Bearer "
            }

            if (jwt != null) {
                try {
                    email = jwtCore.getNameFromJwt(jwt);
                } catch (ExpiredJwtException e) {
                    // Токен просрочен
                }

                if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                    // Проверяем tokenVersion: отклоняем токены, выданные до последнего logout
                    long jwtVersion = jwtCore.getTokenVersion(jwt);
                    long dbVersion = userRepository.findByEmail(email)
                            .map(kz.sleepai.backend.model.User::getTokenVersion)
                            .orElse(-1L);
                    if (jwtVersion < dbVersion) {
                        // Токен инвалидирован при logout — не авторизуем
                        filterChain.doFilter(request, response);
                        return;
                    }

                    userDetails = userDetailsService.loadUserByUsername(email);
                    auth = new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                    SecurityContextHolder.getContext().setAuthentication(auth);
                }
            }
        } catch (Exception e) {
            // Не валим запрос — пусть Spring Security вернёт 401, если нужно.
            // Но логируем, иначе DB-сбои или баги в JWT-парсинге невидимы для оператора.
            log.debug("Token authentication skipped: {}", e.getMessage());
        }

        filterChain.doFilter(request, response);
    }
}