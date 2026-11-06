package com.example.cinema.showtime.repository;

import com.example.cinema.showtime.dto.projection.MovieCapacityProjection;
import com.example.cinema.showtime.dto.projection.SeatTypePriceProjection;
import com.example.cinema.showtime.entity.ShowtimeSeat;
import com.example.cinema.showtime.enums.ShowtimeSeatStatus;
import com.example.cinema.showtime.enums.ShowtimeStatus;
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

    @Query("SELECT ss.seat.type AS seatType, MIN(ss.price) AS price FROM ShowtimeSeat ss WHERE ss.showtime.id = :sid GROUP BY ss.seat.type")
    List<SeatTypePriceProjection> findPricesByType(@Param("sid") Long sid);

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


    @Query("SELECT DISTINCT ss.seat.rowName FROM ShowtimeSeat ss WHERE ss.showtime.id = :sid AND ss.id IN :ids")
    Set<String> findRowNamesByIds(@Param("sid") Long showtimeId, @Param("ids") Collection<Long> ids);

    @Query("SELECT ss.id FROM ShowtimeSeat ss WHERE ss.showtime.id = :sid AND ss.seat.rowName IN :rows ORDER BY ss.id ASC")
    List<Long> findIdsByShowtimeAndRows(@Param("sid") Long showtimeId, @Param("rows") Collection<String> rows);

    @org.springframework.data.jpa.repository.Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            UPDATE ShowtimeSeat ss
            SET ss.price = :price
            WHERE ss.id = :id
              AND ss.status = com.example.cinema.showtime.enums.ShowtimeSeatStatus.AVAILABLE
            """)
    int repriceIfAvailable(@Param("id") Long id, @Param("price") long price);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @QueryHints({@QueryHint(name = "jakarta.persistence.lock.timeout", value = "3000")})
    @Query("""
            SELECT ss FROM ShowtimeSeat ss
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

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @QueryHints({@QueryHint(name = "jakarta.persistence.lock.timeout", value = "3000")})
    @Query("SELECT ss FROM ShowtimeSeat ss WHERE ss.showtime.id = :id ORDER BY ss.id ASC")
    List<ShowtimeSeat> findByShowtimeIdForUpdate(@Param("id") Long id);

    boolean existsByShowtimeIdAndStatusIn(Long showtimeId, List<ShowtimeSeatStatus> statuses);

    @Query("""
            SELECT ss FROM ShowtimeSeat ss
            JOIN FETCH ss.showtime s
            WHERE ss.seat.id = :seatId
              AND ss.status = com.example.cinema.showtime.enums.ShowtimeSeatStatus.AVAILABLE
              AND s.status = com.example.cinema.showtime.enums.ShowtimeStatus.SCHEDULED
              AND s.startTime > :now
            """)
    List<ShowtimeSeat> findFutureAvailableBySeatId(@Param("seatId") Long seatId, @Param("now") LocalDateTime now);

    @Query("""
            SELECT COUNT(ss) > 0 FROM ShowtimeSeat ss
            JOIN ss.showtime s
            WHERE ss.seat.id = :seatId
              AND s.status = :showtimeStatus
              AND s.startTime > :now
              AND ss.status IN :statuses
            """)
    boolean existsBySeatIdAndShowtimeStatusAndShowtimeStartTimeAfterAndStatusIn(
            @Param("seatId") Long seatId,
            @Param("showtimeStatus") ShowtimeStatus showtimeStatus,
            @Param("now") LocalDateTime now,
            @Param("statuses") Collection<ShowtimeSeatStatus> statuses
    );

    @Query("""
            SELECT COUNT(ss) > 0 FROM ShowtimeSeat ss
            JOIN ss.showtime s
            WHERE ss.seat.id IN :seatIds
              AND s.status = :showtimeStatus
              AND s.startTime > :now
              AND ss.status IN :statuses
            """)
    boolean existsBySeatIdInAndShowtimeStatusAndShowtimeStartTimeAfterAndStatusIn(
            @Param("seatIds") Collection<Long> seatIds,
            @Param("showtimeStatus") ShowtimeStatus showtimeStatus,
            @Param("now") LocalDateTime now,
            @Param("statuses") Collection<ShowtimeSeatStatus> statuses
    );

    @Query("""
            SELECT 
                s.movie.id AS movieId,
                COUNT(ss.id) AS totalCapacity,
                COUNT(DISTINCT s.id) AS totalScreenings
            FROM ShowtimeSeat ss
            JOIN ss.showtime s
            WHERE s.status = com.example.cinema.showtime.enums.ShowtimeStatus.SCHEDULED
              AND s.startTime BETWEEN :startDate AND :endDate
            GROUP BY s.movie.id
            """)
    List<MovieCapacityProjection> countCapacityByMovie(
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );
}