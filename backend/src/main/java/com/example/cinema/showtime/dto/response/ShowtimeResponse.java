package com.example.cinema.showtime.dto.response;

import com.example.cinema.movie.enums.MovieStatus;
import com.example.cinema.showtime.enums.SeatType;
import com.example.cinema.showtime.enums.ShowtimeFormat;
import com.example.cinema.showtime.enums.ShowtimeStatus;
import com.example.cinema.showtime.enums.TranslationType;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Builder
public record ShowtimeResponse(
        Long id,
        Long movieId,
        String movieTitle,
        MovieStatus movieStatus,
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
        LocalDateTime updatedAt,
        Map<SeatType, Long> seatTypePrices,
        List<String> priceTags
) {
    public ShowtimeResponse(
            Long id,
            Long movieId,
            String movieTitle,
            MovieStatus movieStatus,
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
        this(
                id, movieId, movieTitle, movieStatus, posterUrl, durationMinutes,
                roomId, roomName, cinemaId, cinemaName, format, translationType,
                startTime, endTime, cleaningEndTime, basePrice, status, createdAt, updatedAt, null, null
        );
    }
}