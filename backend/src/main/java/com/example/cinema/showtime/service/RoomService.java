package com.example.cinema.showtime.service;

import com.example.cinema.common.exception.AppException;
import com.example.cinema.common.exception.ErrorCode;
import com.example.cinema.showtime.dto.request.RoomRequest;
import com.example.cinema.showtime.dto.request.SeatBatchUpdateRequest;
import com.example.cinema.showtime.dto.response.RoomResponse;
import com.example.cinema.showtime.dto.response.SeatResponse;
import com.example.cinema.showtime.entity.Cinema;
import com.example.cinema.showtime.entity.Room;
import com.example.cinema.showtime.entity.Seat;
import com.example.cinema.showtime.entity.ShowtimeSeat;
import com.example.cinema.showtime.enums.SeatType;
import com.example.cinema.showtime.enums.ShowtimeSeatStatus;
import com.example.cinema.showtime.enums.ShowtimeStatus;
import com.example.cinema.showtime.mapper.RoomMapper;
import com.example.cinema.showtime.mapper.SeatMapper;
import com.example.cinema.showtime.repository.RoomRepository;
import com.example.cinema.showtime.repository.SeatRepository;
import com.example.cinema.showtime.repository.ShowtimeRepository;
import com.example.cinema.showtime.repository.ShowtimeSeatRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class RoomService {

    RoomRepository roomRepository;
    SeatRepository seatRepository;
    ShowtimeRepository showtimeRepository;
    ShowtimeSeatRepository showtimeSeatRepository;
    CinemaService cinemaService;
    RoomMapper roomMapper;
    SeatMapper seatMapper;
    PricingService pricingService;

    @Transactional
    public RoomResponse createRoom(RoomRequest request) {
        Cinema cinema = cinemaService.findCinemaByIdOrThrow(request.cinemaId());

        if (roomRepository.existsByCinemaIdAndNameIgnoreCase(request.cinemaId(), request.name().trim())) {
            throw new AppException(ErrorCode.ROOM_NAME_ALREADY_EXISTS);
        }

        Room room = roomRepository.save(roomMapper.toEntity(request, cinema));

        List<Seat> physicalSeats = new ArrayList<>(request.totalRows() * request.totalColumns());
        for (int r = 0; r < request.totalRows(); r++) {
            String rowName = String.valueOf((char) ('A' + r));
            for (int c = 1; c <= request.totalColumns(); c++) {
                physicalSeats.add(Seat.builder()
                        .room(room)
                        .rowName(rowName)
                        .seatNumber(c)
                        .type(SeatType.NORMAL)
                        .isActive(true)
                        .build());
            }
        }
        seatRepository.saveAll(physicalSeats);

        return roomMapper.toResponse(room);
    }

    @Transactional(readOnly = true)
    public List<RoomResponse> getRoomsByCinema(Long cinemaId) {
        return roomRepository.findByCinemaIdOrderByNameAsc(cinemaId).stream()
                .map(roomMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public RoomResponse getRoomById(Long id) {
        return roomMapper.toResponse(findRoomWithCinemaOrThrow(id));
    }

    @Transactional(readOnly = true)
    public List<SeatResponse> getSeatsByRoom(Long roomId) {
        findRoomWithCinemaOrThrow(roomId);
        return seatRepository.findByRoomIdOrderByRowNameAscSeatNumberAsc(roomId).stream()
                .map(seatMapper::toResponse)
                .toList();
    }

    @Transactional
    public List<SeatResponse> batchUpdateSeats(Long roomId, SeatBatchUpdateRequest request) {
        findRoomWithCinemaOrThrow(roomId);

        List<Seat> seats = seatRepository.findByIdInAndRoomId(request.seatIds(), roomId);
        if (seats.size() != request.seatIds().size()) {
            throw new AppException(ErrorCode.SEAT_NOT_FOUND);
        }

        LocalDateTime now = LocalDateTime.now();

        boolean affectsType = request.type() != null;
        boolean affectsPairGroup = request.pairGroup() != null;
        if (affectsType || affectsPairGroup) {
            boolean hasActiveReservations = showtimeSeatRepository.existsBySeatIdInAndShowtimeStatusAndShowtimeStartTimeAfterAndStatusIn(
                    request.seatIds(),
                    ShowtimeStatus.SCHEDULED,
                    now,
                    List.of(ShowtimeSeatStatus.HELD, ShowtimeSeatStatus.BOOKED)
            );
            if (hasActiveReservations) {
                throw new AppException(ErrorCode.SEAT_NOT_AVAILABLE);
            }
        }

        if (request.pairGroup() != null && request.pairGroup() > 0) {
            if (seats.size() != 2) {
                throw new AppException(ErrorCode.INVALID_COUPLE_SEAT_CONFIGURATION);
            }
            Seat s1 = seats.get(0);
            Seat s2 = seats.get(1);
            SeatType type1 = request.type() != null ? request.type() : s1.getType();
            SeatType type2 = request.type() != null ? request.type() : s2.getType();
            if (type1 != SeatType.COUPLE || type2 != SeatType.COUPLE) {
                throw new AppException(ErrorCode.INVALID_COUPLE_SEAT_CONFIGURATION);
            }
            if (!Objects.equals(s1.getRowName(), s2.getRowName())) {
                throw new AppException(ErrorCode.INVALID_COUPLE_SEAT_CONFIGURATION);
            }
            int n1 = s1.getSeatNumber() != null ? s1.getSeatNumber() : -99;
            int n2 = s2.getSeatNumber() != null ? s2.getSeatNumber() : -99;
            if (Math.abs(n1 - n2) != 1) {
                throw new AppException(ErrorCode.INVALID_COUPLE_SEAT_CONFIGURATION);
            }
            List<Seat> existingWithPair = seatRepository.findByRoomIdAndPairGroup(roomId, request.pairGroup());
            Set<Long> updatingIds = new HashSet<>(request.seatIds());
            if (existingWithPair.stream().anyMatch(s -> !updatingIds.contains(s.getId()))) {
                throw new AppException(ErrorCode.INVALID_COUPLE_SEAT_CONFIGURATION);
            }
        }

        for (Seat seat : seats) {
            if (request.type() != null && request.type() != seat.getType()) {
                seat.setType(request.type());
                for (ShowtimeSeat ss : showtimeSeatRepository.findFutureAvailableBySeatId(seat.getId(), now)) {
                    long newPrice = pricingService.calculateSeatPrice(ss.getShowtime(), request.type());
                    showtimeSeatRepository.repriceIfAvailable(ss.getId(), newPrice);
                }
            }
            if (request.isActive() != null) {
                seat.setIsActive(request.isActive());
            }
            if (request.pairGroup() != null) {
                seat.setPairGroup(request.pairGroup() <= 0 ? null : request.pairGroup());
            } else if (request.type() != null && request.type() != SeatType.COUPLE) {
                seat.setPairGroup(null);
            }
        }

        return seatRepository.saveAll(seats).stream()
                .map(seatMapper::toResponse)
                .toList();
    }

    @Transactional
    public RoomResponse toggleRoomStatus(Long id, boolean isActive) {
        Room room = findRoomWithCinemaOrThrow(id);
        if (!isActive) {
            boolean hasFutureShowtimes = showtimeRepository.existsByRoomIdAndStatusAndStartTimeAfter(
                    id, ShowtimeStatus.SCHEDULED, LocalDateTime.now());
            if (hasFutureShowtimes) {
                throw new AppException(ErrorCode.ROOM_HAS_FUTURE_SHOWTIMES);
            }
        }
        room.setIsActive(isActive);
        return roomMapper.toResponse(roomRepository.save(room));
    }

    private Room findRoomWithCinemaOrThrow(Long id) {
        return roomRepository.findWithCinemaById(id)
                .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));
    }
}