package com.example.cinema.showtime.repository;

import com.example.cinema.showtime.entity.ShowtimeSeat;
import com.example.cinema.showtime.enums.ShowtimeSeatStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ShowtimeSeatRepository extends JpaRepository<ShowtimeSeat, Long> {

    @EntityGraph(attributePaths = {"seat"})
    List<ShowtimeSeat> findByShowtimeIdOrderBySeatRowNameAscSeatSeatNumberAsc(Long showtimeId);

    boolean existsByShowtimeIdAndStatusIn(Long showtimeId, List<ShowtimeSeatStatus> statuses);

    void deleteByShowtimeId(Long showtimeId);
}