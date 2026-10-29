package com.example.cinema.showtime.controller;

import com.example.cinema.common.dto.ApiResponse;
import com.example.cinema.showtime.dto.request.RoomRequest;
import com.example.cinema.showtime.dto.request.SeatBatchUpdateRequest;
import com.example.cinema.showtime.dto.response.RoomResponse;
import com.example.cinema.showtime.dto.response.SeatResponse;
import com.example.cinema.showtime.service.RoomService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/rooms")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class RoomController {

    RoomService roomService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<RoomResponse>>> getRoomsByCinema(@RequestParam Long cinemaId) {
        return ResponseEntity.ok(ApiResponse.success(roomService.getRoomsByCinema(cinemaId)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<RoomResponse>> getRoomById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(roomService.getRoomById(id)));
    }

    @GetMapping("/{id}/seats")
    public ResponseEntity<ApiResponse<List<SeatResponse>>> getSeatsByRoom(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(roomService.getSeatsByRoom(id)));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<RoomResponse>> createRoom(@Valid @RequestBody RoomRequest request) {
        RoomResponse response = roomService.createRoom(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Room created with physical seat matrix successfully", response));
    }

    @PutMapping("/{id}/seats/batch")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<SeatResponse>>> batchUpdateSeats(
            @PathVariable Long id,
            @Valid @RequestBody SeatBatchUpdateRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success("Seats updated successfully", roomService.batchUpdateSeats(id, request)));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<RoomResponse>> toggleRoomStatus(
            @PathVariable Long id,
            @RequestParam boolean isActive
    ) {
        return ResponseEntity.ok(ApiResponse.success("Room status updated", roomService.toggleRoomStatus(id, isActive)));
    }
}