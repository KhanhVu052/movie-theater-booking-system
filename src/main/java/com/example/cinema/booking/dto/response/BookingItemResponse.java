package com.example.cinema.booking.dto.response;

import com.example.cinema.showtime.enums.SeatType;
import lombok.Builder;

@Builder
public record BookingItemResponse(
        Long id,
        Long showtimeSeatId,
        String rowName,
        Integer seatNumber,
        SeatType seatType,
        Long price
) {
}