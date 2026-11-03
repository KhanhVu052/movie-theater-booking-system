package com.example.cinema.payment.dto.projection;

import java.time.LocalDate;

public interface DailyRevenueProjection {
    LocalDate getReportDate();
    Long getTotalRevenue();
    Long getTransactionCount();
}

