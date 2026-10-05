package com.litemarket.payment.gateway;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/** Tiny HTTP + JSON helper on top of java.net.http. Tests override {@link #send}. */
public class HttpJson {

    public record Response(int status, JsonNode json, String body) {
        public boolean ok() {
            return status >= 200 && status < 300;
        }
    }

    private final HttpClient client;
    private final ObjectMapper mapper;

    public HttpJson(ObjectMapper mapper) {
        this.mapper = mapper;
        this.client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .followRedirects(HttpClient.Redirect.NEVER)
                .build();
    }

    public ObjectMapper mapper() {
        return mapper;
    }

    public Response postJson(String url, Map<String, String> headers, Object body) {
        try {
            HttpRequest.Builder b = HttpRequest.newBuilder(URI.create(url))
                    .timeout(Duration.ofSeconds(30))
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)));
            headers.forEach(b::header);
            return send(b.build());
        } catch (GatewayException e) {
            throw e;
        } catch (Exception e) {
            throw new GatewayException("Could not build request: " + e.getMessage(), e);
        }
    }

    /** application/x-www-form-urlencoded POST (Stripe). Keys keep their order. */
    public Response postForm(String url, Map<String, String> headers, List<String[]> form) {
        String encoded = form.stream()
                .map(kv -> enc(kv[0]) + "=" + enc(kv[1]))
                .collect(Collectors.joining("&"));
        HttpRequest.Builder b = HttpRequest.newBuilder(URI.create(url))
                .timeout(Duration.ofSeconds(30))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .header("Accept", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(encoded));
        headers.forEach(b::header);
        return send(b.build());
    }

    public Response get(String url, Map<String, String> headers) {
        HttpRequest.Builder b = HttpRequest.newBuilder(URI.create(url))
                .timeout(Duration.ofSeconds(30))
                .header("Accept", "application/json")
                .GET();
        headers.forEach(b::header);
        return send(b.build());
    }

    /** Sends the request. Overridden in tests to return canned provider responses. */
    protected Response send(HttpRequest request) {
        try {
            HttpResponse<String> res = client.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            return new Response(res.statusCode(), parse(res.body()), res.body());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new GatewayException("Request interrupted", e);
        } catch (Exception e) {
            throw new GatewayException("Could not reach the payment provider: " + e.getMessage(), e);
        }
    }

    public JsonNode parse(String body) {
        try {
            if (body == null || body.isBlank()) return mapper.createObjectNode();
            JsonNode n = mapper.readTree(body);
            return n == null ? mapper.createObjectNode() : n;
        } catch (Exception e) {
            return mapper.createObjectNode();
        }
    }

    public static String enc(String s) {
        return URLEncoder.encode(s == null ? "" : s, StandardCharsets.UTF_8);
    }
}
