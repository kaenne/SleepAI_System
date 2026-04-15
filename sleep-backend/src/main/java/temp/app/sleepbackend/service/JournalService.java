package temp.app.sleepbackend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import temp.app.sleepbackend.dto.JournalEntryRequest;
import temp.app.sleepbackend.model.JournalEntry;
import temp.app.sleepbackend.model.User;
import temp.app.sleepbackend.repository.JournalEntryRepository;
import temp.app.sleepbackend.repository.UserRepository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class JournalService {

    private final JournalEntryRepository journalEntryRepository;
    private final UserRepository userRepository;

    /**
     * Создать или обновить запись дневника
     */
    public JournalEntry saveEntry(String email, JournalEntryRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Пользователь не найден: " + email));

        LocalDate date = request.getDate() != null ? request.getDate() : LocalDate.now();

        // Проверяем, есть ли уже запись за этот день
        JournalEntry entry = journalEntryRepository.findByUser_EmailAndDate(email, date)
                .orElse(new JournalEntry());

        entry.setUser(user);
        entry.setDate(date);
        entry.setCreatedAt(LocalDateTime.now());
        
        // Новые поля от фронтенда
        if (request.getSleepHours() != null) {
            entry.setSleepHours(request.getSleepHours());
        }
        if (request.getStressLevel() != null) {
            entry.setStressLevel(request.getStressLevel());
        }
        if (request.getNote() != null) {
            entry.setNotes(request.getNote());
        }
        
        // Остальные поля
        if (request.getMoodTag() != null) {
            entry.setMoodTag(request.getMoodTag());
        }
        if (request.getCaffeineIntake() != null) {
            entry.setCaffeineIntake(request.getCaffeineIntake());
        }
        if (request.getAlcoholIntake() != null) {
            entry.setAlcoholIntake(request.getAlcoholIntake());
        }
        if (request.getActivityLevel() != null) {
            entry.setActivityLevel(request.getActivityLevel());
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

        return journalEntryRepository.save(entry);
    }

    /**
     * Получить запись за конкретный день
     */
    public Optional<JournalEntry> getEntryByDate(String email, LocalDate date) {
        return journalEntryRepository.findByUser_EmailAndDate(email, date);
    }

    /**
     * Получить все записи пользователя
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
     * Удалить запись
     */
    public void deleteEntry(String email, Long entryId) {
        JournalEntry entry = journalEntryRepository.findById(entryId)
                .orElseThrow(() -> new RuntimeException("Запись не найдена"));

        if (!entry.getUser().getEmail().equals(email)) {
            throw new RuntimeException("Нет доступа к этой записи");
        }

        journalEntryRepository.delete(entry);
    }
}

