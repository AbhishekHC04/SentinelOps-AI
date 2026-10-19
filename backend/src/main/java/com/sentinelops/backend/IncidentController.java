
package com.sentinelops.backend;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;

@RestController
@RequestMapping("/api/incidents")
public class IncidentController {

    public record CreateIncidentRequest(
        String title,
        String service,
        String severity
    ) {}

    public record UpdateStatusRequest(String status) {}

    private final IncidentRepository repository;
    private final AtomicInteger nextId = new AtomicInteger(1043);

    public IncidentController(IncidentRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<Incident> getAllIncidents() {
        return repository.findAll().stream()
            .sorted((a, b) -> b.getId().compareTo(a.getId()))
            .toList();
    }

    @GetMapping("/{id}")
    public Incident getIncident(@PathVariable String id) {
        return repository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Incident not found: " + id
            ));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Incident createIncident(
        @RequestBody CreateIncidentRequest request
    ) {
        if (request.title() == null || request.title().isBlank()) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Incident title is required"
            );
        }

        String service = request.service() == null
            || request.service().isBlank()
            ? "API Gateway" : request.service().trim();

        String severity = request.severity() == null
            || request.severity().isBlank()
            ? "Medium" : request.severity();

        if (!Set.of("Low", "Medium", "High", "Critical")
                .contains(severity)) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Severity must be Low, Medium, High, or Critical"
            );
        }

        String id;
        do {
            id = "INC-" + nextId.getAndIncrement();
        } while (repository.existsById(id));

        Incident incident = new Incident(
            id,
            request.title().trim(),
            service,
            severity,
            "Open",
            "Just now"
        );

        return repository.save(incident);
    }

    @PatchMapping("/{id}/status")
    public Incident updateStatus(
        @PathVariable String id,
        @RequestBody UpdateStatusRequest request
    ) {
        Incident existing = repository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Incident not found: " + id
            ));

        if (request.status() == null ||
            !Set.of("Open", "Investigating", "Resolved")
                .contains(request.status())) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Status must be Open, Investigating, or Resolved"
            );
        }

        existing.setStatus(request.status());
        return repository.save(existing);
    }
}

@Configuration
class IncidentSeedConfiguration {

    @Bean
    CommandLineRunner seedIncidents(IncidentRepository repository) {
        return args -> {
            if (repository.count() > 0) {
                return;
            }

            repository.saveAll(List.of(
                new Incident(
                    "INC-1042",
                    "High CPU utilization on production server",
                    "Compute Cluster",
                    "Critical",
                    "Open",
                    "2 min ago"
                ),
                new Incident(
                    "INC-1041",
                    "Elevated API response latency",
                    "API Gateway",
                    "High",
                    "Investigating",
                    "8 min ago"
                ),
                new Incident(
                    "INC-1040",
                    "Database connection pool nearing limit",
                    "MySQL Database",
                    "Medium",
                    "Investigating",
                    "15 min ago"
                ),
                new Incident(
                    "INC-1039",
                    "Unusual memory usage detected",
                    "Analytics Service",
                    "Medium",
                    "Resolved",
                    "32 min ago"
                ),
                new Incident(
                    "INC-1038",
                    "Intermittent health check failures",
                    "Auth Service",
                    "Low",
                    "Resolved",
                    "47 min ago"
                )
            ));
        };
    }
}
