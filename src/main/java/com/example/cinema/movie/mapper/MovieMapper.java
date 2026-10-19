package com.example.cinema.movie.mapper;

import com.example.cinema.movie.dto.request.MovieRequest;
import com.example.cinema.movie.dto.response.MovieResponse;
import com.example.cinema.movie.entity.Actor;
import com.example.cinema.movie.entity.Genre;
import com.example.cinema.movie.entity.Movie;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Component;

import java.util.Set;

@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class MovieMapper {

    GenreMapper genreMapper;
    ActorMapper actorMapper;

    public Movie toEntity(MovieRequest request, Set<Genre> genres, Set<Actor> actors) {
        return Movie.builder()
                .title(request.title().trim())
                .description(request.description())
                .director(request.director() != null ? request.director().trim() : null)
                .durationMinutes(request.durationMinutes())
                .releaseDate(request.releaseDate())
                .ageRating(request.ageRating())
                .originalLanguage(request.originalLanguage().trim())
                .posterUrl(request.posterUrl())
                .trailerUrl(request.trailerUrl())
                .status(request.status())
                .genres(genres)
                .actors(actors)
                .build();
    }

    public void updateEntity(Movie movie, MovieRequest request, Set<Genre> genres, Set<Actor> actors) {
        movie.setTitle(request.title().trim());
        movie.setDescription(request.description());
        movie.setDirector(request.director() != null ? request.director().trim() : null);
        movie.setDurationMinutes(request.durationMinutes());
        movie.setReleaseDate(request.releaseDate());
        movie.setAgeRating(request.ageRating());
        movie.setOriginalLanguage(request.originalLanguage().trim());
        movie.setPosterUrl(request.posterUrl());
        movie.setTrailerUrl(request.trailerUrl());
        movie.setStatus(request.status());
        movie.setGenres(genres);
        movie.setActors(actors);
    }

    public MovieResponse toResponse(Movie movie) {
        return MovieResponse.builder()
                .id(movie.getId())
                .title(movie.getTitle())
                .description(movie.getDescription())
                .director(movie.getDirector())
                .durationMinutes(movie.getDurationMinutes())
                .releaseDate(movie.getReleaseDate())
                .ageRating(movie.getAgeRating())
                .originalLanguage(movie.getOriginalLanguage())
                .posterUrl(movie.getPosterUrl())
                .trailerUrl(movie.getTrailerUrl())
                .status(movie.getStatus())
                .genres(movie.getGenres().stream().map(genreMapper::toResponse).toList())
                .actors(movie.getActors().stream().map(actorMapper::toResponse).toList())
                .createdAt(movie.getCreatedAt())
                .updatedAt(movie.getUpdatedAt())
                .build();
    }
}