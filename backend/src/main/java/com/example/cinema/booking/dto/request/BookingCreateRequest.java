package com.example.cinema.booking.dto.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record BookingCreateRequest(
        @NotNull(message = "Showtime ID is required")
        Long showtimeId,

        @NotEmpty(message = "You must select at least 1 seat")
        @Size(min = 1, max = 8, message = "You can select between 1 and 8 seats per booking")
        List<Long> showtimeSeatIds,

        @Size(max = 50, message = "Voucher code must not exceed 50 characters")
        String voucherCode
) {
}