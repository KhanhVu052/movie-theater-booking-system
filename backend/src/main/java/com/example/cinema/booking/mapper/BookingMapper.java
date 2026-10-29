package com.example.cinema.booking.mapper;

import com.example.cinema.booking.dto.response.BookingItemResponse;
import com.example.cinema.booking.dto.response.BookingResponse;
import com.example.cinema.booking.entity.Booking;
import com.example.cinema.booking.entity.BookingItem;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class BookingMapper {

    public BookingItemResponse toItemResponse(BookingItem item) {
        return BookingItemResponse.builder()
                .id(item.getId())
                .showtimeSeatId(item.getShowtimeSeat().getId())
                .rowName(item.getShowtimeSeat().getSeat().getRowName())
                .seatNumber(item.getShowtimeSeat().getSeat().getSeatNumber())
                .seatType(item.getShowtimeSeat().getSeat().getType())
                .price(item.getPrice())
                .build();
    }

    public BookingResponse toResponse(Booking booking, List<BookingItem> items) {
        return BookingResponse.builder()
                .id(booking.getId())
                .bookingCode(booking.getBookingCode())
                .userId(booking.getUser().getId())
                .userEmail(booking.getUser().getEmail())
                .showtimeId(booking.getShowtime().getId())
                .movieTitle(booking.getShowtime().getMovie().getTitle())
                .roomName(booking.getShowtime().getRoom().getName())
                .cinemaName(booking.getShowtime().getRoom().getCinema().getName())
                .startTime(booking.getShowtime().getStartTime())
                .voucherCode(booking.getVoucher() != null ? booking.getVoucher().getCode() : null)
                .subtotalAmount(booking.getSubtotalAmount())
                .discountAmount(booking.getDiscountAmount())
                .finalAmount(booking.getFinalAmount())
                .status(booking.getStatus())
                .expiresAt(booking.getExpiresAt())
                .createdAt(booking.getCreatedAt())
                .items(items.stream().map(this::toItemResponse).toList())
                .build();
    }
}