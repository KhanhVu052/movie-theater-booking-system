package com.example.cinema.showtime;

import com.example.cinema.auth.entity.User;
import com.example.cinema.auth.enums.Role;
import com.example.cinema.auth.repository.UserRepository;
import com.example.cinema.booking.entity.Booking;
import com.example.cinema.booking.enums.BookingStatus;
import com.example.cinema.booking.repository.BookingRepository;
import com.example.cinema.common.exception.AppException;
import com.example.cinema.common.exception.ErrorCode;
import com.example.cinema.movie.entity.Movie;
import com.example.cinema.movie.enums.AgeRating;
import com.example.cinema.movie.enums.MovieStatus;
import com.example.cinema.movie.repository.MovieRepository;
import com.example.cinema.payment.entity.Payment;
import com.example.cinema.payment.enums.PaymentProvider;
import com.example.cinema.payment.enums.PaymentRefundStatus;
import com.example.cinema.payment.enums.PaymentStatus;
import com.example.cinema.payment.repository.PaymentRepository;
import com.example.cinema.showtime.dto.request.ShowtimeRequest;
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
import com.example.cinema.showtime.service.ShowtimeService;
import com.example.cinema.voucher.entity.Voucher;
import com.example.cinema.voucher.entity.VoucherRedemption;
import com.example.cinema.voucher.enums.DiscountType;
import com.example.cinema.voucher.enums.VoucherRedemptionStatus;
import com.example.cinema.voucher.repository.VoucherRedemptionRepository;
import com.example.cinema.voucher.repository.VoucherRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ShowtimeWorkflowIntegrationTest {

    @Autowired
    ShowtimeService showtimeService;

    @Autowired
    ShowtimeRepository showtimeRepository;

    @Autowired
    ShowtimeSeatRepository showtimeSeatRepository;

    @Autowired
    MovieRepository movieRepository;

    @Autowired
    CinemaRepository cinemaRepository;

    @Autowired
    RoomRepository roomRepository;

    @Autowired
    SeatRepository seatRepository;

    @Autowired
    BookingRepository bookingRepository;

    @Autowired
    PaymentRepository paymentRepository;

    @Autowired
    UserRepository userRepository;

    @Autowired
    VoucherRepository voucherRepository;

    @Autowired
    VoucherRedemptionRepository voucherRedemptionRepository;

    @Autowired
    EntityManager entityManager;

    private Room testRoom;

    @BeforeEach
    void setUpTestData() {
        if (roomRepository.count() == 0) {
            Cinema cinema = cinemaRepository.save(Cinema.builder()
                    .name("Hanoi Central Cinema")
                    .address("123 Hoan Kiem, Hanoi")
                    .build());
            testRoom = roomRepository.save(Room.builder()
                    .cinema(cinema)
                    .name("Hall 1")
                    .totalRows(5)
                    .totalColumns(5)
                    .isActive(true)
                    .build());
            for (int r = 0; r < 5; r++) {
                String row = String.valueOf((char) ('A' + r));
                for (int c = 1; c <= 5; c++) {
                    seatRepository.save(Seat.builder()
                            .room(testRoom)
                            .rowName(row)
                            .seatNumber(c)
                            .type(SeatType.NORMAL)
                            .isActive(true)
                            .build());
                }
            }
        } else {
            testRoom = roomRepository.findAll().getFirst();
        }

        List<Seat> seats = seatRepository.findByRoomIdOrderByRowNameAscSeatNumberAsc(testRoom.getId());
        if (seats.isEmpty()) {
            for (int r = 0; r < 5; r++) {
                String row = String.valueOf((char) ('A' + r));
                for (int c = 1; c <= 5; c++) {
                    seatRepository.save(Seat.builder()
                            .room(testRoom)
                            .rowName(row)
                            .seatNumber(c)
                            .type(SeatType.NORMAL)
                            .isActive(true)
                            .build());
                }
            }
        }

        if (!userRepository.existsByEmail("admin@cinema.com")) {
            userRepository.save(User.builder()
                    .email("admin@cinema.com")
                    .passwordHash("hashed")
                    .fullName("Admin")
                    .phone("0999999999")
                    .role(Role.ADMIN)
                    .isActive(true)
                    .build());
        }
    }

    private Movie getOrCreateActiveMovie() {
        return movieRepository.findAll().stream()
                .filter(m -> m.getStatus() == MovieStatus.NOW_SHOWING)
                .findFirst()
                .orElseGet(() -> movieRepository.save(Movie.builder()
                        .title("Active Test Movie " + UUID.randomUUID().toString().substring(0, 5))
                        .durationMinutes(120)
                        .releaseDate(LocalDate.now())
                        .ageRating(AgeRating.P)
                        .originalLanguage("English")
                        .status(MovieStatus.NOW_SHOWING)
                        .build()));
    }

    private Movie getOrCreateEndedMovie() {
        return movieRepository.findAll().stream()
                .filter(m -> m.getStatus() == MovieStatus.ENDED)
                .findFirst()
                .orElseGet(() -> movieRepository.save(Movie.builder()
                        .title("Ended Test Movie " + UUID.randomUUID().toString().substring(0, 5))
                        .durationMinutes(120)
                        .releaseDate(LocalDate.now().minusMonths(6))
                        .ageRating(AgeRating.P)
                        .originalLanguage("English")
                        .status(MovieStatus.ENDED)
                        .build()));
    }

    @Test
    @DisplayName("TC-SHOW-03: Cannot schedule a showtime for an ENDED movie")
    void cannotCreateShowtimeForEndedMovie() {
        Movie endedMovie = getOrCreateEndedMovie();

        ShowtimeRequest request = new ShowtimeRequest(
                endedMovie.getId(),
                testRoom.getId(),
                ShowtimeFormat._2D,
                TranslationType.SUBTITLE,
                LocalDateTime.now().plusDays(2),
                80000L);

        assertThatThrownBy(() -> showtimeService.createShowtime(request))
                .isInstanceOf(AppException.class)
                .satisfies(ex -> {
                    AppException appEx = (AppException) ex;
                    assertThat(appEx.getErrorCode())
                            .isEqualTo(ErrorCode.MOVIE_NOT_AVAILABLE_FOR_SHOWTIME);
                });
    }

    @Test
    @DisplayName("Hard delete: Showtime with no bookings is completely removed with its seats")
    void cancelEmptyShowtimeHardDeletes() {
        Movie activeMovie = getOrCreateActiveMovie();

        Showtime showtime = showtimeRepository.save(Showtime.builder()
                .movie(activeMovie)
                .room(testRoom)
                .format(ShowtimeFormat._2D)
                .translationType(TranslationType.SUBTITLE)
                .startTime(LocalDateTime.now().plusDays(5))
                .endTime(LocalDateTime.now().plusDays(5).plusMinutes(activeMovie.getDurationMinutes()))
                .cleaningEndTime(LocalDateTime.now().plusDays(5).plusMinutes(activeMovie.getDurationMinutes() + 15))
                .basePrice(85000L)
                .status(ShowtimeStatus.SCHEDULED)
                .build());

        Seat seat = seatRepository.findByRoomIdOrderByRowNameAscSeatNumberAsc(testRoom.getId()).getFirst();
        showtimeSeatRepository.save(ShowtimeSeat.builder()
                .showtime(showtime)
                .seat(seat)
                .price(85000L)
                .status(ShowtimeSeatStatus.AVAILABLE)
                .heldByBookingId(null)
                .build());

        entityManager.flush();
        entityManager.clear();

        showtimeService.cancelShowtime(showtime.getId());

        entityManager.flush();
        entityManager.clear();

        assertThat(showtimeRepository.findById(showtime.getId())).isEmpty();
        assertThat(showtimeSeatRepository.findByShowtimeIdOrderBySeatRowNameAscSeatSeatNumberAsc(showtime.getId())).isEmpty();
    }

    @Test
    @DisplayName("TC-SHOW-05: Cancelling showtime with confirmed bookings transitions booking to CANCELLED and triggers REFUND_REQUIRED, releases voucher")
    void cancelShowtimeWithBookingsTriggersRefundPipeline() {
        Movie activeMovie = getOrCreateActiveMovie();
        User user = userRepository.findByEmail("admin@cinema.com").orElseThrow();

        Voucher voucher = voucherRepository.save(Voucher.builder()
                .code("DISC10-" + UUID.randomUUID().toString().substring(0, 5).toUpperCase())
                .discountType(DiscountType.FIXED_AMOUNT)
                .discountValue(10000L)
                .minOrderValue(50000L)
                .usageLimit(100)
                .reservedCount(0)
                .usedCount(1)
                .perUserLimit(1)
                .startAt(LocalDateTime.now().minusDays(1))
                .endAt(LocalDateTime.now().plusDays(10))
                .isActive(true)
                .build());

        Showtime showtime = showtimeRepository.save(Showtime.builder()
                .movie(activeMovie)
                .room(testRoom)
                .format(ShowtimeFormat._2D)
                .translationType(TranslationType.SUBTITLE)
                .startTime(LocalDateTime.now().plusDays(3))
                .endTime(LocalDateTime.now().plusDays(3).plusMinutes(activeMovie.getDurationMinutes()))
                .cleaningEndTime(LocalDateTime.now().plusDays(3).plusMinutes(activeMovie.getDurationMinutes() + 15))
                .basePrice(90000L)
                .status(ShowtimeStatus.SCHEDULED)
                .build());

        Booking booking = bookingRepository.save(Booking.builder()
                .bookingCode("BK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .user(user)
                .showtime(showtime)
                .voucher(voucher)
                .subtotalAmount(90000L)
                .discountAmount(10000L)
                .finalAmount(80000L)
                .status(BookingStatus.CONFIRMED)
                .expiresAt(LocalDateTime.now().plusMinutes(10))
                .build());

        voucherRedemptionRepository.save(VoucherRedemption.builder()
                .voucher(voucher)
                .user(user)
                .booking(booking)
                .discountApplied(10000L)
                .status(VoucherRedemptionStatus.USED)
                .build());

        Seat seat = seatRepository.findByRoomIdOrderByRowNameAscSeatNumberAsc(testRoom.getId()).getFirst();
        ShowtimeSeat showtimeSeat = showtimeSeatRepository.save(ShowtimeSeat.builder()
                .showtime(showtime)
                .seat(seat)
                .price(90000L)
                .status(ShowtimeSeatStatus.BOOKED)
                .heldByBookingId(booking.getId())
                .build());

        Payment payment = paymentRepository.save(Payment.builder()
                .booking(booking)
                .amount(80000L)
                .provider(PaymentProvider.VNPAY)
                .transactionRef("TRX-TEST-" + UUID.randomUUID().toString().substring(0, 8))
                .status(PaymentStatus.SUCCESS)
                .refundStatus(PaymentRefundStatus.NONE)
                .responseCode("00")
                .transactionStatus("00")
                .payDate(LocalDateTime.now())
                .build());

        entityManager.flush();
        entityManager.clear();

        showtimeService.cancelShowtime(showtime.getId());

        entityManager.flush();
        entityManager.clear();

        Showtime updatedShowtime = showtimeRepository.findById(showtime.getId()).orElseThrow();
        assertThat(updatedShowtime.getStatus()).isEqualTo(ShowtimeStatus.CANCELLED);

        Booking updatedBooking = bookingRepository.findById(booking.getId()).orElseThrow();
        assertThat(updatedBooking.getStatus()).isEqualTo(BookingStatus.CANCELLED);

        Payment updatedPayment = paymentRepository.findById(payment.getId()).orElseThrow();
        assertThat(updatedPayment.getRefundStatus()).isEqualTo(PaymentRefundStatus.REFUND_REQUIRED);

        ShowtimeSeat updatedSeat = showtimeSeatRepository.findById(showtimeSeat.getId()).orElseThrow();
        assertThat(updatedSeat.getStatus()).isEqualTo(ShowtimeSeatStatus.AVAILABLE);
        assertThat(updatedSeat.getHeldByBookingId()).isNull();

        Voucher updatedVoucher = voucherRepository.findById(voucher.getId()).orElseThrow();
        assertThat(updatedVoucher.getUsedCount()).isEqualTo(0);

        VoucherRedemption updatedRedemption = voucherRedemptionRepository.findByBookingId(booking.getId()).orElseThrow();
        assertThat(updatedRedemption.getStatus()).isEqualTo(VoucherRedemptionStatus.RELEASED);
    }

    @Test
    @DisplayName("Foreign Key safe: Showtime with past EXPIRED booking soft-cancels without FK 500 error")
    void cancelShowtimeWithOnlyExpiredBookingsSoftCancels() {
        Movie activeMovie = getOrCreateActiveMovie();
        User user = userRepository.findByEmail("admin@cinema.com").orElseThrow();

        Showtime showtime = showtimeRepository.save(Showtime.builder()
                .movie(activeMovie)
                .room(testRoom)
                .format(ShowtimeFormat._2D)
                .translationType(TranslationType.SUBTITLE)
                .startTime(LocalDateTime.now().plusDays(4))
                .endTime(LocalDateTime.now().plusDays(4).plusMinutes(activeMovie.getDurationMinutes()))
                .cleaningEndTime(LocalDateTime.now().plusDays(4).plusMinutes(activeMovie.getDurationMinutes() + 15))
                .basePrice(80000L)
                .status(ShowtimeStatus.SCHEDULED)
                .build());

        Booking expiredBooking = bookingRepository.save(Booking.builder()
                .bookingCode("BK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .user(user)
                .showtime(showtime)
                .subtotalAmount(80000L)
                .discountAmount(0L)
                .finalAmount(80000L)
                .status(BookingStatus.EXPIRED)
                .expiresAt(LocalDateTime.now().minusMinutes(5))
                .build());

        Seat seat = seatRepository.findByRoomIdOrderByRowNameAscSeatNumberAsc(testRoom.getId()).getFirst();
        ShowtimeSeat showtimeSeat = showtimeSeatRepository.save(ShowtimeSeat.builder()
                .showtime(showtime)
                .seat(seat)
                .price(80000L)
                .status(ShowtimeSeatStatus.AVAILABLE)
                .heldByBookingId(null)
                .build());

        entityManager.flush();
        entityManager.clear();

        showtimeService.cancelShowtime(showtime.getId());

        entityManager.flush();
        entityManager.clear();

        Showtime updatedShowtime = showtimeRepository.findById(showtime.getId()).orElseThrow();
        assertThat(updatedShowtime.getStatus()).isEqualTo(ShowtimeStatus.CANCELLED);

        Booking refreshedBooking = bookingRepository.findById(expiredBooking.getId()).orElseThrow();
        assertThat(refreshedBooking.getStatus()).isEqualTo(BookingStatus.EXPIRED);

        ShowtimeSeat refreshedSeat = showtimeSeatRepository.findById(showtimeSeat.getId()).orElseThrow();
        assertThat(refreshedSeat.getStatus()).isEqualTo(ShowtimeSeatStatus.AVAILABLE);
        assertThat(refreshedSeat.getHeldByBookingId()).isNull();
    }

    @Test
    @DisplayName("Pending cancellation: Showtime with PENDING_PAYMENT booking cancels booking and releases held voucher")
    void cancelShowtimeWithPendingBookingReleasesVoucher() {
        Movie activeMovie = getOrCreateActiveMovie();
        User user = userRepository.findByEmail("admin@cinema.com").orElseThrow();

        Voucher voucher = voucherRepository.save(Voucher.builder()
                .code("PENDING-" + UUID.randomUUID().toString().substring(0, 5).toUpperCase())
                .discountType(DiscountType.FIXED_AMOUNT)
                .discountValue(15000L)
                .minOrderValue(50000L)
                .usageLimit(50)
                .reservedCount(1)
                .usedCount(0)
                .perUserLimit(1)
                .startAt(LocalDateTime.now().minusDays(1))
                .endAt(LocalDateTime.now().plusDays(10))
                .isActive(true)
                .build());

        Showtime showtime = showtimeRepository.save(Showtime.builder()
                .movie(activeMovie)
                .room(testRoom)
                .format(ShowtimeFormat._2D)
                .translationType(TranslationType.SUBTITLE)
                .startTime(LocalDateTime.now().plusDays(2))
                .endTime(LocalDateTime.now().plusDays(2).plusMinutes(activeMovie.getDurationMinutes()))
                .cleaningEndTime(LocalDateTime.now().plusDays(2).plusMinutes(activeMovie.getDurationMinutes() + 15))
                .basePrice(90000L)
                .status(ShowtimeStatus.SCHEDULED)
                .build());

        Booking pendingBooking = bookingRepository.save(Booking.builder()
                .bookingCode("BK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .user(user)
                .showtime(showtime)
                .voucher(voucher)
                .subtotalAmount(90000L)
                .discountAmount(15000L)
                .finalAmount(75000L)
                .status(BookingStatus.PENDING_PAYMENT)
                .expiresAt(LocalDateTime.now().plusMinutes(10))
                .build());

        voucherRedemptionRepository.save(VoucherRedemption.builder()
                .voucher(voucher)
                .user(user)
                .booking(pendingBooking)
                .discountApplied(15000L)
                .status(VoucherRedemptionStatus.RESERVED)
                .build());

        Seat seat = seatRepository.findByRoomIdOrderByRowNameAscSeatNumberAsc(testRoom.getId()).getFirst();
        ShowtimeSeat showtimeSeat = showtimeSeatRepository.save(ShowtimeSeat.builder()
                .showtime(showtime)
                .seat(seat)
                .price(90000L)
                .status(ShowtimeSeatStatus.HELD)
                .heldByBookingId(pendingBooking.getId())
                .build());

        entityManager.flush();
        entityManager.clear();

        showtimeService.cancelShowtime(showtime.getId());

        entityManager.flush();
        entityManager.clear();

        Showtime updatedShowtime = showtimeRepository.findById(showtime.getId()).orElseThrow();
        assertThat(updatedShowtime.getStatus()).isEqualTo(ShowtimeStatus.CANCELLED);

        Booking refreshedBooking = bookingRepository.findById(pendingBooking.getId()).orElseThrow();
        assertThat(refreshedBooking.getStatus()).isEqualTo(BookingStatus.CANCELLED);

        ShowtimeSeat refreshedSeat = showtimeSeatRepository.findById(showtimeSeat.getId()).orElseThrow();
        assertThat(refreshedSeat.getStatus()).isEqualTo(ShowtimeSeatStatus.AVAILABLE);
        assertThat(refreshedSeat.getHeldByBookingId()).isNull();

        Voucher updatedVoucher = voucherRepository.findById(voucher.getId()).orElseThrow();
        assertThat(updatedVoucher.getReservedCount()).isEqualTo(0);

        VoucherRedemption updatedRedemption = voucherRedemptionRepository.findByBookingId(pendingBooking.getId()).orElseThrow();
        assertThat(updatedRedemption.getStatus()).isEqualTo(VoucherRedemptionStatus.RELEASED);
    }
}
