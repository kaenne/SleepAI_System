package kz.sleepai.backend.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;

import java.security.Key;
import java.util.Date;

@Component
public class JwtCore {

    private static final Logger log = LoggerFactory.getLogger(JwtCore.class);

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration}")
    private long expiration; // access token expiration (ms)

    @Value("${jwt.refresh-expiration:604800000}")
    private long refreshExpiration; // refresh token expiration (7 days by default)

    // 1. Генерация access токена
    public String generateToken(Authentication authentication) {
        UserDetails userPrincipal = (UserDetails) authentication.getPrincipal();
        return generateToken(userPrincipal.getUsername());
    }

    // 1a. Генерация access токена по email с текущей версией токена
    public String generateToken(String email, long tokenVersion) {
        return Jwts.builder()
                .setSubject(email)
                .setIssuedAt(new Date())
                .setExpiration(new Date((new Date()).getTime() + expiration))
                .claim("tv", tokenVersion)
                .signWith(getKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    // Backward-compat overload: токены без версии считаются версией 0
    public String generateToken(String email) {
        return generateToken(email, 0L);
    }

    // 2. Генерация refresh токена с tokenVersion для инвалидации при logout
    public String generateRefreshToken(String email, long tokenVersion) {
        return Jwts.builder()
                .setSubject(email)
                .setIssuedAt(new Date())
                .setExpiration(new Date((new Date()).getTime() + refreshExpiration))
                .claim("type", "refresh")
                .claim("tv", tokenVersion)
                .signWith(getKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    // Backward-compat overload
    public String generateRefreshToken(String email) {
        return generateRefreshToken(email, 0L);
    }

    // 3. Вытаскиваем email из токена
    public String getNameFromJwt(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getKey())
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getSubject();
    }

    // 4. Проверка валидности подписи и срока
    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder().setSigningKey(getKey()).build().parseClaimsJws(token);
            return true;
        } catch (Exception e) {
            log.debug("Invalid JWT token: {}", e.getMessage());
        }
        return false;
    }

    // 4a. Извлечь tokenVersion из токена (0 если claim отсутствует — старые токены)
    public long getTokenVersion(String token) {
        try {
            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(getKey())
                    .build()
                    .parseClaimsJws(token)
                    .getBody();
            Number tv = claims.get("tv", Number.class);
            return tv != null ? tv.longValue() : 0L;
        } catch (Exception e) {
            return -1L;
        }
    }

    // 5. Получить время жизни access токена в секундах
    public long getExpirationInSeconds() {
        return expiration / 1000;
    }

    private Key getKey() {
        return Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret));
    }
}