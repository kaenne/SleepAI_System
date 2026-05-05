package kz.sleepai.backend.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.PrintWriter;
import java.io.StringWriter;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@DisplayName("LoginRateLimitFilter Unit Tests")
class LoginRateLimitFilterTest {

    private LoginRateLimitFilter filter;
    private HttpServletRequest request;
    private HttpServletResponse response;
    private FilterChain chain;
    private StringWriter responseBody;

    @BeforeEach
    void setUp() throws Exception {
        filter = new LoginRateLimitFilter();
        request = mock(HttpServletRequest.class);
        response = mock(HttpServletResponse.class);
        chain = mock(FilterChain.class);
        responseBody = new StringWriter();
        when(response.getWriter()).thenReturn(new PrintWriter(responseBody));
        when(request.getMethod()).thenReturn("POST");
        when(request.getRequestURI()).thenReturn("/api/auth/login");
        when(request.getRemoteAddr()).thenReturn("192.168.1.1");
    }

    @Test
    @DisplayName("shouldNotFilter: returns true for non-login path")
    void shouldNotFilter_NonLoginPath() {
        when(request.getRequestURI()).thenReturn("/api/journal/entries");
        assertTrue(filter.shouldNotFilter(request));
    }

    @Test
    @DisplayName("shouldNotFilter: returns true for GET /api/auth/login")
    void shouldNotFilter_GetMethod() {
        when(request.getMethod()).thenReturn("GET");
        assertTrue(filter.shouldNotFilter(request));
    }

    @Test
    @DisplayName("shouldNotFilter: returns false for POST /api/auth/login")
    void shouldNotFilter_PostLogin_NotSkipped() {
        assertFalse(filter.shouldNotFilter(request));
    }

    @Test
    @DisplayName("first 5 requests pass through")
    void firstFiveRequests_PassThrough() throws Exception {
        for (int i = 0; i < 5; i++) {
            filter.doFilterInternal(request, response, chain);
        }
        verify(chain, times(5)).doFilter(request, response);
        verify(response, never()).setStatus(429);
    }

    @Test
    @DisplayName("6th request from same IP is rate limited with 429")
    void sixthRequest_IsRateLimited() throws Exception {
        for (int i = 0; i < 5; i++) {
            filter.doFilterInternal(request, response, chain);
        }
        filter.doFilterInternal(request, response, chain);

        verify(chain, times(5)).doFilter(request, response);
        verify(response).setStatus(429);
        assertTrue(responseBody.toString().contains("Too many login attempts"));
    }

    @Test
    @DisplayName("different IPs have independent rate limit buckets")
    void differentIPs_IndependentBuckets() throws Exception {
        HttpServletRequest request2 = mock(HttpServletRequest.class);
        when(request2.getMethod()).thenReturn("POST");
        when(request2.getRequestURI()).thenReturn("/api/auth/login");
        when(request2.getRemoteAddr()).thenReturn("10.0.0.2");

        for (int i = 0; i < 5; i++) {
            filter.doFilterInternal(request, response, chain);
        }
        // Second IP should still pass
        filter.doFilterInternal(request2, response, chain);

        verify(chain, times(6)).doFilter(any(), any());
    }

    @Test
    @DisplayName("X-Forwarded-For header is ignored without trusted proxy")
    void xForwardedFor_IgnoredWithoutTrustedProxy() throws Exception {
        when(request.getHeader("X-Forwarded-For")).thenReturn("1.2.3.4");

        for (int i = 0; i < 6; i++) {
            filter.doFilterInternal(request, response, chain);
        }
        // Rate limit applied based on remoteAddr (192.168.1.1), not spoofed header
        verify(response).setStatus(429);
    }
}
