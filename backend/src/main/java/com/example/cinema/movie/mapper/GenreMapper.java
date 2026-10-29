package com.example.cinema.movie.mapper;

import com.example.cinema.movie.dto.request.GenreRequest;
import com.example.cinema.movie.dto.response.GenreResponse;
import com.example.cinema.movie.entity.Genre;
import org.springframework.stereotype.Component;

@Component
public class GenreMapper {

    public Genre toEntity(GenreRequest request) {
        return Genre.builder()
                .name(request.name().trim())
                .build();
    }

    public GenreResponse toResponse(Genre genre) {
        return GenreResponse.builder()
                .id(genre.getId())
                .name(genre.getName())
                .createdAt(genre.getCreatedAt())
                .build();
    }
}