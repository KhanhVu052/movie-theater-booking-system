package com.example.cinema.movie.dto.response;

import lombok.Builder;

import java.time.LocalDateTime;

@Builder
public record ActorResponse(
        Long id,
        String name,
        String avatarUrl,
        LocalDateTime createdAt
) {
}