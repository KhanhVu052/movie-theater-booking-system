package com.example.cinema.payment.dto.response;

import com.example.cinema.payment.enums.PaymentProvider;
import com.example.cinema.payment.enums.PaymentRefundStatus;
import com.example.cinema.payment.enums.PaymentStatus;
import lombok.Builder;

import java.time.LocalDateTime;

@Builder
public record CustomerPaymentResponse(
        Long id,
        Long bookingId,
        String bookingCode,
        PaymentProvider provider,
        String transactionRef,
        Long amount,
        PaymentStatus status,
        PaymentRefundStatus refundStatus,
        String responseCode,
        String transactionStatus,
        LocalDateTime payDate,
        LocalDateTime refundedAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}

