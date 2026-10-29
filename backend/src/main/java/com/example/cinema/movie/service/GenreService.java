package com.example.cinema.movie.service;

import com.example.cinema.common.exception.AppException;
import com.example.cinema.common.exception.ErrorCode;
import com.example.cinema.movie.dto.request.GenreRequest;
import com.example.cinema.movie.dto.response.GenreResponse;
import com.example.cinema.movie.entity.Genre;
import com.example.cinema.movie.mapper.GenreMapper;
import com.example.cinema.movie.repository.GenreRepository;
import com.example.cinema.movie.repository.MovieRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class GenreService {

    GenreRepository genreRepository;
    MovieRepository movieRepository;
    GenreMapper genreMapper;

    @Transactional
    public GenreResponse createGenre(GenreRequest request) {
        String normalizedName = request.name().trim();

        if (genreRepository.existsByNameIgnoreCase(normalizedName)) {
            throw new AppException(ErrorCode.GENRE_ALREADY_EXISTS);
        }

        Genre savedGenre = genreRepository.save(genreMapper.toEntity(request));
        return genreMapper.toResponse(savedGenre);
    }

    @Transactional(readOnly = true)
    public List<GenreResponse> getAllGenres() {
        return genreRepository.findAll(Sort.by(Sort.Direction.ASC, "name"))
                .stream()
                .map(genreMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public GenreResponse getGenreById(Long id) {
        return genreMapper.toResponse(findGenreByIdOrThrow(id));
    }

    @Transactional
    public GenreResponse updateGenre(Long id, GenreRequest request) {
        Genre genre = findGenreByIdOrThrow(id);
        String normalizedName = request.name().trim();

        if (genreRepository.existsByNameIgnoreCaseAndIdNot(normalizedName, id)) {
            throw new AppException(ErrorCode.GENRE_ALREADY_EXISTS);
        }

        genre.setName(normalizedName);
        return genreMapper.toResponse(genreRepository.save(genre));
    }

    @Transactional
    public void deleteGenre(Long id) {
        Genre genre = findGenreByIdOrThrow(id);

        if (movieRepository.existsByGenresId(id)) {
            throw new AppException(ErrorCode.GENRE_IN_USE);
        }

        genreRepository.delete(genre);
    }

    private Genre findGenreByIdOrThrow(Long id) {
        return genreRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.GENRE_NOT_FOUND));
    }
}