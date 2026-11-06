package com.example.cinema.showtime.mapper;

import com.example.cinema.movie.entity.Movie;
import com.example.cinema.showtime.dto.request.ShowtimeRequest;
import com.example.cinema.showtime.dto.response.ShowtimeResponse;
import com.example.cinema.showtime.dto.response.ShowtimeSeatResponse;
import com.example.cinema.showtime.entity.Room;
import com.example.cinema.showtime.entity.Showtime;
import com.example.cinema.showtime.entity.ShowtimeSeat;
import com.example.cinema.showtime.enums.SeatType;
import com.example.cinema.showtime.enums.ShowtimeSeatStatus;
import com.example.cinema.showtime.service.PricingService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ShowtimeMapper {

    PricingService pricingService;

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
        return toResponse(showtime, null, null);
    }

    public ShowtimeResponse toResponse(Showtime showtime, Map<SeatType, Long> seatTypePrices, List<String> priceTags) {
        return ShowtimeResponse.builder()
                .id(showtime.getId())
                .movieId(showtime.getMovie().getId())
                .movieTitle(showtime.getMovie().getTitle())
                .movieStatus(showtime.getMovie().getStatus())
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
                .seatTypePrices(seatTypePrices)
                .priceTags(priceTags)
                .build();
    }

    public ShowtimeSeatResponse toSeatResponse(ShowtimeSeat showtimeSeat) {
        return toSeatResponse(showtimeSeat, showtimeSeat.getStatus());
    }

    public ShowtimeSeatResponse toSeatResponse(ShowtimeSeat showtimeSeat, ShowtimeSeatStatus effectiveStatus) {
        boolean isSeatActive = showtimeSeat.getSeat() != null && Boolean.TRUE.equals(showtimeSeat.getSeat().getIsActive());
        boolean isCoupleWithoutPair = showtimeSeat.getSeat() != null
                && showtimeSeat.getSeat().getType() == SeatType.COUPLE
                && (showtimeSeat.getSeat().getPairGroup() == null || showtimeSeat.getSeat().getPairGroup() <= 0);
        boolean selectable = isSeatActive && effectiveStatus == ShowtimeSeatStatus.AVAILABLE && !isCoupleWithoutPair;
        return ShowtimeSeatResponse.builder()
                .id(showtimeSeat.getId())
                .seatId(showtimeSeat.getSeat().getId())
                .rowName(showtimeSeat.getSeat().getRowName())
                .seatNumber(showtimeSeat.getSeat().getSeatNumber())
                .seatType(showtimeSeat.getSeat().getType())
                .price(showtimeSeat.getPrice())
                .status(effectiveStatus)
                .selectable(selectable)
                .pairGroup(showtimeSeat.getSeat() != null ? showtimeSeat.getSeat().getPairGroup() : null)
                .build();
    }
}