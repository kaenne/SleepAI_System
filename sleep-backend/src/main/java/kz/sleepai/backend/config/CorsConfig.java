package kz.sleepai.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
public class CorsConfig {

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // React Native runs outside a browser, so CORS is only relevant for Expo web.
        // Use allowedOriginPatterns to support wildcard matching without disabling credentials.
        configuration.setAllowedOriginPatterns(Arrays.asList(
            "http://localhost:*",         // Local dev (web/Metro/Expo)
            "http://127.0.0.1:*",         // Local dev loopback
            "http://10.*.*.*:*",          // RFC1918 10/8 (Android emulator host 10.0.2.2 + corp networks)
            "http://172.16.*.*:*",        // RFC1918 172.16-31/12 (broad match — Spring patterns don't support ranges)
            "http://172.17.*.*:*",
            "http://172.18.*.*:*",
            "http://172.19.*.*:*",
            "http://172.2*.*.*:*",
            "http://172.30.*.*:*",
            "http://172.31.*.*:*",
            "http://192.168.*.*:*",       // RFC1918 192.168/16 (home/office Wi-Fi)
            "exp://*"                     // Expo Go
        ));

        configuration.setAllowedMethods(Arrays.asList(
            "GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"
        ));

        configuration.setAllowedHeaders(Arrays.asList(
            "Authorization",
            "Content-Type",
            "X-Requested-With",
            "Accept",
            "Origin",
            "Access-Control-Request-Method",
            "Access-Control-Request-Headers"
        ));

        configuration.setExposedHeaders(Arrays.asList(
            "Authorization",
            "Content-Disposition"
        ));

        configuration.setAllowCredentials(false);

        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", configuration);
        source.registerCorsConfiguration("/health", configuration);
        source.registerCorsConfiguration("/actuator/**", configuration);

        return source;
    }
}

