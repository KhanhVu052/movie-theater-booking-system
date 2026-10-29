package com.example.cinema.movie.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record GenreRequest(
        @NotBlank(message = "Genre name must not be blank")
        @Size(max = 100, message = "Genre name must not exceed 100 characters")
        String name
) {
}