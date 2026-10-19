package com.sentinelops.backend;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ResearchNoteRepository
        extends JpaRepository<ResearchNote, Long> {

    List<ResearchNote> findAllByTargetIgnoreCaseOrderByCreatedAtDesc(
        String target
    );

    Page<ResearchNote> findByTargetContainingIgnoreCaseOrNoteContainingIgnoreCase(
        String target,
        String note,
        Pageable pageable
    );
}
