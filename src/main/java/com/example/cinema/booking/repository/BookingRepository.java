package com.example.cinema.booking.repository;

import com.example.cinema.booking.entity.Booking;
import com.example.cinema.booking.enums.BookingStatus;
import jakarta.persistence.LockModeType;
import jakarta.persistence.QueryHint;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.QueryHints;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {


    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @QueryHints({@QueryHint(name = "jakarta.persistence.lock.timeout", value = "3000")})
    @Query("SELECT b FROM Booking b LEFT JOIN FETCH b.voucher WHERE b.id = :id")
    Optional<Booking> findByIdForUpdate(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @QueryHints({@QueryHint(name = "jakarta.persistence.lock.timeout", value = "3000")})
    @Query("SELECT b FROM Booking b LEFT JOIN FETCH b.voucher WHERE b.id IN :ids ORDER BY b.id ASC")
    List<Booking> findByIdsForUpdateOrderByIdAsc(@Param("ids") Collection<Long> ids);


    @Query("""
            SELECT DISTINCT b.id FROM Booking b
            JOIN com.example.cinema.showtime.entity.ShowtimeSeat ss ON ss.heldByBookingId = b.id
            WHERE ss.id IN :showtimeSeatIds
              AND ss.status = com.example.cinema.showtime.enums.ShowtimeSeatStatus.HELD
              AND b.status = com.example.cinema.booking.enums.BookingStatus.PENDING_PAYMENT
              AND b.expiresAt < :now
            ORDER BY b.id ASC
            """)
    List<Long> findExpiredBookingIdsHoldingSeats(
            @Param("showtimeSeatIds") Collection<Long> showtimeSeatIds,
            @Param("now") LocalDateTime now
    );


    @Query("""
            SELECT b.id FROM Booking b
            WHERE b.status = :status
              AND b.expiresAt < :now
            ORDER BY b.id ASC
            """)
    List<Long> findExpiredBookingIdsBatch(
            @Param("status") BookingStatus status,
            @Param("now") LocalDateTime now,
            Pageable pageable
    );

    @EntityGraph(attributePaths = {"showtime", "showtime.movie", "showtime.room", "showtime.room.cinema", "voucher", "user"})
    Optional<Booking> findDetailById(Long id);

    @EntityGraph(attributePaths = {"showtime", "showtime.movie", "showtime.room", "showtime.room.cinema", "voucher"})
    Page<Booking> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
}