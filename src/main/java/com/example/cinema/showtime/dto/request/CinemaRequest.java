package com.example.cinema.showtime.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CinemaRequest(
        @NotBlank(message = "Cinema name must not be blank")
        @Size(max = 150, message = "Cinema name must not exceed 150 characters")
        String name,

        @NotBlank(message = "Address must not be blank")
        @Size(max = 300, message = "Address must not exceed 300 characters")
        String address,

        @Size(max = 20, message = "Hotline must not exceed 20 characters")
        String hotline
) {
}