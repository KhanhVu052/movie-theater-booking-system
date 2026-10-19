package com.example.cinema.showtime.controller;

import com.example.cinema.common.dto.ApiResponse;
import com.example.cinema.common.dto.PageResponse;
import com.example.cinema.showtime.dto.request.ShowtimeRequest;
import com.example.cinema.showtime.dto.response.ShowtimeResponse;
import com.example.cinema.showtime.dto.response.ShowtimeSeatResponse;
import com.example.cinema.showtime.enums.ShowtimeStatus;
import com.example.cinema.showtime.service.ShowtimeService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;

@Validated
@RestController
@RequestMapping("/api/v1/showtimes")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ShowtimeController {

    ShowtimeService showtimeService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<ShowtimeResponse>>> getShowtimes(
            @RequestParam(required = false) Long movieId,
            @RequestParam(required = false) Long roomId,
            @RequestParam(required = false) ShowtimeStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fromTime,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime toTime,
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "10") @Min(1) @Max(100) int size
    ) {
        return ResponseEntity.ok(ApiResponse.success(showtimeService.getShowtimes(movieId, roomId, status, fromTime, toTime, page, size)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ShowtimeResponse>> getShowtimeById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(showtimeService.getShowtimeById(id)));
    }

    @GetMapping("/{id}/seats")
    public ResponseEntity<ApiResponse<List<ShowtimeSeatResponse>>> getShowtimeSeats(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(showtimeService.getShowtimeSeats(id)));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ShowtimeResponse>> createShowtime(@Valid @RequestBody ShowtimeRequest request) {
        ShowtimeResponse response = showtimeService.createShowtime(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Showtime created and seat inventory initialized successfully", response));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> cancelShowtime(@PathVariable Long id) {
        showtimeService.cancelShowtime(id);
        return ResponseEntity.ok(ApiResponse.success("Showtime cancelled successfully", null));
    }
}