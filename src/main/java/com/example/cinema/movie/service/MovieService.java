package com.example.cinema.movie.service;

import com.example.cinema.common.dto.PageResponse;
import com.example.cinema.common.exception.AppException;
import com.example.cinema.common.exception.ErrorCode;
import com.example.cinema.movie.dto.request.MovieRequest;
import com.example.cinema.movie.dto.response.MovieResponse;
import com.example.cinema.movie.entity.Actor;
import com.example.cinema.movie.entity.Genre;
import com.example.cinema.movie.entity.Movie;
import com.example.cinema.movie.enums.MovieStatus;
import com.example.cinema.movie.mapper.MovieMapper;
import com.example.cinema.movie.repository.ActorRepository;
import com.example.cinema.movie.repository.GenreRepository;
import com.example.cinema.movie.repository.MovieRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class MovieService {

    MovieRepository movieRepository;
    GenreRepository genreRepository;
    ActorRepository actorRepository;
    MovieMapper movieMapper;

    @Transactional
    public MovieResponse createMovie(MovieRequest request) {
        Set<Genre> genres = resolveGenres(request.genreIds());
        Set<Actor> actors = resolveActors(request.actorIds());

        Movie movie = movieMapper.toEntity(request, genres, actors);
        return movieMapper.toResponse(movieRepository.save(movie));
    }

    @Transactional(readOnly = true)
    public PageResponse<MovieResponse> getMovies(
            String keyword,
            MovieStatus status,
            Long genreId,
            int page,
            int size
    ) {
        String normalizedKeyword = (keyword == null || keyword.isBlank()) ? null : keyword.trim();
        
        Pageable pageable = PageRequest.of(
                page - 1,
                size,
                Sort.by(Sort.Direction.DESC, "releaseDate", "id")
        );

        Page<Movie> moviePage = movieRepository.searchMovies(normalizedKeyword, status, genreId, pageable);
        return PageResponse.from(moviePage.map(movieMapper::toResponse));
    }

    @Transactional(readOnly = true)
    public MovieResponse getMovieById(Long id) {
        return movieMapper.toResponse(findMovieByIdOrThrow(id));
    }

    @Transactional
    public MovieResponse updateMovie(Long id, MovieRequest request) {
        Movie movie = findMovieByIdOrThrow(id);
        Set<Genre> genres = resolveGenres(request.genreIds());
        Set<Actor> actors = resolveActors(request.actorIds());

        movieMapper.updateEntity(movie, request, genres, actors);
        return movieMapper.toResponse(movieRepository.save(movie));
    }


    @Transactional
    public void discontinueMovie(Long id) {
        Movie movie = findMovieByIdOrThrow(id);
        movie.setStatus(MovieStatus.ENDED);
        movieRepository.save(movie);
    }

    private Movie findMovieByIdOrThrow(Long id) {
        return movieRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.MOVIE_NOT_FOUND));
    }

    private Set<Genre> resolveGenres(Set<Long> genreIds) {
        List<Genre> foundGenres = genreRepository.findAllById(genreIds);
        if (foundGenres.size() != genreIds.size()) {
            throw new AppException(ErrorCode.GENRE_NOT_FOUND);
        }
        return new LinkedHashSet<>(foundGenres);
    }

    private Set<Actor> resolveActors(Set<Long> actorIds) {
        if (actorIds == null || actorIds.isEmpty()) {
            return new LinkedHashSet<>();
        }
        List<Actor> foundActors = actorRepository.findAllById(actorIds);
        if (foundActors.size() != actorIds.size()) {
            throw new AppException(ErrorCode.ACTOR_NOT_FOUND);
        }
        return new LinkedHashSet<>(foundActors);
    }
}