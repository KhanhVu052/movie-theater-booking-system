package com.example.cinema.voucher;

import com.example.cinema.auth.entity.User;
import com.example.cinema.auth.enums.Role;
import com.example.cinema.auth.repository.UserRepository;
import com.example.cinema.booking.dto.request.BookingCreateRequest;
import com.example.cinema.booking.dto.response.BookingResponse;
import com.example.cinema.booking.entity.Booking;
import com.example.cinema.booking.repository.BookingItemRepository;
import com.example.cinema.booking.repository.BookingRepository;
import com.example.cinema.booking.service.BookingService;
import com.example.cinema.common.AbstractMySqlIT;
import com.example.cinema.common.ConcurrencyTestSupport;
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
import com.example.cinema.voucher.entity.Voucher;
import com.example.cinema.voucher.enums.DiscountType;
import com.example.cinema.voucher.repository.VoucherRedemptionRepository;
import com.example.cinema.voucher.repository.VoucherRepository;
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
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

public class VoucherLimitConcurrencyIT extends AbstractMySqlIT {

    @Autowired
    BookingService bookingService;

    @Autowired
    BookingRepository bookingRepository;

    @Autowired
    BookingItemRepository bookingItemRepository;

    @Autowired
    ShowtimeSeatRepository showtimeSeatRepository;

    @Autowired
    ShowtimeRepository showtimeRepository;

    @Autowired
    SeatRepository seatRepository;

    @Autowired
    RoomRepository roomRepository;

    @Autowired
    CinemaRepository cinemaRepository;

    @Autowired
    MovieRepository movieRepository;

    @Autowired
    UserRepository userRepository;

    @Autowired
    VoucherRepository voucherRepository;

    @Autowired
    VoucherRedemptionRepository voucherRedemptionRepository;

    Cinema cinema;
    Room room;
    Movie movie;
    Showtime showtime;
    Voucher voucher;
    final List<Seat> createdSeats = new ArrayList<>();
    final List<ShowtimeSeat> createdShowtimeSeats = new ArrayList<>();
    final List<User> testUsers = new ArrayList<>();

    @BeforeEach
    void setUp() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);

        cinema = cinemaRepository.save(Cinema.builder()
                .name("Voucher Cinema " + suffix)
                .address("789 Voucher Blvd")
                .hotline("19007890")
                .build());

        room = roomRepository.save(Room.builder()
                .cinema(cinema)
                .name("Room " + suffix)
                .totalRows(15)
                .totalColumns(5)
                .isActive(true)
                .build());

        movie = movieRepository.save(Movie.builder()
                .title("Voucher Movie " + suffix)
                .durationMinutes(120)
                .releaseDate(LocalDate.now().plusDays(1))
                .ageRating(AgeRating.P)
                .originalLanguage("vi")
                .status(MovieStatus.NOW_SHOWING)
                .build());

        LocalDateTime start = LocalDateTime.now().plusDays(1);
        showtime = showtimeRepository.save(Showtime.builder()
                .movie(movie)
                .room(room)
                .format(ShowtimeFormat._2D)
                .translationType(TranslationType.SUBTITLE)
                .startTime(start)
                .endTime(start.plusMinutes(120))
                .cleaningEndTime(start.plusMinutes(135))
                .basePrice(60000L)
                .status(ShowtimeStatus.SCHEDULED)
                .build());

        // 15 separate rows to guarantee zero seat conflict and zero orphan seat issues
        String[] rowLetters = new String[]{"A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O"};
        for (String r : rowLetters) {
            for (int num = 1; num <= 3; num++) {
                Seat s = seatRepository.save(Seat.builder()
                        .room(room)
                        .rowName(r)
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
                    createdShowtimeSeats.add(ss);
                }
            }
        }

        voucher = voucherRepository.save(Voucher.builder()
                .code("VC_LIMIT_" + suffix)
                .discountType(DiscountType.FIXED_AMOUNT)
                .discountValue(15000L)
                .minOrderValue(50000L)
                .maxDiscountAmount(null)
                .usageLimit(3)
                .perUserLimit(1)
                .reservedCount(0)
                .usedCount(0)
                .isActive(true)
                .startAt(LocalDateTime.now().minusDays(1))
                .endAt(LocalDateTime.now().plusDays(10))
                .build());

        for (int i = 0; i < 15; i++) {
            User u = userRepository.save(User.builder()
                    .email("voucher_user_" + suffix + "_" + i + "@cinema.com")
                    .fullName("Voucher User " + i)
                    .passwordHash("password_hash")
                    .phone("09110000" + (i < 10 ? "0" + i : i))
                    .role(Role.CUSTOMER)
                    .isActive(true)
                    .build());
            testUsers.add(u);
        }
    }

    @AfterEach
    void tearDown() {
        if (showtime != null) {
            List<Booking> bookings = bookingRepository.findAll().stream()
                    .filter(b -> b.getShowtime().getId().equals(showtime.getId()))
                    .toList();
            for (Booking b : bookings) {
                voucherRedemptionRepository.deleteAll(voucherRedemptionRepository.findAll().stream()
                        .filter(r -> r.getBooking().getId().equals(b.getId()))
                        .toList());
                bookingItemRepository.deleteAll(bookingItemRepository.findByBookingId(b.getId()));
                bookingRepository.delete(b);
            }
            showtimeSeatRepository.deleteAll(showtimeSeatRepository.findByShowtimeIdOrderBySeatRowNameAscSeatSeatNumberAsc(showtime.getId()));
            showtimeRepository.delete(showtime);
        }
        if (voucher != null) {
            voucherRedemptionRepository.deleteAll(voucherRedemptionRepository.findAll().stream()
                    .filter(r -> r.getVoucher().getId().equals(voucher.getId()))
                    .toList());
            voucherRepository.delete(voucher);
        }
        if (!createdSeats.isEmpty()) seatRepository.deleteAll(createdSeats);
        if (room != null) roomRepository.delete(room);
        if (cinema != null) cinemaRepository.delete(cinema);
        if (movie != null) movieRepository.delete(movie);
        if (!testUsers.isEmpty()) userRepository.deleteAll(testUsers);
    }

    @Test
    @DisplayName("FA-02 (2): Voucher usageLimit=3 with 15 concurrent users -> Exactly 3 succeed, 12 fail with VOUCHER_USAGE_LIMIT_EXCEEDED (1406), reservedCount=3")
    void fifteenUsersConcurrentlyApplyLimitedVoucher_exactlyThreeSucceed() throws Exception {
        int concurrency = 15;
        AtomicInteger counter = new AtomicInteger(0);

        List<ConcurrencyTestSupport.ExecutionResult<BookingResponse>> results = ConcurrencyTestSupport.executeConcurrentTasks(
                concurrency,
                () -> {
                    int idx = counter.getAndIncrement();
                    User u = testUsers.get(idx);
                    ShowtimeSeat seat = createdShowtimeSeats.get(idx);
                    BookingCreateRequest req = new BookingCreateRequest(
                            showtime.getId(),
                            List.of(seat.getId()),
                            voucher.getCode()
                    );
                    return bookingService.createBooking(u.getEmail(), req);
                }
        );

        long successCount = results.stream().filter(ConcurrencyTestSupport.ExecutionResult::isSuccess).count();
        long limitExceededCount = results.stream()
                .filter(r -> r.isFailedWith(ErrorCode.VOUCHER_USAGE_LIMIT_EXCEEDED.getCode()))
                .count();

        assertThat(successCount).isEqualTo(3);
        assertThat(limitExceededCount).isEqualTo(12);

        Voucher updatedVoucher = voucherRepository.findById(voucher.getId()).orElseThrow();
        assertThat(updatedVoucher.getReservedCount()).isEqualTo(3);
        assertThat(updatedVoucher.getUsedCount()).isEqualTo(0);
    }
}
