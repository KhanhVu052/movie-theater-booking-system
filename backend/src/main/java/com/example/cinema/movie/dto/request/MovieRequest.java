package com.example.cinema.movie.dto.request;

import com.example.cinema.movie.enums.AgeRating;
import com.example.cinema.movie.enums.MovieStatus;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.Set;

public record MovieRequest(
        @NotBlank(message = "Movie title must not be blank")
        @Size(max = 255, message = "Title must not exceed 255 characters")
        String title,

        String description,

        @Size(max = 150, message = "Director name must not exceed 150 characters")
        String director,

        @NotNull(message = "Duration minutes is required")
        @Min(value = 1, message = "Duration must be greater than 0 minutes")
        Integer durationMinutes,

        @NotNull(message = "Release date is required")
        LocalDate releaseDate,

        @NotNull(message = "Age rating is required")
        AgeRating ageRating,

        @NotBlank(message = "Original language must not be blank")
        @Size(max = 50, message = "Original language must not exceed 50 characters")
        String originalLanguage,

        @Size(max = 500, message = "Poster URL must not exceed 500 characters")
        String posterUrl,

        @Size(max = 500, message = "Trailer URL must not exceed 500 characters")
        String trailerUrl,

        @NotNull(message = "Movie status is required")
        MovieStatus status,

        @NotEmpty(message = "Movie must belong to at least one genre")
        Set<Long> genreIds,

        Set<Long> actorIds
) {
}