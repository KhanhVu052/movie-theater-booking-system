package com.example.cinema.booking;

import com.example.cinema.auth.entity.User;
import com.example.cinema.auth.enums.Role;
import com.example.cinema.auth.repository.UserRepository;
import com.example.cinema.booking.entity.Booking;
import com.example.cinema.booking.entity.BookingItem;
import com.example.cinema.booking.enums.BookingStatus;
import com.example.cinema.booking.repository.BookingItemRepository;
import com.example.cinema.booking.repository.BookingRepository;
import com.example.cinema.booking.service.BookingService;
import com.example.cinema.common.AbstractMySqlIT;
import com.example.cinema.common.ConcurrencyTestSupport;
import com.example.cinema.movie.entity.Movie;
import com.example.cinema.movie.enums.AgeRating;
import com.example.cinema.movie.enums.MovieStatus;
import com.example.cinema.movie.repository.MovieRepository;
import com.example.cinema.payment.entity.Payment;
import com.example.cinema.payment.enums.PaymentProvider;
import com.example.cinema.payment.enums.PaymentRefundStatus;
import com.example.cinema.payment.enums.PaymentStatus;
import com.example.cinema.payment.repository.PaymentRepository;
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
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

public class CancelConfirmedVsCancelShowtimeIT extends AbstractMySqlIT {

    @Autowired
    BookingService bookingService;

    @Autowired
    ShowtimeService showtimeService;

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
    PaymentRepository paymentRepository;

    @Autowired
    VoucherRepository voucherRepository;

    @Autowired
    VoucherRedemptionRepository voucherRedemptionRepository;

    Cinema cinema;
    Room room;
    Seat seat;
    Movie movie;
    Showtime showtime;
    ShowtimeSeat showtimeSeat;
    User user;
    Voucher voucher;
    VoucherRedemption redemption;
    Booking booking;
    Payment payment;

    @BeforeEach
    void setUp() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);

        cinema = cinemaRepository.save(Cinema.builder()
                .name("Cancel Cinema " + suffix)
                .address("202 Cancel Way")
                .hotline("19002222")
                .build());

        room = roomRepository.save(Room.builder()
                .cinema(cinema)
                .name("Room " + suffix)
                .totalRows(5)
                .totalColumns(5)
                .isActive(true)
                .build());

        seat = seatRepository.save(Seat.builder()
                .room(room)
                .rowName("A")
                .seatNumber(1)
                .type(SeatType.NORMAL)
                .isActive(true)
                .build());

        movie = movieRepository.save(Movie.builder()
                .title("Cancel Movie " + suffix)
                .durationMinutes(120)
                .releaseDate(LocalDate.now().plusDays(1))
                .ageRating(AgeRating.P)
                .originalLanguage("vi")
                .status(MovieStatus.NOW_SHOWING)
                .build());

        // Showtime starting after 2 hours (> 60 minutes refund window)
        LocalDateTime start = LocalDateTime.now().plusHours(3);
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

        user = userRepository.save(User.builder()
                .email("canceller_" + suffix + "@cinema.com")
                .fullName("Canceller User")
                .passwordHash("secret_hash")
                .phone("0933445566")
                .role(Role.CUSTOMER)
                .isActive(true)
                .build());

        voucher = voucherRepository.save(Voucher.builder()
                .code("VC_CANCEL_" + suffix)
                .discountType(DiscountType.FIXED_AMOUNT)
                .discountValue(10000L)
                .minOrderValue(50000L)
                .usageLimit(10)
                .perUserLimit(1)
                .reservedCount(0)
                .usedCount(1) // Already confirmed
                .isActive(true)
                .startAt(LocalDateTime.now().minusDays(1))
                .endAt(LocalDateTime.now().plusDays(10))
                .build());

        booking = bookingRepository.save(Booking.builder()
                .user(user)
                .showtime(showtime)
                .voucher(voucher)
                .bookingCode("BK_CONF_" + suffix)
                .status(BookingStatus.CONFIRMED)
                .subtotalAmount(60000L)
                .discountAmount(10000L)
                .finalAmount(50000L)
                .expiresAt(LocalDateTime.now().plusMinutes(10))
                .build());

        redemption = voucherRedemptionRepository.save(VoucherRedemption.builder()
                .voucher(voucher)
                .user(user)
                .booking(booking)
                .discountApplied(10000L)
                .status(VoucherRedemptionStatus.USED)
                .build());

        showtimeSeat = showtimeSeatRepository.save(ShowtimeSeat.builder()
                .showtime(showtime)
                .seat(seat)
                .status(ShowtimeSeatStatus.BOOKED)
                .heldByBookingId(booking.getId())
                .price(60000L)
                .build());

        bookingItemRepository.save(BookingItem.builder()
                .booking(booking)
                .showtimeSeat(showtimeSeat)
                .price(60000L)
                .build());

        payment = paymentRepository.save(Payment.builder()
                .booking(booking)
                .provider(PaymentProvider.VNPAY)
                .transactionRef("TXN_CONF_" + suffix)
                .amount(50000L)
                .status(PaymentStatus.SUCCESS)
                .refundStatus(PaymentRefundStatus.NONE)
                .build());
    }

    @AfterEach
    void tearDown() {
        if (payment != null) paymentRepository.delete(payment);
        if (redemption != null) voucherRedemptionRepository.delete(redemption);
        if (booking != null) {
            bookingItemRepository.deleteAll(bookingItemRepository.findByBookingId(booking.getId()));
            bookingRepository.delete(booking);
        }
        if (voucher != null) voucherRepository.delete(voucher);
        if (showtime != null) {
            showtimeSeatRepository.deleteAll(showtimeSeatRepository.findByShowtimeIdOrderBySeatRowNameAscSeatSeatNumberAsc(showtime.getId()));
            showtimeRepository.delete(showtime);
        }
        if (seat != null) seatRepository.delete(seat);
        if (room != null) roomRepository.delete(room);
        if (cinema != null) cinemaRepository.delete(cinema);
        if (movie != null) movieRepository.delete(movie);
        if (user != null) userRepository.delete(user);
    }

    @Test
    @DisplayName("FA-02 (4): Customer cancelConfirmedBooking vs Admin cancelShowtime -> Invariant: Booking CANCELLED, seat AVAILABLE, refund required, voucher reverted exactly once")
    void cancelConfirmedVsCancelShowtime_noDeadlockAndVoucherRevertedExactlyOnce() throws Exception {
        List<Runnable> concurrentActions = List.of(
                () -> bookingService.cancelConfirmedBooking(user.getEmail(), booking.getId()),
                () -> showtimeService.cancelShowtime(showtime.getId())
        );

        List<ConcurrencyTestSupport.ExecutionResult<Void>> results =
                ConcurrencyTestSupport.executeConcurrentActions(concurrentActions);

        // Neither thread should fail with unhandled 500 error
        for (ConcurrencyTestSupport.ExecutionResult<Void> r : results) {
            if (!r.isSuccess()) {
                // If one thread fails because the other already cancelled, it should be an expected business AppException
                assertThat(r.exception()).isInstanceOf(com.example.cinema.common.exception.AppException.class);
            }
        }

        // Final state verifications
        Showtime updatedShowtime = showtimeRepository.findById(showtime.getId()).orElseThrow();
        assertThat(updatedShowtime.getStatus()).isEqualTo(ShowtimeStatus.CANCELLED);

        ShowtimeSeat updatedSeat = showtimeSeatRepository.findById(showtimeSeat.getId()).orElseThrow();
        assertThat(updatedSeat.getStatus()).isEqualTo(ShowtimeSeatStatus.AVAILABLE);
        assertThat(updatedSeat.getHeldByBookingId()).isNull();

        Booking updatedBooking = bookingRepository.findById(booking.getId()).orElseThrow();
        assertThat(updatedBooking.getStatus()).isEqualTo(BookingStatus.CANCELLED);

        Payment updatedPayment = paymentRepository.findById(payment.getId()).orElseThrow();
        assertThat(updatedPayment.getStatus()).isEqualTo(PaymentStatus.SUCCESS);
        assertThat(updatedPayment.getRefundStatus()).isEqualTo(PaymentRefundStatus.REFUND_REQUIRED);

        Voucher updatedVoucher = voucherRepository.findById(voucher.getId()).orElseThrow();
        assertThat(updatedVoucher.getUsedCount())
                .as("CRITICAL INVARIANT: Voucher usedCount must be reverted exactly once to 0 and not become negative")
                .isEqualTo(0);

        VoucherRedemption updatedRedemption = voucherRedemptionRepository.findById(redemption.getId()).orElseThrow();
        assertThat(updatedRedemption.getStatus()).isEqualTo(VoucherRedemptionStatus.RELEASED);
    }
}
