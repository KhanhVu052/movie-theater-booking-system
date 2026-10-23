package com.example.cinema.booking.service;

import com.example.cinema.auth.entity.User;
import com.example.cinema.auth.enums.Role;
import com.example.cinema.auth.repository.UserRepository;
import com.example.cinema.booking.dto.request.BookingCreateRequest;
import com.example.cinema.booking.dto.response.BookingResponse;
import com.example.cinema.booking.entity.Booking;
import com.example.cinema.booking.entity.BookingItem;
import com.example.cinema.booking.enums.BookingStatus;
import com.example.cinema.booking.mapper.BookingMapper;
import com.example.cinema.booking.repository.BookingItemRepository;
import com.example.cinema.booking.repository.BookingRepository;
import com.example.cinema.common.dto.PageResponse;
import com.example.cinema.common.exception.AppException;
import com.example.cinema.common.exception.ErrorCode;
import com.example.cinema.showtime.entity.Showtime;
import com.example.cinema.showtime.entity.ShowtimeSeat;
import com.example.cinema.showtime.enums.ShowtimeSeatStatus;
import com.example.cinema.showtime.enums.ShowtimeStatus;
import com.example.cinema.showtime.repository.ShowtimeRepository;
import com.example.cinema.showtime.repository.ShowtimeSeatRepository;
import com.example.cinema.voucher.entity.Voucher;
import com.example.cinema.voucher.service.VoucherService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class BookingService {

    private static final int SEAT_HOLD_MINUTES = 10;

    BookingRepository bookingRepository;
    BookingItemRepository bookingItemRepository;
    ShowtimeRepository showtimeRepository;
    ShowtimeSeatRepository showtimeSeatRepository;
    UserRepository userRepository;
    VoucherService voucherService;
    BookingMapper bookingMapper;

    @Transactional
    public BookingResponse createBooking(String userEmail, BookingCreateRequest request) {
        LocalDateTime now = LocalDateTime.now();

        Set<Long> uniqueRequestedSeatIds = new TreeSet<>(request.showtimeSeatIds());
        if (uniqueRequestedSeatIds.size() != request.showtimeSeatIds().size()) {
            throw new AppException(ErrorCode.SEAT_SELECTION_INVALID);
        }

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        Showtime showtime = showtimeRepository.findDetailById(request.showtimeId())
                .orElseThrow(() -> new AppException(ErrorCode.SHOWTIME_NOT_FOUND));

        if (showtime.getStatus() != ShowtimeStatus.SCHEDULED || !showtime.getStartTime().isAfter(now)) {
            throw new AppException(ErrorCode.SHOWTIME_NOT_AVAILABLE_FOR_BOOKING);
        }

        List<Long> expiredBookingIds = bookingRepository.findExpiredBookingIdsHoldingSeats(uniqueRequestedSeatIds, now);
        List<Booking> lockedExpiredBookings = List.of();
        Set<Long> allSeatIdsToLock = new TreeSet<>(uniqueRequestedSeatIds);

        if (!expiredBookingIds.isEmpty()) {
            lockedExpiredBookings = bookingRepository.findByIdsForUpdateOrderByIdAsc(expiredBookingIds);
            List<Long> expiredBookingSeatIds = showtimeSeatRepository.findIdsByHeldByBookingIdIn(expiredBookingIds);
            allSeatIdsToLock.addAll(expiredBookingSeatIds);
        }

        List<ShowtimeSeat> allLockedSeats = showtimeSeatRepository.findByIdsForUpdateOrderByIdAsc(allSeatIdsToLock);

        if (!lockedExpiredBookings.isEmpty()) {
            Set<Long> actuallyExpiredBookingIds = new HashSet<>();
            for (Booking oldBooking : lockedExpiredBookings) {
                if (oldBooking.getStatus() == BookingStatus.PENDING_PAYMENT && oldBooking.getExpiresAt().isBefore(now)) {
                    oldBooking.setStatus(BookingStatus.EXPIRED);
                    bookingRepository.save(oldBooking);
                    actuallyExpiredBookingIds.add(oldBooking.getId());
                }
            }

            if (!actuallyExpiredBookingIds.isEmpty()) {
                List<ShowtimeSeat> seatsToRelease = allLockedSeats.stream()
                        .filter(ss -> ss.getHeldByBookingId() != null && actuallyExpiredBookingIds.contains(ss.getHeldByBookingId()))
                        .toList();

                for (ShowtimeSeat ss : seatsToRelease) {
                    ss.setStatus(ShowtimeSeatStatus.AVAILABLE);
                    ss.setHeldByBookingId(null);
                }
                showtimeSeatRepository.saveAll(seatsToRelease);

                for (Booking oldBooking : lockedExpiredBookings) {
                    if (actuallyExpiredBookingIds.contains(oldBooking.getId())) {
                        voucherService.releaseVoucherIfPresent(oldBooking);
                    }
                }
            }
        }

        Map<Long, ShowtimeSeat> lockedSeatMap = allLockedSeats.stream()
                .collect(Collectors.toMap(ShowtimeSeat::getId, ss -> ss));

        List<ShowtimeSeat> requestedSeats = new ArrayList<>(uniqueRequestedSeatIds.size());
        long subtotalAmount = 0L;

        for (Long reqSeatId : uniqueRequestedSeatIds) {
            ShowtimeSeat seat = lockedSeatMap.get(reqSeatId);
            if (seat == null || !seat.getShowtime().getId().equals(showtime.getId())) {
                throw new AppException(ErrorCode.SEAT_SELECTION_INVALID);
            }
            if (seat.getStatus() != ShowtimeSeatStatus.AVAILABLE) {
                throw new AppException(ErrorCode.SEAT_NOT_AVAILABLE);
            }
            requestedSeats.add(seat);
            subtotalAmount += seat.getPrice();
        }

        Voucher appliedVoucher = null;
        long discountAmount = 0L;
        if (request.voucherCode() != null && !request.voucherCode().isBlank()) {
            appliedVoucher = voucherService.lockAndReserveVoucher(
                    request.voucherCode(),
                    user,
                    subtotalAmount,
                    now
            );
            discountAmount = appliedVoucher.calculateDiscount(subtotalAmount);
        }

        long finalAmount = subtotalAmount - discountAmount;
        LocalDateTime expiresAt = now.plusMinutes(SEAT_HOLD_MINUTES);

        Booking booking = Booking.builder()
                .bookingCode(generateUniqueBookingCode())
                .user(user)
                .showtime(showtime)
                .voucher(appliedVoucher)
                .subtotalAmount(subtotalAmount)
                .discountAmount(discountAmount)
                .finalAmount(finalAmount)
                .status(BookingStatus.PENDING_PAYMENT)
                .expiresAt(expiresAt)
                .build();

        Booking savedBooking = bookingRepository.save(booking);

        if (appliedVoucher != null) {
            voucherService.createReservedRedemption(appliedVoucher, user, savedBooking, discountAmount);
        }

        List<BookingItem> bookingItems = new ArrayList<>(requestedSeats.size());
        for (ShowtimeSeat seat : requestedSeats) {
            seat.setStatus(ShowtimeSeatStatus.HELD);
            seat.setHeldByBookingId(savedBooking.getId());

            bookingItems.add(BookingItem.builder()
                    .booking(savedBooking)
                    .showtimeSeat(seat)
                    .price(seat.getPrice())
                    .build());
        }

        showtimeSeatRepository.saveAll(requestedSeats);
        List<BookingItem> savedItems = bookingItemRepository.saveAll(bookingItems);

        return bookingMapper.toResponse(savedBooking, savedItems);
    }

    @Transactional
    public BookingResponse cancelBooking(String userEmail, Long bookingId) {
        User currentUser = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        Booking booking = bookingRepository.findByIdForUpdate(bookingId)
                .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));

        if (!booking.getUser().getId().equals(currentUser.getId()) && currentUser.getRole() != Role.ADMIN) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        if (booking.getStatus() != BookingStatus.PENDING_PAYMENT) {
            throw new AppException(ErrorCode.BOOKING_CANNOT_BE_CANCELLED);
        }

        List<ShowtimeSeat> heldSeats = showtimeSeatRepository.findByHeldByBookingIdForUpdate(booking.getId());
        for (ShowtimeSeat seat : heldSeats) {
            seat.setStatus(ShowtimeSeatStatus.AVAILABLE);
            seat.setHeldByBookingId(null);
        }
        showtimeSeatRepository.saveAll(heldSeats);

        voucherService.releaseVoucherIfPresent(booking);

        booking.setStatus(BookingStatus.CANCELLED);
        Booking savedBooking = bookingRepository.save(booking);

        Booking fullBooking = bookingRepository.findDetailById(savedBooking.getId()).orElse(savedBooking);
        List<BookingItem> items = bookingItemRepository.findByBookingIdOrderByIdAsc(savedBooking.getId());
        return bookingMapper.toResponse(fullBooking, items);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean expireSingleBookingIsolated(Long bookingId, LocalDateTime now) {
        Booking booking = bookingRepository.findByIdForUpdate(bookingId).orElse(null);
        if (booking == null
                || booking.getStatus() != BookingStatus.PENDING_PAYMENT
                || !booking.getExpiresAt().isBefore(now)) {
            return false;
        }

        List<ShowtimeSeat> heldSeats = showtimeSeatRepository.findByHeldByBookingIdForUpdate(booking.getId());
        for (ShowtimeSeat seat : heldSeats) {
            seat.setStatus(ShowtimeSeatStatus.AVAILABLE);
            seat.setHeldByBookingId(null);
        }
        showtimeSeatRepository.saveAll(heldSeats);

        voucherService.releaseVoucherIfPresent(booking);

        booking.setStatus(BookingStatus.EXPIRED);
        bookingRepository.save(booking);
        return true;
    }

    @Transactional(readOnly = true)
    public BookingResponse getBookingById(String userEmail, Long bookingId) {
        User currentUser = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        Booking booking = bookingRepository.findDetailById(bookingId)
                .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));

        if (!booking.getUser().getId().equals(currentUser.getId()) && currentUser.getRole() != Role.ADMIN) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        List<BookingItem> items = bookingItemRepository.findByBookingIdOrderByIdAsc(bookingId);
        return bookingMapper.toResponse(booking, items);
    }

    @Transactional(readOnly = true)
    public PageResponse<BookingResponse> getMyBookings(String userEmail, int page, int size) {
        User currentUser = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        Pageable pageable = PageRequest.of(page - 1, size);
        Page<Booking> bookingPage = bookingRepository.findByUserIdOrderByCreatedAtDesc(currentUser.getId(), pageable);

        Page<BookingResponse> responsePage = bookingPage.map(booking -> {
            List<BookingItem> items = bookingItemRepository.findByBookingIdOrderByIdAsc(booking.getId());
            return bookingMapper.toResponse(booking, items);
        });

        return PageResponse.from(responsePage);
    }

    private String generateUniqueBookingCode() {
        String randomHex = UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
        int suffix = ThreadLocalRandom.current().nextInt(10, 99);
        return "BK-" + randomHex + suffix;
    }
}