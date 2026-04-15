package temp.app.sleepbackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import temp.app.sleepbackend.model.JournalEntry;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface JournalEntryRepository extends JpaRepository<JournalEntry, Long> {
    List<JournalEntry> findAllByUser_EmailOrderByDateDesc(String email);
    Optional<JournalEntry> findByUser_EmailAndDate(String email, LocalDate date);
    List<JournalEntry> findAllByUser_EmailAndDateBetween(String email, LocalDate from, LocalDate to);
}

