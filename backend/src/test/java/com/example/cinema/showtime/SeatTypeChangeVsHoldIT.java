package com.example.cinema.showtime;

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
import com.example.cinema.showtime.service.RoomService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

public class SeatTypeChangeVsHoldIT extends AbstractMySqlIT {

    @Autowired
    RoomService roomService;

    @Autowired
    BookingService bookingService;

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
    BookingRepository bookingRepository;

    @Autowired
    BookingItemRepository bookingItemRepository;

    Cinema cinema;
    Room room;
    Seat seat;
    Movie movie;
    Showtime showtime;
    ShowtimeSeat showtimeSeat;
    User customer;

    @BeforeEach
    void setUp() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);

        cinema = cinemaRepository.save(Cinema.builder()
                .name("AdminVsHold Cinema " + suffix)
                .address("789 Parallel Rd")
                .hotline("19009999")
                .build());

        room = roomRepository.save(Room.builder()
                .cinema(cinema)
                .name("Room " + suffix)
                .totalRows(1)
                .totalColumns(1)
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
                .title("AdminVsHold Movie " + suffix)
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

        showtimeSeat = showtimeSeatRepository.save(ShowtimeSeat.builder()
                .showtime(showtime)
                .seat(seat)
                .status(ShowtimeSeatStatus.AVAILABLE)
                .price(60000L)
                .build());

        customer = userRepository.save(User.builder()
                .email("hold_vs_type_" + suffix + "@cinema.com")
                .fullName("Hold Customer")
                .passwordHash("password_hash")
                .phone("0988888888")
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
        if (seat != null) seatRepository.delete(seat);
        if (room != null) roomRepository.delete(room);
        if (cinema != null) cinemaRepository.delete(cinema);
        if (movie != null) movieRepository.delete(movie);
        if (customer != null) userRepository.delete(customer);
    }

    @Test
    @DisplayName("AF-07 (c) / AF-03: Admin updating seat to VIP concurrently with User holding seat -> Held seat status must never be overwritten")
    void adminBatchUpdateConcurrentlyWithUserHold_heldSeatNeverOverwritten() throws Exception {
        SeatBatchUpdateRequest updateReq = new SeatBatchUpdateRequest(
                List.of(seat.getId()),
                SeatType.VIP,
                null
        );
        BookingCreateRequest bookReq = new BookingCreateRequest(
                showtime.getId(),
                List.of(showtimeSeat.getId()),
                null
        );

        List<Runnable> actions = List.of(
                () -> roomService.batchUpdateSeats(room.getId(), updateReq),
                () -> bookingService.createBooking(customer.getEmail(), bookReq)
        );

        List<ConcurrencyTestSupport.ExecutionResult<Void>> results = ConcurrencyTestSupport.executeConcurrentActions(actions);

        // Check the final state of the showtime seat in database
        ShowtimeSeat finalSeat = showtimeSeatRepository.findById(showtimeSeat.getId()).orElseThrow();
        boolean userBookedSuccessfully = results.get(1).isSuccess();

        if (userBookedSuccessfully) {
            // If user succeeded, the seat MUST remain HELD with heldByBookingId NOT NULL
            assertThat(finalSeat.getStatus()).isEqualTo(ShowtimeSeatStatus.HELD);
            assertThat(finalSeat.getHeldByBookingId()).isNotNull();
        } else {
            // If user failed (e.g. admin locked or changed first and seat wasn't available), status is AVAILABLE
            assertThat(finalSeat.getStatus()).isEqualTo(ShowtimeSeatStatus.AVAILABLE);
        }
    }
}
