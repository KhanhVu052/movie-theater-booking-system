package com.example.cinema.showtime.dto.projection;

import com.example.cinema.showtime.enums.SeatType;

public interface SeatTypePriceProjection {
    SeatType getSeatType();
    Long getPrice();
}

