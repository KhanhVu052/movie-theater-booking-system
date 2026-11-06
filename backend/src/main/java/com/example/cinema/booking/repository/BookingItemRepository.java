package com.example.cinema.booking.repository;

import com.example.cinema.booking.dto.projection.MovieTicketSalesProjection;
import com.example.cinema.booking.entity.BookingItem;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@Repository
public interface BookingItemRepository extends JpaRepository<BookingItem, Long> {

    @EntityGraph(attributePaths = {"showtimeSeat", "showtimeSeat.seat"})
    List<BookingItem> findByBookingId(Long bookingId);

    @EntityGraph(attributePaths = {"showtimeSeat", "showtimeSeat.seat"})
    List<BookingItem> findByBookingIdOrderByIdAsc(Long bookingId);

    @EntityGraph(attributePaths = {"showtimeSeat", "showtimeSeat.seat"})
    List<BookingItem> findByBookingIdInOrderByIdAsc(Collection<Long> bookingIds);

    @Query("""
            SELECT 
                s.movie.id AS movieId,
                COUNT(bi.id) AS ticketsSold
            FROM BookingItem bi
            JOIN bi.booking b
            JOIN b.showtime s
            WHERE b.status = com.example.cinema.booking.enums.BookingStatus.CONFIRMED
              AND EXISTS (
                  SELECT 1 FROM com.example.cinema.payment.entity.Payment p
                  WHERE p.booking = b
                    AND p.status = com.example.cinema.payment.enums.PaymentStatus.SUCCESS
                    AND p.refundStatus = com.example.cinema.payment.enums.PaymentRefundStatus.NONE
                    AND p.payDate BETWEEN :startDate AND :endDate
              )
            GROUP BY s.movie.id
            """)
    List<MovieTicketSalesProjection> countTicketsSoldByMovie(
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );

    @Query("""
            SELECT COUNT(bi.id)
            FROM BookingItem bi
            JOIN bi.booking b
            WHERE b.status = com.example.cinema.booking.enums.BookingStatus.CONFIRMED
              AND EXISTS (
                  SELECT 1 FROM com.example.cinema.payment.entity.Payment p
                  WHERE p.booking = b
                    AND p.status = com.example.cinema.payment.enums.PaymentStatus.SUCCESS
                    AND p.refundStatus = com.example.cinema.payment.enums.PaymentRefundStatus.NONE
                    AND p.payDate BETWEEN :startDate AND :endDate
              )
            """)
    Long countTotalTicketsSold(
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );

    @Query("""
            SELECT s.movie.id AS movieId, COUNT(bi.id) AS ticketsSold
            FROM BookingItem bi JOIN bi.booking b JOIN b.showtime s
            WHERE b.status = com.example.cinema.booking.enums.BookingStatus.CONFIRMED
              AND s.status = com.example.cinema.showtime.enums.ShowtimeStatus.SCHEDULED
              AND s.startTime BETWEEN :startDate AND :endDate
            GROUP BY s.movie.id
            """)
    List<MovieTicketSalesProjection> countTicketsByShowtimeWindow(
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );
}
