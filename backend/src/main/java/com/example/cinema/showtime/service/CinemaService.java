package com.example.cinema.showtime.service;

import com.example.cinema.common.exception.AppException;
import com.example.cinema.common.exception.ErrorCode;
import com.example.cinema.showtime.dto.request.CinemaRequest;
import com.example.cinema.showtime.dto.response.CinemaResponse;
import com.example.cinema.showtime.entity.Cinema;
import com.example.cinema.showtime.mapper.CinemaMapper;
import com.example.cinema.showtime.repository.CinemaRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class CinemaService {

    CinemaRepository cinemaRepository;
    CinemaMapper cinemaMapper;

    @Transactional(readOnly = true)
    public List<CinemaResponse> getAllCinemas() {
        return cinemaRepository.findAll().stream()
                .map(cinemaMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public CinemaResponse getCinemaById(Long id) {
        return cinemaMapper.toResponse(findCinemaByIdOrThrow(id));
    }

    @Transactional
    public CinemaResponse updateCinema(Long id, CinemaRequest request) {
        Cinema cinema = findCinemaByIdOrThrow(id);
        cinemaMapper.updateEntity(cinema, request);
        return cinemaMapper.toResponse(cinemaRepository.save(cinema));
    }

    public Cinema findCinemaByIdOrThrow(Long id) {
        return cinemaRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.CINEMA_NOT_FOUND));
    }
}