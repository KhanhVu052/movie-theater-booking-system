package com.example.cinema.common.exception;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.experimental.FieldDefaults;
import org.springframework.http.HttpStatus;

@Getter
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public enum ErrorCode {

    // --- System & Common Errors (1000 - 1099) ---
    UNCATEGORIZED_EXCEPTION(9999, "Uncategorized error", HttpStatus.INTERNAL_SERVER_ERROR),
    VALIDATION_ERROR(1001, "Validation error", HttpStatus.BAD_REQUEST),
    UNAUTHENTICATED(1002, "Unauthenticated", HttpStatus.UNAUTHORIZED),
    UNAUTHORIZED(1003, "You do not have permission", HttpStatus.FORBIDDEN),
    CONCURRENCY_LOCK_CONFLICT(1004, "Resource is currently locked by another transaction, please try again", HttpStatus.CONFLICT),

    // --- Auth & User Errors (1100 - 1199) ---
    EMAIL_ALREADY_EXISTS(1101, "Email is already registered", HttpStatus.CONFLICT),
    USER_NOT_FOUND(1102, "User not found", HttpStatus.NOT_FOUND),
    INVALID_CREDENTIALS(1103, "Invalid email or password", HttpStatus.UNAUTHORIZED),
    USER_INACTIVE(1104, "User account has been deactivated", HttpStatus.FORBIDDEN),

    // --- Movie, Genre & Actor Errors (1200 - 1299) ---
    GENRE_NOT_FOUND(1201, "One or more genres not found", HttpStatus.NOT_FOUND),
    GENRE_ALREADY_EXISTS(1202, "Genre name already exists", HttpStatus.CONFLICT),
    GENRE_IN_USE(1203, "Cannot delete genre because it is associated with existing movies", HttpStatus.CONFLICT),
    ACTOR_NOT_FOUND(1204, "One or more actors not found", HttpStatus.NOT_FOUND),
    ACTOR_IN_USE(1205, "Cannot delete actor because they are associated with existing movies", HttpStatus.CONFLICT),
    MOVIE_NOT_FOUND(1206, "Movie not found", HttpStatus.NOT_FOUND),

    // --- Cinema, Room, Seat & Showtime Errors (1300 - 1399) ---
    CINEMA_NOT_FOUND(1301, "Cinema not found", HttpStatus.NOT_FOUND),
    ROOM_NOT_FOUND(1302, "Room not found", HttpStatus.NOT_FOUND),
    ROOM_NAME_ALREADY_EXISTS(1303, "Room name already exists in this cinema", HttpStatus.CONFLICT),
    ROOM_INACTIVE(1304, "Room is currently inactive and cannot host showtimes", HttpStatus.CONFLICT),
    ROOM_HAS_NO_ACTIVE_SEATS(1305, "Room has no active seats to generate showtime inventory", HttpStatus.CONFLICT),
    SEAT_NOT_FOUND(1306, "One or more seats not found in this room", HttpStatus.NOT_FOUND),
    SHOWTIME_NOT_FOUND(1307, "Showtime not found", HttpStatus.NOT_FOUND),
    SHOWTIME_TIME_CONFLICT(1308, "Showtime overlaps with an existing scheduled showtime in the same room", HttpStatus.CONFLICT),
    MOVIE_NOT_AVAILABLE_FOR_SHOWTIME(1309, "Cannot schedule showtime for a movie that has already ENDED", HttpStatus.CONFLICT),
    SHOWTIME_ALREADY_CANCELLED(1310, "Showtime is already cancelled", HttpStatus.CONFLICT),
    SHOWTIME_HAS_ACTIVE_BOOKINGS(1311, "Cannot cancel showtime because seats are currently held or booked", HttpStatus.CONFLICT),

    // --- Voucher Errors (1400 - 1499) ---
    VOUCHER_NOT_FOUND(1401, "Voucher not found", HttpStatus.NOT_FOUND),
    VOUCHER_CODE_ALREADY_EXISTS(1402, "Voucher code already exists", HttpStatus.CONFLICT),
    VOUCHER_INACTIVE(1403, "Voucher is currently inactive", HttpStatus.BAD_REQUEST),
    VOUCHER_NOT_STARTED_OR_EXPIRED(1404, "Voucher is not within its valid time range", HttpStatus.BAD_REQUEST),
    VOUCHER_MIN_ORDER_NOT_MET(1405, "Order subtotal does not meet the minimum value required for this voucher", HttpStatus.BAD_REQUEST),
    VOUCHER_USAGE_LIMIT_EXCEEDED(1406, "Voucher has reached its maximum usage limit", HttpStatus.CONFLICT),
    VOUCHER_USER_LIMIT_EXCEEDED(1407, "You have reached the maximum usage limit for this voucher", HttpStatus.CONFLICT),
    VOUCHER_INVALID_DATE_RANGE(1408, "Voucher start time must be before end time", HttpStatus.BAD_REQUEST),
    VOUCHER_INVALID_PERCENTAGE(1409, "Percentage discount value must be between 1 and 100", HttpStatus.BAD_REQUEST),

    // --- Booking & Seat Inventory Errors (1500 - 1599) ---
    BOOKING_NOT_FOUND(1501, "Booking not found", HttpStatus.NOT_FOUND),
    SHOWTIME_NOT_AVAILABLE_FOR_BOOKING(1502, "Showtime is cancelled or has already started", HttpStatus.CONFLICT),
    SEAT_SELECTION_INVALID(1503, "Selected seats contain duplicates or do not belong to the requested showtime", HttpStatus.CONFLICT),
    SEAT_NOT_AVAILABLE(1504, "One or more selected seats are currently held or already booked", HttpStatus.CONFLICT),
    BOOKING_CANNOT_BE_CANCELLED(1505, "Only PENDING_PAYMENT bookings can be cancelled", HttpStatus.CONFLICT),
    BOOKING_EXPIRED(1506, "Booking hold time (10 minutes) has already expired", HttpStatus.CONFLICT),

    // --- Payment & Refund Errors (1600 - 1699) ---
    PAYMENT_NOT_FOUND(1601, "Payment transaction not found", HttpStatus.NOT_FOUND),
    BOOKING_NOT_PAYABLE(1602, "Booking is not in PENDING_PAYMENT status", HttpStatus.CONFLICT),
    PAYMENT_MAX_ATTEMPTS_EXCEEDED(1603, "Maximum of 3 payment attempts allowed per booking has been reached", HttpStatus.CONFLICT),
    PAYMENT_INVALID_SIGNATURE(1604, "Invalid VNPay digital signature (checksum failed)", HttpStatus.BAD_REQUEST),
    PAYMENT_REFUND_NOT_REQUIRED(1605, "Only payments with REFUND_REQUIRED status can be marked as REFUNDED", HttpStatus.CONFLICT);

    int code;
    String message;
    HttpStatus statusCode;
}