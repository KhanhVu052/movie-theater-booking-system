package com.example.cinema.booking.dto.response;

import com.example.cinema.booking.enums.BookingStatus;
import com.example.cinema.showtime.enums.ShowtimeStatus;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.List;

@Builder
public record BookingResponse(
        Long id,
        String bookingCode,
        Long userId,
        String userEmail,
        Long showtimeId,
        ShowtimeStatus showtimeStatus,
        Long movieId,
        String movieTitle,
        String roomName,
        String cinemaName,
        LocalDateTime startTime,
        LocalDateTime endTime,
        String voucherCode,
        Long subtotalAmount,
        Long discountAmount,
        Long finalAmount,
        BookingStatus status,
        LocalDateTime expiresAt,
        Long secondsRemaining,
        LocalDateTime createdAt,
        List<BookingItemResponse> items
) {
}
