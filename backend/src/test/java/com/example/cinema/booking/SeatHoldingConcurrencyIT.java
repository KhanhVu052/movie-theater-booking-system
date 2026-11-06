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

public class SeatHoldingConcurrencyIT extends AbstractMySqlIT {

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

    Cinema cinema;
    Room room;
    Seat seat;
    Movie movie;
    Showtime showtime;
    ShowtimeSeat showtimeSeat;
    final List<User> testUsers = new ArrayList<>();

    @BeforeEach
    void setUp() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);

        cinema = cinemaRepository.save(Cinema.builder()
                .name("Concurrency Cinema " + suffix)
                .address("123 Test St")
                .hotline("19001234")
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
                .title("Concurrency Movie " + suffix)
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

        showtimeSeat = showtimeSeatRepository.save(ShowtimeSeat.builder()
                .showtime(showtime)
                .seat(seat)
                .status(ShowtimeSeatStatus.AVAILABLE)
                .price(60000L)
                .build());

        for (int i = 1; i <= 50; i++) {
            User u = userRepository.save(User.builder()
                    .email("hold_concurrency_" + suffix + "_" + i + "@cinema.com")
                    .fullName("Concurrent User " + i)
                    .passwordHash("password_hash")
                    .phone("09000000" + (i < 10 ? "0" + i : i))
                    .role(Role.CUSTOMER)
                    .isActive(true)
                    .build());
            testUsers.add(u);
        }
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
            showtimeSeatRepository.deleteByShowtimeId(showtime.getId());
            showtimeRepository.delete(showtime);
        }
        if (seat != null) seatRepository.delete(seat);
        if (room != null) roomRepository.delete(room);
        if (cinema != null) cinemaRepository.delete(cinema);
        if (movie != null) movieRepository.delete(movie);
        if (!testUsers.isEmpty()) userRepository.deleteAll(testUsers);
    }

    @Test
    @DisplayName("AF-07 (a) / AF-01: 50 concurrent threads attempt to hold the exact same seat -> Exactly 1 succeeds, 49 fail with SEAT_NOT_AVAILABLE")
    void fiftyThreadsHoldSameSeat_exactlyOneSucceeds() throws Exception {
        int concurrency = 50;
        AtomicInteger counter = new AtomicInteger(0);

        List<ConcurrencyTestSupport.ExecutionResult<BookingResponse>> results = ConcurrencyTestSupport.executeConcurrentTasks(
                concurrency,
                () -> {
                    int idx = counter.getAndIncrement();
                    User u = testUsers.get(idx);
                    BookingCreateRequest req = new BookingCreateRequest(
                            showtime.getId(),
                            List.of(showtimeSeat.getId()),
                            null
                    );
                    return bookingService.createBooking(u.getEmail(), req);
                }
        );

        long successCount = results.stream().filter(ConcurrencyTestSupport.ExecutionResult::isSuccess).count();
        long seatNotAvailableCount = results.stream()
                .filter(r -> r.isFailedWith(ErrorCode.SEAT_NOT_AVAILABLE.getCode()))
                .count();

        assertThat(successCount).isEqualTo(1);
        assertThat(seatNotAvailableCount).isEqualTo(49);

        ShowtimeSeat updatedSeat = showtimeSeatRepository.findById(showtimeSeat.getId()).orElseThrow();
        assertThat(updatedSeat.getStatus()).isEqualTo(ShowtimeSeatStatus.HELD);
        assertThat(updatedSeat.getHeldByBookingId()).isNotNull();

        Booking heldBooking = bookingRepository.findById(updatedSeat.getHeldByBookingId()).orElseThrow();
        assertThat(heldBooking.getStatus()).isEqualTo(BookingStatus.PENDING_PAYMENT);
    }
}
