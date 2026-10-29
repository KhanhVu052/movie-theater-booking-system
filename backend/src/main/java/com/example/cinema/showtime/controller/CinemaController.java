package com.example.cinema.showtime.controller;

import com.example.cinema.common.dto.ApiResponse;
import com.example.cinema.showtime.dto.request.CinemaRequest;
import com.example.cinema.showtime.dto.response.CinemaResponse;
import com.example.cinema.showtime.service.CinemaService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/cinemas")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class CinemaController {

    CinemaService cinemaService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<CinemaResponse>>> getAllCinemas() {
        return ResponseEntity.ok(ApiResponse.success(cinemaService.getAllCinemas()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CinemaResponse>> getCinemaById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(cinemaService.getCinemaById(id)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<CinemaResponse>> updateCinema(
            @PathVariable Long id,
            @Valid @RequestBody CinemaRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success("Cinema updated successfully", cinemaService.updateCinema(id, request)));
    }
}