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

    UNCATEGORIZED_EXCEPTION(9999, "Uncategorized error", HttpStatus.INTERNAL_SERVER_ERROR),
    VALIDATION_ERROR(1001, "Validation error", HttpStatus.BAD_REQUEST),
    UNAUTHENTICATED(1002, "Unauthenticated", HttpStatus.UNAUTHORIZED),
    UNAUTHORIZED(1003, "You do not have permission", HttpStatus.FORBIDDEN),

    EMAIL_ALREADY_EXISTS(1101, "Email is already registered", HttpStatus.CONFLICT),
    USER_NOT_FOUND(1102, "User not found", HttpStatus.NOT_FOUND),
    INVALID_CREDENTIALS(1103, "Invalid email or password", HttpStatus.UNAUTHORIZED),
    USER_INACTIVE(1104, "User account has been deactivated", HttpStatus.FORBIDDEN),

    GENRE_NOT_FOUND(1201, "One or more genres not found", HttpStatus.NOT_FOUND),
    GENRE_ALREADY_EXISTS(1202, "Genre name already exists", HttpStatus.CONFLICT),
    GENRE_IN_USE(1203, "Cannot delete genre because it is associated with existing movies", HttpStatus.CONFLICT),
    ACTOR_NOT_FOUND(1204, "One or more actors not found", HttpStatus.NOT_FOUND),
    ACTOR_IN_USE(1205, "Cannot delete actor because they are associated with existing movies", HttpStatus.CONFLICT),
    MOVIE_NOT_FOUND(1206, "Movie not found", HttpStatus.NOT_FOUND);

    int code;
    String message;
    HttpStatus statusCode;
}