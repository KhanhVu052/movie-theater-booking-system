package com.example.cinema.review.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ReviewRequest(
        @NotNull(message = "Movie ID is required")
        Long movieId,

        @NotNull(message = "Rating is required")
        @Min(value = 1, message = "Rating must be at least 1 star")
        @Max(value = 5, message = "Rating must not exceed 5 stars")
        Integer rating,

        @Size(max = 2000, message = "Comment must not exceed 2000 characters")
        String comment
) {
}