package com.example.cinema.booking.config;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.validation.annotation.Validated;

@Getter
@Setter
@Validated
@Configuration
@ConfigurationProperties(prefix = "app.booking")
public class BookingProperties {

    @Min(1)
    @Max(10)
    private int holdMinutes = 10;

    private int maxPendingPerUser = 2;
    private int cutoffMinutes = 15;
    private int refundCutoffMinutes = 60;
    private boolean orphanSeatRuleEnabled = true;

    private long expiryScanDelayMs = 30_000L;
    private int expiryScanBatchSize = 100;
}

