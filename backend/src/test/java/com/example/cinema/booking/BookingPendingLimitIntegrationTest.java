package com.example.cinema.booking;

import com.example.cinema.auth.entity.User;
import com.example.cinema.auth.enums.Role;
import com.example.cinema.auth.repository.UserRepository;
import com.example.cinema.booking.dto.request.BookingCreateRequest;
import com.example.cinema.booking.dto.response.BookingResponse;
import com.example.cinema.booking.entity.Booking;
import com.example.cinema.booking.enums.BookingStatus;
import com.example.cinema.booking.repository.BookingRepository;
import com.example.cinema.booking.service.BookingService;
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
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
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
public class BookingPendingLimitIntegrationTest extends AbstractMySqlIT {

    @Autowired
    BookingService bookingService;

    @Autowired
    BookingRepository bookingRepository;

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
    private Showtime testShowtime;
    private List<ShowtimeSeat> testSeats;

    @BeforeEach
    void setUp() {
        String testId = UUID.randomUUID().toString().substring(0, 8);

        testUser = userRepository.save(User.builder()
                .email("cust-" + testId + "@cinema.com")
                .passwordHash("hashedpassword")
                .fullName("Customer " + testId)
                .phone("098" + testId.replaceAll("[^0-9]", "2").substring(0, Math.min(6, testId.length())) + "111")
                .role(Role.CUSTOMER)
                .isActive(true)
                .build());

        Cinema cinema = cinemaRepository.save(Cinema.builder()
                .name("Cinema " + testId)
                .address("Pending Test Address " + testId)
                .build());

        Room room = roomRepository.save(Room.builder()
                .cinema(cinema)
                .name("Hall " + testId)
                .totalRows(2)
                .totalColumns(5)
                .isActive(true)
                .build());

        List<Seat> physicalSeats = new ArrayList<>();
        for (int c = 1; c <= 5; c++) {
            physicalSeats.add(seatRepository.save(Seat.builder()
                    .room(room)
                    .rowName("A")
                    .seatNumber(c)
                    .type(SeatType.NORMAL)
                    .isActive(true)
                    .build()));
        }

        Movie movie = movieRepository.save(Movie.builder()
                .title("Movie " + testId)
                .durationMinutes(120)
                .releaseDate(LocalDate.now().minusDays(5))
                .ageRating(AgeRating.P)
                .originalLanguage("Vietnamese")
                .status(MovieStatus.NOW_SHOWING)
                .build());

        LocalDateTime showtimeStart = LocalDateTime.now().plusDays(1);
        testShowtime = showtimeRepository.save(Showtime.builder()
                .movie(movie)
                .room(room)
                .format(ShowtimeFormat._2D)
                .translationType(TranslationType.SUBTITLE)
                .startTime(showtimeStart)
                .endTime(showtimeStart.plusMinutes(120))
                .cleaningEndTime(showtimeStart.plusMinutes(135))
                .basePrice(90000L)
                .status(ShowtimeStatus.SCHEDULED)
                .build());

        testSeats = new ArrayList<>();
        for (Seat seat : physicalSeats) {
            testSeats.add(showtimeSeatRepository.save(ShowtimeSeat.builder()
                    .showtime(testShowtime)
                    .seat(seat)
                    .price(90000L)
                    .status(ShowtimeSeatStatus.AVAILABLE)
                    .build()));
        }

        entityManager.flush();
        entityManager.clear();
    }

    @Test
    @DisplayName("G2-01: User with 2 active PENDING_PAYMENT bookings cannot create 3rd booking (HTTP 429, ErrorCode 1507)")
    void userWithTwoActivePendingBookings_cannotCreateThirdBooking() {
        // Create 2 active PENDING_PAYMENT bookings (expiresAt in future)
        bookingRepository.save(Booking.builder()
                .bookingCode("BK-ACT-1-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase())
                .user(testUser)
                .showtime(testShowtime)
                .subtotalAmount(90000L)
                .discountAmount(0L)
                .finalAmount(90000L)
                .status(BookingStatus.PENDING_PAYMENT)
                .expiresAt(LocalDateTime.now().plusMinutes(10))
                .build());

        bookingRepository.save(Booking.builder()
                .bookingCode("BK-ACT-2-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase())
                .user(testUser)
                .showtime(testShowtime)
                .subtotalAmount(90000L)
                .discountAmount(0L)
                .finalAmount(90000L)
                .status(BookingStatus.PENDING_PAYMENT)
                .expiresAt(LocalDateTime.now().plusMinutes(8))
                .build());

        entityManager.flush();
        entityManager.clear();

        // Attempt to create 3rd booking
        BookingCreateRequest request = new BookingCreateRequest(
                testShowtime.getId(),
                List.of(testSeats.get(0).getId()),
                null
        );

        assertThatThrownBy(() -> bookingService.createBooking(testUser.getEmail(), request))
                .isInstanceOf(AppException.class)
                .satisfies(ex -> {
                    AppException appEx = (AppException) ex;
                    assertThat(appEx.getErrorCode()).isEqualTo(ErrorCode.TOO_MANY_PENDING_BOOKINGS);
                    assertThat(appEx.getErrorCode().getCode()).isEqualTo(1507);
                    assertThat(appEx.getErrorCode().getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
                });
    }

    @Test
    @DisplayName("G2-01: User with expired PENDING_PAYMENT bookings can create booking successfully")
    void userWithExpiredPendingBookings_canCreateBookingSuccessfully() {
        // Create 2 expired PENDING_PAYMENT bookings (expiresAt in the past)
        bookingRepository.save(Booking.builder()
                .bookingCode("BK-EXP-1-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase())
                .user(testUser)
                .showtime(testShowtime)
                .subtotalAmount(90000L)
                .discountAmount(0L)
                .finalAmount(90000L)
                .status(BookingStatus.PENDING_PAYMENT)
                .expiresAt(LocalDateTime.now().minusMinutes(5))
                .build());

        bookingRepository.save(Booking.builder()
                .bookingCode("BK-EXP-2-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase())
                .user(testUser)
                .showtime(testShowtime)
                .subtotalAmount(90000L)
                .discountAmount(0L)
                .finalAmount(90000L)
                .status(BookingStatus.PENDING_PAYMENT)
                .expiresAt(LocalDateTime.now().minusMinutes(2))
                .build());

        entityManager.flush();
        entityManager.clear();

        // Attempt to create booking - should succeed
        BookingCreateRequest request = new BookingCreateRequest(
                testShowtime.getId(),
                List.of(testSeats.get(0).getId()),
                null
        );

        BookingResponse response = bookingService.createBooking(testUser.getEmail(), request);

        assertThat(response).isNotNull();
        assertThat(response.status()).isEqualTo(BookingStatus.PENDING_PAYMENT);
        assertThat(response.subtotalAmount()).isEqualTo(90000L);
    }
}
