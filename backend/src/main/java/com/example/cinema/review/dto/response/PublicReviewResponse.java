package com.example.cinema.review.dto.response;

import lombok.Builder;

import java.time.LocalDateTime;

@Builder
public record PublicReviewResponse(
        Long id,
        String userFullName,
        String userAvatarUrl,
        Long movieId,
        Integer rating,
        String comment,
        LocalDateTime createdAt
) {
}

