package com.example.cinema.review.dto.request;

import com.example.cinema.review.enums.ReviewStatus;

public record ReviewStatusUpdateRequest(
        ReviewStatus status,
        Boolean isActive
) {
    public ReviewStatus getEffectiveStatus() {
        if (status != null) return status;
        if (Boolean.FALSE.equals(isActive)) return ReviewStatus.HIDDEN;
        return ReviewStatus.VISIBLE;
    }
}

