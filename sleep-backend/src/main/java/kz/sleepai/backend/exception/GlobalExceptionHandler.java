package kz.sleepai.backend.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationException(MethodArgumentNotValidException e) {
        String errors = e.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .collect(Collectors.joining(", "));
        return buildErrorResponse(HttpStatus.BAD_REQUEST, errors);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException e) {
        return buildErrorResponse(HttpStatus.BAD_REQUEST, e.getMessage());
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDenied(AccessDeniedException e) {
        return buildErrorResponse(HttpStatus.FORBIDDEN, "Access denied");
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<Map<String, Object>> handleBadCredentials(BadCredentialsException e) {
        return buildErrorResponse(HttpStatus.UNAUTHORIZED, "Invalid email or password");
    }

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<Map<String, Object>> handleDataAccess(DataAccessException e) {
        log.error("Database error", e);
        return buildErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR, "Database error");
    }

    /**
     * Service layer throws RuntimeException for expected client-side errors
     * ("User not found", "Access denied for this entry", etc.). Treat them as 400
     * and forward the message — but log at warn so we notice patterns.
     * Real bugs (NPE etc.) bypass this via the Exception handler below.
     */
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, Object>> handleRuntimeException(RuntimeException e) {
        // NPE and other JDK bugs should NOT leak as 400 with internal messages.
        if (e instanceof NullPointerException
                || e instanceof IndexOutOfBoundsException
                || e instanceof ClassCastException
                || e instanceof ArithmeticException) {
            log.error("Unexpected runtime error", e);
            return buildErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error");
        }
        log.warn("Service-level error: {}", e.getMessage());
        return buildErrorResponse(HttpStatus.BAD_REQUEST, e.getMessage());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGenericException(Exception e) {
        log.error("Unhandled exception", e);
        return buildErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error");
    }

    private ResponseEntity<Map<String, Object>> buildErrorResponse(HttpStatus status, String message) {
        Map<String, Object> error = new HashMap<>();
        error.put("timestamp", LocalDateTime.now());
        error.put("status", status.value());
        error.put("error", status.getReasonPhrase());
        error.put("message", message);
        return ResponseEntity.status(status).body(error);
    }
}
