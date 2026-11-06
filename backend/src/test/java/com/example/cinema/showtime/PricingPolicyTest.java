package com.example.cinema.showtime;

import com.example.cinema.showtime.config.PricingProperties;
import com.example.cinema.showtime.entity.Showtime;
import com.example.cinema.showtime.enums.SeatType;
import com.example.cinema.showtime.service.PricingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.TemporalAdjusters;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

public class PricingPolicyTest {

    private PricingProperties pricingProperties;
    private PricingService pricingService;

    @BeforeEach
    void setUp() {
        pricingProperties = new PricingProperties();
        pricingProperties.setStandardBasePrice(60_000L);
        pricingProperties.setVipSurcharge(15_000L);
        pricingProperties.setCoupleSurcharge(10_000L);
        pricingProperties.setWeekendSurcharge(15_000L);
        pricingProperties.setPeakHourSurcharge(10_000L);
        pricingProperties.setMorningDiscount(10_000L);
        pricingProperties.setMorningCutoffTime(LocalTime.of(12, 0));
        pricingProperties.setPeakHourStartTime(LocalTime.of(18, 0));
        pricingProperties.setPeakHourEndTime(LocalTime.of(22, 0));
        pricingProperties.setMinSeatPrice(40_000L);

        pricingService = new PricingService(pricingProperties);
    }

    @Test
    @DisplayName("Case 1: Suất chiếu sáng thứ Ba (10:00 sáng) -> Ghế Standard = 60k - 10k = 50.000 VND")
    void testCase1_tuesdayMorningDiscount() {
        LocalDate tuesday = LocalDate.of(2026, 11, 10); // Tuesday
        assertThat(tuesday.getDayOfWeek()).isEqualTo(DayOfWeek.TUESDAY);
        LocalDateTime startTime = LocalDateTime.of(tuesday, LocalTime.of(10, 0));

        Showtime showtime = Showtime.builder()
                .startTime(startTime)
                .basePrice(60_000L)
                .build();

        long price = pricingService.calculateSeatPrice(showtime, SeatType.NORMAL);
        assertThat(price).isEqualTo(50_000L);
    }

    @Test
    @DisplayName("Case 2: Suất chiếu tối thứ Năm (19:30) -> Standard = 60k + 10k = 70k; VIP = 60k + 15k + 10k = 85k")
    void testCase2_thursdayPeakHour() {
        LocalDate thursday = LocalDate.of(2026, 11, 12); // Thursday
        assertThat(thursday.getDayOfWeek()).isEqualTo(DayOfWeek.THURSDAY);
        LocalDateTime startTime = LocalDateTime.of(thursday, LocalTime.of(19, 30));

        Showtime showtime = Showtime.builder()
                .startTime(startTime)
                .basePrice(60_000L)
                .build();

        long standardPrice = pricingService.calculateSeatPrice(showtime, SeatType.NORMAL);
        long vipPrice = pricingService.calculateSeatPrice(showtime, SeatType.VIP);

        assertThat(standardPrice).isEqualTo(70_000L);
        assertThat(vipPrice).isEqualTo(85_000L);
    }

    @Test
    @DisplayName("Case 3: Suất chiếu tối Chủ Nhật (20:00) -> Standard = 60k + 15k (cuối tuần) + 10k (giờ vàng) = 85.000 VND")
    void testCase3_sundayPeakHour() {
        LocalDate sunday = LocalDate.of(2026, 11, 15); // Sunday
        assertThat(sunday.getDayOfWeek()).isEqualTo(DayOfWeek.SUNDAY);
        LocalDateTime startTime = LocalDateTime.of(sunday, LocalTime.of(20, 0));

        Showtime showtime = Showtime.builder()
                .startTime(startTime)
                .basePrice(60_000L)
                .build();

        long standardPrice = pricingService.calculateSeatPrice(showtime, SeatType.NORMAL);
        long vipPrice = pricingService.calculateSeatPrice(showtime, SeatType.VIP);
        long couplePrice = pricingService.calculateSeatPrice(showtime, SeatType.COUPLE);

        assertThat(standardPrice).isEqualTo(85_000L); // 60k + 15k + 10k
        assertThat(vipPrice).isEqualTo(100_000L);     // 60k + 15k + 15k + 10k
        assertThat(couplePrice).isEqualTo(95_000L);   // 60k + 10k (couple) + 15k + 10k
    }

    @Test
    @DisplayName("Case 4: Suất chiếu sáng Chủ Nhật (09:00) -> Standard = 60k + 15k (cuối tuần) - 10k (suất sáng) = 65.000 VND")
    void testCase4_sundayMorning() {
        LocalDate sunday = LocalDate.of(2026, 11, 15); // Sunday
        LocalDateTime startTime = LocalDateTime.of(sunday, LocalTime.of(9, 0));

        Showtime showtime = Showtime.builder()
                .startTime(startTime)
                .basePrice(60_000L)
                .build();

        long standardPrice = pricingService.calculateSeatPrice(showtime, SeatType.NORMAL);
        assertThat(standardPrice).isEqualTo(65_000L); // 60k + 15k - 10k
    }

    @Test
    @DisplayName("Case 5: Minimum price floor enforcement (never lower than minSeatPrice 40.000 VND)")
    void testCase5_minSeatPriceFloor() {
        LocalDate tuesday = LocalDate.of(2026, 11, 10);
        LocalDateTime startTime = LocalDateTime.of(tuesday, LocalTime.of(9, 0));

        // Base price is low (45,000 VND), morning discount is -10,000 VND -> calculated 35,000 VND -> clamped to 40,000 VND
        Showtime showtime = Showtime.builder()
                .startTime(startTime)
                .basePrice(45_000L)
                .build();

        long price = pricingService.calculateSeatPrice(showtime, SeatType.NORMAL);
        assertThat(price).isEqualTo(40_000L);
    }

    @Test
    @DisplayName("Case 6: calculateSeatTypePrices returns full map of all seat types")
    void testCase6_calculateSeatTypePricesMap() {
        LocalDate saturday = LocalDate.of(2026, 11, 14);
        LocalDateTime startTime = LocalDateTime.of(saturday, LocalTime.of(14, 0)); // Afternoon Saturday (weekend, not peak, not morning)

        Showtime showtime = Showtime.builder()
                .startTime(startTime)
                .basePrice(60_000L)
                .build();

        Map<SeatType, Long> map = pricingService.calculateSeatTypePrices(showtime);
        assertThat(map).isNotNull();
        assertThat(map.get(SeatType.NORMAL)).isEqualTo(75_000L); // 60k + 15k
        assertThat(map.get(SeatType.VIP)).isEqualTo(90_000L);    // 60k + 15k + 15k
        assertThat(map.get(SeatType.COUPLE)).isEqualTo(85_000L); // 60k + 10k + 15k
    }
}
