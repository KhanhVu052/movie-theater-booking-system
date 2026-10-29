package com.example.cinema.showtime.mapper;

import com.example.cinema.movie.entity.Movie;
import com.example.cinema.showtime.dto.request.ShowtimeRequest;
import com.example.cinema.showtime.dto.response.ShowtimeResponse;
import com.example.cinema.showtime.dto.response.ShowtimeSeatResponse;
import com.example.cinema.showtime.entity.Room;
import com.example.cinema.showtime.entity.Showtime;
import com.example.cinema.showtime.entity.ShowtimeSeat;
import com.example.cinema.showtime.enums.ShowtimeSeatStatus;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
public class ShowtimeMapper {

    public Showtime toEntity(
            ShowtimeRequest request,
            Movie movie,
            Room room,
            LocalDateTime endTime,
            LocalDateTime cleaningEndTime
    ) {
        return Showtime.builder()
                .movie(movie)
                .room(room)
                .format(request.format())
                .translationType(request.translationType())
                .startTime(request.startTime())
                .endTime(endTime)
                .cleaningEndTime(cleaningEndTime)
                .basePrice(request.basePrice())
                .build();
    }

    public ShowtimeResponse toResponse(Showtime showtime) {
        return ShowtimeResponse.builder()
                .id(showtime.getId())
                .movieId(showtime.getMovie().getId())
                .movieTitle(showtime.getMovie().getTitle())
                .posterUrl(showtime.getMovie().getPosterUrl())
                .durationMinutes(showtime.getMovie().getDurationMinutes())
                .roomId(showtime.getRoom().getId())
                .roomName(showtime.getRoom().getName())
                .cinemaId(showtime.getRoom().getCinema().getId())
                .cinemaName(showtime.getRoom().getCinema().getName())
                .format(showtime.getFormat())
                .translationType(showtime.getTranslationType())
                .startTime(showtime.getStartTime())
                .endTime(showtime.getEndTime())
                .cleaningEndTime(showtime.getCleaningEndTime())
                .basePrice(showtime.getBasePrice())
                .status(showtime.getStatus())
                .createdAt(showtime.getCreatedAt())
                .updatedAt(showtime.getUpdatedAt())
                .build();
    }

    public ShowtimeSeatResponse toSeatResponse(ShowtimeSeat showtimeSeat) {
        return ShowtimeSeatResponse.builder()
                .id(showtimeSeat.getId())
                .seatId(showtimeSeat.getSeat().getId())
                .rowName(showtimeSeat.getSeat().getRowName())
                .seatNumber(showtimeSeat.getSeat().getSeatNumber())
                .seatType(showtimeSeat.getSeat().getType())
                .price(showtimeSeat.getPrice())
                .status(showtimeSeat.getStatus())
                .build();
    }

    public ShowtimeSeatResponse toSeatResponse(ShowtimeSeat showtimeSeat, ShowtimeSeatStatus effectiveStatus) {
        return ShowtimeSeatResponse.builder()
                .id(showtimeSeat.getId())
                .seatId(showtimeSeat.getSeat().getId())
                .rowName(showtimeSeat.getSeat().getRowName())
                .seatNumber(showtimeSeat.getSeat().getSeatNumber())
                .seatType(showtimeSeat.getSeat().getType())
                .price(showtimeSeat.getPrice())
                .status(effectiveStatus)
                .build();
    }
}