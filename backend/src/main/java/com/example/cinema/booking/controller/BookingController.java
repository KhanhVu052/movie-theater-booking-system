package com.example.cinema.booking.controller;

import com.example.cinema.booking.dto.request.BookingCreateRequest;
import com.example.cinema.booking.dto.response.BookingResponse;
import com.example.cinema.booking.service.BookingService;
import com.example.cinema.common.component.DeadlockRetryExecutor;
import com.example.cinema.common.dto.ApiResponse;
import com.example.cinema.common.dto.PageResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/v1/bookings")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class BookingController {

    BookingService bookingService;
    DeadlockRetryExecutor deadlockRetryExecutor;

    @PostMapping
    public ResponseEntity<ApiResponse<BookingResponse>> createBooking(
            Authentication authentication,
            @Valid @RequestBody BookingCreateRequest request
    ) {
        BookingResponse response = deadlockRetryExecutor.executeWithRetry(
                "CreateBooking",
                () -> bookingService.createBooking(authentication.getName(), request)
        );
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Seats held successfully for 10 minutes", response));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<BookingResponse>> cancelBooking(
            Authentication authentication,
            @PathVariable Long id
    ) {
        BookingResponse response = deadlockRetryExecutor.executeWithRetry(
                "CancelBooking-" + id,
                () -> bookingService.cancelBooking(authentication.getName(), id)
        );
        return ResponseEntity.ok(ApiResponse.success("Booking cancelled and seats released successfully", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<BookingResponse>> getBookingById(
            Authentication authentication,
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(ApiResponse.success(bookingService.getBookingById(authentication.getName(), id)));
    }

    @GetMapping("/my-bookings")
    public ResponseEntity<ApiResponse<PageResponse<BookingResponse>>> getMyBookings(
            Authentication authentication,
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "10") @Min(1) @Max(100) int size
    ) {
        return ResponseEntity.ok(ApiResponse.success(bookingService.getMyBookings(authentication.getName(), page, size)));
    }
}