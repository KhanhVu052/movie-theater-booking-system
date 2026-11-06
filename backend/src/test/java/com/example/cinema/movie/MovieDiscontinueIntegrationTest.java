package com.example.cinema.movie;

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
import com.example.cinema.movie.service.MovieService;
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
public class MovieDiscontinueIntegrationTest extends AbstractMySqlIT {

    @Autowired
    MovieService movieService;

    @Autowired
    BookingService bookingService;

    @Autowired
    MovieRepository movieRepository;

    @Autowired
    ShowtimeRepository showtimeRepository;

    @Autowired
    ShowtimeSeatRepository showtimeSeatRepository;

    @Autowired
    RoomRepository roomRepository;

    @Autowired
    SeatRepository seatRepository;

    @Autowired
    CinemaRepository cinemaRepository;

    @Autowired
    UserRepository userRepository;

    @Autowired
    EntityManager entityManager;

    private User testUser;
    private Movie testMovie;
    private Room testRoom;
    private List<Seat> physicalSeats;

    @BeforeEach
    void setUp() {
        String testId = UUID.randomUUID().toString().substring(0, 8);

        testUser = userRepository.save(User.builder()
                .email("discontinue-" + testId + "@cinema.com")
                .passwordHash("hashedpassword")
                .fullName("Discontinue User " + testId)
                .phone("096" + testId.replaceAll("[^0-9]", "4").substring(0, Math.min(6, testId.length())) + "333")
                .role(Role.CUSTOMER)
                .isActive(true)
                .build());

        Cinema cinema = cinemaRepository.save(Cinema.builder()
                .name("Cinema " + testId)
                .address("Address " + testId)
                .build());

        testRoom = roomRepository.save(Room.builder()
                .cinema(cinema)
                .name("Room " + testId)
                .totalRows(2)
                .totalColumns(5)
                .isActive(true)
                .build());

        physicalSeats = new ArrayList<>();
        for (int c = 1; c <= 5; c++) {
            physicalSeats.add(seatRepository.save(Seat.builder()
                    .room(testRoom)
                    .rowName("A")
                    .seatNumber(c)
                    .type(SeatType.NORMAL)
                    .isActive(true)
                    .build()));
        }

        testMovie = movieRepository.save(Movie.builder()
                .title("Movie Disc " + testId)
                .durationMinutes(110)
                .releaseDate(LocalDate.now().minusDays(10))
                .ageRating(AgeRating.T16)
                .originalLanguage("English")
                .status(MovieStatus.NOW_SHOWING)
                .build());

        entityManager.flush();
        entityManager.clear();
    }

    private Showtime createShowtimeWithSeats(Movie movie, Room room, LocalDateTime startTime, ShowtimeStatus status) {
        Showtime showtime = showtimeRepository.save(Showtime.builder()
                .movie(movie)
                .room(room)
                .format(ShowtimeFormat._2D)
                .translationType(TranslationType.SUBTITLE)
                .startTime(startTime)
                .endTime(startTime.plusMinutes(movie.getDurationMinutes()))
                .cleaningEndTime(startTime.plusMinutes(movie.getDurationMinutes() + 15))
                .basePrice(80000L)
                .status(status)
                .build());

        for (Seat seat : physicalSeats) {
            showtimeSeatRepository.save(ShowtimeSeat.builder()
                    .showtime(showtime)
                    .seat(seat)
                    .price(80000L)
                    .status(ShowtimeSeatStatus.AVAILABLE)
                    .build());
        }

        entityManager.flush();
        return showtime;
    }

    @Test
    @DisplayName("G2-04 Case 1: Thử ngừng chiếu (discontinueMovie) phim còn suất SCHEDULED tương lai -> Bị chặn với lỗi 1207")
    void discontinueMovie_WhenHasFutureScheduledShowtimes_ThrowsMovieHasFutureShowtimes() {
        LocalDateTime futureStart = LocalDateTime.now().plusDays(2);
        createShowtimeWithSeats(testMovie, testRoom, futureStart, ShowtimeStatus.SCHEDULED);

        assertThatThrownBy(() -> movieService.discontinueMovie(testMovie.getId()))
                .isInstanceOf(AppException.class)
                .satisfies(ex -> {
                    AppException appEx = (AppException) ex;
                    assertThat(appEx.getErrorCode()).isEqualTo(ErrorCode.MOVIE_HAS_FUTURE_SHOWTIMES);
                    assertThat(appEx.getErrorCode().getCode()).isEqualTo(1207);
                });

        Movie refreshedMovie = movieRepository.findById(testMovie.getId()).orElseThrow();
        assertThat(refreshedMovie.getStatus()).isEqualTo(MovieStatus.NOW_SHOWING);
    }

    @Test
    @DisplayName("G2-04 Case 2: Ngừng chiếu phim khi không còn suất tương lai hoặc các suất đều đã CANCELLED -> Thành công ENDED")
    void discontinueMovie_WhenNoScheduledFutureShowtimes_Success() {
        LocalDateTime futureStart = LocalDateTime.now().plusDays(2);
        createShowtimeWithSeats(testMovie, testRoom, futureStart, ShowtimeStatus.CANCELLED);

        movieService.discontinueMovie(testMovie.getId());

        Movie refreshedMovie = movieRepository.findById(testMovie.getId()).orElseThrow();
        assertThat(refreshedMovie.getStatus()).isEqualTo(MovieStatus.ENDED);
    }

    @Test
    @DisplayName("G2-04 Case 3: Đặt vé vào suất chiếu thuộc phim có trạng thái ENDED -> Bị từ chối với lỗi 1502")
    void createBooking_WhenMovieStatusIsEnded_ThrowsShowtimeNotAvailableForBooking() {
        LocalDateTime futureStart = LocalDateTime.now().plusDays(1);
        Showtime showtime = createShowtimeWithSeats(testMovie, testRoom, futureStart, ShowtimeStatus.SCHEDULED);

        // Transition movie to ENDED (defensive scenario)
        testMovie.setStatus(MovieStatus.ENDED);
        movieRepository.save(testMovie);
        entityManager.flush();
        entityManager.clear();

        List<ShowtimeSeat> seats = showtimeSeatRepository.findByShowtimeIdOrderBySeatRowNameAscSeatSeatNumberAsc(showtime.getId());
        ShowtimeSeat targetSeat = seats.get(0);

        BookingCreateRequest request = new BookingCreateRequest(
                showtime.getId(),
                List.of(targetSeat.getId()),
                null
        );

        assertThatThrownBy(() -> bookingService.createBooking(testUser.getEmail(), request))
                .isInstanceOf(AppException.class)
                .satisfies(ex -> {
                    AppException appEx = (AppException) ex;
                    assertThat(appEx.getErrorCode()).isEqualTo(ErrorCode.SHOWTIME_NOT_AVAILABLE_FOR_BOOKING);
                    assertThat(appEx.getErrorCode().getCode()).isEqualTo(1502);
                });
    }
}
