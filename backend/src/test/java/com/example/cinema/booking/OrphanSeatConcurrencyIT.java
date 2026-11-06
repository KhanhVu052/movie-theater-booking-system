package com.example.cinema.booking;

import com.example.cinema.auth.entity.User;
import com.example.cinema.auth.enums.Role;
import com.example.cinema.auth.repository.UserRepository;
import com.example.cinema.booking.dto.request.BookingCreateRequest;
import com.example.cinema.booking.entity.Booking;
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

import static org.assertj.core.api.Assertions.assertThat;

public class OrphanSeatConcurrencyIT extends AbstractMySqlIT {

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
    Movie movie;
    Showtime showtime;
    final List<Seat> seats = new ArrayList<>();
    final List<ShowtimeSeat> showtimeSeats = new ArrayList<>();
    User user1;
    User user2;

    @BeforeEach
    void setUp() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);

        cinema = cinemaRepository.save(Cinema.builder()
                .name("Orphan Cinema " + suffix)
                .address("456 Concurrency Ave")
                .hotline("19005678")
                .build());

        room = roomRepository.save(Room.builder()
                .cinema(cinema)
                .name("Room " + suffix)
                .totalRows(1)
                .totalColumns(5)
                .isActive(true)
                .build());

        for (int i = 1; i <= 5; i++) {
            Seat s = seatRepository.save(Seat.builder()
                    .room(room)
                    .rowName("A")
                    .seatNumber(i)
                    .type(SeatType.NORMAL)
                    .isActive(true)
                    .build());
            seats.add(s);
        }

        movie = movieRepository.save(Movie.builder()
                .title("Orphan Movie " + suffix)
                .durationMinutes(100)
                .releaseDate(LocalDate.now().plusDays(1))
                .ageRating(AgeRating.P)
                .originalLanguage("en")
                .status(MovieStatus.NOW_SHOWING)
                .build());

        LocalDateTime start = LocalDateTime.now().plusDays(1);
        showtime = showtimeRepository.save(Showtime.builder()
                .movie(movie)
                .room(room)
                .format(ShowtimeFormat._2D)
                .translationType(TranslationType.SUBTITLE)
                .startTime(start)
                .endTime(start.plusMinutes(100))
                .cleaningEndTime(start.plusMinutes(115))
                .basePrice(60000L)
                .status(ShowtimeStatus.SCHEDULED)
                .build());

        for (Seat s : seats) {
            ShowtimeSeat ss = showtimeSeatRepository.save(ShowtimeSeat.builder()
                    .showtime(showtime)
                    .seat(s)
                    .status(ShowtimeSeatStatus.AVAILABLE)
                    .price(60000L)
                    .build());
            showtimeSeats.add(ss);
        }

        user1 = userRepository.save(User.builder()
                .email("orphan_u1_" + suffix + "@cinema.com")
                .fullName("User One")
                .passwordHash("password_hash")
                .phone("0911111111")
                .role(Role.CUSTOMER)
                .isActive(true)
                .build());

        user2 = userRepository.save(User.builder()
                .email("orphan_u2_" + suffix + "@cinema.com")
                .fullName("User Two")
                .passwordHash("password_hash")
                .phone("0922222222")
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
            showtimeSeatRepository.deleteByShowtimeId(showtime.getId());
            showtimeRepository.delete(showtime);
        }
        if (!seats.isEmpty()) seatRepository.deleteAll(seats);
        if (room != null) roomRepository.delete(room);
        if (cinema != null) cinemaRepository.delete(cinema);
        if (movie != null) movieRepository.delete(movie);
        if (user1 != null) userRepository.delete(user1);
        if (user2 != null) userRepository.delete(user2);
    }

    @Test
    @DisplayName("AF-07 (b) / AF-01: Two concurrent users book A1-A2 and A4-A5 on 5-seat row -> Exactly 1 succeeds, other fails with ORPHAN_SEAT_DETECTED (A3 orphaned)")
    void concurrentBookings_preventOrphanSeat() throws Exception {
        // User 1 requests A1, A2
        List<Long> u1SeatIds = List.of(showtimeSeats.get(0).getId(), showtimeSeats.get(1).getId());
        // User 2 requests A4, A5
        List<Long> u2SeatIds = List.of(showtimeSeats.get(3).getId(), showtimeSeats.get(4).getId());

        List<Runnable> actions = List.of(
                () -> bookingService.createBooking(user1.getEmail(), new BookingCreateRequest(showtime.getId(), u1SeatIds, null)),
                () -> bookingService.createBooking(user2.getEmail(), new BookingCreateRequest(showtime.getId(), u2SeatIds, null))
        );

        List<ConcurrencyTestSupport.ExecutionResult<Void>> results = ConcurrencyTestSupport.executeConcurrentActions(actions);

        long successCount = results.stream().filter(ConcurrencyTestSupport.ExecutionResult::isSuccess).count();
        long orphanErrorCount = results.stream()
                .filter(r -> r.isFailedWith(ErrorCode.ORPHAN_SEAT_DETECTED.getCode()))
                .count();

        assertThat(successCount).isEqualTo(1);
        assertThat(orphanErrorCount).isEqualTo(1);
    }
}
