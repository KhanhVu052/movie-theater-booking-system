package com.example.cinema.showtime.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.time.LocalTime;

@Getter
@Setter
@Configuration
@ConfigurationProperties(prefix = "app.pricing")
public class PricingProperties {

    private long standardBasePrice = 60_000L;
    private long vipSurcharge = 15_000L;
    private long coupleSurcharge = 10_000L;
    private long weekendSurcharge = 15_000L;
    private long peakHourSurcharge = 10_000L;
    private long morningDiscount = 10_000L;
    private LocalTime morningCutoffTime = LocalTime.of(12, 0);
    private LocalTime peakHourStartTime = LocalTime.of(18, 0);
    private LocalTime peakHourEndTime = LocalTime.of(22, 0);
    private long minSeatPrice = 40_000L;

    // Aliases to support naming variants from ROADMAP D-05
    public long getPrimeTimeSurcharge() {
        return peakHourSurcharge;
    }

    public void setPrimeTimeSurcharge(long primeTimeSurcharge) {
        this.peakHourSurcharge = primeTimeSurcharge;
    }

    public long getMatineeDiscount() {
        return morningDiscount;
    }

    public void setMatineeDiscount(long matineeDiscount) {
        this.morningDiscount = matineeDiscount;
    }
}

