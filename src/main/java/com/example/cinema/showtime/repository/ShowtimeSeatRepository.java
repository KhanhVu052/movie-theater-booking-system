package com.example.cinema.showtime.repository;

import com.example.cinema.showtime.entity.ShowtimeSeat;
import com.example.cinema.showtime.enums.ShowtimeSeatStatus;
import jakarta.persistence.LockModeType;
import jakarta.persistence.QueryHint;
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
import java.util.Set;

@Repository
public interface ShowtimeSeatRepository extends JpaRepository<ShowtimeSeat, Long> {

    @EntityGraph(attributePaths = {"seat"})
    List<ShowtimeSeat> findByShowtimeIdOrderBySeatRowNameAscSeatSeatNumberAsc(Long showtimeId);

    @Query("""
            SELECT ss.id FROM ShowtimeSeat ss
            JOIN com.example.cinema.booking.entity.Booking b ON ss.heldByBookingId = b.id
            WHERE ss.showtime.id = :showtimeId
              AND ss.status = com.example.cinema.showtime.enums.ShowtimeSeatStatus.HELD
              AND b.status = com.example.cinema.booking.enums.BookingStatus.PENDING_PAYMENT
              AND b.expiresAt < :now
            """)
    Set<Long> findExpiredHeldSeatIdsByShowtime(
            @Param("showtimeId") Long showtimeId,
            @Param("now") LocalDateTime now
    );


    @Query("""
            SELECT ss.id FROM ShowtimeSeat ss
            WHERE ss.heldByBookingId IN :bookingIds
            """)
    List<Long> findIdsByHeldByBookingIdIn(@Param("bookingIds") Collection<Long> bookingIds);


    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @QueryHints({@QueryHint(name = "jakarta.persistence.lock.timeout", value = "3000")})
    @Query("""
            SELECT ss FROM ShowtimeSeat ss
            JOIN FETCH ss.seat
            WHERE ss.id IN :seatIds
            ORDER BY ss.id ASC
            """)
    List<ShowtimeSeat> findByIdsForUpdateOrderByIdAsc(@Param("seatIds") Collection<Long> seatIds);


    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @QueryHints({@QueryHint(name = "jakarta.persistence.lock.timeout", value = "3000")})
    @Query("""
            SELECT ss FROM ShowtimeSeat ss
            WHERE ss.heldByBookingId = :bookingId
            ORDER BY ss.id ASC
            """)
    List<ShowtimeSeat> findByHeldByBookingIdForUpdate(@Param("bookingId") Long bookingId);

    boolean existsByShowtimeIdAndStatusIn(Long showtimeId, List<ShowtimeSeatStatus> statuses);

    void deleteByShowtimeId(Long showtimeId);
}