package com.example.cinema.payment.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record PaymentCreateRequest(
        @NotNull(message = "Booking ID is required")
        Long bookingId,

        @Size(max = 20, message = "Bank code must not exceed 20 characters")
        String bankCode
) {
}