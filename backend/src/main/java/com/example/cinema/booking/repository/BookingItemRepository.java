package com.example.cinema.booking.repository;

import com.example.cinema.booking.entity.BookingItem;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BookingItemRepository extends JpaRepository<BookingItem, Long> {

    @EntityGraph(attributePaths = {"showtimeSeat", "showtimeSeat.seat"})
    List<BookingItem> findByBookingIdOrderByIdAsc(Long bookingId);
}