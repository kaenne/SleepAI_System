package kz.sleepai.backend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import kz.sleepai.backend.model.User;
import kz.sleepai.backend.repository.JournalEntryRepository;
import kz.sleepai.backend.repository.SleepSessionRepository;
import kz.sleepai.backend.repository.StressDataRepository;
import kz.sleepai.backend.repository.UserRepository;

import java.security.Principal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final JournalEntryRepository journalEntryRepository;
    private final SleepSessionRepository sleepSessionRepository;
    private final StressDataRepository stressDataRepository;

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
    @GetMapping("/export")
    public ResponseEntity<?> exportData(Principal principal) {
        if (principal == null) return ResponseEntity.status(401).build();

        User user = userRepository.findByEmail(principal.getName()).orElse(null);
        if (user == null) return ResponseEntity.notFound().build();

        Map<String, Object> export = new HashMap<>();
        export.put("user", Map.of(
                "id", user.getId(),
                "fullName", user.getFullName() != null ? user.getFullName() : "",
                "email", user.getEmail(),
                "createdAt", user.getCreatedAt()
        ));
        export.put("journalEntries", journalEntryRepository.findAllByUser_EmailOrderByDateDesc(user.getEmail()));
        export.put("sleepSessions", sleepSessionRepository.findAllByUser_EmailOrderByStartTimeDesc(user.getEmail()));
        export.put("stressData", stressDataRepository.findByUserIdOrderByTimestampDesc(user.getId()));

        return ResponseEntity.ok(export);
    }

    // ─── DELETE /api/user/data ───────────────────────────────────────────────
    @DeleteMapping("/data")
    @Transactional
    public ResponseEntity<Void> deleteData(Principal principal) {
        if (principal == null) return ResponseEntity.status(401).build();

        User user = userRepository.findByEmail(principal.getName()).orElse(null);
        if (user == null) return ResponseEntity.notFound().build();

        journalEntryRepository.deleteAll(
                journalEntryRepository.findAllByUser_EmailOrderByDateDesc(user.getEmail()));
        sleepSessionRepository.deleteAll(
                sleepSessionRepository.findAllByUser_EmailOrderByStartTimeDesc(user.getEmail()));
        stressDataRepository.deleteAll(
                stressDataRepository.findByUserIdOrderByTimestampDesc(user.getId()));

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
