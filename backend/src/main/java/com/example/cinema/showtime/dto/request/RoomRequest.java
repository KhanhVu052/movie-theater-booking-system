package com.example.cinema.showtime.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record RoomRequest(
        @NotNull(message = "Cinema ID is required")
        Long cinemaId,

        @NotBlank(message = "Room name must not be blank")
        @Size(max = 100, message = "Room name must not exceed 100 characters")
        String name,

        @NotNull(message = "Total rows is required")
        @Min(value = 1, message = "Room must have at least 1 row")
        @Max(value = 26, message = "Room can have at most 26 rows (A-Z)")
        Integer totalRows,

        @NotNull(message = "Total columns is required")
        @Min(value = 1, message = "Room must have at least 1 seat per row")
        @Max(value = 50, message = "Room can have at most 50 seats per row")
        Integer totalColumns
) {
}