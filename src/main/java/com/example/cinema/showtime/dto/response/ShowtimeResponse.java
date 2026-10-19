package com.example.cinema.showtime.dto.response;

import com.example.cinema.showtime.enums.ShowtimeFormat;
import com.example.cinema.showtime.enums.ShowtimeStatus;
import com.example.cinema.showtime.enums.TranslationType;
import lombok.Builder;

import java.time.LocalDateTime;

@Builder
public record ShowtimeResponse(
        Long id,
        Long movieId,
        String movieTitle,
        String posterUrl,
        Integer durationMinutes,
        Long roomId,
        String roomName,
        Long cinemaId,
        String cinemaName,
        ShowtimeFormat format,
        TranslationType translationType,
        LocalDateTime startTime,
        LocalDateTime endTime,
        LocalDateTime cleaningEndTime,
        Long basePrice,
        ShowtimeStatus status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}