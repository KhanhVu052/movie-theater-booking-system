package com.example.cinema.showtime.repository;

import com.example.cinema.showtime.entity.Seat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SeatRepository extends JpaRepository<Seat, Long> {

    List<Seat> findByRoomIdOrderByRowNameAscSeatNumberAsc(Long roomId);

    List<Seat> findByRoomIdAndIsActiveTrueOrderByRowNameAscSeatNumberAsc(Long roomId);

    List<Seat> findByIdInAndRoomId(List<Long> ids, Long roomId);
}