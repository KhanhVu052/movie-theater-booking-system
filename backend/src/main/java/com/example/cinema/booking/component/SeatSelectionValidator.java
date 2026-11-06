package com.example.cinema.booking.component;

import com.example.cinema.common.exception.AppException;
import com.example.cinema.common.exception.ErrorCode;
import com.example.cinema.showtime.entity.ShowtimeSeat;
import com.example.cinema.showtime.enums.ShowtimeSeatStatus;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.stream.Collectors;

@Component
public class SeatSelectionValidator {

    public void validateOrphanSeats(List<ShowtimeSeat> allSeatsInShowtime, Collection<Long> selectedSeatIds) {
        if (allSeatsInShowtime == null || allSeatsInShowtime.isEmpty() || selectedSeatIds == null || selectedSeatIds.isEmpty()) {
            return;
        }

        Set<Long> selectedSet = new HashSet<>(selectedSeatIds);

        // Group seats by rowName
        Map<String, List<ShowtimeSeat>> seatsByRow = allSeatsInShowtime.stream()
                .filter(ss -> ss.getSeat() != null && ss.getSeat().getRowName() != null)
                .collect(Collectors.groupingBy(ss -> ss.getSeat().getRowName(), LinkedHashMap::new, Collectors.toList()));

        for (Map.Entry<String, List<ShowtimeSeat>> entry : seatsByRow.entrySet()) {
            List<ShowtimeSeat> rowSeats = new ArrayList<>(entry.getValue());
            // Sort seats by seatNumber ascending
            rowSeats.sort(Comparator.comparingInt(ss -> ss.getSeat().getSeatNumber() != null ? ss.getSeat().getSeatNumber() : 0));

            // Find orphan seats before and after selection
            Set<Long> orphansBefore = findOrphanSeatIds(rowSeats, Set.of());
            Set<Long> orphansAfter = findOrphanSeatIds(rowSeats, selectedSet);

            // Only reject if this selection creates NEW orphan seat(s)
            orphansAfter.removeAll(orphansBefore);
            if (!orphansAfter.isEmpty()) {
                throw new AppException(ErrorCode.ORPHAN_SEAT_DETECTED);
            }
        }
    }

    private Set<Long> findOrphanSeatIds(List<ShowtimeSeat> rowSeats, Set<Long> selectedSet) {
        Set<Long> orphanIds = new HashSet<>();
        int n = rowSeats.size();
        int i = 0;

        // Break row into continuous physical blocks (where adjacent seatNumbers differ by exactly 1; gap > 1 is an aisle)
        while (i < n) {
            int j = i;
            while (j + 1 < n
                    && rowSeats.get(j + 1).getSeat().getSeatNumber() != null
                    && rowSeats.get(j).getSeat().getSeatNumber() != null
                    && rowSeats.get(j + 1).getSeat().getSeatNumber() == rowSeats.get(j).getSeat().getSeatNumber() + 1) {
                j++;
            }

            List<ShowtimeSeat> block = rowSeats.subList(i, j + 1);
            checkBlockForOrphans(block, selectedSet, orphanIds);

            i = j + 1;
        }

        return orphanIds;
    }

    private void checkBlockForOrphans(List<ShowtimeSeat> block, Set<Long> selectedSet, Set<Long> orphanIds) {
        int m = block.size();
        int k = 0;

        while (k < m) {
            if (isSeatEmpty(block.get(k), selectedSet)) {
                int start = k;
                while (k < m && isSeatEmpty(block.get(k), selectedSet)) {
                    k++;
                }
                int length = k - start;
                if (length == 1) {
                    orphanIds.add(block.get(start).getId());
                }
            } else {
                k++;
            }
        }
    }

    private boolean isSeatEmpty(ShowtimeSeat ss, Set<Long> selectedSet) {
        if (ss.getSeat() == null || !Boolean.TRUE.equals(ss.getSeat().getIsActive())) {
            return false;
        }
        if (selectedSet.contains(ss.getId())) {
            return false;
        }
        return ss.getStatus() == ShowtimeSeatStatus.AVAILABLE;
    }
}
