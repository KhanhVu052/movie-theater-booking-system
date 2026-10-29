package com.example.cinema.showtime.mapper;

import com.example.cinema.showtime.dto.response.SeatResponse;
import com.example.cinema.showtime.entity.Seat;
import org.springframework.stereotype.Component;

@Component
public class SeatMapper {

    public SeatResponse toResponse(Seat seat) {
        return SeatResponse.builder()
                .id(seat.getId())
                .rowName(seat.getRowName())
                .seatNumber(seat.getSeatNumber())
                .type(seat.getType())
                .isActive(seat.getIsActive())
                .build();
    }
}