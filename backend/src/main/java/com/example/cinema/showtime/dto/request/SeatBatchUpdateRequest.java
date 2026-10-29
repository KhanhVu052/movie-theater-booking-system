package com.example.cinema.showtime.dto.request;

import com.example.cinema.showtime.enums.SeatType;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record SeatBatchUpdateRequest(
        @NotEmpty(message = "Seat IDs list must not be empty")
        List<Long> seatIds,

        SeatType type,

        Boolean isActive
) {
}