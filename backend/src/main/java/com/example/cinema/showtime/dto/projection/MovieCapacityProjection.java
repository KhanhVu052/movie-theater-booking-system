package com.example.cinema.showtime.dto.projection;

public interface MovieCapacityProjection {
    Long getMovieId();
    Long getTotalCapacity();
    Long getTotalScreenings();
}
