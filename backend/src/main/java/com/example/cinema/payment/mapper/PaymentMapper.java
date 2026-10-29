package com.example.cinema.payment.mapper;

import com.example.cinema.payment.dto.response.PaymentResponse;
import com.example.cinema.payment.entity.Payment;
import org.springframework.stereotype.Component;

@Component
public class PaymentMapper {

    public PaymentResponse toResponse(Payment payment) {
        return PaymentResponse.builder()
                .id(payment.getId())
                .bookingId(payment.getBooking().getId())
                .bookingCode(payment.getBooking().getBookingCode())
                .provider(payment.getProvider())
                .transactionRef(payment.getTransactionRef())
                .transactionNo(payment.getTransactionNo())
                .amount(payment.getAmount())
                .status(payment.getStatus())
                .refundStatus(payment.getRefundStatus())
                .responseCode(payment.getResponseCode())
                .transactionStatus(payment.getTransactionStatus())
                .payDate(payment.getPayDate())
                .createdAt(payment.getCreatedAt())
                .updatedAt(payment.getUpdatedAt())
                .build();
    }
}