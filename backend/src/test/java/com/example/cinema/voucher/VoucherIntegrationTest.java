package com.example.cinema.voucher;

import com.example.cinema.auth.entity.User;
import com.example.cinema.auth.enums.Role;
import com.example.cinema.auth.repository.UserRepository;
import com.example.cinema.booking.dto.request.BookingCreateRequest;
import com.example.cinema.booking.dto.response.BookingResponse;
import com.example.cinema.booking.entity.Booking;
import com.example.cinema.booking.enums.BookingStatus;
import com.example.cinema.booking.repository.BookingItemRepository;
import com.example.cinema.booking.repository.BookingRepository;
import com.example.cinema.booking.service.BookingService;
import com.example.cinema.common.AbstractMySqlIT;
import com.example.cinema.common.exception.AppException;
import com.example.cinema.common.exception.ErrorCode;
import com.example.cinema.movie.entity.Movie;
import com.example.cinema.movie.enums.AgeRating;
import com.example.cinema.movie.enums.MovieStatus;
import com.example.cinema.movie.repository.MovieRepository;
import com.example.cinema.showtime.entity.Cinema;
import com.example.cinema.showtime.entity.Room;
import com.example.cinema.showtime.entity.Seat;
import com.example.cinema.showtime.entity.Showtime;
import com.example.cinema.showtime.entity.ShowtimeSeat;
import com.example.cinema.showtime.enums.SeatType;
import com.example.cinema.showtime.enums.ShowtimeFormat;
import com.example.cinema.showtime.enums.ShowtimeSeatStatus;
import com.example.cinema.showtime.enums.ShowtimeStatus;
import com.example.cinema.showtime.enums.TranslationType;
import com.example.cinema.showtime.repository.CinemaRepository;
import com.example.cinema.showtime.repository.RoomRepository;
import com.example.cinema.showtime.repository.SeatRepository;
import com.example.cinema.showtime.repository.ShowtimeRepository;
import com.example.cinema.showtime.repository.ShowtimeSeatRepository;
import com.example.cinema.voucher.dto.response.VoucherResponse;
import com.example.cinema.voucher.entity.Voucher;
import com.example.cinema.voucher.entity.VoucherRedemption;
import com.example.cinema.voucher.enums.DiscountType;
import com.example.cinema.voucher.enums.VoucherRedemptionStatus;
import com.example.cinema.voucher.repository.VoucherRedemptionRepository;
import com.example.cinema.voucher.repository.VoucherRepository;
import com.example.cinema.voucher.service.VoucherService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

public class VoucherIntegrationTest extends AbstractMySqlIT {

    @Autowired
    VoucherService voucherService;

    @Autowired
    VoucherRepository voucherRepository;

    @Autowired
    VoucherRedemptionRepository voucherRedemptionRepository;

    @Autowired
    BookingService bookingService;

    @Autowired
    BookingRepository bookingRepository;

    @Autowired
    BookingItemRepository bookingItemRepository;

    @Autowired
    UserRepository userRepository;

    @Autowired
    CinemaRepository cinemaRepository;

    @Autowired
    RoomRepository roomRepository;

    @Autowired
    SeatRepository seatRepository;

    @Autowired
    MovieRepository movieRepository;

    @Autowired
    ShowtimeRepository showtimeRepository;

    @Autowired
    ShowtimeSeatRepository showtimeSeatRepository;

    private User testUser;
    private User inactiveUser;
    private Cinema cinema;
    private Room room;
    private List<Seat> createdSeats = new ArrayList<>();
    private Movie movie;
    private Showtime showtime;
    private ShowtimeSeat showtimeSeat;
    private List<Voucher> createdVouchers = new ArrayList<>();

    @BeforeEach
    void setUp() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);

        testUser = userRepository.save(User.builder()
                .email("voucher_tester_" + suffix + "@cinema.com")
                .fullName("Voucher Tester")
                .passwordHash("password_hash")
                .phone("0988000001")
                .role(Role.CUSTOMER)
                .isActive(true)
                .build());

        inactiveUser = userRepository.save(User.builder()
                .email("inactive_tester_" + suffix + "@cinema.com")
                .fullName("Inactive User")
                .passwordHash("password_hash")
                .phone("0988000002")
                .role(Role.CUSTOMER)
                .isActive(false)
                .build());

        cinema = cinemaRepository.save(Cinema.builder()
                .name("Cinema " + suffix)
                .address("123 Street")
                .hotline("19007890")
                .isActive(true)
                .build());

        room = roomRepository.save(Room.builder()
                .cinema(cinema)
                .name("Room " + suffix)
                .totalRows(5)
                .totalColumns(5)
                .isActive(true)
                .build());

        movie = movieRepository.save(Movie.builder()
                .title("Voucher Movie " + suffix)
                .durationMinutes(120)
                .releaseDate(LocalDate.now().minusDays(5))
                .posterUrl("https://example.com/poster.jpg")
                .ageRating(AgeRating.P)
                .status(MovieStatus.NOW_SHOWING)
                .build());

        LocalDateTime start = LocalDateTime.now().plusHours(5);
        showtime = showtimeRepository.save(Showtime.builder()
                .movie(movie)
                .room(room)
                .startTime(start)
                .endTime(start.plusMinutes(120))
                .cleaningEndTime(start.plusMinutes(135))
                .format(ShowtimeFormat._2D)
                .translationType(TranslationType.SUBTITLE)
                .basePrice(60000L)
                .status(ShowtimeStatus.SCHEDULED)
                .build());

        for (int num = 1; num <= 3; num++) {
            Seat s = seatRepository.save(Seat.builder()
                    .room(room)
                    .rowName("A")
                    .seatNumber(num)
                    .type(SeatType.NORMAL)
                    .isActive(true)
                    .build());
            createdSeats.add(s);

            ShowtimeSeat ss = showtimeSeatRepository.save(ShowtimeSeat.builder()
                    .showtime(showtime)
                    .seat(s)
                    .status(ShowtimeSeatStatus.AVAILABLE)
                    .price(60000L)
                    .build());

            if (num == 1) {
                showtimeSeat = ss;
            }
        }
    }

    @AfterEach
    void tearDown() {
        if (showtime != null) {
            List<Booking> bookings = bookingRepository.findAll().stream()
                    .filter(b -> b.getShowtime().getId().equals(showtime.getId()))
                    .toList();
            for (Booking b : bookings) {
                voucherRedemptionRepository.findByBookingId(b.getId()).ifPresent(voucherRedemptionRepository::delete);
                bookingItemRepository.deleteAll(bookingItemRepository.findByBookingId(b.getId()));
                bookingRepository.delete(b);
            }
            showtimeSeatRepository.deleteAll(showtimeSeatRepository.findByShowtimeIdOrderBySeatRowNameAscSeatSeatNumberAsc(showtime.getId()));
            showtimeRepository.delete(showtime);
        }

        for (Voucher v : createdVouchers) {
            voucherRedemptionRepository.deleteAll(voucherRedemptionRepository.findAll().stream()
                    .filter(r -> r.getVoucher().getId().equals(v.getId()))
                    .toList());
            voucherRepository.delete(v);
        }

        if (!createdSeats.isEmpty()) seatRepository.deleteAll(createdSeats);
        if (room != null) roomRepository.delete(room);
        if (cinema != null) cinemaRepository.delete(cinema);
        if (movie != null) movieRepository.delete(movie);
        if (testUser != null) userRepository.delete(testUser);
        if (inactiveUser != null) userRepository.delete(inactiveUser);
    }

    @Test
    @DisplayName("FA-04: Zero-amount booking (100% discount) -> Automatically CONFIRMED and seats BOOKED without payment gateway")
    void zeroAmountBooking_automaticallyConfirmedAndSeatsBooked() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Voucher freeVoucher = voucherRepository.save(Voucher.builder()
                .code("FREE100_" + suffix)
                .discountType(DiscountType.FIXED_AMOUNT)
                .discountValue(60000L) // 100% covers seat price
                .minOrderValue(50000L)
                .usageLimit(10)
                .perUserLimit(2)
                .reservedCount(0)
                .usedCount(0)
                .isActive(true)
                .startAt(LocalDateTime.now().minusDays(1))
                .endAt(LocalDateTime.now().plusDays(10))
                .build());
        createdVouchers.add(freeVoucher);

        BookingCreateRequest request = new BookingCreateRequest(
                showtime.getId(),
                List.of(showtimeSeat.getId()),
                freeVoucher.getCode()
        );

        BookingResponse response = bookingService.createBooking(testUser.getEmail(), request);

        // Assert response
        assertThat(response.status()).isEqualTo(BookingStatus.CONFIRMED);
        assertThat(response.subtotalAmount()).isEqualTo(60000L);
        assertThat(response.discountAmount()).isEqualTo(60000L);
        assertThat(response.finalAmount()).isEqualTo(0L);

        // Assert database booking
        Booking dbBooking = bookingRepository.findById(response.id()).orElseThrow();
        assertThat(dbBooking.getStatus()).isEqualTo(BookingStatus.CONFIRMED);
        assertThat(dbBooking.getFinalAmount()).isEqualTo(0L);

        // Assert showtime seat is BOOKED (not HELD)
        ShowtimeSeat dbSeat = showtimeSeatRepository.findById(showtimeSeat.getId()).orElseThrow();
        assertThat(dbSeat.getStatus()).isEqualTo(ShowtimeSeatStatus.BOOKED);
        assertThat(dbSeat.getHeldByBookingId()).isEqualTo(dbBooking.getId());

        // Assert voucher redemption status is USED (not RESERVED)
        VoucherRedemption redemption = voucherRedemptionRepository.findByBookingId(dbBooking.getId()).orElseThrow();
        assertThat(redemption.getStatus()).isEqualTo(VoucherRedemptionStatus.USED);

        // Assert voucher usedCount incremented and reservedCount remains 0
        Voucher dbVoucher = voucherRepository.findById(freeVoucher.getId()).orElseThrow();
        assertThat(dbVoucher.getUsedCount()).isEqualTo(1);
        assertThat(dbVoucher.getReservedCount()).isEqualTo(0);
    }

    @Test
    @DisplayName("FA-04: Public vouchers endpoint filters out inactive, expired, and exhausted vouchers")
    void publicVouchers_filtersOutInactiveExpiredOrExhaustedVouchers() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);

        Voucher validVoucher = voucherRepository.save(Voucher.builder()
                .code("VALID_" + suffix)
                .discountType(DiscountType.FIXED_AMOUNT)
                .discountValue(10000L)
                .minOrderValue(30000L)
                .usageLimit(10)
                .reservedCount(0)
                .usedCount(0)
                .isActive(true)
                .startAt(LocalDateTime.now().minusDays(1))
                .endAt(LocalDateTime.now().plusDays(5))
                .build());
        createdVouchers.add(validVoucher);

        Voucher inactiveVoucher = voucherRepository.save(Voucher.builder()
                .code("INACTIVE_" + suffix)
                .discountType(DiscountType.FIXED_AMOUNT)
                .discountValue(10000L)
                .minOrderValue(30000L)
                .usageLimit(10)
                .reservedCount(0)
                .usedCount(0)
                .isActive(false) // Inactive
                .startAt(LocalDateTime.now().minusDays(1))
                .endAt(LocalDateTime.now().plusDays(5))
                .build());
        createdVouchers.add(inactiveVoucher);

        Voucher expiredVoucher = voucherRepository.save(Voucher.builder()
                .code("EXPIRED_" + suffix)
                .discountType(DiscountType.FIXED_AMOUNT)
                .discountValue(10000L)
                .minOrderValue(30000L)
                .usageLimit(10)
                .reservedCount(0)
                .usedCount(0)
                .isActive(true)
                .startAt(LocalDateTime.now().minusDays(10))
                .endAt(LocalDateTime.now().minusDays(1)) // Expired
                .build());
        createdVouchers.add(expiredVoucher);

        Voucher exhaustedVoucher = voucherRepository.save(Voucher.builder()
                .code("EXHAUSTED_" + suffix)
                .discountType(DiscountType.FIXED_AMOUNT)
                .discountValue(10000L)
                .minOrderValue(30000L)
                .usageLimit(5)
                .reservedCount(2)
                .usedCount(3) // 2 + 3 = 5 >= 5 (exhausted)
                .isActive(true)
                .startAt(LocalDateTime.now().minusDays(1))
                .endAt(LocalDateTime.now().plusDays(5))
                .build());
        createdVouchers.add(exhaustedVoucher);

        List<VoucherResponse> publicVouchers = voucherService.getPublicVouchers();
        List<String> publicCodes = publicVouchers.stream().map(VoucherResponse::code).toList();

        assertThat(publicCodes).contains(validVoucher.getCode());
        assertThat(publicCodes).doesNotContain(inactiveVoucher.getCode());
        assertThat(publicCodes).doesNotContain(expiredVoucher.getCode());
        assertThat(publicCodes).doesNotContain(exhaustedVoucher.getCode());

        List<VoucherResponse> adminVouchers = voucherService.getAllVouchersForAdmin();
        List<String> adminCodes = adminVouchers.stream().map(VoucherResponse::code).toList();

        assertThat(adminCodes).contains(
                validVoucher.getCode(),
                inactiveVoucher.getCode(),
                expiredVoucher.getCode(),
                exhaustedVoucher.getCode()
        );
    }

    @Test
    @DisplayName("FA-03: Inactive user (isActive=false) is blocked from creating bookings with UNAUTHORIZED")
    void inactiveUser_cannotCreateBooking() {
        BookingCreateRequest request = new BookingCreateRequest(
                showtime.getId(),
                List.of(showtimeSeat.getId()),
                null
        );

        assertThatThrownBy(() -> bookingService.createBooking(inactiveUser.getEmail(), request))
                .isInstanceOf(AppException.class)
                .satisfies(e -> {
                    AppException appEx = (AppException) e;
                    assertThat(appEx.getErrorCode()).isEqualTo(ErrorCode.UNAUTHORIZED);
                });
    }
}

