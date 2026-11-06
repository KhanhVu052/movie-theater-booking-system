package com.example.cinema.payment.dto.request;

import jakarta.validation.constraints.Size;

public record RefundConfirmRequest(
        @Size(max = 255, message = "Refund note must not exceed 255 characters")
        String note
) {
}

