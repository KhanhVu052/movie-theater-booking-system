package com.example.cinema.common.exception;

import com.example.cinema.common.dto.ApiResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.http.HttpInputMessage;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MissingServletRequestParameterException;

import static org.assertj.core.api.Assertions.assertThat;

public class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    @DisplayName("AF-16: DataIntegrityViolationException returns HTTP 409 with code 1005 (DATA_CONFLICT)")
    void testDataIntegrityViolation() {
        DataIntegrityViolationException ex = new DataIntegrityViolationException("Duplicate key violation");
        ResponseEntity<ApiResponse<Void>> response = handler.handleDataIntegrityViolation(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getCode()).isEqualTo(1005);
        assertThat(response.getBody().getMessage()).contains("Data integrity violation");
    }

    @Test
    @DisplayName("AF-16: HttpMessageNotReadableException returns HTTP 400 with code 1006 (MALFORMED_REQUEST)")
    void testHttpMessageNotReadable() {
        HttpMessageNotReadableException ex = new HttpMessageNotReadableException("Invalid JSON payload", (HttpInputMessage) null);
        ResponseEntity<ApiResponse<Void>> response = handler.handleHttpMessageNotReadable(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getCode()).isEqualTo(1006);
        assertThat(response.getBody().getMessage()).contains("Malformed request");
    }

    @Test
    @DisplayName("AF-16: MissingServletRequestParameterException returns HTTP 400 with code 1006 (MALFORMED_REQUEST)")
    void testMissingParameter() {
        MissingServletRequestParameterException ex = new MissingServletRequestParameterException("movieId", "Long");
        ResponseEntity<ApiResponse<Void>> response = handler.handleParamMismatchAndMissing(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getCode()).isEqualTo(1006);
    }

    @Test
    @DisplayName("AF-13 / AF-16: PessimisticLockingFailureException returns HTTP 409 with code 1004 (CONCURRENCY_LOCK_CONFLICT)")
    void testPessimisticLockingFailure() {
        PessimisticLockingFailureException ex = new PessimisticLockingFailureException("Lock wait timeout exceeded");
        ResponseEntity<ApiResponse<Void>> response = handler.handlePessimisticLockingFailure(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getCode()).isEqualTo(1004);
    }
}
