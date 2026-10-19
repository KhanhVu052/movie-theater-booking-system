package com.example.cinema.showtime.mapper;

import com.example.cinema.showtime.dto.request.CinemaRequest;
import com.example.cinema.showtime.dto.response.CinemaResponse;
import com.example.cinema.showtime.entity.Cinema;
import org.springframework.stereotype.Component;

@Component
public class CinemaMapper {

    public Cinema toEntity(CinemaRequest request) {
        return Cinema.builder()
                .name(request.name().trim())
                .address(request.address().trim())
                .hotline(request.hotline() != null ? request.hotline().trim() : null)
                .build();
    }

    public void updateEntity(Cinema cinema, CinemaRequest request) {
        cinema.setName(request.name().trim());
        cinema.setAddress(request.address().trim());
        cinema.setHotline(request.hotline() != null ? request.hotline().trim() : null);
    }

    public CinemaResponse toResponse(Cinema cinema) {
        return CinemaResponse.builder()
                .id(cinema.getId())
                .name(cinema.getName())
                .address(cinema.getAddress())
                .hotline(cinema.getHotline())
                .createdAt(cinema.getCreatedAt())
                .updatedAt(cinema.getUpdatedAt())
                .build();
    }
}