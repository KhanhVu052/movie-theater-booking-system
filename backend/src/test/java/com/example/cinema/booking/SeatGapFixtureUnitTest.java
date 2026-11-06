package com.example.cinema.booking;

import com.example.cinema.booking.component.SeatSelectionValidator;
import com.example.cinema.common.exception.AppException;
import com.example.cinema.common.exception.ErrorCode;
import com.example.cinema.showtime.entity.Seat;
import com.example.cinema.showtime.entity.ShowtimeSeat;
import com.example.cinema.showtime.enums.ShowtimeSeatStatus;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

public class SeatGapFixtureUnitTest {

    private SeatSelectionValidator validator;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        validator = new SeatSelectionValidator();
        objectMapper = new ObjectMapper();
    }

    private Path resolveFixturePath() {
        Path p = Paths.get("docs", "fixtures", "seat-gap-cases.json");
        if (Files.exists(p)) {
            return p;
        }
        p = Paths.get("..", "docs", "fixtures", "seat-gap-cases.json");
        if (Files.exists(p)) {
            return p;
        }
        throw new IllegalStateException("Cannot find docs/fixtures/seat-gap-cases.json");
    }

    @Test
    @DisplayName("Verify all test cases from docs/fixtures/seat-gap-cases.json (AF-05)")
    void testAllCasesFromSharedFixture() throws IOException {
        Path fixturePath = resolveFixturePath();
        JsonNode root = objectMapper.readTree(fixturePath.toFile());
        assertThat(root.isArray()).isTrue();
        assertThat(root.size()).isGreaterThanOrEqualTo(8);

        for (JsonNode caseNode : root) {
            String caseId = caseNode.get("id").asText();
            String name = caseNode.get("name").asText();
            boolean expectOrphan = caseNode.get("expectOrphan").asBoolean();

            List<ShowtimeSeat> seats = new ArrayList<>();
            for (JsonNode sn : caseNode.get("seats")) {
                Seat seat = Seat.builder()
                        .id(sn.get("id").asLong())
                        .rowName(sn.has("rowName") ? sn.get("rowName").asText() : "A")
                        .seatNumber(sn.has("seatNumber") ? sn.get("seatNumber").asInt() : 1)
                        .isActive(!sn.has("isActive") || sn.get("isActive").asBoolean())
                        .build();

                ShowtimeSeat ss = ShowtimeSeat.builder()
                        .id(sn.get("id").asLong())
                        .seat(seat)
                        .status(ShowtimeSeatStatus.valueOf(sn.get("status").asText()))
                        .build();

                seats.add(ss);
            }

            List<Long> selectedIds = new ArrayList<>();
            for (JsonNode idNode : caseNode.get("selectedSeatIds")) {
                selectedIds.add(idNode.asLong());
            }

            if (expectOrphan) {
                assertThatThrownBy(() -> validator.validateOrphanSeats(seats, selectedIds))
                        .as("Case %s (%s) should trigger ORPHAN_SEAT_DETECTED", caseId, name)
                        .isInstanceOf(AppException.class)
                        .satisfies(ex -> {
                            AppException appEx = (AppException) ex;
                            assertThat(appEx.getErrorCode()).isEqualTo(ErrorCode.ORPHAN_SEAT_DETECTED);
                        });
            } else {
                assertThatCode(() -> validator.validateOrphanSeats(seats, selectedIds))
                        .as("Case %s (%s) should NOT trigger orphan seat error", caseId, name)
                        .doesNotThrowAnyException();
            }
        }
    }
}
