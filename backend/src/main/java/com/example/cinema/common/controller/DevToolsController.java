package com.example.cinema.common.controller;

import com.example.cinema.common.component.DeadlockRetryExecutor;
import com.example.cinema.common.dto.ApiResponse;
import com.example.cinema.payment.dto.request.PaymentCreateRequest;
import com.example.cinema.payment.dto.response.PaymentResponse;
import com.example.cinema.payment.service.PaymentService;
import com.example.cinema.review.service.ReviewService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@ConditionalOnProperty(name = "app.dev-tools.enabled", havingValue = "true")
public class DevToolsController {

    PaymentService paymentService;
    ReviewService reviewService;
    DeadlockRetryExecutor deadlockRetryExecutor;

    @PostMapping("/payments/simulate-success")
    public ResponseEntity<ApiResponse<PaymentResponse>> simulatePaymentSuccess(
            Authentication authentication,
            @Valid @RequestBody PaymentCreateRequest request
    ) {
        PaymentResponse response = deadlockRetryExecutor.executeWithRetry(
                "SimulatePayment-" + request.bookingId(),
                () -> paymentService.simulatePaymentSuccess(authentication.getName(), request.bookingId())
        );
        return ResponseEntity.ok(ApiResponse.success("Test payment simulated successfully", response));
    }

    @PatchMapping("/reviews/showtime/{showtimeId}/simulate-ended")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> simulateShowtimeEnded(@PathVariable Long showtimeId) {
        reviewService.simulateShowtimeEnded(showtimeId);
        return ResponseEntity.ok(ApiResponse.success("Showtime end time simulated successfully for testing", null));
    }
}

