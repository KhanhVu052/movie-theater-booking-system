package com.example.cinema.review.mapper;

import com.example.cinema.auth.entity.User;
import com.example.cinema.booking.entity.Booking;
import com.example.cinema.movie.entity.Movie;
import com.example.cinema.review.dto.request.ReviewRequest;
import com.example.cinema.review.dto.response.ReviewResponse;
import com.example.cinema.review.entity.Review;
import com.example.cinema.review.enums.ReviewStatus;
import org.springframework.stereotype.Component;

@Component
public class ReviewMapper {

    public Review toEntity(ReviewRequest request, User user, Movie movie, Booking booking) {
        return Review.builder()
                .user(user)
                .movie(movie)
                .booking(booking)
                .rating(request.rating())
                .comment(request.comment() != null ? request.comment().trim() : null)
                .status(ReviewStatus.VISIBLE)
                .build();
    }

    public ReviewResponse toResponse(Review review) {
        return ReviewResponse.builder()
                .id(review.getId())
                .userId(review.getUser().getId())
                .userFullName(review.getUser().getFullName())
                .userAvatarUrl(review.getUser().getAvatarUrl())
                .movieId(review.getMovie().getId())
                .movieTitle(review.getMovie().getTitle())
                .bookingId(review.getBooking().getId())
                .bookingCode(review.getBooking().getBookingCode())
                .rating(review.getRating())
                .comment(review.getComment())
                .status(review.getStatus())
                .createdAt(review.getCreatedAt())
                .updatedAt(review.getUpdatedAt())
                .build();
    }
}