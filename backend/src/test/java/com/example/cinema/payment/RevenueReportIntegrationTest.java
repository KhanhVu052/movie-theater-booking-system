package com.example.cinema.payment;

import com.example.cinema.auth.entity.User;
import com.example.cinema.auth.enums.Role;
import com.example.cinema.auth.repository.UserRepository;
import com.example.cinema.booking.entity.Booking;
import com.example.cinema.booking.entity.BookingItem;
import com.example.cinema.booking.enums.BookingStatus;
import com.example.cinema.booking.repository.BookingItemRepository;
import com.example.cinema.booking.repository.BookingRepository;
import com.example.cinema.movie.entity.Movie;
import com.example.cinema.movie.enums.AgeRating;
import com.example.cinema.movie.enums.MovieStatus;
import com.example.cinema.movie.repository.MovieRepository;
import com.example.cinema.payment.dto.response.RevenueReportResponse;
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

@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class RevenueReportIntegrationTest extends AbstractMySqlIT {

    @Autowired
    PaymentService paymentService;

    @Autowired
    PaymentRepository paymentRepository;

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
    EntityManager entityManager;

    private User testUser;
    private Movie testMovie;
    private Showtime testShowtime;
    private List<ShowtimeSeat> showtimeSeats;

    @BeforeEach
    void setUp() {
        String testId = UUID.randomUUID().toString().substring(0, 8);

        testUser = userRepository.save(User.builder()
                .email("rev-user-" + testId + "@cinema.com")
                .passwordHash("hashedpassword")
                .fullName("Revenue User " + testId)
                .phone("098" + testId.replaceAll("[^0-9]", "3").substring(0, Math.min(6, testId.length())) + "111")
                .role(Role.CUSTOMER)
                .isActive(true)
                .build());

        Cinema cinema = cinemaRepository.save(Cinema.builder()
                .name("Revenue Cinema " + testId)
                .address("123 Revenue St " + testId)
                .build());

        Room room = roomRepository.save(Room.builder()
                .cinema(cinema)
                .name("Revenue Hall " + testId)
                .totalRows(5)
                .totalColumns(5)
                .isActive(true)
                .build());

        // Create 25 physical seats (5 rows x 5 seats)
        List<Seat> physicalSeats = new ArrayList<>();
        String[] rows = {"A", "B", "C", "D", "E"};
        for (String r : rows) {
            for (int col = 1; col <= 5; col++) {
                physicalSeats.add(seatRepository.save(Seat.builder()
                        .room(room)
                        .rowName(r)
                        .seatNumber(col)
                        .type(SeatType.NORMAL)
                        .isActive(true)
                        .build()));
            }
        }

        testMovie = movieRepository.save(Movie.builder()
                .title("Revenue Movie " + testId)
                .durationMinutes(120)
                .releaseDate(LocalDate.now().minusDays(3))
                .ageRating(AgeRating.P)
                .originalLanguage("Vietnamese")
                .status(MovieStatus.NOW_SHOWING)
                .build());

        LocalDateTime now = LocalDateTime.now();
        testShowtime = showtimeRepository.save(Showtime.builder()
                .movie(testMovie)
                .room(room)
                .format(ShowtimeFormat._2D)
                .translationType(TranslationType.SUBTITLE)
                .startTime(now.plusHours(2))
                .endTime(now.plusHours(4))
                .cleaningEndTime(now.plusHours(4).plusMinutes(15))
                .basePrice(80000L)
                .status(ShowtimeStatus.SCHEDULED)
                .build());

        showtimeSeats = new ArrayList<>();
        for (Seat s : physicalSeats) {
            showtimeSeats.add(showtimeSeatRepository.save(ShowtimeSeat.builder()
                    .showtime(testShowtime)
                    .seat(s)
                    .price(80000L)
                    .status(ShowtimeSeatStatus.AVAILABLE)
                    .build()));
        }

        entityManager.flush();
        entityManager.clear();
    }

    @Test
    @DisplayName("G2-06 Case 1: Showtime with 25 seats, 2 CONFIRMED bookings (3 + 2 seats) -> tickets = 5, occupancy = 20.0%")
    void testCase1_exactTicketCountAndOccupancy() {
        // Booking 1: 3 seats
        Booking booking1 = bookingRepository.save(Booking.builder()
                .bookingCode("BK1-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase())
                .user(testUser)
                .showtime(testShowtime)
                .subtotalAmount(240000L)
                .discountAmount(0L)
                .finalAmount(240000L)
                .status(BookingStatus.CONFIRMED)
                .expiresAt(LocalDateTime.now().plusMinutes(15))
                .build());

        for (int i = 0; i < 3; i++) {
            bookingItemRepository.save(BookingItem.builder()
                    .booking(booking1)
                    .showtimeSeat(showtimeSeats.get(i))
                    .price(80000L)
                    .build());
        }

        paymentRepository.save(Payment.builder()
                .booking(booking1)
                .provider(PaymentProvider.VNPAY)
                .transactionRef("TX1-" + UUID.randomUUID().toString().substring(0, 8))
                .amount(240000L)
                .status(PaymentStatus.SUCCESS)
                .refundStatus(PaymentRefundStatus.NONE)
                .payDate(LocalDateTime.now())
                .build());

        // Booking 2: 2 seats
        Booking booking2 = bookingRepository.save(Booking.builder()
                .bookingCode("BK2-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase())
                .user(testUser)
                .showtime(testShowtime)
                .subtotalAmount(160000L)
                .discountAmount(0L)
                .finalAmount(160000L)
                .status(BookingStatus.CONFIRMED)
                .expiresAt(LocalDateTime.now().plusMinutes(15))
                .build());

        for (int i = 3; i < 5; i++) {
            bookingItemRepository.save(BookingItem.builder()
                    .booking(booking2)
                    .showtimeSeat(showtimeSeats.get(i))
                    .price(80000L)
                    .build());
        }

        paymentRepository.save(Payment.builder()
                .booking(booking2)
                .provider(PaymentProvider.VNPAY)
                .transactionRef("TX2-" + UUID.randomUUID().toString().substring(0, 8))
                .amount(160000L)
                .status(PaymentStatus.SUCCESS)
                .refundStatus(PaymentRefundStatus.NONE)
                .payDate(LocalDateTime.now())
                .build());

        entityManager.flush();
        entityManager.clear();

        // Query revenue report for today
        RevenueReportResponse report = paymentService.getRevenueReport(LocalDate.now(), LocalDate.now());

        // Assertions
        assertThat(report).isNotNull();
        assertThat(report.totalTicketsSold()).isEqualTo(5L);
        assertThat(report.totalRealizedRevenue()).isEqualTo(400000L);
        assertThat(report.totalSuccessfulTransactions()).isEqualTo(2L);

        RevenueReportResponse.MovieRevenueItem movieItem = report.movieBreakdowns().stream()
                .filter(m -> m.movieId().equals(testMovie.getId()))
                .findFirst()
                .orElse(null);

        assertThat(movieItem).isNotNull();
        assertThat(movieItem.ticketsSold()).isEqualTo(5L);
        assertThat(movieItem.totalBookings()).isEqualTo(2L);
        assertThat(movieItem.totalScreenings()).isEqualTo(1L);
        assertThat(movieItem.occupancyRate()).isEqualTo(20.0);
        assertThat(movieItem.revenue()).isEqualTo(400000L);
    }

    @Test
    @DisplayName("G2-06 Case 2: Additional booking with REFUND_REQUIRED payment is excluded from tickets and revenue")
    void testCase2_excludesRefundRequiredPayments() {
        // Setup base 2 bookings (3 + 2 seats)
        Booking booking1 = bookingRepository.save(Booking.builder()
                .bookingCode("BK1-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase())
                .user(testUser)
                .showtime(testShowtime)
                .subtotalAmount(240000L)
                .discountAmount(0L)
                .finalAmount(240000L)
                .status(BookingStatus.CONFIRMED)
                .expiresAt(LocalDateTime.now().plusMinutes(15))
                .build());
        for (int i = 0; i < 3; i++) {
            bookingItemRepository.save(BookingItem.builder()
                    .booking(booking1)
                    .showtimeSeat(showtimeSeats.get(i))
                    .price(80000L)
                    .build());
        }
        paymentRepository.save(Payment.builder()
                .booking(booking1)
                .provider(PaymentProvider.VNPAY)
                .transactionRef("TX1-" + UUID.randomUUID().toString().substring(0, 8))
                .amount(240000L)
                .status(PaymentStatus.SUCCESS)
                .refundStatus(PaymentRefundStatus.NONE)
                .payDate(LocalDateTime.now())
                .build());

        Booking booking2 = bookingRepository.save(Booking.builder()
                .bookingCode("BK2-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase())
                .user(testUser)
                .showtime(testShowtime)
                .subtotalAmount(160000L)
                .discountAmount(0L)
                .finalAmount(160000L)
                .status(BookingStatus.CONFIRMED)
                .expiresAt(LocalDateTime.now().plusMinutes(15))
                .build());
        for (int i = 3; i < 5; i++) {
            bookingItemRepository.save(BookingItem.builder()
                    .booking(booking2)
                    .showtimeSeat(showtimeSeats.get(i))
                    .price(80000L)
                    .build());
        }
        paymentRepository.save(Payment.builder()
                .booking(booking2)
                .provider(PaymentProvider.VNPAY)
                .transactionRef("TX2-" + UUID.randomUUID().toString().substring(0, 8))
                .amount(160000L)
                .status(PaymentStatus.SUCCESS)
                .refundStatus(PaymentRefundStatus.NONE)
                .payDate(LocalDateTime.now())
                .build());

        // Booking 3: 2 seats, but refundStatus = REFUND_REQUIRED
        Booking booking3 = bookingRepository.save(Booking.builder()
                .bookingCode("BK3-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase())
                .user(testUser)
                .showtime(testShowtime)
                .subtotalAmount(160000L)
                .discountAmount(0L)
                .finalAmount(160000L)
                .status(BookingStatus.CANCELLED)
                .expiresAt(LocalDateTime.now().plusMinutes(15))
                .build());
        for (int i = 5; i < 7; i++) {
            bookingItemRepository.save(BookingItem.builder()
                    .booking(booking3)
                    .showtimeSeat(showtimeSeats.get(i))
                    .price(80000L)
                    .build());
        }
        paymentRepository.save(Payment.builder()
                .booking(booking3)
                .provider(PaymentProvider.VNPAY)
                .transactionRef("TX3-" + UUID.randomUUID().toString().substring(0, 8))
                .amount(160000L)
                .status(PaymentStatus.SUCCESS)
                .refundStatus(PaymentRefundStatus.REFUND_REQUIRED)
                .payDate(LocalDateTime.now())
                .build());

        entityManager.flush();
        entityManager.clear();

        RevenueReportResponse report = paymentService.getRevenueReport(LocalDate.now(), LocalDate.now());

        // Assertions: Tickets sold is still 5, revenue is still 400,000, refund_required is tracked
        assertThat(report).isNotNull();
        assertThat(report.totalTicketsSold()).isEqualTo(5L);
        assertThat(report.totalRealizedRevenue()).isEqualTo(400000L);
        assertThat(report.totalPendingRefunds()).isGreaterThanOrEqualTo(1L);

        RevenueReportResponse.MovieRevenueItem movieItem = report.movieBreakdowns().stream()
                .filter(m -> m.movieId().equals(testMovie.getId()))
                .findFirst()
                .orElse(null);

        assertThat(movieItem).isNotNull();
        assertThat(movieItem.ticketsSold()).isEqualTo(5L);
        assertThat(movieItem.occupancyRate()).isEqualTo(20.0);
        assertThat(movieItem.revenue()).isEqualTo(400000L);
    }

    @Test
    @DisplayName("G2-06 Case 3: Date range without showtimes (capacity = 0) -> occupancy is 0.0, no division by zero")
    void testCase3_zeroCapacityHandledGracefully() {
        LocalDate futureDate = LocalDate.now().plusYears(2);
        RevenueReportResponse report = paymentService.getRevenueReport(futureDate, futureDate.plusDays(1));

        assertThat(report).isNotNull();
        assertThat(report.totalTicketsSold()).isEqualTo(0L);
        assertThat(report.totalRealizedRevenue()).isEqualTo(0L);

        for (RevenueReportResponse.MovieRevenueItem item : report.movieBreakdowns()) {
            assertThat(item.occupancyRate()).isEqualTo(0.0);
        }
    }
}
