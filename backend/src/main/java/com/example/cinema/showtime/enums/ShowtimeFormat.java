package com.example.cinema.showtime.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

import java.util.Arrays;

@Getter
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public enum ShowtimeFormat {
    _2D("2D"),
    _3D("3D"),
    IMAX("IMAX");

    @JsonValue
    String dbValue;

    @JsonCreator
    public static ShowtimeFormat fromValue(String value) {
        if (value == null) {
            return null;
        }
        return Arrays.stream(values())
                .filter(format -> format.dbValue.equalsIgnoreCase(value.trim()) || format.name().equalsIgnoreCase(value.trim()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Invalid showtime format: " + value + ". Allowed values: 2D, 3D, IMAX"));
    }
}