package com.example.cinema.booking.component;

import com.example.cinema.booking.enums.BookingStatus;
import com.example.cinema.booking.repository.BookingRepository;
import com.example.cinema.booking.service.BookingService;
import com.example.cinema.common.component.DeadlockRetryExecutor;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class BookingExpirationScheduler {

    private static final int BATCH_SIZE = 100;

    BookingRepository bookingRepository;
    BookingService bookingService;
    DeadlockRetryExecutor deadlockRetryExecutor;

    @Scheduled(fixedDelay = 30_000)
    public void releaseExpiredBookings() {
        LocalDateTime now = LocalDateTime.now();
        List<Long> expiredBookingIds = bookingRepository.findExpiredBookingIdsBatch(
                BookingStatus.PENDING_PAYMENT,
                now,
                PageRequest.of(0, BATCH_SIZE)
        );

        if (expiredBookingIds.isEmpty()) {
            return;
        }

        int releasedCount = 0;
        for (Long bookingId : expiredBookingIds) {
            try {
                boolean expired = deadlockRetryExecutor.executeWithRetry(
                        "ExpireBooking-" + bookingId,
                        () -> bookingService.expireSingleBookingIsolated(bookingId, LocalDateTime.now())
                );
                if (expired) {
                    releasedCount++;
                }
            } catch (Exception e) {
                log.error("Failed to release expired booking ID={} after retries", bookingId, e);
            }
        }

        if (releasedCount > 0) {
            log.info("[Scheduler FR-BOOK-03] Automatically expired {} overdue bookings and released their seats/vouchers.", releasedCount);
        }
    }
}