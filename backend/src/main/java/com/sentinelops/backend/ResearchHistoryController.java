package com.sentinelops.backend;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/research/history")
public class ResearchHistoryController {

    private final ResearchNoteRepository notes;

    public ResearchHistoryController(ResearchNoteRepository notes) {
        this.notes = notes;
    }

    @GetMapping
    public Page<ResearchNote> getHistory(
        @RequestParam(defaultValue = "") String search,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int size
    ) {
        if (page < 0) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Page must be zero or greater."
            );
        }

        if (size < 1 || size > 100) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Page size must be between 1 and 100."
            );
        }

        String query = search == null ? "" : search.trim();

        if (query.length() > 253) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Search must be 253 characters or fewer."
            );
        }

        PageRequest pagination = PageRequest.of(
            page,
            size,
            Sort.by(Sort.Direction.DESC, "createdAt")
        );

        if (query.isEmpty()) {
            return notes.findAll(pagination);
        }

        return notes.findByTargetContainingIgnoreCaseOrNoteContainingIgnoreCase(
            query, query, pagination
        );
    }
}
