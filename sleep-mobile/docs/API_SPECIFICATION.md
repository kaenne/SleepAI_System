# SleepMind Backend API Specification

## Overview

This document describes the REST API endpoints that the SleepMind mobile app expects from the backend server.

**Base URL:** Configured via `EXPO_PUBLIC_API_BASE_URL` environment variable.

**Authentication:** JWT Bearer tokens in `Authorization` header.

---

## Authentication Endpoints

### POST /api/auth/register

Register a new user.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid-string",
    "name": "John Doe",
    "email": "john@example.com",
    "createdAt": "2025-01-07T12:00:00Z"
  },
  "tokens": {
    "accessToken": "jwt-access-token",
    "refreshToken": "jwt-refresh-token",
    "expiresIn": 3600
  }
}
```

---

### POST /api/auth/login

Authenticate existing user.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response (200):** Same as register response.

**Error Response (401):**
```json
{
  "message": "Invalid email or password"
}
```

---

### POST /api/auth/refresh

Refresh access token.

**Request Body:**
```json
{
  "refreshToken": "jwt-refresh-token"
}
```

**Response (200):**
```json
{
  "accessToken": "new-jwt-access-token",
  "refreshToken": "new-jwt-refresh-token",
  "expiresIn": 3600
}
```

---

### POST /api/auth/logout

Logout (invalidate tokens).

**Headers:**
- `Authorization: Bearer <access-token>`

**Response (204):** No content.

---

### GET /api/auth/me

Get current user profile.

**Headers:**
- `Authorization: Bearer <access-token>`

**Response (200):**
```json
{
  "id": "uuid-string",
  "name": "John Doe",
  "email": "john@example.com",
  "avatar": "https://example.com/avatar.jpg",
  "createdAt": "2025-01-07T12:00:00Z"
}
```

---

### PUT /api/auth/profile

Update user profile.

**Headers:**
- `Authorization: Bearer <access-token>`

**Request Body:**
```json
{
  "name": "John Updated",
  "avatar": "https://example.com/new-avatar.jpg"
}
```

**Response (200):** Updated user object.

---

### POST /api/auth/change-password

Change user password.

**Headers:**
- `Authorization: Bearer <access-token>`

**Request Body:**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

**Response (204):** No content.

---

### POST /api/auth/forgot-password

Request password reset email.

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Response (204):** No content.

---

## Journal Endpoints

### POST /api/journal/entries

Create a new sleep journal entry.

**Headers:**
- `Authorization: Bearer <access-token>`

**Request Body:**
```json
{
  "createdAt": "2025-01-07T08:00:00Z",
  "sleepHours": 7.5,
  "stressLevel": 4,
  "note": "Felt rested today"
}
```

**Response (201):**
```json
{
  "id": "uuid-string"
}
```

---

### GET /api/journal/entries

Get user's journal entries.

**Headers:**
- `Authorization: Bearer <access-token>`

**Query Parameters:**
- `limit` (optional): Number of entries to return
- `offset` (optional): Offset for pagination

**Response (200):**
```json
[
  {
    "id": "uuid-string",
    "userId": "user-uuid",
    "createdAt": "2025-01-07T08:00:00Z",
    "sleepHours": 7.5,
    "stressLevel": 4,
    "note": "Felt rested today"
  }
]
```

---

### GET /api/journal/entries/:id

Get specific journal entry.

**Headers:**
- `Authorization: Bearer <access-token>`

**Response (200):** Single entry object.

---

### DELETE /api/journal/entries/:id

Delete a journal entry.

**Headers:**
- `Authorization: Bearer <access-token>`

**Response (204):** No content.

---

## Analysis Endpoints

### GET /api/analysis/sleep

Get sleep analysis and insights.

**Headers:**
- `Authorization: Bearer <access-token>`

**Query Parameters:**
- `days` (optional): Number of days to analyze (default: 7)

**Response (200):**
```json
{
  "sleepQuality": 85,
  "averageSleep": 7.2,
  "deepSleepPercent": 20,
  "remSleepPercent": 25,
  "insights": [
    "Your sleep quality has improved by 10% this week",
    "You're getting more deep sleep on weekends"
  ],
  "recommendations": [
    "Try to maintain a consistent bedtime",
    "Consider reducing screen time before bed"
  ]
}
```

---

### GET /api/analysis/stress

Get stress analysis.

**Headers:**
- `Authorization: Bearer <access-token>`

**Query Parameters:**
- `days` (optional): Number of days to analyze (default: 7)

**Response (200):**
```json
{
  "averageStress": 4.2,
  "trend": "decreasing",
  "insights": [
    "Your stress levels are 15% lower than last week",
    "Mondays tend to be your most stressful days"
  ]
}
```

---

## AI Chat Endpoints

### POST /api/chat/message

Send a message to the AI sleep coach.

**Headers:**
- `Authorization: Bearer <access-token>`

**Request Body:**
```json
{
  "content": "How can I improve my sleep quality?",
  "conversationId": "optional-conversation-uuid"
}
```

**Response (200):**
```json
{
  "message": {
    "id": "message-uuid",
    "role": "assistant",
    "content": "Based on your sleep data, here are some personalized recommendations...",
    "timestamp": "2025-01-07T12:00:00Z"
  },
  "suggestions": [
    "Tell me more about deep sleep",
    "What's the ideal bedtime?",
    "How does stress affect sleep?"
  ]
}
```

---

### GET /api/chat/history

Get chat history.

**Headers:**
- `Authorization: Bearer <access-token>`

**Query Parameters:**
- `conversationId` (optional): Specific conversation to retrieve

**Response (200):**
```json
[
  {
    "id": "message-uuid",
    "role": "user",
    "content": "How can I improve my sleep quality?",
    "timestamp": "2025-01-07T11:59:00Z"
  },
  {
    "id": "message-uuid-2",
    "role": "assistant",
    "content": "Based on your sleep data...",
    "timestamp": "2025-01-07T12:00:00Z"
  }
]
```

---

## User Settings Endpoints

### GET /api/user/settings

Get user settings.

**Headers:**
- `Authorization: Bearer <access-token>`

**Response (200):**
```json
{
  "notifications": true,
  "darkMode": false,
  "reminderTime": "22:00",
  "dataSync": true
}
```

---

### PUT /api/user/settings

Update user settings.

**Headers:**
- `Authorization: Bearer <access-token>`

**Request Body:**
```json
{
  "notifications": true,
  "darkMode": true,
  "reminderTime": "21:30",
  "dataSync": true
}
```

**Response (204):** No content.

---

## Data Export Endpoints

### GET /api/user/export

Export user data.

**Headers:**
- `Authorization: Bearer <access-token>`

**Response (200):**
```json
{
  "downloadUrl": "https://storage.example.com/exports/user-data.json"
}
```

---

### DELETE /api/user/data

Delete all user data.

**Headers:**
- `Authorization: Bearer <access-token>`

**Response (204):** No content.

---

## Health Check

### GET /health

Server health check (no authentication required).

**Response (200):**
```json
{
  "status": "UP"
}
```

Or: `GET /actuator/health` for Spring Boot Actuator.

---

## Error Response Format

All error responses follow this format:

```json
{
  "message": "Human readable error message",
  "status": 400,
  "errors": {
    "email": ["Email is required", "Invalid email format"],
    "password": ["Password must be at least 6 characters"]
  }
}
```

---

## Spring Boot Implementation Notes

### Security Configuration

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf().disable()
            .cors().and()
            .sessionManagement()
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            .and()
            .authorizeHttpRequests()
                .requestMatchers("/api/auth/login", "/api/auth/register", "/api/auth/refresh", "/api/auth/forgot-password").permitAll()
                .requestMatchers("/health", "/actuator/health").permitAll()
                .anyRequest().authenticated()
            .and()
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        
        return http.build();
    }
}
```

### JWT Token Generation

```java
@Service
public class JwtService {
    
    @Value("${jwt.secret}")
    private String secretKey;
    
    @Value("${jwt.expiration}")
    private long accessTokenExpiration; // e.g., 3600000 (1 hour)
    
    @Value("${jwt.refresh-expiration}")
    private long refreshTokenExpiration; // e.g., 604800000 (7 days)
    
    public String generateAccessToken(User user) {
        return Jwts.builder()
            .setSubject(user.getId())
            .setIssuedAt(new Date())
            .setExpiration(new Date(System.currentTimeMillis() + accessTokenExpiration))
            .signWith(getSignKey(), SignatureAlgorithm.HS256)
            .compact();
    }
}
```

### CORS Configuration

```java
@Configuration
public class CorsConfig implements WebMvcConfigurer {
    
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
            .allowedOrigins("*")
            .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
            .allowedHeaders("*")
            .exposedHeaders("Authorization");
    }
}
```
