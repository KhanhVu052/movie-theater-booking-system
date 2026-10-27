package com.example.cinema.review.dto.response;

import com.example.cinema.common.dto.PageResponse;
import lombok.Builder;

@Builder
public record MovieReviewSummaryResponse(
        Long movieId,
        Double averageRating,
        Long totalReviews,
        PageResponse<ReviewResponse> reviews
) {
}