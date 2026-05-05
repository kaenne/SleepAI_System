package kz.sleepai.backend.service;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import kz.sleepai.backend.dto.JournalEntryRequest;
import kz.sleepai.backend.model.ActivityLevel;
import kz.sleepai.backend.model.JournalEntry;
import kz.sleepai.backend.model.MoodTag;
import kz.sleepai.backend.model.User;
import kz.sleepai.backend.repository.JournalEntryRepository;
import kz.sleepai.backend.repository.UserRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class JournalService {

    private static final Logger log = LoggerFactory.getLogger(JournalService.class);

    private final JournalEntryRepository journalEntryRepository;
    private final UserRepository userRepository;

    /**
     * Создать или обновить запись дневника
     */
    public JournalEntry saveEntry(String email, JournalEntryRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));

        LocalDate date = request.getDate() != null ? request.getDate() : LocalDate.now();

        // Проверяем, есть ли уже запись за этот день
        JournalEntry entry = journalEntryRepository.findByUser_EmailAndDate(email, date)
                .orElse(new JournalEntry());

        entry.setUser(user);
        entry.setDate(date);
        
        // Новые поля от фронтенда
        if (request.getSleepHours() != null) {
            entry.setSleepHours(request.getSleepHours());
        }
        if (request.getStressLevel() != null) {
            entry.setStressLevel(request.getStressLevel());
        }

        // Остальные поля
        if (request.getMoodTag() != null) {
            try { entry.setMoodTag(MoodTag.valueOf(request.getMoodTag().toUpperCase())); } catch (IllegalArgumentException ignored) {}
        }
        if (request.getCaffeineIntake() != null) {
            entry.setCaffeineIntake(request.getCaffeineIntake());
        }
        if (request.getAlcoholIntake() != null) {
            entry.setAlcoholIntake(request.getAlcoholIntake());
        }
        if (request.getActivityLevel() != null) {
            try {
                entry.setActivityLevel(ActivityLevel.valueOf(request.getActivityLevel().toUpperCase()));
            } catch (IllegalArgumentException ignored) {}
        }
        if (request.getLastMealBeforeSleep() != null) {
            entry.setLastMealBeforeSleep(request.getLastMealBeforeSleep());
        }
        if (request.getScreenTimeBeforeSleep() != null) {
            entry.setScreenTimeBeforeSleep(request.getScreenTimeBeforeSleep());
        }
        if (request.getNotes() != null) {
            entry.setNotes(request.getNotes());
        }

        JournalEntry saved = journalEntryRepository.save(entry);
        log.debug("Journal entry saved: id={}, user={}, date={}", saved.getId(), email, saved.getDate());
        return saved;
    }

    /**
     * Получить запись за конкретный день
     */
    public Optional<JournalEntry> getEntryByDate(String email, LocalDate date) {
        return journalEntryRepository.findByUser_EmailAndDate(email, date);
    }

    /**
     * Получить все записи пользователя (с пагинацией)
     */
    public Page<JournalEntry> getAllEntries(String email, Pageable pageable) {
        return journalEntryRepository.findAllByUser_EmailOrderByDateDesc(email, pageable);
    }

    /**
     * Получить все записи без пагинации (для legacy-эндпоинта)
     */
    public List<JournalEntry> getAllEntries(String email) {
        return journalEntryRepository.findAllByUser_EmailOrderByDateDesc(email);
    }

    /**
     * Получить записи за период
     */
    public List<JournalEntry> getEntriesBetween(String email, LocalDate from, LocalDate to) {
        return journalEntryRepository.findAllByUser_EmailAndDateBetween(email, from, to);
    }

    /**
     * Получить запись по ID (только своя)
     */
    public Optional<JournalEntry> getEntryById(String email, Long id) {
        return journalEntryRepository.findById(id)
                .filter(e -> e.getUser().getEmail().equals(email));
    }

    /**
     * Удалить запись
     */
    public void deleteEntry(String email, Long entryId) {
        JournalEntry entry = journalEntryRepository.findById(entryId)
                .orElseThrow(() -> new RuntimeException("Entry not found"));

        if (!entry.getUser().getEmail().equals(email)) {
            throw new RuntimeException("Access denied for this entry");
        }

        journalEntryRepository.delete(entry);
        log.debug("Journal entry deleted: id={}, user={}", entryId, email);
    }
}

