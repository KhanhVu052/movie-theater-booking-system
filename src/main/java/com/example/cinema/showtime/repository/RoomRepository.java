package com.example.cinema.showtime.repository;

import com.example.cinema.showtime.entity.Room;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RoomRepository extends JpaRepository<Room, Long> {

    boolean existsByCinemaIdAndNameIgnoreCase(Long cinemaId, String name);

    boolean existsByCinemaIdAndNameIgnoreCaseAndIdNot(Long cinemaId, String name, Long id);

    @EntityGraph(attributePaths = {"cinema"})
    List<Room> findByCinemaIdOrderByNameAsc(Long cinemaId);

    @EntityGraph(attributePaths = {"cinema"})
    Optional<Room> findWithCinemaById(Long id);


    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM Room r JOIN FETCH r.cinema WHERE r.id = :id")
    Optional<Room> findByIdForUpdate(@Param("id") Long id);
}