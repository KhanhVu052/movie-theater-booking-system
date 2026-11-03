package com.example.cinema.payment.dto.response;

import lombok.Builder;

import java.time.LocalDate;
import java.util.List;

@Builder
public record RevenueReportResponse(
        Long totalRevenue,
        Long totalSuccessfulTransactions,
        List<DailyRevenueItem> dailyBreakdown,
        List<MovieRevenueItem> movieBreakdown
) {
    @Builder
    public record DailyRevenueItem(
            LocalDate date,
            Long revenue,
            Long transactionCount
    ) {}

    @Builder
    public record MovieRevenueItem(
            Long movieId,
            String movieTitle,
            Long revenue,
            Long totalBookings
    ) {}
}

