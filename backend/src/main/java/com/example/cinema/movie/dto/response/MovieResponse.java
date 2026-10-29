package com.example.cinema.movie.dto.response;

import com.example.cinema.movie.enums.AgeRating;
import com.example.cinema.movie.enums.MovieStatus;
import lombok.Builder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Builder
public record MovieResponse(
        Long id,
        String title,
        String description,
        String director,
        Integer durationMinutes,
        LocalDate releaseDate,
        AgeRating ageRating,
        String originalLanguage,
        String posterUrl,
        String trailerUrl,
        MovieStatus status,
        List<GenreResponse> genres,
        List<ActorResponse> actors,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}