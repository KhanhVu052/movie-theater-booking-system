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
    SHOWTIME_HAS_ACTIVE_BOOKINGS(1311, "Cannot cancel showtime because seats are currently held or booked", HttpStatus.CONFLICT);

    int code;
    String message;
    HttpStatus statusCode;
    }