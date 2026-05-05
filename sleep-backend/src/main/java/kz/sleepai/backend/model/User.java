package kz.sleepai.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "users")
@EntityListeners(AuditingEntityListener.class)
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String email;

    // Nullable — Google-only users have no password
    @Column(nullable = true)
    private String passwordHash;

    private String fullName;

    // Google OAuth subject ID (null for email/password users)
    @Column(unique = true, nullable = true)
    private String googleId;

    // Дата регистрации — выставляется JPA auditing при INSERT, неизменяема.
    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    // Настройки пользователя
    @Column(nullable = false, columnDefinition = "boolean default true")
    private boolean notificationsEnabled = true;

    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean darkModeEnabled = false;

    @Column(length = 10)
    private String reminderTime = "22:00";

    @Column(nullable = false, columnDefinition = "boolean default true")
    private boolean dataSyncEnabled = true;

    @Column(nullable = false, columnDefinition = "bigint default 0")
    private long tokenVersion = 0;
}