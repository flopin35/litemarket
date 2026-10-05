package com.litemarket.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.litemarket.common.ApiException;
import com.litemarket.config.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

/**
 * Talks to the Python AI service (ai-service/). The AI service is private: only this API calls it,
 * with a shared key, so AI provider keys never reach the browser.
 */
@Component
public class AiClient {

    private static final Logger log = LoggerFactory.getLogger(AiClient.class);

    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    private final ObjectMapper mapper;
    private final AppProperties props;

    public AiClient(ObjectMapper mapper, AppProperties props) {
        this.mapper = mapper;
        this.props = props;
    }

    private String base() {
        String b = props.ai().baseUrl();
        return b.endsWith("/") ? b.substring(0, b.length() - 1) : b;
    }

    public JsonNode post(String path, Object body) {
        try {
            HttpRequest req = HttpRequest.newBuilder(URI.create(base() + path))
                    .timeout(Duration.ofSeconds(Math.max(5, props.ai().timeoutSeconds())))
                    .header("Content-Type", "application/json")
                    .header("X-Internal-Key", props.ai().internalKey())
                    .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body), StandardCharsets.UTF_8))
                    .build();
            HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (res.statusCode() >= 200 && res.statusCode() < 300) {
                return mapper.readTree(res.body());
            }
            log.warn("AI service {} returned {}: {}", path, res.statusCode(), res.body());
            if (res.statusCode() == 400 || res.statusCode() == 422) {
                throw ApiException.badRequest("The AI assistant couldn't use that input. Try rewording it.");
            }
            throw ApiException.unavailable("The AI assistant is busy. Try again in a moment.");
        } catch (ApiException e) {
            throw e;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw ApiException.unavailable("The AI assistant took too long. Try again.");
        } catch (Exception e) {
            log.warn("AI service unreachable at {}: {}", base(), e.getMessage());
            throw ApiException.unavailable("The AI assistant is offline right now. Try again soon.");
        }
    }

    public boolean healthy() {
        try {
            HttpRequest req = HttpRequest.newBuilder(URI.create(base() + "/health"))
                    .timeout(Duration.ofSeconds(3)).GET().build();
            return http.send(req, HttpResponse.BodyHandlers.discarding()).statusCode() == 200;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        } catch (Exception e) {
            return false;
        }
    }
}
