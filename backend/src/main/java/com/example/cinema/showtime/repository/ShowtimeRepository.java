package com.example.cinema.showtime.repository;

import com.example.cinema.showtime.entity.Showtime;
import com.example.cinema.showtime.enums.ShowtimeStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface ShowtimeRepository extends JpaRepository<Showtime, Long> {

    @Query("""
            SELECT COUNT(s) > 0 FROM Showtime s
            WHERE s.room.id = :roomId
              AND s.status = :status
              AND s.startTime < :newCleaningEndTime
              AND :newStartTime < s.cleaningEndTime
            """)
    boolean existsOverlappingShowtime(
            @Param("roomId") Long roomId,
            @Param("status") ShowtimeStatus status,
            @Param("newStartTime") LocalDateTime newStartTime,
            @Param("newCleaningEndTime") LocalDateTime newCleaningEndTime
    );

    @EntityGraph(attributePaths = {"movie", "room", "room.cinema"})
    Optional<Showtime> findDetailById(Long id);

    @EntityGraph(attributePaths = {"movie", "room", "room.cinema"})
    @Query("""
            SELECT s FROM Showtime s
            WHERE (:movieId IS NULL OR s.movie.id = :movieId)
              AND (:roomId IS NULL OR s.room.id = :roomId)
              AND (:status IS NULL OR s.status = :status)
              AND (:fromTime IS NULL OR s.startTime >= :fromTime)
              AND (:toTime IS NULL OR s.startTime <= :toTime)
            """)
    Page<Showtime> searchShowtimes(
            @Param("movieId") Long movieId,
            @Param("roomId") Long roomId,
            @Param("status") ShowtimeStatus status,
            @Param("fromTime") LocalDateTime fromTime,
            @Param("toTime") LocalDateTime toTime,
            Pageable pageable
    );
}