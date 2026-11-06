package com.example.cinema.showtime;

import com.example.cinema.auth.entity.User;
import com.example.cinema.auth.enums.Role;
import com.example.cinema.auth.repository.UserRepository;
import com.example.cinema.booking.dto.request.BookingCreateRequest;
import com.example.cinema.booking.service.BookingService;
import com.example.cinema.common.exception.AppException;
import com.example.cinema.common.exception.ErrorCode;
import com.example.cinema.movie.entity.Movie;
import com.example.cinema.movie.enums.AgeRating;
import com.example.cinema.movie.enums.MovieStatus;
import com.example.cinema.movie.repository.MovieRepository;
import com.example.cinema.showtime.dto.request.SeatBatchUpdateRequest;
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
import com.example.cinema.showtime.service.PricingService;
import com.example.cinema.showtime.service.RoomService;
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
import java.util.List;
import java.util.UUID;

import com.example.cinema.common.AbstractMySqlIT;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class RoomSeatOperationIntegrationTest extends AbstractMySqlIT {

    @Autowired
    RoomService roomService;

    @Autowired
    PricingService pricingService;

    @Autowired
    BookingService bookingService;

    @Autowired
    RoomRepository roomRepository;

    @Autowired
    SeatRepository seatRepository;

    @Autowired
    CinemaRepository cinemaRepository;

    @Autowired
    MovieRepository movieRepository;

    @Autowired
    ShowtimeRepository showtimeRepository;

    @Autowired
    ShowtimeSeatRepository showtimeSeatRepository;

    @Autowired
    UserRepository userRepository;

    @Autowired
    com.example.cinema.booking.repository.BookingRepository bookingRepository;

    @Autowired
    EntityManager entityManager;

    private Cinema testCinema;
    private Room testRoom;
    private Movie testMovie;
    private User testUser;

    @BeforeEach
    void setUp() {
        String testId = UUID.randomUUID().toString().substring(0, 8);

        testCinema = cinemaRepository.save(Cinema.builder()
                .name("Cinema Room Test " + testId)
                .address("123 Street " + testId)
                .build());

        testRoom = roomRepository.save(Room.builder()
                .cinema(testCinema)
                .name("Hall " + testId)
                .totalRows(2)
                .totalColumns(5)
                .isActive(true)
                .build());

        testMovie = movieRepository.save(Movie.builder()
                .title("Movie Room Test " + testId)
                .durationMinutes(120)
                .releaseDate(LocalDate.now().minusDays(5))
                .ageRating(AgeRating.P)
                .originalLanguage("Vietnamese")
                .status(MovieStatus.NOW_SHOWING)
                .build());

        testUser = userRepository.save(User.builder()
                .email("user-" + testId + "@cinema.com")
                .passwordHash("passwordHash")
                .fullName("User " + testId)
                .phone("091" + testId.replaceAll("[^0-9]", "3").substring(0, Math.min(6, testId.length())) + "444")
                .role(Role.CUSTOMER)
                .isActive(true)
                .build());
    }

    @Test
    @DisplayName("G2-02 (a): Booking an inactive physical seat throws SEAT_NOT_AVAILABLE")
    void cannotBookInactiveSeat_throwsSeatNotAvailable() {
        Seat physicalSeat = seatRepository.save(Seat.builder()
                .room(testRoom)
                .rowName("A")
                .seatNumber(1)
                .type(SeatType.NORMAL)
                .isActive(false) // Inactive physical seat
                .build());

        LocalDateTime showtimeStart = LocalDateTime.now().plusDays(2);
        Showtime showtime = showtimeRepository.save(Showtime.builder()
                .movie(testMovie)
                .room(testRoom)
                .format(ShowtimeFormat._2D)
                .translationType(TranslationType.SUBTITLE)
                .startTime(showtimeStart)
                .endTime(showtimeStart.plusMinutes(120))
                .cleaningEndTime(showtimeStart.plusMinutes(135))
                .basePrice(80000L)
                .status(ShowtimeStatus.SCHEDULED)
                .build());

        ShowtimeSeat showtimeSeat = showtimeSeatRepository.save(ShowtimeSeat.builder()
                .showtime(showtime)
                .seat(physicalSeat)
                .price(80000L)
                .status(ShowtimeSeatStatus.AVAILABLE)
                .build());

        entityManager.flush();
        entityManager.clear();

        BookingCreateRequest request = new BookingCreateRequest(
                showtime.getId(),
                List.of(showtimeSeat.getId()),
                null
        );

        assertThatThrownBy(() -> bookingService.createBooking(testUser.getEmail(), request))
                .isInstanceOf(AppException.class)
                .satisfies(ex -> {
                    AppException appEx = (AppException) ex;
                    assertThat(appEx.getErrorCode()).isEqualTo(ErrorCode.SEAT_NOT_AVAILABLE);
                });
    }

    @Test
    @DisplayName("G2-02 (b): Changing seat type (NORMAL -> VIP) recalculates price for future AVAILABLE showtime seats")
    void batchUpdateSeatType_updatesPriceOfFutureAvailableShowtimeSeats() {
        Seat seat = seatRepository.save(Seat.builder()
                .room(testRoom)
                .rowName("B")
                .seatNumber(1)
                .type(SeatType.NORMAL)
                .isActive(true)
                .build());

        LocalDateTime showtimeStart = LocalDateTime.now().plusDays(2);
        Showtime showtime = showtimeRepository.save(Showtime.builder()
                .movie(testMovie)
                .room(testRoom)
                .format(ShowtimeFormat._2D)
                .translationType(TranslationType.SUBTITLE)
                .startTime(showtimeStart)
                .endTime(showtimeStart.plusMinutes(120))
                .cleaningEndTime(showtimeStart.plusMinutes(135))
                .basePrice(80000L)
                .status(ShowtimeStatus.SCHEDULED)
                .build());

        ShowtimeSeat showtimeSeat = showtimeSeatRepository.save(ShowtimeSeat.builder()
                .showtime(showtime)
                .seat(seat)
                .price(80000L)
                .status(ShowtimeSeatStatus.AVAILABLE)
                .build());

        entityManager.flush();
        entityManager.clear();

        // Update seat to VIP
        SeatBatchUpdateRequest updateRequest = new SeatBatchUpdateRequest(
                List.of(seat.getId()),
                SeatType.VIP,
                null
        );
        roomService.batchUpdateSeats(testRoom.getId(), updateRequest);

        entityManager.flush();
        entityManager.clear();

        // Verify showtime seat price is updated to VIP price calculated via PricingService
        ShowtimeSeat updatedShowtimeSeat = showtimeSeatRepository.findById(showtimeSeat.getId()).orElseThrow();
        long expectedPrice = pricingService.calculateSeatPrice(showtime, SeatType.VIP);
        assertThat(updatedShowtimeSeat.getPrice()).isEqualTo(expectedPrice);
    }

    @Test
    @DisplayName("G2-02 (c): Changing seat type fails when seat is HELD or BOOKED in future showtime")
    void batchUpdateSeatType_failsWhenSeatIsHeldOrBookedInFutureShowtime() {
        Seat seat = seatRepository.save(Seat.builder()
                .room(testRoom)
                .rowName("C")
                .seatNumber(1)
                .type(SeatType.NORMAL)
                .isActive(true)
                .build());

        LocalDateTime showtimeStart = LocalDateTime.now().plusDays(2);
        Showtime showtime = showtimeRepository.save(Showtime.builder()
                .movie(testMovie)
                .room(testRoom)
                .format(ShowtimeFormat._2D)
                .translationType(TranslationType.SUBTITLE)
                .startTime(showtimeStart)
                .endTime(showtimeStart.plusMinutes(120))
                .cleaningEndTime(showtimeStart.plusMinutes(135))
                .basePrice(80000L)
                .status(ShowtimeStatus.SCHEDULED)
                .build());

        com.example.cinema.booking.entity.Booking holdBooking = bookingRepository.save(com.example.cinema.booking.entity.Booking.builder()
                .bookingCode("HOLD-" + UUID.randomUUID().toString().substring(0, 8))
                .user(testUser)
                .showtime(showtime)
                .subtotalAmount(80000L)
                .discountAmount(0L)
                .finalAmount(80000L)
                .status(com.example.cinema.booking.enums.BookingStatus.PENDING_PAYMENT)
                .expiresAt(LocalDateTime.now().plusMinutes(10))
                .build());

        showtimeSeatRepository.save(ShowtimeSeat.builder()
                .showtime(showtime)
                .seat(seat)
                .price(80000L)
                .status(ShowtimeSeatStatus.HELD) // HELD in future showtime
                .heldByBookingId(holdBooking.getId())
                .build());

        entityManager.flush();
        entityManager.clear();

        SeatBatchUpdateRequest updateRequest = new SeatBatchUpdateRequest(
                List.of(seat.getId()),
                SeatType.VIP,
                null
        );

        assertThatThrownBy(() -> roomService.batchUpdateSeats(testRoom.getId(), updateRequest))
                .isInstanceOf(AppException.class)
                .satisfies(ex -> {
                    AppException appEx = (AppException) ex;
                    assertThat(appEx.getErrorCode()).isEqualTo(ErrorCode.SEAT_NOT_AVAILABLE);
                });
    }

    @Test
    @DisplayName("G2-02 (d): Deactivating a room with future scheduled showtimes throws ROOM_HAS_FUTURE_SHOWTIMES (409)")
    void toggleRoomStatusFalse_failsWhenRoomHasFutureShowtimes() {
        LocalDateTime showtimeStart = LocalDateTime.now().plusDays(3);
        showtimeRepository.save(Showtime.builder()
                .movie(testMovie)
                .room(testRoom)
                .format(ShowtimeFormat._2D)
                .translationType(TranslationType.SUBTITLE)
                .startTime(showtimeStart)
                .endTime(showtimeStart.plusMinutes(120))
                .cleaningEndTime(showtimeStart.plusMinutes(135))
                .basePrice(80000L)
                .status(ShowtimeStatus.SCHEDULED)
                .build());

        entityManager.flush();
        entityManager.clear();

        assertThatThrownBy(() -> roomService.toggleRoomStatus(testRoom.getId(), false))
                .isInstanceOf(AppException.class)
                .satisfies(ex -> {
                    AppException appEx = (AppException) ex;
                    assertThat(appEx.getErrorCode()).isEqualTo(ErrorCode.ROOM_HAS_FUTURE_SHOWTIMES);
                    assertThat(appEx.getErrorCode().getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
                });
    }
}
