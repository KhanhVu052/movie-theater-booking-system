package com.example.cinema.movie.dto.response;

import lombok.Builder;

import java.time.LocalDateTime;

@Builder
public record GenreResponse(
        Long id,
        String name,
        LocalDateTime createdAt
) {
}