package com.example.cinema.showtime.dto.request;

import com.example.cinema.showtime.enums.ShowtimeFormat;
import com.example.cinema.showtime.enums.TranslationType;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

public record ShowtimeRequest(
        @NotNull(message = "Movie ID is required")
        Long movieId,

        @NotNull(message = "Room ID is required")
        Long roomId,

        @NotNull(message = "Format is required (2D, 3D, IMAX)")
        ShowtimeFormat format,

        @NotNull(message = "Translation type is required (SUBTITLE, DUBBED)")
        TranslationType translationType,

        @NotNull(message = "Start time is required")
        @Future(message = "Start time must be in the future")
        LocalDateTime startTime,

        @NotNull(message = "Base price is required")
        @Min(value = 0, message = "Base price cannot be negative")
        Long basePrice
) {
}