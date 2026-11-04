package com.example.cinema.payment.dto.response;

import lombok.Builder;

import java.time.LocalDate;
import java.util.List;

@Builder
public record RevenueReportResponse(
        Long totalRevenue,
        Long totalRealizedRevenue,
        Long totalSuccessfulTransactions,
        Long totalSuccessPayments,
        Long totalTicketsSold,
        Long totalPendingRefunds,
        List<DailyRevenueItem> dailyBreakdown,
        List<DailyRevenueItem> dailyBreakdowns,
        List<MovieRevenueItem> movieBreakdown,
        List<MovieRevenueItem> movieBreakdowns
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
            Long totalBookings,
            Long ticketsSold,
            Long totalScreenings,
            Double occupancyRate
    ) {}
}
