package com.example.cinema.review.repository;

import com.example.cinema.booking.entity.Booking;
import com.example.cinema.review.entity.Review;
import com.example.cinema.review.enums.ReviewStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {

    boolean existsByUserIdAndMovieId(Long userId, Long movieId);

    @EntityGraph(attributePaths = {"user", "movie", "booking"})
    Optional<Review> findWithDetailsById(Long id);

    @EntityGraph(attributePaths = {"user", "movie", "booking"})
    Page<Review> findByMovieIdAndStatus(Long movieId, ReviewStatus status, Pageable pageable);

    @EntityGraph(attributePaths = {"user", "movie", "booking"})
    @Query("""
            SELECT r FROM Review r
            WHERE (:movieId IS NULL OR r.movie.id = :movieId)
              AND (:status IS NULL OR r.status = :status)
            """)
    Page<Review> searchReviewsForAdmin(
            @Param("movieId") Long movieId,
            @Param("status") ReviewStatus status,
            Pageable pageable
    );

    @Query("""
            SELECT COALESCE(AVG(r.rating), 0.0)
            FROM Review r
            WHERE r.movie.id = :movieId
              AND r.status = com.example.cinema.review.enums.ReviewStatus.VISIBLE
            """)
    Double calculateAverageRatingByMovieId(@Param("movieId") Long movieId);

    long countByMovieIdAndStatus(Long movieId, ReviewStatus status);

    @Query("""
            SELECT b FROM Booking b
            JOIN b.showtime s
            WHERE b.user.id = :userId
              AND s.movie.id = :movieId
              AND b.status = com.example.cinema.booking.enums.BookingStatus.CONFIRMED
              AND s.endTime < :now
            ORDER BY s.endTime DESC
            """)
    List<Booking> findEligibleBookingsForReview(
            @Param("userId") Long userId,
            @Param("movieId") Long movieId,
            @Param("now") LocalDateTime now
    );
}