package com.example.cinema.payment.dto.response;

import com.example.cinema.booking.enums.BookingStatus;
import com.example.cinema.payment.enums.PaymentRefundStatus;
import com.example.cinema.payment.enums.PaymentStatus;
import lombok.Builder;

@Builder
public record VnPayReturnResponse(
        boolean signatureValid,
        boolean gatewaySuccess,
        String transactionRef,
        String transactionNo,
        String responseCode,
        String transactionStatus,
        Long amount,
        Long bookingId,
        String bookingCode,
        BookingStatus bookingStatus,
        PaymentStatus paymentStatus,
        PaymentRefundStatus refundStatus,
        String message
) {
}