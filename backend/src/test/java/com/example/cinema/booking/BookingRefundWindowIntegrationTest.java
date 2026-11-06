package com.example.cinema.booking;

import com.example.cinema.auth.entity.User;
import com.example.cinema.auth.enums.Role;
import com.example.cinema.auth.repository.UserRepository;
import com.example.cinema.booking.dto.response.BookingResponse;
import com.example.cinema.booking.entity.Booking;
import com.example.cinema.booking.entity.BookingItem;
import com.example.cinema.booking.enums.BookingStatus;
import com.example.cinema.booking.repository.BookingItemRepository;
import com.example.cinema.booking.repository.BookingRepository;
import com.example.cinema.booking.service.BookingService;
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
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import com.example.cinema.common.AbstractMySqlIT;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class BookingRefundWindowIntegrationTest extends AbstractMySqlIT {

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

    @Autowired
    PaymentRepository paymentRepository;

    @Autowired
    VoucherRepository voucherRepository;

    @Autowired
    VoucherRedemptionRepository voucherRedemptionRepository;

    @Autowired
    EntityManager entityManager;

    private User testUser;
    private User otherUser;
    private Movie testMovie;
    private Room testRoom;
    private List<Seat> physicalSeats;

    @BeforeEach
    void setUp() {
        String testId = UUID.randomUUID().toString().substring(0, 8);

        testUser = userRepository.save(User.builder()
                .email("refund-user-" + testId + "@cinema.com")
                .passwordHash("hashedpassword")
                .fullName("Refund Test User " + testId)
                .phone("091" + testId.replaceAll("[^0-9]", "5").substring(0, Math.min(6, testId.length())) + "444")
                .role(Role.CUSTOMER)
                .isActive(true)
                .build());

        otherUser = userRepository.save(User.builder()
                .email("other-user-" + testId + "@cinema.com")
                .passwordHash("hashedpassword")
                .fullName("Other User " + testId)
                .phone("092" + testId.replaceAll("[^0-9]", "6").substring(0, Math.min(6, testId.length())) + "555")
                .role(Role.CUSTOMER)
                .isActive(true)
                .build());

        Cinema cinema = cinemaRepository.save(Cinema.builder()
                .name("Cinema Refund " + testId)
                .address("Refund Address " + testId)
                .build());

        testRoom = roomRepository.save(Room.builder()
                .cinema(cinema)
                .name("Refund Hall " + testId)
                .totalRows(2)
                .totalColumns(5)
                .isActive(true)
                .build());

        physicalSeats = new ArrayList<>();
        for (int c = 1; c <= 5; c++) {
            physicalSeats.add(seatRepository.save(Seat.builder()
                    .room(testRoom)
                    .rowName("A")
                    .seatNumber(c)
                    .type(SeatType.NORMAL)
                    .isActive(true)
                    .build()));
        }

        testMovie = movieRepository.save(Movie.builder()
                .title("Refund Movie " + testId)
                .durationMinutes(120)
                .releaseDate(LocalDate.now().minusDays(2))
                .ageRating(AgeRating.P)
                .originalLanguage("Vietnamese")
                .status(MovieStatus.NOW_SHOWING)
                .build());

        entityManager.flush();
        entityManager.clear();
    }

    private Booking createConfirmedBookingWithPaymentAndVoucher(LocalDateTime startTime, boolean withVoucher) {
        Showtime showtime = showtimeRepository.save(Showtime.builder()
                .movie(testMovie)
                .room(testRoom)
                .format(ShowtimeFormat._2D)
                .translationType(TranslationType.SUBTITLE)
                .startTime(startTime)
                .endTime(startTime.plusMinutes(120))
                .cleaningEndTime(startTime.plusMinutes(135))
                .basePrice(100000L)
                .status(ShowtimeStatus.SCHEDULED)
                .build());

        ShowtimeSeat showtimeSeat = showtimeSeatRepository.save(ShowtimeSeat.builder()
                .showtime(showtime)
                .seat(physicalSeats.get(0))
                .price(100000L)
                .status(ShowtimeSeatStatus.BOOKED)
                .build());

        Voucher voucher = null;
        if (withVoucher) {
            String code = "VOUC-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
            voucher = voucherRepository.save(Voucher.builder()
                    .code(code)
                    .discountType(DiscountType.FIXED_AMOUNT)
                    .discountValue(20000L)
                    .minOrderValue(50000L)
                    .usageLimit(10)
                    .perUserLimit(1)
                    .usedCount(1)
                    .reservedCount(0)
                    .startAt(LocalDateTime.now().minusDays(1))
                    .endAt(LocalDateTime.now().plusDays(5))
                    .isActive(true)
                    .build());
        }

        Booking booking = bookingRepository.save(Booking.builder()
                .bookingCode("BK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .user(testUser)
                .showtime(showtime)
                .voucher(voucher)
                .subtotalAmount(100000L)
                .discountAmount(withVoucher ? 20000L : 0L)
                .finalAmount(withVoucher ? 80000L : 100000L)
                .status(BookingStatus.CONFIRMED)
                .expiresAt(LocalDateTime.now().minusMinutes(5))
                .build());

        showtimeSeat.setHeldByBookingId(booking.getId());
        showtimeSeatRepository.save(showtimeSeat);

        bookingItemRepository.save(BookingItem.builder()
                .booking(booking)
                .showtimeSeat(showtimeSeat)
                .price(100000L)
                .build());

        paymentRepository.save(Payment.builder()
                .booking(booking)
                .provider(PaymentProvider.VNPAY)
                .transactionRef("TXN-" + UUID.randomUUID().toString().substring(0, 8))
                .amount(booking.getFinalAmount())
                .status(PaymentStatus.SUCCESS)
                .refundStatus(PaymentRefundStatus.NONE)
                .build());

        if (withVoucher) {
            voucherRedemptionRepository.save(VoucherRedemption.builder()
                    .voucher(voucher)
                    .user(testUser)
                    .booking(booking)
                    .discountApplied(20000L)
                    .status(VoucherRedemptionStatus.USED)
                    .build());
        }

        entityManager.flush();
        return booking;
    }

    @Test
    @DisplayName("G2-05 Case 1: Hủy đơn CONFIRMED trước 60 phút -> Thành công, ghế về AVAILABLE, payment REFUND_REQUIRED, voucher hoàn lượt")
    void cancelConfirmedBooking_WhenBeforeCutoffWindow_SucceedsAndQueuesRefund() {
        LocalDateTime startTime = LocalDateTime.now().plusMinutes(120); // > 60 mins cutoff
        Booking booking = createConfirmedBookingWithPaymentAndVoucher(startTime, true);

        BookingResponse response = bookingService.cancelConfirmedBooking(testUser.getEmail(), booking.getId());

        assertThat(response).isNotNull();
        assertThat(response.status()).isEqualTo(BookingStatus.CANCELLED);

        // 1. Booking status is CANCELLED
        Booking refreshedBooking = bookingRepository.findById(booking.getId()).orElseThrow();
        assertThat(refreshedBooking.getStatus()).isEqualTo(BookingStatus.CANCELLED);

        // 2. Seat status is AVAILABLE and heldByBookingId is null
        List<ShowtimeSeat> seats = showtimeSeatRepository.findByShowtimeIdOrderBySeatRowNameAscSeatSeatNumberAsc(booking.getShowtime().getId());
        assertThat(seats.get(0).getStatus()).isEqualTo(ShowtimeSeatStatus.AVAILABLE);
        assertThat(seats.get(0).getHeldByBookingId()).isNull();

        // 3. Payment refundStatus is REFUND_REQUIRED
        List<Payment> payments = paymentRepository.findByBookingId(booking.getId());
        assertThat(payments).hasSize(1);
        assertThat(payments.get(0).getRefundStatus()).isEqualTo(PaymentRefundStatus.REFUND_REQUIRED);

        // 4. Voucher usedCount reverted (decremented by 1) and redemption RELEASED
        Voucher refreshedVoucher = voucherRepository.findById(booking.getVoucher().getId()).orElseThrow();
        assertThat(refreshedVoucher.getUsedCount()).isEqualTo(0);

        VoucherRedemption redemption = voucherRedemptionRepository.findByBookingId(booking.getId()).orElseThrow();
        assertThat(redemption.getStatus()).isEqualTo(VoucherRedemptionStatus.RELEASED);
    }

    @Test
    @DisplayName("G2-05 Case 2: Hủy đơn CONFIRMED khi còn dưới 60 phút trước giờ chiếu -> Bị từ chối với lỗi 1508")
    void cancelConfirmedBooking_WhenWithinCutoffWindow_ThrowsCancellationWindowClosed() {
        LocalDateTime startTime = LocalDateTime.now().plusMinutes(40); // < 60 mins cutoff
        Booking booking = createConfirmedBookingWithPaymentAndVoucher(startTime, false);

        assertThatThrownBy(() -> bookingService.cancelConfirmedBooking(testUser.getEmail(), booking.getId()))
                .isInstanceOf(AppException.class)
                .satisfies(ex -> {
                    AppException appEx = (AppException) ex;
                    assertThat(appEx.getErrorCode()).isEqualTo(ErrorCode.BOOKING_CANCELLATION_WINDOW_CLOSED);
                    assertThat(appEx.getErrorCode().getCode()).isEqualTo(1508);
                    assertThat(appEx.getMessage()).isEqualTo("Booking cancellation window has closed");
                });

        Booking refreshedBooking = bookingRepository.findById(booking.getId()).orElseThrow();
        assertThat(refreshedBooking.getStatus()).isEqualTo(BookingStatus.CONFIRMED);
    }

    @Test
    @DisplayName("G2-05 Case 3: Người dùng khác cố hủy đơn không thuộc về mình -> Bị chặn với lỗi 403 Forbidden")
    void cancelConfirmedBooking_WhenNotOwnerNorAdmin_ThrowsUnauthorized() {
        LocalDateTime startTime = LocalDateTime.now().plusMinutes(120);
        Booking booking = createConfirmedBookingWithPaymentAndVoucher(startTime, false);

        assertThatThrownBy(() -> bookingService.cancelConfirmedBooking(otherUser.getEmail(), booking.getId()))
                .isInstanceOf(AppException.class)
                .satisfies(ex -> {
                    AppException appEx = (AppException) ex;
                    assertThat(appEx.getErrorCode()).isEqualTo(ErrorCode.UNAUTHORIZED);
                    assertThat(appEx.getErrorCode().getStatusCode().value()).isEqualTo(403);
                });

        Booking refreshedBooking = bookingRepository.findById(booking.getId()).orElseThrow();
        assertThat(refreshedBooking.getStatus()).isEqualTo(BookingStatus.CONFIRMED);
    }
}
