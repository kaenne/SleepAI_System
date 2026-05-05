package kz.sleepai.backend.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory sliding-window rate limiter for POST /api/auth/login.
 * Allows MAX_ATTEMPTS per IP within WINDOW_SECONDS. No external dependencies required.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 1)
public class LoginRateLimitFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(LoginRateLimitFilter.class);

    private static final String LOGIN_PATH = "/api/auth/login";
    private static final int MAX_ATTEMPTS = 5;
    private static final long WINDOW_SECONDS = 60;

    private final Map<String, Deque<Long>> attempts = new ConcurrentHashMap<>();

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !LOGIN_PATH.equals(request.getRequestURI())
                || !"POST".equalsIgnoreCase(request.getMethod());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String ip = resolveClientIp(request);
        long now = Instant.now().getEpochSecond();
        long windowStart = now - WINDOW_SECONDS;

        Deque<Long> timestamps = attempts.computeIfAbsent(ip, k -> new ArrayDeque<>());

        synchronized (timestamps) {
            // evict timestamps outside the window
            while (!timestamps.isEmpty() && timestamps.peekFirst() < windowStart) {
                timestamps.pollFirst();
            }

            if (timestamps.size() >= MAX_ATTEMPTS) {
                log.warn("Rate limit exceeded for IP {}: {} attempts in {}s", ip, timestamps.size(), WINDOW_SECONDS);
                response.setStatus(429);
                response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                response.getWriter().write(
                        "{\"message\":\"Too many login attempts. Please wait 60 seconds and try again.\"}");
                return;
            }

            timestamps.addLast(now);
        }

        chain.doFilter(request, response);
    }

    /**
     * Periodically purge IPs whose deque has fully expired. Without this the map grows
     * by one entry per unique attacker IP and never shrinks.
     */
    @Scheduled(fixedDelay = 5 * 60 * 1000L)
    public void purgeExpired() {
        long windowStart = Instant.now().getEpochSecond() - WINDOW_SECONDS;
        Iterator<Map.Entry<String, Deque<Long>>> it = attempts.entrySet().iterator();
        while (it.hasNext()) {
            Map.Entry<String, Deque<Long>> e = it.next();
            Deque<Long> ts = e.getValue();
            synchronized (ts) {
                while (!ts.isEmpty() && ts.peekFirst() < windowStart) {
                    ts.pollFirst();
                }
                if (ts.isEmpty()) it.remove();
            }
        }
    }

    private static final String TRUSTED_PROXY = System.getenv("TRUSTED_PROXY_IP");

    private String resolveClientIp(HttpServletRequest request) {
        // Only trust X-Forwarded-For when the request comes from a known proxy IP.
        // Without this guard, anyone can spoof the header to bypass rate limiting.
        String remoteAddr = request.getRemoteAddr();
        if (TRUSTED_PROXY != null && TRUSTED_PROXY.equals(remoteAddr)) {
            String forwarded = request.getHeader("X-Forwarded-For");
            if (forwarded != null && !forwarded.isBlank()) {
                return forwarded.split(",")[0].trim();
            }
        }
        return remoteAddr;
    }
}
