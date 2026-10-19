package com.example.cinema.showtime.service;

import com.example.cinema.common.dto.PageResponse;
import com.example.cinema.common.exception.AppException;
import com.example.cinema.common.exception.ErrorCode;
import com.example.cinema.movie.entity.Movie;
import com.example.cinema.movie.enums.MovieStatus;
import com.example.cinema.movie.repository.MovieRepository;
import com.example.cinema.showtime.dto.request.ShowtimeRequest;
import com.example.cinema.showtime.dto.response.ShowtimeResponse;
import com.example.cinema.showtime.dto.response.ShowtimeSeatResponse;
import com.example.cinema.showtime.entity.Room;
import com.example.cinema.showtime.entity.Seat;
import com.example.cinema.showtime.entity.Showtime;
import com.example.cinema.showtime.entity.ShowtimeSeat;
import com.example.cinema.showtime.enums.ShowtimeSeatStatus;
import com.example.cinema.showtime.enums.ShowtimeStatus;
import com.example.cinema.showtime.mapper.ShowtimeMapper;
import com.example.cinema.showtime.repository.RoomRepository;
import com.example.cinema.showtime.repository.SeatRepository;
import com.example.cinema.showtime.repository.ShowtimeRepository;
import com.example.cinema.showtime.repository.ShowtimeSeatRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ShowtimeService {

    ShowtimeRepository showtimeRepository;
    ShowtimeSeatRepository showtimeSeatRepository;
    RoomRepository roomRepository;
    SeatRepository seatRepository;
    MovieRepository movieRepository;
    ShowtimeMapper showtimeMapper;

    @Transactional
    public ShowtimeResponse createShowtime(ShowtimeRequest request) {
        Movie movie = movieRepository.findById(request.movieId())
                .orElseThrow(() -> new AppException(ErrorCode.MOVIE_NOT_FOUND));

        if (movie.getStatus() == MovieStatus.ENDED) {
            throw new AppException(ErrorCode.MOVIE_NOT_AVAILABLE_FOR_SHOWTIME);
        }

        Room room = roomRepository.findByIdForUpdate(request.roomId())
                .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));

        if (Boolean.FALSE.equals(room.getIsActive())) {
            throw new AppException(ErrorCode.ROOM_INACTIVE);
        }

        // 3. Tính end_time = start_time + duration_minutes và cleaning_end_time = end_time + 15 phút
        LocalDateTime startTime = request.startTime();
        LocalDateTime endTime = startTime.plusMinutes(movie.getDurationMinutes());
        LocalDateTime cleaningEndTime = endTime.plusMinutes(15);

        boolean hasOverlap = showtimeRepository.existsOverlappingShowtime(
                room.getId(),
                ShowtimeStatus.SCHEDULED,
                startTime,
                cleaningEndTime
        );

        if (hasOverlap) {
            throw new AppException(ErrorCode.SHOWTIME_TIME_CONFLICT);
        }


        Showtime showtime = showtimeMapper.toEntity(request, movie, room, endTime, cleaningEndTime);
        Showtime savedShowtime = showtimeRepository.save(showtime);

        List<Seat> activeSeats = seatRepository.findByRoomIdAndIsActiveTrueOrderByRowNameAscSeatNumberAsc(room.getId());
        if (activeSeats.isEmpty()) {
            throw new AppException(ErrorCode.ROOM_HAS_NO_ACTIVE_SEATS);
        }

        List<ShowtimeSeat> showtimeSeats = activeSeats.stream()
                .map(seat -> ShowtimeSeat.builder()
                        .showtime(savedShowtime)
                        .seat(seat)
                        .price(seat.getType().calculatePrice(savedShowtime.getBasePrice()))
                        .status(ShowtimeSeatStatus.AVAILABLE)
                        .heldByBookingId(null)
                        .build())
                .toList();

        showtimeSeatRepository.saveAll(showtimeSeats);

        return showtimeMapper.toResponse(savedShowtime);
    }

    @Transactional(readOnly = true)
    public PageResponse<ShowtimeResponse> getShowtimes(
            Long movieId,
            Long roomId,
            ShowtimeStatus status,
            LocalDateTime fromTime,
            LocalDateTime toTime,
            int page,
            int size
    ) {
        Pageable pageable = PageRequest.of(page - 1, size, Sort.by(Sort.Direction.ASC, "startTime"));
        Page<Showtime> showtimePage = showtimeRepository.searchShowtimes(movieId, roomId, status, fromTime, toTime, pageable);
        return PageResponse.from(showtimePage.map(showtimeMapper::toResponse));
    }

    @Transactional(readOnly = true)
    public ShowtimeResponse getShowtimeById(Long id) {
        Showtime showtime = showtimeRepository.findDetailById(id)
                .orElseThrow(() -> new AppException(ErrorCode.SHOWTIME_NOT_FOUND));
        return showtimeMapper.toResponse(showtime);
    }

    @Transactional(readOnly = true)
    public List<ShowtimeSeatResponse> getShowtimeSeats(Long showtimeId) {
        if (!showtimeRepository.existsById(showtimeId)) {
            throw new AppException(ErrorCode.SHOWTIME_NOT_FOUND);
        }
        return showtimeSeatRepository.findByShowtimeIdOrderBySeatRowNameAscSeatSeatNumberAsc(showtimeId).stream()
                .map(showtimeMapper::toSeatResponse)
                .toList();
    }

    @Transactional
    public void cancelShowtime(Long id) {
        Showtime showtime = showtimeRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.SHOWTIME_NOT_FOUND));

        if (showtime.getStatus() == ShowtimeStatus.CANCELLED) {
            throw new AppException(ErrorCode.SHOWTIME_ALREADY_CANCELLED);
        }

        boolean hasActiveBookings = showtimeSeatRepository.existsByShowtimeIdAndStatusIn(
                id,
                List.of(ShowtimeSeatStatus.HELD, ShowtimeSeatStatus.BOOKED)
        );

        if (hasActiveBookings) {
            throw new AppException(ErrorCode.SHOWTIME_HAS_ACTIVE_BOOKINGS);
        }

        showtime.setStatus(ShowtimeStatus.CANCELLED);
        showtimeRepository.save(showtime);
    }
}