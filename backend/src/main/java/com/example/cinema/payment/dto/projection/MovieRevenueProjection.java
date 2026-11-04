package com.example.cinema.payment.dto.projection;

public interface MovieRevenueProjection {
    Long getMovieId();
    String getMovieTitle();
    Long getTotalRevenue();
    Long getTotalBookings();
    Long getTotalScreenings();
}
