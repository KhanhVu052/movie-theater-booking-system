package com.example.cinema.showtime.mapper;

import com.example.cinema.showtime.dto.request.RoomRequest;
import com.example.cinema.showtime.dto.response.RoomResponse;
import com.example.cinema.showtime.entity.Cinema;
import com.example.cinema.showtime.entity.Room;
import org.springframework.stereotype.Component;

@Component
public class RoomMapper {

    public Room toEntity(RoomRequest request, Cinema cinema) {
        return Room.builder()
                .cinema(cinema)
                .name(request.name().trim())
                .totalRows(request.totalRows())
                .totalColumns(request.totalColumns())
                .isActive(true)
                .build();
    }

    public RoomResponse toResponse(Room room) {
        return RoomResponse.builder()
                .id(room.getId())
                .cinemaId(room.getCinema().getId())
                .cinemaName(room.getCinema().getName())
                .name(room.getName())
                .totalRows(room.getTotalRows())
                .totalColumns(room.getTotalColumns())
                .totalSeats(room.getTotalRows() * room.getTotalColumns())
                .isActive(room.getIsActive())
                .createdAt(room.getCreatedAt())
                .updatedAt(room.getUpdatedAt())
                .build();
    }
}