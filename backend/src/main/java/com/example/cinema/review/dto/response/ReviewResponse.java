package com.example.cinema.review.dto.response;

import com.example.cinema.review.enums.ReviewStatus;
import lombok.Builder;

import java.time.LocalDateTime;

@Builder
public record ReviewResponse(
        Long id,
        Long userId,
        String userFullName,
        String userAvatarUrl,
        Long movieId,
        String movieTitle,
        Long bookingId,
        String bookingCode,
        Integer rating,
        String comment,
        ReviewStatus status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}