package com.example.cinema.showtime.dto.response;

import lombok.Builder;

import java.time.LocalDateTime;

@Builder
public record CinemaResponse(
        Long id,
        String name,
        String address,
        String hotline,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}