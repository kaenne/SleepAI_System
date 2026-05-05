package kz.sleepai.backend.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import kz.sleepai.backend.model.JournalEntry;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface JournalEntryRepository extends JpaRepository<JournalEntry, Long> {
    Page<JournalEntry> findAllByUser_EmailOrderByDateDesc(String email, Pageable pageable);
    List<JournalEntry> findAllByUser_EmailOrderByDateDesc(String email);
    Optional<JournalEntry> findByUser_EmailAndDate(String email, LocalDate date);
    List<JournalEntry> findAllByUser_EmailAndDateBetween(String email, LocalDate from, LocalDate to);
}

