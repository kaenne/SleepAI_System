package kz.sleepai.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import kz.sleepai.backend.dto.JournalEntryRequest;
import kz.sleepai.backend.model.JournalEntry;
import kz.sleepai.backend.service.JournalService;

import java.security.Principal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/journal")
@RequiredArgsConstructor
public class JournalController {

    private final JournalService journalService;

    /**
     * Создать запись дневника
     * POST /api/journal/entries
     */
    @PostMapping("/entries")
    public ResponseEntity<?> createEntry(
            @Valid @RequestBody JournalEntryRequest request,
            Principal principal
    ) {
        JournalEntry saved = journalService.saveEntry(principal.getName(), request);
        return ResponseEntity.status(201).body(Map.of("id", saved.getId().toString()));
    }

    /**
     * Получить все записи дневника (с пагинацией)
     * GET /api/journal/entries?page=0&size=50
     * Для обратной совместимости с мобильным приложением поддерживается параметр limit.
     */
    @GetMapping("/entries")
    public ResponseEntity<List<JournalEntry>> getAllEntries(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false) Integer limit,
            Principal principal
    ) {
        int effectiveSize = limit != null ? Math.min(limit, 500) : Math.min(size, 200);
        PageRequest pageable = PageRequest.of(page, effectiveSize, Sort.by("date").descending());
        return ResponseEntity.ok(journalService.getAllEntries(principal.getName(), pageable).getContent());
    }

    /**
     * Получить запись по ID
     * GET /api/journal/entries/:id
     */
    @GetMapping("/entries/{id}")
    public ResponseEntity<?> getEntryById(
            @PathVariable Long id,
            Principal principal
    ) {
        return journalService.getEntryById(principal.getName(), id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Удалить запись
     * DELETE /api/journal/entries/:id
     */
    @DeleteMapping("/entries/{id}")
    public ResponseEntity<?> deleteEntry(@PathVariable Long id, Principal principal) {
        journalService.deleteEntry(principal.getName(), id);
        return ResponseEntity.noContent().build();
    }

    // ============ Дополнительные endpoints (совместимость) ============

    /**
     * Создать или обновить запись дневника (legacy)
     * POST /api/journal
     */
    @PostMapping
    public ResponseEntity<JournalEntry> saveEntry(
            @Valid @RequestBody JournalEntryRequest request,
            Principal principal
    ) {
        JournalEntry saved = journalService.saveEntry(principal.getName(), request);
        return ResponseEntity.ok(saved);
    }

    /**
     * Получить все записи дневника (legacy)
     * GET /api/journal
     */
    @GetMapping
    public ResponseEntity<List<JournalEntry>> getAllEntriesLegacy(Principal principal) {
        List<JournalEntry> entries = journalService.getAllEntries(principal.getName());
        return ResponseEntity.ok(entries);
    }

    /**
     * Получить запись за конкретную дату
     * GET /api/journal/date/2026-01-25
     */
    @GetMapping("/date/{date}")
    public ResponseEntity<?> getEntryByDate(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            Principal principal
    ) {
        return journalService.getEntryByDate(principal.getName(), date)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Получить записи за период
     * GET /api/journal/range?from=2026-01-01&to=2026-01-25
     */
    @GetMapping("/range")
    public ResponseEntity<List<JournalEntry>> getEntriesInRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            Principal principal
    ) {
        List<JournalEntry> entries = journalService.getEntriesBetween(principal.getName(), from, to);
        return ResponseEntity.ok(entries);
    }

    /**
     * Удалить запись (legacy)
     * DELETE /api/journal/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteEntryLegacy(@PathVariable Long id, Principal principal) {
        journalService.deleteEntry(principal.getName(), id);
        return ResponseEntity.ok("Entry deleted");
    }
}

