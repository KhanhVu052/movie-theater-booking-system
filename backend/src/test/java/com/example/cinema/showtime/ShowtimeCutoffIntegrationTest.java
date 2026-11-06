package com.example.cinema.showtime;

import com.example.cinema.auth.entity.User;
import com.example.cinema.auth.enums.Role;
import com.example.cinema.auth.repository.UserRepository;
import com.example.cinema.booking.dto.request.BookingCreateRequest;
import com.example.cinema.booking.dto.response.BookingResponse;
import com.example.cinema.booking.enums.BookingStatus;
import com.example.cinema.booking.service.BookingService;
import com.example.cinema.common.dto.ApiResponse;
import com.example.cinema.common.dto.PageResponse;
import com.example.cinema.common.exception.AppException;
import com.example.cinema.common.exception.ErrorCode;
import com.example.cinema.movie.entity.Movie;
import com.example.cinema.movie.enums.AgeRating;
import com.example.cinema.movie.enums.MovieStatus;
import com.example.cinema.movie.repository.MovieRepository;
import com.example.cinema.showtime.controller.ShowtimeController;
import com.example.cinema.showtime.dto.response.ShowtimeResponse;
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
import org.springframework.http.ResponseEntity;
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
public class ShowtimeCutoffIntegrationTest extends AbstractMySqlIT {

    @Autowired
    BookingService bookingService;

    @Autowired
    ShowtimeController showtimeController;

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
    private Movie testMovie;
    private Room testRoom1;
    private Room testRoom2;
    private List<Seat> room1PhysicalSeats;
    private List<Seat> room2PhysicalSeats;

    @BeforeEach
    void setUp() {
        String testId = UUID.randomUUID().toString().substring(0, 8);

        testUser = userRepository.save(User.builder()
                .email("cutoff-" + testId + "@cinema.com")
                .passwordHash("hashedpassword")
                .fullName("Cutoff Test User " + testId)
                .phone("097" + testId.replaceAll("[^0-9]", "3").substring(0, Math.min(6, testId.length())) + "222")
                .role(Role.CUSTOMER)
                .isActive(true)
                .build());

        Cinema cinema = cinemaRepository.save(Cinema.builder()
                .name("Cinema Cutoff " + testId)
                .address("Cutoff Test Address " + testId)
                .build());

        testRoom1 = roomRepository.save(Room.builder()
                .cinema(cinema)
                .name("Hall A " + testId)
                .totalRows(2)
                .totalColumns(5)
                .isActive(true)
                .build());

        testRoom2 = roomRepository.save(Room.builder()
                .cinema(cinema)
                .name("Hall B " + testId)
                .totalRows(2)
                .totalColumns(5)
                .isActive(true)
                .build());

        room1PhysicalSeats = new ArrayList<>();
        for (int c = 1; c <= 5; c++) {
            room1PhysicalSeats.add(seatRepository.save(Seat.builder()
                    .room(testRoom1)
                    .rowName("A")
                    .seatNumber(c)
                    .type(SeatType.NORMAL)
                    .isActive(true)
                    .build()));
        }

        room2PhysicalSeats = new ArrayList<>();
        for (int c = 1; c <= 5; c++) {
            room2PhysicalSeats.add(seatRepository.save(Seat.builder()
                    .room(testRoom2)
                    .rowName("B")
                    .seatNumber(c)
                    .type(SeatType.NORMAL)
                    .isActive(true)
                    .build()));
        }

        testMovie = movieRepository.save(Movie.builder()
                .title("Movie Cutoff " + testId)
                .durationMinutes(120)
                .releaseDate(LocalDate.now().minusDays(3))
                .ageRating(AgeRating.P)
                .originalLanguage("Vietnamese")
                .status(MovieStatus.NOW_SHOWING)
                .build());

        entityManager.flush();
        entityManager.clear();
    }

    private Showtime createShowtimeWithSeats(Room room, LocalDateTime startTime, List<Seat> physicalSeats) {
        Showtime showtime = showtimeRepository.save(Showtime.builder()
                .movie(testMovie)
                .room(room)
                .format(ShowtimeFormat._2D)
                .translationType(TranslationType.SUBTITLE)
                .startTime(startTime)
                .endTime(startTime.plusMinutes(120))
                .cleaningEndTime(startTime.plusMinutes(135))
                .basePrice(85000L)
                .status(ShowtimeStatus.SCHEDULED)
                .build());

        for (Seat seat : physicalSeats) {
            showtimeSeatRepository.save(ShowtimeSeat.builder()
                    .showtime(showtime)
                    .seat(seat)
                    .price(85000L)
                    .status(ShowtimeSeatStatus.AVAILABLE)
                    .build());
        }

        entityManager.flush();
        return showtime;
    }

    @Test
    @DisplayName("G2-03: Đặt vé cho suất chiếu bắt đầu sau 10 phút (< 15 phút cutoff) phải bị từ chối với mã lỗi 1502")
    void createBooking_WhenShowtimeStartsIn10Minutes_ThrowsShowtimeNotAvailable() {
        LocalDateTime startTime = LocalDateTime.now().plusMinutes(10);
        Showtime showtime10m = createShowtimeWithSeats(testRoom1, startTime, room1PhysicalSeats);
        List<ShowtimeSeat> seats = showtimeSeatRepository.findByShowtimeIdOrderBySeatRowNameAscSeatSeatNumberAsc(showtime10m.getId());
        ShowtimeSeat targetSeat = seats.get(0);

        BookingCreateRequest request = new BookingCreateRequest(
                showtime10m.getId(),
                List.of(targetSeat.getId()),
                null
        );

        assertThatThrownBy(() -> bookingService.createBooking(testUser.getEmail(), request))
                .isInstanceOf(AppException.class)
                .satisfies(ex -> {
                    AppException appEx = (AppException) ex;
                    assertThat(appEx.getErrorCode()).isEqualTo(ErrorCode.SHOWTIME_NOT_AVAILABLE_FOR_BOOKING);
                    assertThat(appEx.getErrorCode().getCode()).isEqualTo(1502);
                    assertThat(appEx.getMessage()).isEqualTo("Showtime is cancelled or the booking window has closed");
                });
    }

    @Test
    @DisplayName("G2-03: Đặt vé cho suất chiếu bắt đầu sau 20 phút (> 15 phút cutoff) phải thành công với trạng thái PENDING_PAYMENT")
    void createBooking_WhenShowtimeStartsIn20Minutes_Succeeds() {
        LocalDateTime startTime = LocalDateTime.now().plusMinutes(20);
        Showtime showtime20m = createShowtimeWithSeats(testRoom1, startTime, room1PhysicalSeats);
        List<ShowtimeSeat> seats = showtimeSeatRepository.findByShowtimeIdOrderBySeatRowNameAscSeatSeatNumberAsc(showtime20m.getId());
        ShowtimeSeat targetSeat = seats.get(0);

        BookingCreateRequest request = new BookingCreateRequest(
                showtime20m.getId(),
                List.of(targetSeat.getId()),
                null
        );

        BookingResponse response = bookingService.createBooking(testUser.getEmail(), request);

        assertThat(response).isNotNull();
        assertThat(response.id()).isNotNull();
        assertThat(response.status()).isEqualTo(BookingStatus.PENDING_PAYMENT);
        assertThat(response.showtimeId()).isEqualTo(showtime20m.getId());
    }

    @Test
    @DisplayName("G2-03: Lọc GET /showtimes?bookableOnly=true chỉ trả về suất chiếu sau 25 phút, loại bỏ suất sau 10 phút")
    void getShowtimes_WhenBookableOnlyTrue_FiltersOutShowtimesStartingWithinCutoff() {
        LocalDateTime startIn10m = LocalDateTime.now().plusMinutes(10);
        LocalDateTime startIn25m = LocalDateTime.now().plusMinutes(25);

        Showtime showtime10m = createShowtimeWithSeats(testRoom1, startIn10m, room1PhysicalSeats);
        Showtime showtime25m = createShowtimeWithSeats(testRoom2, startIn25m, room2PhysicalSeats);

        // 1. Calling with bookableOnly = true
        ResponseEntity<ApiResponse<PageResponse<ShowtimeResponse>>> responseBookable = showtimeController.getShowtimes(
                testMovie.getId(),
                null,
                null,
                null,
                null,
                true,
                1,
                10
        );

        assertThat(responseBookable.getBody()).isNotNull();
        List<ShowtimeResponse> bookableItems = responseBookable.getBody().getData().items();
        List<Long> bookableIds = bookableItems.stream().map(ShowtimeResponse::id).toList();

        assertThat(bookableIds).contains(showtime25m.getId());
        assertThat(bookableIds).doesNotContain(showtime10m.getId());

        // 2. Calling with bookableOnly = false (Admin default view)
        ResponseEntity<ApiResponse<PageResponse<ShowtimeResponse>>> responseAll = showtimeController.getShowtimes(
                testMovie.getId(),
                null,
                null,
                null,
                null,
                false,
                1,
                10
        );

        assertThat(responseAll.getBody()).isNotNull();
        List<ShowtimeResponse> allItems = responseAll.getBody().getData().items();
        List<Long> allIds = allItems.stream().map(ShowtimeResponse::id).toList();

        assertThat(allIds).contains(showtime10m.getId(), showtime25m.getId());
    }
}
