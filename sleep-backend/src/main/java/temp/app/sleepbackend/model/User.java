package temp.app.sleepbackend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String passwordHash; // Хеш пароля (BCrypt)

    private String fullName;

    // Дата регистрации
    private LocalDateTime createdAt = LocalDateTime.now();

    // Связь: Один пользователь -> Много сессий сна
    // cascade = ALL значит: если удалим юзера, удалятся и все его сны
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<SleepSession> sleepSessions;

    // Связь: Один пользователь -> Много записей дневника
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<JournalEntry> journalEntries;

    // Связь: Один пользователь -> Много данных стресса
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<StressData> stressData;
}