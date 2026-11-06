package com.example.cinema.booking;

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
public class CoupleSeatIntegrationTest extends AbstractMySqlIT {

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
    EntityManager entityManager;

    private User testUser;
    private Showtime testShowtime;
    private ShowtimeSeat coupleSeat1;
    private ShowtimeSeat coupleSeat2;
    private ShowtimeSeat normalSeat1;
    private ShowtimeSeat normalSeat2;

    @BeforeEach
    void setUp() {
        String testId = UUID.randomUUID().toString().substring(0, 8);

        testUser = userRepository.save(User.builder()
                .email("couple-user-" + testId + "@cinema.com")
                .passwordHash("hashedpassword")
                .fullName("Couple Test User")
                .phone("090" + testId)
                .role(Role.CUSTOMER)
                .isActive(true)
                .build());

        Cinema cinema = cinemaRepository.save(Cinema.builder()
                .name("Couple Cinema " + testId)
                .address("123 Test Street")
                .hotline("19001111")
                .build());

        Room room = roomRepository.save(Room.builder()
                .cinema(cinema)
                .name("Room Couple " + testId)
                .totalRows(1)
                .totalColumns(4)
                .isActive(true)
                .build());

        // Seat 1 & 2: Couple seats in Pair Group 1
        Seat seat1 = seatRepository.save(Seat.builder()
                .room(room)
                .rowName("D")
                .seatNumber(1)
                .type(SeatType.COUPLE)
                .pairGroup(1)
                .isActive(true)
                .build());

        Seat seat2 = seatRepository.save(Seat.builder()
                .room(room)
                .rowName("D")
                .seatNumber(2)
                .type(SeatType.COUPLE)
                .pairGroup(1)
                .isActive(true)
                .build());

        // Seat 3 & 4: Normal seats
        Seat seat3 = seatRepository.save(Seat.builder()
                .room(room)
                .rowName("D")
                .seatNumber(3)
                .type(SeatType.NORMAL)
                .isActive(true)
                .build());

        Seat seat4 = seatRepository.save(Seat.builder()
                .room(room)
                .rowName("D")
                .seatNumber(4)
                .type(SeatType.NORMAL)
                .isActive(true)
                .build());

        Movie movie = movieRepository.save(Movie.builder()
                .title("Couple Movie " + testId)
                .director("Director")
                .originalLanguage("vi")
                .durationMinutes(120)
                .releaseDate(LocalDate.now().minusDays(5))
                .ageRating(AgeRating.P)
                .status(MovieStatus.NOW_SHOWING)
                .build());

        testShowtime = showtimeRepository.save(Showtime.builder()
                .movie(movie)
                .room(room)
                .format(ShowtimeFormat._2D)
                .translationType(TranslationType.SUBTITLE)
                .startTime(LocalDateTime.now().plusDays(1))
                .endTime(LocalDateTime.now().plusDays(1).plusMinutes(120))
                .cleaningEndTime(LocalDateTime.now().plusDays(1).plusMinutes(135))
                .basePrice(80000L)
                .status(ShowtimeStatus.SCHEDULED)
                .build());

        coupleSeat1 = showtimeSeatRepository.save(ShowtimeSeat.builder()
                .showtime(testShowtime)
                .seat(seat1)
                .price(80000L) // Each seat in pair has base price 80,000 (D-02)
                .status(ShowtimeSeatStatus.AVAILABLE)
                .build());

        coupleSeat2 = showtimeSeatRepository.save(ShowtimeSeat.builder()
                .showtime(testShowtime)
                .seat(seat2)
                .price(80000L)
                .status(ShowtimeSeatStatus.AVAILABLE)
                .build());

        normalSeat1 = showtimeSeatRepository.save(ShowtimeSeat.builder()
                .showtime(testShowtime)
                .seat(seat3)
                .price(80000L)
                .status(ShowtimeSeatStatus.AVAILABLE)
                .build());

        normalSeat2 = showtimeSeatRepository.save(ShowtimeSeat.builder()
                .showtime(testShowtime)
                .seat(seat4)
                .price(80000L)
                .status(ShowtimeSeatStatus.AVAILABLE)
                .build());

        entityManager.flush();
        entityManager.clear();
    }

    @Test
    @DisplayName("Case 1: Booking only 1 seat of a couple pair fails with COUPLE_SEAT_MUST_BE_BOOKED_IN_PAIR (1510)")
    void case1_bookingSingleSeatOfCouplePair_failsWith1510() {
        BookingCreateRequest request = new BookingCreateRequest(
                testShowtime.getId(),
                List.of(coupleSeat1.getId()),
                null
        );

        assertThatThrownBy(() -> bookingService.createBooking(testUser.getEmail(), request))
                .isInstanceOf(AppException.class)
                .satisfies(ex -> {
                    AppException appEx = (AppException) ex;
                    assertThat(appEx.getErrorCode()).isEqualTo(ErrorCode.COUPLE_SEAT_MUST_BE_BOOKED_IN_PAIR);
                    assertThat(appEx.getErrorCode().getCode()).isEqualTo(1510);
                });
    }

    @Test
    @DisplayName("Case 2: Booking both seats of a couple pair succeeds and calculates price per D-02")
    void case2_bookingBothCoupleSeats_succeedsWithCorrectPrice() {
        BookingCreateRequest request = new BookingCreateRequest(
                testShowtime.getId(),
                List.of(coupleSeat1.getId(), coupleSeat2.getId()),
                null
        );

        BookingResponse response = bookingService.createBooking(testUser.getEmail(), request);

        assertThat(response).isNotNull();
        assertThat(response.status()).isEqualTo(BookingStatus.PENDING_PAYMENT);
        assertThat(response.items()).hasSize(2);
        // Each seat = 80,000; total = 160,000 (not quadrupled)
        assertThat(response.subtotalAmount()).isEqualTo(160000L);
        assertThat(response.finalAmount()).isEqualTo(160000L);

        // Verify seats in database are now HELD and linked to booking
        ShowtimeSeat dbSeat1 = showtimeSeatRepository.findById(coupleSeat1.getId()).orElseThrow();
        ShowtimeSeat dbSeat2 = showtimeSeatRepository.findById(coupleSeat2.getId()).orElseThrow();
        assertThat(dbSeat1.getStatus()).isEqualTo(ShowtimeSeatStatus.HELD);
        assertThat(dbSeat2.getStatus()).isEqualTo(ShowtimeSeatStatus.HELD);
        assertThat(dbSeat1.getHeldByBookingId()).isEqualTo(response.id());
        assertThat(dbSeat2.getHeldByBookingId()).isEqualTo(response.id());
    }

    @Test
    @DisplayName("Case 3: When one partner seat is BOOKED, booking the remaining seat fails")
    void case3_bookingWhenPartnerSeatIsAlreadyBooked_fails() {
        // Create an existing booking for coupleSeat1
        Booking priorBooking = bookingRepository.save(Booking.builder()
                .bookingCode("PRIOR-BKG")
                .user(testUser)
                .showtime(testShowtime)
                .subtotalAmount(80000L)
                .discountAmount(0L)
                .finalAmount(80000L)
                .status(BookingStatus.CONFIRMED)
                .expiresAt(LocalDateTime.now().plusMinutes(10))
                .build());

        coupleSeat1.setStatus(ShowtimeSeatStatus.BOOKED);
        coupleSeat1.setHeldByBookingId(priorBooking.getId());
        showtimeSeatRepository.save(coupleSeat1);

        entityManager.flush();
        entityManager.clear();

        // 3a. Customer tries to book only the remaining available partner seat (coupleSeat2)
        BookingCreateRequest requestSingle = new BookingCreateRequest(
                testShowtime.getId(),
                List.of(coupleSeat2.getId()),
                null
        );

        assertThatThrownBy(() -> bookingService.createBooking(testUser.getEmail(), requestSingle))
                .isInstanceOf(AppException.class)
                .satisfies(ex -> {
                    AppException appEx = (AppException) ex;
                    assertThat(appEx.getErrorCode()).isEqualTo(ErrorCode.COUPLE_SEAT_MUST_BE_BOOKED_IN_PAIR);
                });

        // 3b. Customer tries to book both seats (coupleSeat1 + coupleSeat2)
        BookingCreateRequest requestBoth = new BookingCreateRequest(
                testShowtime.getId(),
                List.of(coupleSeat1.getId(), coupleSeat2.getId()),
                null
        );

        assertThatThrownBy(() -> bookingService.createBooking(testUser.getEmail(), requestBoth))
                .isInstanceOf(AppException.class)
                .satisfies(ex -> {
                    AppException appEx = (AppException) ex;
                    assertThat(appEx.getErrorCode()).isEqualTo(ErrorCode.SEAT_NOT_AVAILABLE);
                });
    }

    @Test
    @DisplayName("Case 4: Booking couple seat with pairGroup = null fails with 1510 (AF-04, D-07)")
    void case4_bookingCoupleSeatWithoutPairGroup_failsWith1510() {
        Seat orphanCoupleSeat = seatRepository.save(Seat.builder()
                .room(testShowtime.getRoom())
                .rowName("E")
                .seatNumber(1)
                .type(SeatType.COUPLE)
                .pairGroup(null)
                .isActive(true)
                .build());

        ShowtimeSeat ss = showtimeSeatRepository.save(ShowtimeSeat.builder()
                .showtime(testShowtime)
                .seat(orphanCoupleSeat)
                .price(80000L)
                .status(ShowtimeSeatStatus.AVAILABLE)
                .build());

        BookingCreateRequest request = new BookingCreateRequest(
                testShowtime.getId(),
                List.of(ss.getId()),
                null
        );

        assertThatThrownBy(() -> bookingService.createBooking(testUser.getEmail(), request))
                .isInstanceOf(AppException.class)
                .satisfies(ex -> {
                    AppException appEx = (AppException) ex;
                    assertThat(appEx.getErrorCode()).isEqualTo(ErrorCode.COUPLE_SEAT_MUST_BE_BOOKED_IN_PAIR);
                    assertThat(appEx.getErrorCode().getCode()).isEqualTo(1510);
                });
    }
}
