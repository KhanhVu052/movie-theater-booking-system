package com.example.cinema.review.service;

import com.example.cinema.auth.entity.User;
import com.example.cinema.auth.repository.UserRepository;
import com.example.cinema.booking.entity.Booking;
import com.example.cinema.common.dto.PageResponse;
import com.example.cinema.common.exception.AppException;
import com.example.cinema.common.exception.ErrorCode;
import com.example.cinema.movie.entity.Movie;
import com.example.cinema.movie.repository.MovieRepository;
import com.example.cinema.review.dto.request.ReviewRequest;
import com.example.cinema.review.dto.response.MovieReviewSummaryResponse;
import com.example.cinema.review.dto.response.ReviewResponse;
import com.example.cinema.review.entity.Review;
import com.example.cinema.review.enums.ReviewStatus;
import com.example.cinema.review.mapper.ReviewMapper;
import com.example.cinema.review.repository.ReviewRepository;
import com.example.cinema.showtime.entity.Showtime;
import com.example.cinema.showtime.repository.ShowtimeRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ReviewService {

    ReviewRepository reviewRepository;
    MovieRepository movieRepository;
    UserRepository userRepository;
    ShowtimeRepository showtimeRepository;
    ReviewMapper reviewMapper;

    @Transactional
    public ReviewResponse createReview(String userEmail, ReviewRequest request) {
        User currentUser = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        Movie movie = movieRepository.findById(request.movieId())
                .orElseThrow(() -> new AppException(ErrorCode.MOVIE_NOT_FOUND));

        if (reviewRepository.existsByUserIdAndMovieId(currentUser.getId(), movie.getId())) {
            throw new AppException(ErrorCode.REVIEW_ALREADY_EXISTS);
        }

        List<Booking> eligibleBookings = reviewRepository.findEligibleBookingsForReview(
                currentUser.getId(),
                movie.getId(),
                LocalDateTime.now()
        );

        if (eligibleBookings.isEmpty()) {
            throw new AppException(ErrorCode.REVIEW_NOT_ELIGIBLE);
        }

        Booking verifiedBooking = eligibleBookings.get(0);
        Review review = reviewMapper.toEntity(request, currentUser, movie, verifiedBooking);
        return reviewMapper.toResponse(reviewRepository.save(review));
    }

    @Transactional
    public ReviewResponse updateMyReview(String userEmail, Long reviewId, ReviewRequest request) {
        User currentUser = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        Review review = reviewRepository.findWithDetailsById(reviewId)
                .orElseThrow(() -> new AppException(ErrorCode.REVIEW_NOT_FOUND));

        if (!review.getUser().getId().equals(currentUser.getId())) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        if (review.getStatus() == ReviewStatus.HIDDEN) {
            throw new AppException(ErrorCode.REVIEW_HIDDEN_CANNOT_EDIT);
        }

        review.setRating(request.rating());
        review.setComment(request.comment() != null ? request.comment().trim() : null);
        return reviewMapper.toResponse(reviewRepository.save(review));
    }

    @Transactional(readOnly = true)
    public MovieReviewSummaryResponse getMovieReviews(Long movieId, int page, int size) {
        if (!movieRepository.existsById(movieId)) {
            throw new AppException(ErrorCode.MOVIE_NOT_FOUND);
        }

        Pageable pageable = PageRequest.of(page - 1, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Review> reviewPage = reviewRepository.findByMovieIdAndStatus(movieId, ReviewStatus.VISIBLE, pageable);

        Double avgRating = reviewRepository.calculateAverageRatingByMovieId(movieId);
        double roundedAvg = avgRating != null ? Math.round(avgRating * 10.0) / 10.0 : 0.0;
        long totalVisible = reviewRepository.countByMovieIdAndStatus(movieId, ReviewStatus.VISIBLE);

        return MovieReviewSummaryResponse.builder()
                .movieId(movieId)
                .averageRating(roundedAvg)
                .totalReviews(totalVisible)
                .reviews(PageResponse.from(reviewPage.map(reviewMapper::toResponse)))
                .build();
    }

    @Transactional(readOnly = true)
    public PageResponse<ReviewResponse> getAllReviewsForAdmin(
            Long movieId,
            ReviewStatus status,
            int page,
            int size
    ) {
        Pageable pageable = PageRequest.of(page - 1, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Review> reviewPage = reviewRepository.searchReviewsForAdmin(movieId, status, pageable);
        return PageResponse.from(reviewPage.map(reviewMapper::toResponse));
    }

    @Transactional
    public ReviewResponse updateReviewStatusByAdmin(Long reviewId, ReviewStatus status) {
        Review review = reviewRepository.findWithDetailsById(reviewId)
                .orElseThrow(() -> new AppException(ErrorCode.REVIEW_NOT_FOUND));

        review.setStatus(status);
        return reviewMapper.toResponse(reviewRepository.save(review));
    }

    @Transactional
    public void simulateShowtimeEnded(Long showtimeId) {
        Showtime showtime = showtimeRepository.findById(showtimeId)
                .orElseThrow(() -> new AppException(ErrorCode.SHOWTIME_NOT_FOUND));

        LocalDateTime now = LocalDateTime.now();
        showtime.setStartTime(now.minusHours(3));
        showtime.setEndTime(now.minusMinutes(30));
        showtime.setCleaningEndTime(now.minusMinutes(15));
        showtimeRepository.save(showtime);
    }
}