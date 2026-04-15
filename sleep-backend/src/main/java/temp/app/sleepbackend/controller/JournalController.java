package temp.app.sleepbackend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import temp.app.sleepbackend.dto.JournalEntryRequest;
import temp.app.sleepbackend.model.JournalEntry;
import temp.app.sleepbackend.service.JournalService;

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
     * Получить все записи дневника
     * GET /api/journal/entries
     */
    @GetMapping("/entries")
    public ResponseEntity<List<JournalEntry>> getAllEntries(
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) Integer offset,
            Principal principal
    ) {
        List<JournalEntry> entries = journalService.getAllEntries(principal.getName());
        
        // Применяем пагинацию если указаны параметры
        if (offset != null && offset > 0) {
            entries = entries.subList(Math.min(offset, entries.size()), entries.size());
        }
        if (limit != null && limit > 0) {
            entries = entries.subList(0, Math.min(limit, entries.size()));
        }
        
        return ResponseEntity.ok(entries);
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
        // TODO: добавить метод в сервис
        return ResponseEntity.ok().build();
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
        return ResponseEntity.ok("Запись удалена");
    }
}

