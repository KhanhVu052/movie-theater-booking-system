package com.example.cinema.showtime.service;

import com.example.cinema.showtime.config.PricingProperties;
import com.example.cinema.showtime.entity.Showtime;
import com.example.cinema.showtime.enums.SeatType;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class PricingService {

    PricingProperties pricingProperties;

    public long calculateSeatPrice(Showtime showtime, SeatType seatType) {
        LocalDateTime startTime = showtime != null ? showtime.getStartTime() : null;
        Long basePrice = showtime != null ? showtime.getBasePrice() : null;
        return calculateSeatPrice(startTime, basePrice, seatType);
    }

    public long calculateSeatPrice(LocalDateTime startTime, Long basePrice, SeatType seatType) {
        long base = (basePrice != null && basePrice > 0)
                ? basePrice
                : pricingProperties.getStandardBasePrice();

        long price = base;

        // 1. Seat Type surcharge / base
        if (seatType == SeatType.VIP) {
            price += pricingProperties.getVipSurcharge();
        } else if (seatType == SeatType.COUPLE) {
            price += pricingProperties.getCoupleSurcharge();
        }

        // 2. Showtime date & time adjustments
        if (startTime != null) {
            DayOfWeek dayOfWeek = startTime.getDayOfWeek();
            if (dayOfWeek == DayOfWeek.SATURDAY || dayOfWeek == DayOfWeek.SUNDAY) {
                price += pricingProperties.getWeekendSurcharge();
            }

            LocalTime time = startTime.toLocalTime();
            if (pricingProperties.getMorningCutoffTime() != null && time.isBefore(pricingProperties.getMorningCutoffTime())) {
                price -= pricingProperties.getMorningDiscount();
            } else if (pricingProperties.getPeakHourStartTime() != null
                    && pricingProperties.getPeakHourEndTime() != null
                    && !time.isBefore(pricingProperties.getPeakHourStartTime())
                    && time.isBefore(pricingProperties.getPeakHourEndTime())) {
                price += pricingProperties.getPeakHourSurcharge();
            }
        }

        // 3. Minimum seat price threshold
        return Math.max(price, pricingProperties.getMinSeatPrice());
    }

    public BigDecimal calculateSeatPriceBigDecimal(Showtime showtime, SeatType seatType) {
        return BigDecimal.valueOf(calculateSeatPrice(showtime, seatType));
    }

    public Map<SeatType, Long> calculateSeatTypePrices(Showtime showtime) {
        Map<SeatType, Long> map = new EnumMap<>(SeatType.class);
        for (SeatType type : SeatType.values()) {
            map.put(type, calculateSeatPrice(showtime, type));
        }
        return map;
    }

    public List<String> describePriceTags(LocalDateTime startTime) {
        if (startTime == null) {
            return List.of();
        }
        List<String> tags = new ArrayList<>();
        DayOfWeek dayOfWeek = startTime.getDayOfWeek();
        if (dayOfWeek == DayOfWeek.SATURDAY || dayOfWeek == DayOfWeek.SUNDAY) {
            tags.add("WEEKEND");
        }

        LocalTime time = startTime.toLocalTime();
        if (pricingProperties.getMorningCutoffTime() != null && time.isBefore(pricingProperties.getMorningCutoffTime())) {
            tags.add("EARLY_BIRD");
        } else if (pricingProperties.getPeakHourStartTime() != null
                && pricingProperties.getPeakHourEndTime() != null
                && !time.isBefore(pricingProperties.getPeakHourStartTime())
                && time.isBefore(pricingProperties.getPeakHourEndTime())) {
            tags.add("PEAK_HOUR");
        }
        return tags;
    }
}

