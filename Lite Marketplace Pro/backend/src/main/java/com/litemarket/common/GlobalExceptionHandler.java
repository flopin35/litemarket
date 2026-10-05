package com.litemarket.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.util.LinkedHashMap;
import java.util.Map;

/** Every error leaves the API as {"error": CODE, "message": "...", "fields": {...}}. */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<Map<String, Object>> handleApi(ApiException e) {
        return ResponseEntity.status(e.status()).body(body(e.code(), e.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException e) {
        Map<String, String> fields = new LinkedHashMap<>();
        for (FieldError fe : e.getBindingResult().getFieldErrors()) {
            fields.putIfAbsent(fe.getField(), fe.getDefaultMessage() == null ? "is invalid" : fe.getDefaultMessage());
        }
        String first = fields.isEmpty() ? "Please check the form." :
                fields.entrySet().iterator().next().getKey() + " " + fields.entrySet().iterator().next().getValue();
        Map<String, Object> body = body("VALIDATION", first);
        body.put("fields", fields);
        return ResponseEntity.status(400).body(body);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> handleUnreadable(HttpMessageNotReadableException e) {
        return ResponseEntity.status(400).body(body("BAD_REQUEST", "The request body is not valid JSON."));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, Object>> handleTooBig(MaxUploadSizeExceededException e) {
        return ResponseEntity.status(413).body(body("TOO_LARGE", "That file is too big. The limit is 5 MB."));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleOther(Exception e) {
        // Spring's own web errors (404 no route, 405 wrong method, 415...) keep their status.
        if (e instanceof ErrorResponse er) {
            int status = er.getStatusCode().value();
            String code = status == 404 ? "NOT_FOUND" : status == 405 ? "METHOD_NOT_ALLOWED" : "BAD_REQUEST";
            return ResponseEntity.status(status).body(body(code, status == 404 ? "Not found." : e.getMessage()));
        }
        log.error("Unhandled error", e);
        return ResponseEntity.status(500).body(body("SERVER_ERROR", "Something went wrong on our side. Please try again."));
    }

    private static Map<String, Object> body(String code, String message) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("error", code);
        m.put("message", message == null ? "" : message);
        return m;
    }
}
