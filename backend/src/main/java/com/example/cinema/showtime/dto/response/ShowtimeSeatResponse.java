package com.example.cinema.showtime.dto.response;

import com.example.cinema.showtime.enums.SeatType;
import com.example.cinema.showtime.enums.ShowtimeSeatStatus;
import lombok.Builder;

@Builder
public record ShowtimeSeatResponse(
        Long id,
        Long seatId,
        String rowName,
        Integer seatNumber,
        SeatType seatType,
        Long price,
        ShowtimeSeatStatus status
) {
}