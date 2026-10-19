
package com.sentinelops.backend;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.net.Inet6Address;
import java.net.InetAddress;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/research")
public class ResearchController {

    public record SaveNoteRequest(String target, String note) {}

    public record LookupResponse(
        String target, String type, String source,
        Map<String, Object> data
    ) {}

    private static final Pattern IPV4 = Pattern.compile(
        "^(?:\\d{1,3}\\.){3}\\d{1,3}$"
    );

    private static final Pattern DOMAIN = Pattern.compile(
        "^(?=.{1,253}$)(?:[a-zA-Z0-9]"
        + "(?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\\.)+"
        + "[a-zA-Z]{2,63}$"
    );

    private static final HttpClient HTTP = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(8))
        .followRedirects(HttpClient.Redirect.NORMAL)
        .build();

    private final ResearchNoteRepository notes;
    private final ObjectMapper objectMapper;

    public ResearchController(
        ResearchNoteRepository notes,
        ObjectMapper objectMapper
    ) {
        this.notes = notes;
        this.objectMapper = objectMapper;
    }

    @GetMapping("/lookup")
    public LookupResponse lookup(@RequestParam String target) {
        String value = normalizeTarget(target);
        boolean isIp = isValidIp(value);

        if (!isIp && !DOMAIN.matcher(value).matches()) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Enter a valid public IP address or domain name."
            );
        }

        String path = isIp ? "ip/" : "domain/";
        URI uri = URI.create("https://rdap.org/" + path + value);

        HttpRequest request = HttpRequest.newBuilder(uri)
            .timeout(Duration.ofSeconds(15))
            .header("Accept", "application/rdap+json, application/json")
            .header("User-Agent", "SentinelOps-AI-Research/1.0")
            .GET().build();

        try {
            HttpResponse<String> response = HTTP.send(
                request, HttpResponse.BodyHandlers.ofString()
            );

            if (response.statusCode() < 200 ||
                response.statusCode() >= 300) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "The RDAP provider returned HTTP "
                        + response.statusCode()
                );
            }

            Map<String, Object> data = objectMapper.readValue(
                response.body(),
                new TypeReference<Map<String, Object>>() {}
            );

            return new LookupResponse(
                value, isIp ? "IP address" : "Domain", "RDAP", data
            );

        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "The lookup was interrupted."
            );
        } catch (IOException | IllegalArgumentException ex) {
            throw new ResponseStatusException(
                HttpStatus.BAD_GATEWAY,
                "The RDAP lookup failed. Check network access and try again."
            );
        }
    }

    @GetMapping("/virustotal")
    public Map<String, Object> virusTotal(@RequestParam String target) {
        String value = normalizeTarget(target);
        validateTarget(value);

        String apiKey = System.getenv("VIRUSTOTAL_API_KEY");
        if (apiKey == null || apiKey.isBlank()) {
            throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "VirusTotal API key is not available to the backend. "
                    + "Start the backend from a terminal with the key loaded."
            );
        }

        boolean isIp = isValidIp(value);
        String encoded = URLEncoder.encode(value, StandardCharsets.UTF_8);
        String path = isIp ? "ip_addresses/" : "domains/";
        URI uri = URI.create(
            "https://www.virustotal.com/api/v3/" + path + encoded
        );

        HttpRequest request = HttpRequest.newBuilder(uri)
            .timeout(Duration.ofSeconds(20))
            .header("x-apikey", apiKey)
            .header("Accept", "application/json")
            .GET().build();

        try {
            HttpResponse<String> response = HTTP.send(
                request, HttpResponse.BodyHandlers.ofString()
            );

            if (response.statusCode() == 401 ||
                response.statusCode() == 403) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "VirusTotal rejected the API key or account access."
                );
            }

            if (response.statusCode() == 404) {
                throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "VirusTotal has no report for this target."
                );
            }

            if (response.statusCode() == 429) {
                throw new ResponseStatusException(
                    HttpStatus.TOO_MANY_REQUESTS,
                    "VirusTotal rate limit reached. Please try again later."
                );
            }

            if (response.statusCode() < 200 ||
                response.statusCode() >= 300) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "VirusTotal returned HTTP " + response.statusCode()
                );
            }

            Map<String, Object> data = objectMapper.readValue(
                response.body(),
                new TypeReference<Map<String, Object>>() {}
            );

            return Map.of(
                "target", value,
                "type", isIp ? "IP address" : "Domain",
                "source", "VirusTotal",
                "data", data
            );

        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "The VirusTotal lookup was interrupted."
            );
        } catch (IOException | IllegalArgumentException ex) {
            throw new ResponseStatusException(
                HttpStatus.BAD_GATEWAY,
                "VirusTotal lookup failed. Check network access and try again."
            );
        }
    }

    @GetMapping("/notes")
    public List<ResearchNote> getNotes(@RequestParam String target) {
        String value = normalizeTarget(target);
        validateTarget(value);
        return notes.findAllByTargetIgnoreCaseOrderByCreatedAtDesc(value);
    }

    @PostMapping("/notes")
    @ResponseStatus(HttpStatus.CREATED)
    public ResearchNote saveNote(@RequestBody SaveNoteRequest request) {
        if (request == null || request.target() == null ||
            request.note() == null || request.note().isBlank()) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "A target and non-empty note are required."
            );
        }

        String target = normalizeTarget(request.target());
        validateTarget(target);

        if (request.note().trim().length() > 10000) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Notes must be 10,000 characters or fewer."
            );
        }

        return notes.save(new ResearchNote(target, request.note().trim()));
    }

    private static String normalizeTarget(String target) {
        if (target == null || target.isBlank()) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "A target is required."
            );
        }
        return target.trim().toLowerCase();
    }

    private static void validateTarget(String target) {
        if (!isValidIp(target) && !DOMAIN.matcher(target).matches()) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Enter a valid IP address or domain."
            );
        }
    }

    private static boolean isValidIp(String value) {
        if (IPV4.matcher(value).matches()) {
            String[] parts = value.split("\\.");
            for (String part : parts) {
                try {
                    int number = Integer.parseInt(part);
                    if (number < 0 || number > 255) return false;
                } catch (NumberFormatException ex) {
                    return false;
                }
            }
            return true;
        }

        if (!value.contains(":")) return false;

        try {
            return InetAddress.getByName(value) instanceof Inet6Address;
        } catch (Exception ex) {
            return false;
        }
    }
}
