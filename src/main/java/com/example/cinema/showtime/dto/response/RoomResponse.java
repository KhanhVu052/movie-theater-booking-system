package com.example.cinema.showtime.dto.response;

import lombok.Builder;

import java.time.LocalDateTime;

@Builder
public record RoomResponse(
        Long id,
        Long cinemaId,
        String cinemaName,
        String name,
        Integer totalRows,
        Integer totalColumns,
        Integer totalSeats,
        Boolean isActive,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}