package com.example.cinema.showtime;

import com.example.cinema.auth.entity.User;
import com.example.cinema.auth.enums.Role;
import com.example.cinema.auth.repository.UserRepository;
import com.example.cinema.booking.entity.Booking;
import com.example.cinema.booking.enums.BookingStatus;
import com.example.cinema.booking.repository.BookingRepository;
import com.example.cinema.common.exception.AppException;
import com.example.cinema.common.exception.ErrorCode;
import com.example.cinema.movie.entity.Movie;
import com.example.cinema.movie.enums.MovieStatus;
import com.example.cinema.movie.repository.MovieRepository;
import com.example.cinema.payment.entity.Payment;
import com.example.cinema.payment.enums.PaymentProvider;
import com.example.cinema.payment.enums.PaymentRefundStatus;
import com.example.cinema.payment.enums.PaymentStatus;
import com.example.cinema.payment.repository.PaymentRepository;
import com.example.cinema.showtime.dto.request.ShowtimeRequest;
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
import com.example.cinema.showtime.service.ShowtimeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional
class ShowtimeWorkflowIntegrationTest {

    @Autowired
    ShowtimeService showtimeService;

    @Autowired
    ShowtimeRepository showtimeRepository;

    @Autowired
    ShowtimeSeatRepository showtimeSeatRepository;

    @Autowired
    MovieRepository movieRepository;

    @Autowired
    CinemaRepository cinemaRepository;

    @Autowired
    RoomRepository roomRepository;

    @Autowired
    SeatRepository seatRepository;

    @Autowired
    BookingRepository bookingRepository;

    @Autowired
    PaymentRepository paymentRepository;

    @Autowired
    UserRepository userRepository;

    private Room testRoom;

    @BeforeEach
    void setUpTestData() {
        if (roomRepository.count() == 0) {
            Cinema cinema = cinemaRepository.save(Cinema.builder()
                    .name("Hanoi Central Cinema")
                    .address("123 Hoan Kiem, Hanoi")
                    .build());
            testRoom = roomRepository.save(Room.builder()
                    .cinema(cinema)
                    .name("Hall 1")
                    .totalRows(5)
                    .totalColumns(5)
                    .isActive(true)
                    .build());
            for (int r = 0; r < 5; r++) {
                String row = String.valueOf((char) ('A' + r));
                for (int c = 1; c <= 5; c++) {
                    seatRepository.save(Seat.builder()
                            .room(testRoom)
                            .rowName(row)
                            .seatNumber(c)
                            .type(SeatType.NORMAL)
                            .isActive(true)
                            .build());
                }
            }
        } else {
            testRoom = roomRepository.findAll().getFirst();
        }

        if (!userRepository.existsByEmail("admin@cinema.com")) {
            userRepository.save(User.builder()
                    .email("admin@cinema.com")
                    .passwordHash("hashed")
                    .fullName("Admin")
                    .phone("0999999999")
                    .role(Role.ADMIN)
                    .isActive(true)
                    .build());
        }
    }

    @Test
    @DisplayName("TC-SHOW-03: Cannot schedule a showtime for an ENDED movie")
    void cannotCreateShowtimeForEndedMovie() {
        Movie endedMovie = movieRepository.findAll().stream()
                .filter(m -> m.getStatus() == MovieStatus.ENDED)
                .findFirst()
                .orElseGet(() -> movieRepository.save(Movie.builder()
                        .title("Ended Test Movie")
                        .durationMinutes(120)
                        .status(MovieStatus.ENDED)
                        .build()));

        ShowtimeRequest request = new ShowtimeRequest(
                endedMovie.getId(),
                testRoom.getId(),
                ShowtimeFormat._2D,
                TranslationType.SUBTITLE,
                LocalDateTime.now().plusDays(2),
                80000L
        );

        assertThatThrownBy(() -> showtimeService.createShowtime(request))
                .isInstanceOf(AppException.class)
                .satisfies(ex -> {
                    AppException appEx = (AppException) ex;
                    assertThat(appEx.getErrorCode()).isEqualTo(ErrorCode.MOVIE_NOT_AVAILABLE_FOR_SHOWTIME);
                });
    }

    @Test
    @DisplayName("TC-SHOW-05: Cancelling showtime with confirmed bookings transitions booking to CANCELLED and triggers REFUND_REQUIRED")
    void cancelShowtimeWithBookingsTriggersRefundPipeline() {
        Movie activeMovie = movieRepository.findAll().stream()
                .filter(m -> m.getStatus() == MovieStatus.NOW_SHOWING)
                .findFirst()
                .orElseGet(() -> movieRepository.save(Movie.builder()
                        .title("Active Test Movie")
                        .durationMinutes(120)
                        .status(MovieStatus.NOW_SHOWING)
                        .build()));

        User user = userRepository.findByEmail("admin@cinema.com").orElseThrow();

        Showtime showtime = showtimeRepository.save(Showtime.builder()
                .movie(activeMovie)
                .room(testRoom)
                .format(ShowtimeFormat._2D)
                .translationType(TranslationType.SUBTITLE)
                .startTime(LocalDateTime.now().plusDays(3))
                .endTime(LocalDateTime.now().plusDays(3).plusMinutes(activeMovie.getDurationMinutes()))
                .cleaningEndTime(LocalDateTime.now().plusDays(3).plusMinutes(activeMovie.getDurationMinutes() + 15))
                .basePrice(90000L)
                .status(ShowtimeStatus.SCHEDULED)
                .build());

        Booking booking = bookingRepository.save(Booking.builder()
                .bookingCode("BK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .user(user)
                .showtime(showtime)
                .subtotalAmount(90000L)
                .discountAmount(0L)
                .finalAmount(90000L)
                .status(BookingStatus.CONFIRMED)
                .expiresAt(LocalDateTime.now().plusMinutes(10))
                .build());

        Seat seat = seatRepository.findByRoomIdOrderByRowNameAscSeatNumberAsc(testRoom.getId()).getFirst();
        ShowtimeSeat showtimeSeat = showtimeSeatRepository.save(ShowtimeSeat.builder()
                .showtime(showtime)
                .seat(seat)
                .price(90000L)
                .status(ShowtimeSeatStatus.BOOKED)
                .heldByBookingId(booking.getId())
                .build());

        Payment payment = paymentRepository.save(Payment.builder()
                .booking(booking)
                .amount(90000L)
                .provider(PaymentProvider.VNPAY)
                .transactionRef("TRX-TEST-" + UUID.randomUUID().toString().substring(0, 8))
                .status(PaymentStatus.SUCCESS)
                .refundStatus(PaymentRefundStatus.NONE)
                .responseCode("00")
                .transactionStatus("00")
                .payDate(LocalDateTime.now())
                .build());

        showtimeService.cancelShowtime(showtime.getId());

        Showtime updatedShowtime = showtimeRepository.findById(showtime.getId()).orElseThrow();
        assertThat(updatedShowtime.getStatus()).isEqualTo(ShowtimeStatus.CANCELLED);

        Booking updatedBooking = bookingRepository.findById(booking.getId()).orElseThrow();
        assertThat(updatedBooking.getStatus()).isEqualTo(BookingStatus.CANCELLED);

        Payment updatedPayment = paymentRepository.findById(payment.getId()).orElseThrow();
        assertThat(updatedPayment.getRefundStatus()).isEqualTo(PaymentRefundStatus.REFUND_REQUIRED);

        ShowtimeSeat updatedSeat = showtimeSeatRepository.findById(showtimeSeat.getId()).orElseThrow();
        assertThat(updatedSeat.getStatus()).isEqualTo(ShowtimeSeatStatus.AVAILABLE);
        assertThat(updatedSeat.getHeldByBookingId()).isNull();
    }
}
