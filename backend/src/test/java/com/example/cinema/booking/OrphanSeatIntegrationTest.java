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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class OrphanSeatIntegrationTest {

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
    private List<ShowtimeSeat> showtimeSeats;

    @BeforeEach
    void setUp() {
        String testId = UUID.randomUUID().toString().substring(0, 8);

        testUser = userRepository.save(User.builder()
                .email("orphan-user-" + testId + "@cinema.com")
                .passwordHash("hashedpassword")
                .fullName("Orphan User " + testId)
                .phone("097" + testId.replaceAll("[^0-9]", "4").substring(0, Math.min(6, testId.length())) + "222")
                .role(Role.CUSTOMER)
                .isActive(true)
                .build());

        Cinema cinema = cinemaRepository.save(Cinema.builder()
                .name("Cinema Orphan " + testId)
                .address("123 Orphan St " + testId)
                .build());

        Room room = roomRepository.save(Room.builder()
                .cinema(cinema)
                .name("Orphan Hall " + testId)
                .totalRows(1)
                .totalColumns(5)
                .isActive(true)
                .build());

        // 1 row "A" with 5 seats (1, 2, 3, 4, 5)
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
                .title("Orphan Movie " + testId)
                .durationMinutes(120)
                .releaseDate(LocalDate.now().minusDays(1))
                .ageRating(AgeRating.P)
                .originalLanguage("Vietnamese")
                .status(MovieStatus.NOW_SHOWING)
                .build());

        LocalDateTime now = LocalDateTime.now();
        testShowtime = showtimeRepository.save(Showtime.builder()
                .movie(movie)
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
    @DisplayName("Case 1: Row 5 seats (1..5). Selecting 2 and 3 leaves seat 1 isolated at edge -> throws 1509")
    void testCase1_leavesSeat1IsolatedAtEdge() {
        // Requested seats: A2 (index 1) and A3 (index 2)
        List<Long> reqSeatIds = List.of(showtimeSeats.get(1).getId(), showtimeSeats.get(2).getId());

        BookingCreateRequest request = new BookingCreateRequest(
                testShowtime.getId(),
                reqSeatIds,
                null
        );

        assertThatThrownBy(() -> bookingService.createBooking(testUser.getEmail(), request))
                .isInstanceOf(AppException.class)
                .satisfies(ex -> {
                    AppException appEx = (AppException) ex;
                    assertThat(appEx.getErrorCode()).isEqualTo(ErrorCode.ORPHAN_SEAT_DETECTED);
                    assertThat(appEx.getErrorCode().getCode()).isEqualTo(1509);
                });
    }

    @Test
    @DisplayName("Case 2: Row 5 seats. Seat 1 is BOOKED. Customer selects seat 3 -> Seat 2 is trapped between 1 and 3 -> throws 1509")
    void testCase2_leavesSeat2TrappedBetweenBookedAndSelected() {
        Booking priorBooking = bookingRepository.save(Booking.builder()
                .bookingCode("PRIOR2-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase())
                .user(testUser)
                .showtime(testShowtime)
                .subtotalAmount(80000L)
                .discountAmount(0L)
                .finalAmount(80000L)
                .status(BookingStatus.CONFIRMED)
                .expiresAt(LocalDateTime.now().plusHours(1))
                .build());

        // Set seat 1 to BOOKED
        ShowtimeSeat seat1 = showtimeSeatRepository.findById(showtimeSeats.get(0).getId()).orElseThrow();
        seat1.setStatus(ShowtimeSeatStatus.BOOKED);
        seat1.setHeldByBookingId(priorBooking.getId());
        showtimeSeatRepository.save(seat1);

        entityManager.flush();
        entityManager.clear();

        // Customer selects seat 3 (index 2)
        List<Long> reqSeatIds = List.of(showtimeSeats.get(2).getId());

        BookingCreateRequest request = new BookingCreateRequest(
                testShowtime.getId(),
                reqSeatIds,
                null
        );

        assertThatThrownBy(() -> bookingService.createBooking(testUser.getEmail(), request))
                .isInstanceOf(AppException.class)
                .satisfies(ex -> {
                    AppException appEx = (AppException) ex;
                    assertThat(appEx.getErrorCode()).isEqualTo(ErrorCode.ORPHAN_SEAT_DETECTED);
                    assertThat(appEx.getErrorCode().getCode()).isEqualTo(1509);
                });
    }

    @Test
    @DisplayName("Case 3: Row 5 seats. Customer selects seats 1 and 2 -> Leaves 3, 4, 5 (3 consecutive empty) -> success")
    void testCase3_leavesThreeConsecutiveSeats_success() {
        // Customer selects seats 1 (index 0) and 2 (index 1)
        List<Long> reqSeatIds = List.of(showtimeSeats.get(0).getId(), showtimeSeats.get(1).getId());

        BookingCreateRequest request = new BookingCreateRequest(
                testShowtime.getId(),
                reqSeatIds,
                null
        );

        BookingResponse response = bookingService.createBooking(testUser.getEmail(), request);

        assertThat(response).isNotNull();
        assertThat(response.id()).isNotNull();
        assertThat(response.status()).isEqualTo(BookingStatus.PENDING_PAYMENT);
        assertThat(response.items()).hasSize(2);
    }

    @Test
    @DisplayName("Case 4: Customer selects all 5 seats in the row -> success")
    void testCase4_selectAllSeatsInRow_success() {
        List<Long> reqSeatIds = showtimeSeats.stream().map(ShowtimeSeat::getId).toList();

        BookingCreateRequest request = new BookingCreateRequest(
                testShowtime.getId(),
                reqSeatIds,
                null
        );

        BookingResponse response = bookingService.createBooking(testUser.getEmail(), request);

        assertThat(response).isNotNull();
        assertThat(response.id()).isNotNull();
        assertThat(response.status()).isEqualTo(BookingStatus.PENDING_PAYMENT);
        assertThat(response.items()).hasSize(5);
    }

    @Test
    @DisplayName("Case 5: Pre-existing orphan (seat 2 was already orphan). Customer selects 4 and 5 -> does not penalize customer -> success")
    void testCase5_preExistingOrphan_doesNotPenalize() {
        Booking priorBooking = bookingRepository.save(Booking.builder()
                .bookingCode("PRIOR5-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase())
                .user(testUser)
                .showtime(testShowtime)
                .subtotalAmount(160000L)
                .discountAmount(0L)
                .finalAmount(160000L)
                .status(BookingStatus.CONFIRMED)
                .expiresAt(LocalDateTime.now().plusHours(1))
                .build());

        // Seats 1 and 3 are BOOKED -> Seat 2 is a pre-existing orphan
        ShowtimeSeat seat1 = showtimeSeatRepository.findById(showtimeSeats.get(0).getId()).orElseThrow();
        seat1.setStatus(ShowtimeSeatStatus.BOOKED);
        seat1.setHeldByBookingId(priorBooking.getId());
        showtimeSeatRepository.save(seat1);

        ShowtimeSeat seat3 = showtimeSeatRepository.findById(showtimeSeats.get(2).getId()).orElseThrow();
        seat3.setStatus(ShowtimeSeatStatus.BOOKED);
        seat3.setHeldByBookingId(priorBooking.getId());
        showtimeSeatRepository.save(seat3);

        entityManager.flush();
        entityManager.clear();

        // Customer books remaining seats 4 and 5 (index 3 and 4)
        List<Long> reqSeatIds = List.of(showtimeSeats.get(3).getId(), showtimeSeats.get(4).getId());

        BookingCreateRequest request = new BookingCreateRequest(
                testShowtime.getId(),
                reqSeatIds,
                null
        );

        BookingResponse response = bookingService.createBooking(testUser.getEmail(), request);

        assertThat(response).isNotNull();
        assertThat(response.id()).isNotNull();
        assertThat(response.status()).isEqualTo(BookingStatus.PENDING_PAYMENT);
        assertThat(response.items()).hasSize(2);
    }
}
