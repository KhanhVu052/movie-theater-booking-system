package com.example.cinema.payment.dto.response;

import lombok.Builder;

import java.time.LocalDateTime;

@Builder
public record PaymentUrlResponse(
        Long paymentId,
        Long bookingId,
        String bookingCode,
        String transactionRef,
        Long amount,
        Integer attemptNumber,
        Integer remainingAttempts,
        LocalDateTime bookingExpiresAt,
        String paymentUrl
) {
}