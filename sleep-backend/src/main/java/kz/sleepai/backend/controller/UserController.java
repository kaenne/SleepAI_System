package kz.sleepai.backend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import kz.sleepai.backend.model.User;
import kz.sleepai.backend.repository.ChatMessageRepository;
import kz.sleepai.backend.repository.JournalEntryRepository;
import kz.sleepai.backend.repository.PasswordResetTokenRepository;
import kz.sleepai.backend.repository.RecommendationRepository;
import kz.sleepai.backend.repository.SleepSessionRepository;
import kz.sleepai.backend.repository.StressDataRepository;
import kz.sleepai.backend.repository.UserRepository;

import java.security.Principal;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final JournalEntryRepository journalEntryRepository;
    private final SleepSessionRepository sleepSessionRepository;
    private final StressDataRepository stressDataRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final RecommendationRepository recommendationRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;

    // ─── GET /api/user/settings ─────────────────────────────────────────────
    @GetMapping("/settings")
    public ResponseEntity<?> getSettings(Principal principal) {
        if (principal == null) return ResponseEntity.status(401).build();

        User user = userRepository.findByEmail(principal.getName()).orElse(null);
        if (user == null) return ResponseEntity.notFound().build();

        return ResponseEntity.ok(buildSettingsMap(user));
    }

    // ─── PUT /api/user/settings ──────────────────────────────────────────────
    @PutMapping("/settings")
    public ResponseEntity<?> updateSettings(@RequestBody Map<String, Object> body, Principal principal) {
        if (principal == null) return ResponseEntity.status(401).build();

        User user = userRepository.findByEmail(principal.getName()).orElse(null);
        if (user == null) return ResponseEntity.notFound().build();

        if (body.containsKey("notifications")) {
            user.setNotificationsEnabled(Boolean.TRUE.equals(body.get("notifications")));
        }
        if (body.containsKey("darkMode")) {
            user.setDarkModeEnabled(Boolean.TRUE.equals(body.get("darkMode")));
        }
        if (body.containsKey("reminderTime") && body.get("reminderTime") instanceof String rt) {
            user.setReminderTime(rt);
        }
        if (body.containsKey("dataSync")) {
            user.setDataSyncEnabled(Boolean.TRUE.equals(body.get("dataSync")));
        }

        userRepository.save(user);
        return ResponseEntity.ok(buildSettingsMap(user));
    }

    // ─── GET /api/user/export ────────────────────────────────────────────────
    // readOnly = true: Hibernate skips dirty-checking flush, so the `setUser(null)`
    // detach trick below cannot accidentally persist user_id = null on the rows.
    @GetMapping("/export")
    @Transactional(readOnly = true)
    public ResponseEntity<?> exportData(Principal principal) {
        if (principal == null) return ResponseEntity.status(401).build();

        User user = userRepository.findByEmail(principal.getName()).orElse(null);
        if (user == null) return ResponseEntity.notFound().build();

        var journals = journalEntryRepository.findAllByUser_EmailOrderByDateDesc(user.getEmail());
        var sessions = sleepSessionRepository.findAllByUser_EmailOrderByStartTimeDesc(user.getEmail());
        var stress   = stressDataRepository.findByUserIdOrderByTimestampDesc(user.getId());

        // Drop the lazy User reference on each row. With `open-in-view=false` Jackson
        // serializes after the JPA session closes, and an unresolved proxy throws.
        // Owner is already in the top-level "user" block — per-row userId is redundant.
        journals.forEach(e -> e.setUser(null));
        sessions.forEach(s -> s.setUser(null));
        stress.forEach(s -> s.setUser(null));

        Map<String, Object> export = new HashMap<>();
        export.put("user", Map.of(
                "id", user.getId(),
                "fullName", user.getFullName() != null ? user.getFullName() : "",
                "email", user.getEmail(),
                "createdAt", user.getCreatedAt()
        ));
        export.put("journalEntries", journals);
        export.put("sleepSessions", sessions);
        export.put("stressData", stress);

        return ResponseEntity.ok(export);
    }

    // ─── DELETE /api/user/data ───────────────────────────────────────────────
    /**
     * GDPR-style erase of all user-generated data while keeping the account row.
     * Order matters: dependents first (recommendations reference sleep_sessions),
     * then owners. PasswordResetToken is keyed by email, not user_id, so we wipe
     * those too — otherwise stale reset links survive a data deletion.
     */
    @DeleteMapping("/data")
    @Transactional
    public ResponseEntity<Void> deleteData(Principal principal) {
        if (principal == null) return ResponseEntity.status(401).build();

        User user = userRepository.findByEmail(principal.getName()).orElse(null);
        if (user == null) return ResponseEntity.notFound().build();

        recommendationRepository.deleteAll(
                recommendationRepository.findAllBySession_User_Email(user.getEmail()));
        chatMessageRepository.deleteByUser_Email(user.getEmail());
        journalEntryRepository.deleteAll(
                journalEntryRepository.findAllByUser_EmailOrderByDateDesc(user.getEmail()));
        sleepSessionRepository.deleteAll(
                sleepSessionRepository.findAllByUser_EmailOrderByStartTimeDesc(user.getEmail()));
        stressDataRepository.deleteAll(
                stressDataRepository.findByUserIdOrderByTimestampDesc(user.getId()));
        passwordResetTokenRepository.deleteByEmail(user.getEmail());

        return ResponseEntity.noContent().build();
    }

    private Map<String, Object> buildSettingsMap(User user) {
        Map<String, Object> map = new HashMap<>();
        map.put("notifications", user.isNotificationsEnabled());
        map.put("darkMode", user.isDarkModeEnabled());
        map.put("reminderTime", user.getReminderTime() != null ? user.getReminderTime() : "22:00");
        map.put("dataSync", user.isDataSyncEnabled());
        return map;
    }
}
