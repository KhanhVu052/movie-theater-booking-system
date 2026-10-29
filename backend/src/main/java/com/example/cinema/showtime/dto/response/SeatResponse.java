package com.example.cinema.showtime.dto.response;

import com.example.cinema.showtime.enums.SeatType;
import lombok.Builder;

@Builder
public record SeatResponse(
        Long id,
        String rowName,
        Integer seatNumber,
        SeatType type,
        Boolean isActive
) {
}