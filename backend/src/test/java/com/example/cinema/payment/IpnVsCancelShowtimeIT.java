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
import com.example.cinema.common.ConcurrencyTestSupport;
import com.example.cinema.movie.entity.Movie;
import com.example.cinema.movie.enums.AgeRating;
import com.example.cinema.movie.enums.MovieStatus;
import com.example.cinema.movie.repository.MovieRepository;
import com.example.cinema.payment.config.VnPayProperties;
import com.example.cinema.payment.config.VnPayUtil;
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
import com.example.cinema.showtime.service.ShowtimeService;
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
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

public class IpnVsCancelShowtimeIT extends AbstractMySqlIT {

    @Autowired
    PaymentService paymentService;

    @Autowired
    ShowtimeService showtimeService;

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
        txnRef = "TXN_IPN_" + suffix;

        cinema = cinemaRepository.save(Cinema.builder()
                .name("IPN Cinema " + suffix)
                .address("101 IPN St")
                .hotline("19001111")
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
                .title("IPN Movie " + suffix)
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
                .email("ipn_user_" + suffix + "@cinema.com")
                .fullName("IPN User")
                .passwordHash("hash_secret")
                .phone("0922334455")
                .role(Role.CUSTOMER)
                .isActive(true)
                .build());

        booking = bookingRepository.save(Booking.builder()
                .user(user)
                .showtime(showtime)
                .bookingCode("BK_IPN_" + suffix)
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
    @DisplayName("FA-02 (3): Race condition VNPay IPN Success (TH1) vs Admin cancelShowtime -> Invariant: Never CANCELLED booking with Payment SUCCESS and refundStatus NONE")
    void ipnSuccessVsCancelShowtime_guaranteesRefundRequiredInvariant() throws Exception {
        Map<String, String> ipnParams = new HashMap<>();
        ipnParams.put("vnp_TxnRef", txnRef);
        ipnParams.put("vnp_Amount", String.valueOf(payment.getAmount() * 100L));
        ipnParams.put("vnp_ResponseCode", "00");
        ipnParams.put("vnp_TransactionStatus", "00");
        ipnParams.put("vnp_TransactionNo", "14000999");
        ipnParams.put("vnp_PayDate", "20261106120000");
        String secureHash = generateSecureHash(ipnParams, vnPayProperties.getHashSecret());
        ipnParams.put("vnp_SecureHash", secureHash);

        List<Runnable> concurrentActions = List.of(
                () -> paymentService.processVnPayIpn(ipnParams),
                () -> showtimeService.cancelShowtime(showtime.getId())
        );

        ConcurrencyTestSupport.executeConcurrentActions(concurrentActions);

        // Core system invariants verification
        Showtime updatedShowtime = showtimeRepository.findById(showtime.getId()).orElseThrow();
        assertThat(updatedShowtime.getStatus()).isEqualTo(ShowtimeStatus.CANCELLED);

        ShowtimeSeat updatedSeat = showtimeSeatRepository.findById(showtimeSeat.getId()).orElseThrow();
        assertThat(updatedSeat.getStatus()).isEqualTo(ShowtimeSeatStatus.AVAILABLE);
        assertThat(updatedSeat.getHeldByBookingId()).isNull();

        Booking updatedBooking = bookingRepository.findById(booking.getId()).orElseThrow();
        assertThat(updatedBooking.getStatus()).isEqualTo(BookingStatus.CANCELLED);

        Payment updatedPayment = paymentRepository.findById(payment.getId()).orElseThrow();
        if (updatedPayment.getStatus() == PaymentStatus.SUCCESS) {
            assertThat(updatedPayment.getRefundStatus())
                    .as("CRITICAL INVARIANT: A cancelled booking with successful payment MUST have REFUND_REQUIRED status")
                    .isEqualTo(PaymentRefundStatus.REFUND_REQUIRED);
        }
    }

    private String generateSecureHash(Map<String, String> params, String secret) {
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
        return VnPayUtil.hmacSHA512(secret, hashData);
    }
}
