package com.example.cinema.review.controller;

import com.example.cinema.common.dto.ApiResponse;
import com.example.cinema.common.dto.PageResponse;
import com.example.cinema.review.dto.request.ReviewRequest;
import com.example.cinema.review.dto.response.MovieReviewSummaryResponse;
import com.example.cinema.review.dto.response.ReviewResponse;
import com.example.cinema.review.enums.ReviewStatus;
import com.example.cinema.review.service.ReviewService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/v1/reviews")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ReviewController {

    ReviewService reviewService;

    @PostMapping
    public ResponseEntity<ApiResponse<ReviewResponse>> createReview(
            Authentication authentication,
            @Valid @RequestBody ReviewRequest request
    ) {
        ReviewResponse response = reviewService.createReview(authentication.getName(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Review submitted successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ReviewResponse>> updateMyReview(
            Authentication authentication,
            @PathVariable Long id,
            @Valid @RequestBody ReviewRequest request
    ) {
        ReviewResponse response = reviewService.updateMyReview(authentication.getName(), id, request);
        return ResponseEntity.ok(ApiResponse.success("Review updated successfully", response));
    }

    @GetMapping("/movie/{movieId}")
    public ResponseEntity<ApiResponse<MovieReviewSummaryResponse>> getMovieReviews(
            @PathVariable Long movieId,
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "10") @Min(1) @Max(100) int size
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                reviewService.getMovieReviews(movieId, page, size)
        ));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<PageResponse<ReviewResponse>>> getAllReviewsForAdmin(
            @RequestParam(required = false) Long movieId,
            @RequestParam(required = false) ReviewStatus status,
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "10") @Min(1) @Max(100) int size
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                reviewService.getAllReviewsForAdmin(movieId, status, page, size)
        ));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ReviewResponse>> updateReviewStatusByAdmin(
            @PathVariable Long id,
            @RequestParam ReviewStatus status
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Review status updated successfully",
                reviewService.updateReviewStatusByAdmin(id, status)
        ));
    }

    @PatchMapping("/showtime/{showtimeId}/simulate-ended")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> simulateShowtimeEnded(@PathVariable Long showtimeId) {
        reviewService.simulateShowtimeEnded(showtimeId);
        return ResponseEntity.ok(ApiResponse.success("Showtime fast-forwarded to ended state for review testing", null));
    }
}