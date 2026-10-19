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
import com.example.cinema.showtime.enums.SeatType;
import com.example.cinema.showtime.mapper.RoomMapper;
import com.example.cinema.showtime.mapper.SeatMapper;
import com.example.cinema.showtime.repository.RoomRepository;
import com.example.cinema.showtime.repository.SeatRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class RoomService {

    RoomRepository roomRepository;
    SeatRepository seatRepository;
    CinemaService cinemaService;
    RoomMapper roomMapper;
    SeatMapper seatMapper;

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

        for (Seat seat : seats) {
            if (request.type() != null) {
                seat.setType(request.type());
            }
            if (request.isActive() != null) {
                seat.setIsActive(request.isActive());
            }
        }

        return seatRepository.saveAll(seats).stream()
                .map(seatMapper::toResponse)
                .toList();
    }

    @Transactional
    public RoomResponse toggleRoomStatus(Long id, boolean isActive) {
        Room room = findRoomWithCinemaOrThrow(id);
        room.setIsActive(isActive);
        return roomMapper.toResponse(roomRepository.save(room));
    }

    private Room findRoomWithCinemaOrThrow(Long id) {
        return roomRepository.findWithCinemaById(id)
                .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));
    }
}