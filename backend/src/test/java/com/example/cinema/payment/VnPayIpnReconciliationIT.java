package com.example.cinema.payment;

import com.example.cinema.auth.entity.User;
import com.example.cinema.auth.enums.Role;
import com.example.cinema.auth.repository.UserRepository;
import com.example.cinema.booking.entity.Booking;
import com.example.cinema.booking.entity.BookingItem;
import com.example.cinema.booking.enums.BookingStatus;
import com.example.cinema.booking.repository.BookingItemRepository;
import com.example.cinema.booking.repository.BookingRepository;
import com.example.cinema.common.AbstractMySqlIT;
import com.example.cinema.movie.entity.Movie;
import com.example.cinema.movie.enums.AgeRating;
import com.example.cinema.movie.enums.MovieStatus;
import com.example.cinema.movie.repository.MovieRepository;
import com.example.cinema.payment.config.VnPayProperties;
import com.example.cinema.payment.config.VnPayUtil;
import com.example.cinema.payment.dto.response.VnPayIpnResponse;
import com.example.cinema.payment.entity.Payment;
import com.example.cinema.payment.enums.PaymentProvider;
import com.example.cinema.payment.enums.PaymentRefundStatus;
import com.example.cinema.payment.enums.PaymentStatus;
import com.example.cinema.payment.repository.PaymentRepository;
import com.example.cinema.payment.service.PaymentService;
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
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

public class VnPayIpnReconciliationIT extends AbstractMySqlIT {

    @Autowired
    PaymentService paymentService;

    @Autowired
    PaymentRepository paymentRepository;

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
    VnPayProperties vnPayProperties;

    Cinema cinema;
    Room room;
    Seat seat;
    Movie movie;
    Showtime showtime;
    ShowtimeSeat showtimeSeat;
    User user;
    Booking booking;
    Payment payment;
    String txnRef;

    @BeforeEach
    void setUp() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        txnRef = "TXN_RECON_" + suffix;

        cinema = cinemaRepository.save(Cinema.builder()
                .name("Recon Cinema " + suffix)
                .address("202 Reconciliation St")
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
                .title("Recon Movie " + suffix)
                .durationMinutes(120)
                .releaseDate(LocalDate.now().plusDays(1))
                .ageRating(AgeRating.P)
                .originalLanguage("vi")
                .status(MovieStatus.NOW_SHOWING)
                .build());

        LocalDateTime start = LocalDateTime.now().plusDays(2);
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
                .email("recon_user_" + suffix + "@cinema.com")
                .fullName("Reconciliation User")
                .passwordHash("secret_hash")
                .phone("0988776655")
                .role(Role.CUSTOMER)
                .isActive(true)
                .build());

        booking = bookingRepository.save(Booking.builder()
                .user(user)
                .showtime(showtime)
                .bookingCode("BK_RECON_" + suffix)
                .status(BookingStatus.PENDING_PAYMENT)
                .subtotalAmount(60000L)
                .discountAmount(0L)
                .finalAmount(60000L)
                .expiresAt(LocalDateTime.now().plusMinutes(10))
                .build());

        showtimeSeat = showtimeSeatRepository.save(ShowtimeSeat.builder()
                .showtime(showtime)
                .seat(seat)
                .status(ShowtimeSeatStatus.HELD)
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
                .transactionRef(txnRef)
                .amount(60000L)
                .status(PaymentStatus.PENDING)
                .refundStatus(PaymentRefundStatus.NONE)
                .build());
    }

    @AfterEach
    void tearDown() {
        if (payment != null) paymentRepository.delete(payment);
        if (booking != null) {
            bookingItemRepository.deleteAll(bookingItemRepository.findByBookingId(booking.getId()));
            bookingRepository.delete(booking);
        }
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
    @DisplayName("IPN Test 1: Amount Mismatch (Error 04) -> Returns 04 and leaves DB status unchanged")
    void ipnAmountMismatch_returnsError04_andLeavesStatusUnchanged() {
        Map<String, String> ipnParams = createBaseIpnParams();
        // Database amount is 60000L (VNPay expected 6000000), send mismatched 5000000
        ipnParams.put("vnp_Amount", "5000000");
        signParams(ipnParams);

        VnPayIpnResponse response = paymentService.processVnPayIpn(ipnParams);

        assertThat(response.rspCode()).isEqualTo("04");
        assertThat(response.message()).isEqualTo("Invalid Amount");

        Payment reloadedPayment = paymentRepository.findById(payment.getId()).orElseThrow();
        assertThat(reloadedPayment.getStatus()).isEqualTo(PaymentStatus.PENDING);

        Booking reloadedBooking = bookingRepository.findById(booking.getId()).orElseThrow();
        assertThat(reloadedBooking.getStatus()).isEqualTo(BookingStatus.PENDING_PAYMENT);
    }

    @Test
    @DisplayName("IPN Test 2: Duplicate IPN (Error 02) -> First succeeds, second returns 02 without duplicate payment")
    void duplicateIpn_returns02_andPreventsDuplicateProcessing() {
        Map<String, String> ipnParams = createBaseIpnParams();
        signParams(ipnParams);

        // First callback: should succeed
        VnPayIpnResponse firstResponse = paymentService.processVnPayIpn(ipnParams);
        assertThat(firstResponse.rspCode()).isEqualTo("00");
        assertThat(firstResponse.message()).isEqualTo("Confirm Success");

        Booking confirmedBooking = bookingRepository.findById(booking.getId()).orElseThrow();
        assertThat(confirmedBooking.getStatus()).isEqualTo(BookingStatus.CONFIRMED);

        Payment successfulPayment = paymentRepository.findById(payment.getId()).orElseThrow();
        assertThat(successfulPayment.getStatus()).isEqualTo(PaymentStatus.SUCCESS);

        // Second identical callback: should return 02 (Order already confirmed)
        VnPayIpnResponse secondResponse = paymentService.processVnPayIpn(ipnParams);
        assertThat(secondResponse.rspCode()).isEqualTo("02");
        assertThat(secondResponse.message()).isEqualTo("Order already confirmed");

        // Verify no duplicate payment inserted
        assertThat(paymentRepository.findByBookingIdOrderByCreatedAtAsc(booking.getId())).hasSize(1);
    }

    @Test
    @DisplayName("IPN Test 3: Late Recovery (TH2) -> Expired booking paid on-time with empty seat is restored to CONFIRMED")
    void lateRecovery_whenExpiredBookingPaidOnTimeAndSeatFree_recoversToConfirmed() {
        LocalDateTime now = LocalDateTime.now();
        // Booking expired but payDate is before/on expiresAt
        booking.setStatus(BookingStatus.EXPIRED);
        booking.setExpiresAt(now.plusMinutes(5));
        bookingRepository.save(booking);

        // Seat was released back to AVAILABLE
        showtimeSeat.setStatus(ShowtimeSeatStatus.AVAILABLE);
        showtimeSeat.setHeldByBookingId(null);
        showtimeSeatRepository.save(showtimeSeat);

        Map<String, String> ipnParams = createBaseIpnParams();
        ipnParams.put("vnp_PayDate", VnPayUtil.formatVnPayDate(now));
        signParams(ipnParams);

        VnPayIpnResponse response = paymentService.processVnPayIpn(ipnParams);

        assertThat(response.rspCode()).isEqualTo("00");
        assertThat(response.message()).isEqualTo("Confirm Success");

        Booking recoveredBooking = bookingRepository.findById(booking.getId()).orElseThrow();
        assertThat(recoveredBooking.getStatus()).isEqualTo(BookingStatus.CONFIRMED);

        ShowtimeSeat recoveredSeat = showtimeSeatRepository.findById(showtimeSeat.getId()).orElseThrow();
        assertThat(recoveredSeat.getStatus()).isEqualTo(ShowtimeSeatStatus.BOOKED);
        assertThat(recoveredSeat.getHeldByBookingId()).isEqualTo(booking.getId());

        Payment reloadedPayment = paymentRepository.findById(payment.getId()).orElseThrow();
        assertThat(reloadedPayment.getStatus()).isEqualTo(PaymentStatus.SUCCESS);
        assertThat(reloadedPayment.getRefundStatus()).isEqualTo(PaymentRefundStatus.NONE);
    }

    @Test
    @DisplayName("IPN Test 4: Refund Required (TH3) -> Expired booking whose seat was taken is marked REFUND_REQUIRED without ticket delivery")
    void refundRequired_whenExpiredBookingSeatTaken_marksRefundRequiredWithoutConfirmingBooking() {
        LocalDateTime now = LocalDateTime.now();
        booking.setStatus(BookingStatus.EXPIRED);
        booking.setExpiresAt(now.minusMinutes(2));
        bookingRepository.save(booking);

        // Seat is taken by another user / another booking
        User competitor = userRepository.save(User.builder()
                .email("competitor_" + UUID.randomUUID().toString().substring(0, 6) + "@cinema.com")
                .fullName("Competitor User")
                .passwordHash("competitor_hash")
                .phone("0911223344")
                .role(Role.CUSTOMER)
                .isActive(true)
                .build());

        Booking otherBooking = bookingRepository.save(Booking.builder()
                .user(competitor)
                .showtime(showtime)
                .bookingCode("BK_COMPETITOR_" + UUID.randomUUID().toString().substring(0, 6))
                .status(BookingStatus.CONFIRMED)
                .subtotalAmount(60000L)
                .discountAmount(0L)
                .finalAmount(60000L)
                .expiresAt(now.plusHours(1))
                .build());

        showtimeSeat.setStatus(ShowtimeSeatStatus.BOOKED);
        showtimeSeat.setHeldByBookingId(otherBooking.getId());
        showtimeSeatRepository.save(showtimeSeat);

        Map<String, String> ipnParams = createBaseIpnParams();
        ipnParams.put("vnp_PayDate", VnPayUtil.formatVnPayDate(now));
        signParams(ipnParams);

        try {
            VnPayIpnResponse response = paymentService.processVnPayIpn(ipnParams);

            assertThat(response.rspCode()).isEqualTo("00");
            assertThat(response.message()).isEqualTo("Confirm Success");

            // Booking remains EXPIRED (ticket not issued to original user)
            Booking originalBooking = bookingRepository.findById(booking.getId()).orElseThrow();
            assertThat(originalBooking.getStatus()).isEqualTo(BookingStatus.EXPIRED);

            // Payment must be marked SUCCESS with REFUND_REQUIRED
            Payment reloadedPayment = paymentRepository.findById(payment.getId()).orElseThrow();
            assertThat(reloadedPayment.getStatus()).isEqualTo(PaymentStatus.SUCCESS);
            assertThat(reloadedPayment.getRefundStatus()).isEqualTo(PaymentRefundStatus.REFUND_REQUIRED);

            // Seat remains assigned to competitor
            ShowtimeSeat currentSeat = showtimeSeatRepository.findById(showtimeSeat.getId()).orElseThrow();
            assertThat(currentSeat.getHeldByBookingId()).isEqualTo(otherBooking.getId());
        } finally {
            bookingRepository.delete(otherBooking);
            userRepository.delete(competitor);
        }
    }

    private Map<String, String> createBaseIpnParams() {
        Map<String, String> ipnParams = new HashMap<>();
        ipnParams.put("vnp_TxnRef", txnRef);
        ipnParams.put("vnp_Amount", String.valueOf(payment.getAmount() * 100L));
        ipnParams.put("vnp_ResponseCode", "00");
        ipnParams.put("vnp_TransactionStatus", "00");
        ipnParams.put("vnp_TransactionNo", "14888999");
        ipnParams.put("vnp_PayDate", "20261109120000");
        return ipnParams;
    }

    private void signParams(Map<String, String> params) {
        Map<String, String> sortedParams = new TreeMap<>();
        for (Map.Entry<String, String> entry : params.entrySet()) {
            String key = entry.getKey();
            String value = entry.getValue();
            if (key != null
                    && !key.equalsIgnoreCase("vnp_SecureHash")
                    && !key.equalsIgnoreCase("vnp_SecureHashType")
                    && value != null
                    && !value.isBlank()) {
                sortedParams.put(key, value);
            }
        }
        String hashData = sortedParams.entrySet().stream()
                .map(entry -> URLEncoder.encode(entry.getKey(), StandardCharsets.US_ASCII) + "=" +
                        URLEncoder.encode(entry.getValue(), StandardCharsets.US_ASCII))
                .collect(Collectors.joining("&"));
        String secureHash = VnPayUtil.hmacSHA512(vnPayProperties.getHashSecret(), hashData);
        params.put("vnp_SecureHash", secureHash);
    }
}

