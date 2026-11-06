package com.example.cinema.movie;

import com.example.cinema.common.AbstractMySqlIT;
import com.example.cinema.common.ConcurrencyTestSupport;
import com.example.cinema.common.exception.AppException;
import com.example.cinema.common.exception.ErrorCode;
import com.example.cinema.movie.entity.Movie;
import com.example.cinema.movie.enums.AgeRating;
import com.example.cinema.movie.enums.MovieStatus;
import com.example.cinema.movie.repository.MovieRepository;
import com.example.cinema.movie.service.MovieService;
import com.example.cinema.showtime.dto.request.ShowtimeRequest;
import com.example.cinema.showtime.entity.Cinema;
import com.example.cinema.showtime.entity.Room;
import com.example.cinema.showtime.entity.Seat;
import com.example.cinema.showtime.entity.Showtime;
import com.example.cinema.showtime.enums.SeatType;
import com.example.cinema.showtime.enums.ShowtimeFormat;
import com.example.cinema.showtime.enums.ShowtimeStatus;
import com.example.cinema.showtime.enums.TranslationType;
import com.example.cinema.showtime.repository.CinemaRepository;
import com.example.cinema.showtime.repository.RoomRepository;
import com.example.cinema.showtime.repository.SeatRepository;
import com.example.cinema.showtime.repository.ShowtimeRepository;
import com.example.cinema.showtime.repository.ShowtimeSeatRepository;
import com.example.cinema.showtime.service.ShowtimeService;
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

public class ShowtimeVsDiscontinueIT extends AbstractMySqlIT {

    @Autowired
    ShowtimeService showtimeService;

    @Autowired
    MovieService movieService;

    @Autowired
    ShowtimeRepository showtimeRepository;

    @Autowired
    ShowtimeSeatRepository showtimeSeatRepository;

    @Autowired
    MovieRepository movieRepository;

    @Autowired
    RoomRepository roomRepository;

    @Autowired
    SeatRepository seatRepository;

    @Autowired
    CinemaRepository cinemaRepository;

    private Movie movie;
    private Room room;
    private Cinema cinema;
    private List<Seat> seats = new ArrayList<>();

    @BeforeEach
    void setUp() {
        String testId = UUID.randomUUID().toString().substring(0, 8);

        cinema = cinemaRepository.save(Cinema.builder()
                .name("Cinema-Disc-" + testId)
                .address("123 Street " + testId)
                .hotline("19008888")
                .build());

        room = roomRepository.save(Room.builder()
                .cinema(cinema)
                .name("Room-Disc-" + testId)
                .totalRows(1)
                .totalColumns(4)
                .isActive(true)
                .build());

        for (int i = 1; i <= 4; i++) {
            seats.add(seatRepository.save(Seat.builder()
                    .room(room)
                    .rowName("A")
                    .seatNumber(i)
                    .type(SeatType.NORMAL)
                    .isActive(true)
                    .build()));
        }

        movie = movieRepository.save(Movie.builder()
                .title("Race Movie " + testId)
                .director("Director " + testId)
                .originalLanguage("en")
                .durationMinutes(100)
                .releaseDate(LocalDate.now().minusDays(3))
                .ageRating(AgeRating.T13)
                .status(MovieStatus.NOW_SHOWING)
                .build());
    }

    @AfterEach
    void tearDown() {
        if (movie != null) {
            List<Showtime> showtimes = showtimeRepository.findAll().stream()
                    .filter(s -> s.getMovie().getId().equals(movie.getId()))
                    .toList();
            for (Showtime s : showtimes) {
                showtimeSeatRepository.deleteAll(
                        showtimeSeatRepository.findByShowtimeIdOrderBySeatRowNameAscSeatSeatNumberAsc(s.getId()));
                showtimeRepository.delete(s);
            }
        }
        if (!seats.isEmpty()) seatRepository.deleteAll(seats);
        if (room != null) roomRepository.delete(room);
        if (cinema != null) cinemaRepository.delete(cinema);
        if (movie != null) movieRepository.delete(movie);
    }

    @Test
    @DisplayName("AF-10: Race condition between createShowtime and discontinueMovie is serialized without inconsistent state")
    void raceConditionBetweenCreateShowtimeAndDiscontinueMovie() throws Exception {
        LocalDateTime futureStart = LocalDateTime.now().plusDays(2);
        ShowtimeRequest request = new ShowtimeRequest(
                movie.getId(),
                room.getId(),
                ShowtimeFormat._2D,
                TranslationType.SUBTITLE,
                futureStart,
                75000L
        );

        List<Runnable> actions = List.of(
                () -> showtimeService.createShowtime(request),
                () -> movieService.discontinueMovie(movie.getId())
        );

        List<ConcurrencyTestSupport.ExecutionResult<Void>> results = ConcurrencyTestSupport.executeConcurrentActions(actions);
        assertThat(results).hasSize(2);

        Movie finalMovie = movieRepository.findById(movie.getId()).orElseThrow();
        boolean hasFutureActiveShowtime = showtimeRepository.existsByMovieIdAndStatusAndStartTimeAfter(
                movie.getId(), ShowtimeStatus.SCHEDULED, LocalDateTime.now());

        // Invariant: An ENDED movie can NEVER have scheduled future showtimes
        if (finalMovie.getStatus() == MovieStatus.ENDED) {
            assertThat(hasFutureActiveShowtime)
                    .as("An ENDED movie must not have future SCHEDULED showtimes")
                    .isFalse();
        } else {
            assertThat(hasFutureActiveShowtime)
                    .as("If movie is not ENDED, createShowtime succeeded and discontinueMovie was rejected")
                    .isTrue();
        }
    }
}

