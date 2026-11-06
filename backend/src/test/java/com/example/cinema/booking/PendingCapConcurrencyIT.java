package com.example.cinema.booking;

import com.example.cinema.auth.entity.User;
import com.example.cinema.auth.enums.Role;
import com.example.cinema.auth.repository.UserRepository;
import com.example.cinema.booking.config.BookingProperties;
import com.example.cinema.booking.dto.request.BookingCreateRequest;
import com.example.cinema.booking.dto.response.BookingResponse;
import com.example.cinema.booking.entity.Booking;
import com.example.cinema.booking.enums.BookingStatus;
import com.example.cinema.booking.repository.BookingItemRepository;
import com.example.cinema.booking.repository.BookingRepository;
import com.example.cinema.booking.service.BookingService;
import com.example.cinema.common.AbstractMySqlIT;
import com.example.cinema.common.ConcurrencyTestSupport;
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
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

public class PendingCapConcurrencyIT extends AbstractMySqlIT {

    @Autowired
    BookingService bookingService;

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
    BookingProperties bookingProperties;

    Cinema cinema;
    Room room;
    Movie movie;
    Showtime showtime;
    User testUser;
    final List<Seat> createdSeats = new ArrayList<>();
    final List<ShowtimeSeat> createdShowtimeSeats = new ArrayList<>();

    @BeforeEach
    void setUp() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);

        cinema = cinemaRepository.save(Cinema.builder()
                .name("Cap Cinema " + suffix)
                .address("456 Cap St")
                .hotline("19004567")
                .build());

        room = roomRepository.save(Room.builder()
                .cinema(cinema)
                .name("Room " + suffix)
                .totalRows(10)
                .totalColumns(5)
                .isActive(true)
                .build());

        movie = movieRepository.save(Movie.builder()
                .title("Cap Movie " + suffix)
                .durationMinutes(120)
                .releaseDate(LocalDate.now().plusDays(1))
                .ageRating(AgeRating.P)
                .originalLanguage("vi")
                .status(MovieStatus.NOW_SHOWING)
                .build());

        LocalDateTime start = LocalDateTime.now().plusDays(1);
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

        char[] rows = new char[]{'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'};
        for (char r : rows) {
            // Create 3 seats per row to avoid orphan seat triggers (picking seat 1 leaves seats 2 and 3 available, length 2 > 1)
            for (int num = 1; num <= 3; num++) {
                Seat s = seatRepository.save(Seat.builder()
                        .room(room)
                        .rowName(String.valueOf(r))
                        .seatNumber(num)
                        .type(SeatType.NORMAL)
                        .isActive(true)
                        .build());
                createdSeats.add(s);

                ShowtimeSeat ss = showtimeSeatRepository.save(ShowtimeSeat.builder()
                        .showtime(showtime)
                        .seat(s)
                        .status(ShowtimeSeatStatus.AVAILABLE)
                        .price(60000L)
                        .build());

                if (num == 1) {
                    createdShowtimeSeats.add(ss);
                }
            }
        }

        testUser = userRepository.save(User.builder()
                .email("pending_cap_" + suffix + "@cinema.com")
                .fullName("Pending Cap User")
                .passwordHash("hash_secret")
                .phone("0900112233")
                .role(Role.CUSTOMER)
                .isActive(true)
                .build());
    }

    @AfterEach
    void tearDown() {
        if (showtime != null) {
            List<Booking> bookings = bookingRepository.findAll().stream()
                    .filter(b -> b.getShowtime().getId().equals(showtime.getId()))
                    .toList();
            for (Booking b : bookings) {
                bookingItemRepository.deleteAll(bookingItemRepository.findByBookingId(b.getId()));
                bookingRepository.delete(b);
            }
            showtimeSeatRepository.deleteAll(showtimeSeatRepository.findByShowtimeIdOrderBySeatRowNameAscSeatSeatNumberAsc(showtime.getId()));
            showtimeRepository.delete(showtime);
        }
        if (!createdSeats.isEmpty()) seatRepository.deleteAll(createdSeats);
        if (room != null) roomRepository.delete(room);
        if (cinema != null) cinemaRepository.delete(cinema);
        if (movie != null) movieRepository.delete(movie);
        if (testUser != null) userRepository.delete(testUser);
    }

    @Test
    @DisplayName("FA-02 (1): 1 user concurrently sends 10 createBooking requests -> Exactly maxPendingPerUser (2) succeed, 8 fail with TOO_MANY_PENDING_BOOKINGS (1507)")
    void oneUserConcurrentTenBookings_exactlyTwoSucceed() throws Exception {
        int concurrency = 10;
        AtomicInteger counter = new AtomicInteger(0);

        List<ConcurrencyTestSupport.ExecutionResult<BookingResponse>> results = ConcurrencyTestSupport.executeConcurrentTasks(
                concurrency,
                () -> {
                    int idx = counter.getAndIncrement();
                    ShowtimeSeat targetSeat = createdShowtimeSeats.get(idx);
                    BookingCreateRequest req = new BookingCreateRequest(
                            showtime.getId(),
                            List.of(targetSeat.getId()),
                            null
                    );
                    return bookingService.createBooking(testUser.getEmail(), req);
                }
        );

        long successCount = results.stream().filter(ConcurrencyTestSupport.ExecutionResult::isSuccess).count();
        long rejectedCount = results.stream()
                .filter(r -> r.isFailedWith(ErrorCode.TOO_MANY_PENDING_BOOKINGS.getCode()))
                .count();

        int maxAllowed = bookingProperties.getMaxPendingPerUser();
        assertThat(successCount).isEqualTo(maxAllowed);
        assertThat(rejectedCount).isEqualTo(concurrency - maxAllowed);

        long pendingBookingsInDb = bookingRepository.countByUserIdAndStatusAndExpiresAtAfter(
                testUser.getId(),
                BookingStatus.PENDING_PAYMENT,
                LocalDateTime.now()
        );
        assertThat(pendingBookingsInDb).isEqualTo(maxAllowed);
    }
}
