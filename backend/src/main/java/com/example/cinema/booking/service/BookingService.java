package com.example.cinema.booking.service;

import com.example.cinema.auth.entity.User;
import com.example.cinema.auth.enums.Role;
import com.example.cinema.auth.repository.UserRepository;
import com.example.cinema.booking.component.SeatSelectionValidator;
import com.example.cinema.booking.config.BookingProperties;
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
import com.example.cinema.movie.enums.MovieStatus;
import com.example.cinema.payment.entity.Payment;
import com.example.cinema.payment.enums.PaymentProvider;
import com.example.cinema.payment.enums.PaymentRefundStatus;
import com.example.cinema.payment.enums.PaymentStatus;
import com.example.cinema.payment.repository.PaymentRepository;
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
import java.util.Comparator;
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

    BookingRepository bookingRepository;
    BookingItemRepository bookingItemRepository;
    ShowtimeRepository showtimeRepository;
    ShowtimeSeatRepository showtimeSeatRepository;
    UserRepository userRepository;
    VoucherService voucherService;
    BookingMapper bookingMapper;
    BookingProperties bookingProperties;
    PaymentRepository paymentRepository;
    SeatSelectionValidator seatSelectionValidator;

    @Transactional
    public BookingResponse createBooking(String userEmail, BookingCreateRequest request) {
        LocalDateTime now = LocalDateTime.now();

        Set<Long> uniqueRequestedSeatIds = new TreeSet<>(request.showtimeSeatIds());
        if (uniqueRequestedSeatIds.size() != request.showtimeSeatIds().size()) {
            throw new AppException(ErrorCode.SEAT_SELECTION_INVALID);
        }

        User user = userRepository.findByEmailForUpdate(userEmail)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        long pendingCount = bookingRepository.countByUserIdAndStatusAndExpiresAtAfter(
                user.getId(), BookingStatus.PENDING_PAYMENT, now);
        if (pendingCount >= bookingProperties.getMaxPendingPerUser()) {
            throw new AppException(ErrorCode.TOO_MANY_PENDING_BOOKINGS);
        }

        Showtime showtime = showtimeRepository.findByIdForShare(request.showtimeId())
                .orElseThrow(() -> new AppException(ErrorCode.SHOWTIME_NOT_FOUND));

        LocalDateTime cutoffThreshold = showtime.getStartTime().minusMinutes(bookingProperties.getCutoffMinutes());
        if (showtime.getStatus() != ShowtimeStatus.SCHEDULED || !now.isBefore(cutoffThreshold)) {
            throw new AppException(ErrorCode.SHOWTIME_NOT_AVAILABLE_FOR_BOOKING);
        }

        showtime = showtimeRepository.findDetailById(showtime.getId())
                .orElse(showtime);

        if (showtime.getMovie() != null && showtime.getMovie().getStatus() == MovieStatus.ENDED) {
            throw new AppException(ErrorCode.SHOWTIME_NOT_AVAILABLE_FOR_BOOKING);
        }

        // LƯU Ý BẤT BIẾN (AF-01): KHÔNG nạp entity ShowtimeSeat trước khi khóa FOR UPDATE để tránh Hibernate L1 Cache stale snapshot!
        Set<String> rows = showtimeSeatRepository.findRowNamesByIds(showtime.getId(), uniqueRequestedSeatIds);
        if (rows.isEmpty()) {
            throw new AppException(ErrorCode.SEAT_SELECTION_INVALID);
        }

        List<Long> rowSeatIds = showtimeSeatRepository.findIdsByShowtimeAndRows(showtime.getId(), rows); // Đã ORDER BY id ASC
        if (!new HashSet<>(rowSeatIds).containsAll(uniqueRequestedSeatIds)) {
            throw new AppException(ErrorCode.SEAT_SELECTION_INVALID); // Có ghế không thuộc suất chiếu này
        }

        // Tìm các booking đã hết hạn đang giữ ghế trong các hàng liên quan
        List<Long> expiredBookingIds = bookingRepository.findExpiredBookingIdsHoldingSeats(rowSeatIds, now);
        List<Booking> lockedExpiredBookings = expiredBookingIds.isEmpty()
                ? List.of()
                : bookingRepository.findByIdsForUpdateOrderByIdAsc(expiredBookingIds); // Khóa bookings theo thứ tự ID tăng dần

        Set<Long> allSeatIdsToLock = new TreeSet<>(rowSeatIds);
        if (!expiredBookingIds.isEmpty()) {
            allSeatIdsToLock.addAll(showtimeSeatRepository.findIdsByHeldByBookingIdIn(expiredBookingIds));
        }

        // Khóa toàn bộ ShowtimeSeat liên quan trong ĐÚNG MỘT câu lệnh theo thứ tự ID tăng dần
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

        // Lọc ra danh sách ghế thuộc các hàng mà khách chọn (đã được khóa và giải phóng hold hết hạn)
        List<ShowtimeSeat> lockedRowSeats = allLockedSeats.stream()
                .filter(ss -> rows.contains(ss.getSeat().getRowName()))
                .sorted(Comparator.comparing((ShowtimeSeat ss) -> ss.getSeat().getRowName())
                        .thenComparing(ss -> ss.getSeat().getSeatNumber()))
                .toList();

        // Validate ghế đôi và ghế lẻ trên dữ liệu đã khóa an toàn
        seatSelectionValidator.validateCoupleSeats(lockedRowSeats, uniqueRequestedSeatIds);
        if (bookingProperties.isOrphanSeatRuleEnabled()) {
            seatSelectionValidator.validateOrphanSeats(lockedRowSeats, uniqueRequestedSeatIds);
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
            if (seat.getSeat() == null || !Boolean.TRUE.equals(seat.getSeat().getIsActive())) {
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
        LocalDateTime expiresAt = now.plusMinutes(bookingProperties.getHoldMinutes());

        BookingStatus initialStatus = (finalAmount == 0L) ? BookingStatus.CONFIRMED : BookingStatus.PENDING_PAYMENT;
        ShowtimeSeatStatus seatStatus = (finalAmount == 0L) ? ShowtimeSeatStatus.BOOKED : ShowtimeSeatStatus.HELD;

        Booking booking = Booking.builder()
                .bookingCode(generateUniqueBookingCode())
                .user(user)
                .showtime(showtime)
                .voucher(appliedVoucher)
                .subtotalAmount(subtotalAmount)
                .discountAmount(discountAmount)
                .finalAmount(finalAmount)
                .status(initialStatus)
                .expiresAt(expiresAt)
                .build();

        Booking savedBooking = bookingRepository.save(booking);

        if (appliedVoucher != null) {
            voucherService.createReservedRedemption(appliedVoucher, user, savedBooking, discountAmount);
            if (finalAmount == 0L) {
                voucherService.confirmVoucherIfPresent(savedBooking);
            }
        }

        List<BookingItem> bookingItems = new ArrayList<>(requestedSeats.size());
        for (ShowtimeSeat seat : requestedSeats) {
            seat.setStatus(seatStatus);
            seat.setHeldByBookingId(savedBooking.getId());

            bookingItems.add(BookingItem.builder()
                    .booking(savedBooking)
                    .showtimeSeat(seat)
                    .price(seat.getPrice())
                    .build());
        }

        showtimeSeatRepository.saveAll(requestedSeats);
        List<BookingItem> savedItems = bookingItemRepository.saveAll(bookingItems);

        if (finalAmount == 0L) {
            Payment zeroPayment = Payment.builder()
                    .booking(savedBooking)
                    .provider(PaymentProvider.VNPAY)
                    .transactionRef("FREE-" + savedBooking.getBookingCode())
                    .transactionNo("VOUCHER_100_" + savedBooking.getId())
                    .amount(0L)
                    .status(PaymentStatus.SUCCESS)
                    .refundStatus(PaymentRefundStatus.NONE)
                    .responseCode("00")
                    .transactionStatus("00")
                    .payDate(now)
                    .build();
            paymentRepository.save(zeroPayment);
        }

        return bookingMapper.toResponse(savedBooking, savedItems);
    }

    @Transactional
    public BookingResponse cancelBooking(String userEmail, Long bookingId) {
        User currentUser = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        Booking booking = bookingRepository.findByIdForUpdate(bookingId)
                .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));

        if (!booking.getUser().getId().equals(currentUser.getId()) && currentUser.getRole() != Role.ADMIN) {
            throw new AppException(ErrorCode.BOOKING_NOT_FOUND);
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

    @Transactional
    public BookingResponse cancelConfirmedBooking(String userEmail, Long bookingId) {
        User currentUser = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        Booking booking = bookingRepository.findByIdForUpdate(bookingId)
                .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));

        if (!booking.getUser().getId().equals(currentUser.getId()) && currentUser.getRole() != Role.ADMIN) {
            throw new AppException(ErrorCode.BOOKING_NOT_FOUND);
        }

        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new AppException(ErrorCode.BOOKING_CANNOT_BE_CANCELLED);
        }

        LocalDateTime refundCutoffTime = booking.getShowtime().getStartTime().minusMinutes(bookingProperties.getRefundCutoffMinutes());
        if (!LocalDateTime.now().isBefore(refundCutoffTime)) {
            throw new AppException(ErrorCode.BOOKING_CANCELLATION_WINDOW_CLOSED);
        }

        List<ShowtimeSeat> seats = showtimeSeatRepository.findByHeldByBookingIdForUpdate(booking.getId());
        if (seats.isEmpty()) {
            List<Long> seatIds = bookingItemRepository.findByBookingIdOrderByIdAsc(booking.getId())
                    .stream().map(item -> item.getShowtimeSeat().getId()).toList();
            if (!seatIds.isEmpty()) {
                seats = showtimeSeatRepository.findByIdsForUpdateOrderByIdAsc(seatIds);
            }
        }
        for (ShowtimeSeat seat : seats) {
            seat.setStatus(ShowtimeSeatStatus.AVAILABLE);
            seat.setHeldByBookingId(null);
        }
        showtimeSeatRepository.saveAll(seats);

        List<Payment> payments = paymentRepository.findByBookingId(booking.getId());
        for (Payment payment : payments) {
            if (payment.getStatus() == PaymentStatus.SUCCESS
                    && payment.getRefundStatus() == PaymentRefundStatus.NONE
                    && payment.getAmount() != null && payment.getAmount() > 0) {
                payment.setRefundStatus(PaymentRefundStatus.REFUND_REQUIRED);
                paymentRepository.save(payment);
            }
        }

        voucherService.revertUsedVoucherIfPresent(booking);

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
            throw new AppException(ErrorCode.BOOKING_NOT_FOUND);
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

        List<Booking> bookings = bookingPage.getContent();
        List<Long> bookingIds = bookings.stream().map(Booking::getId).toList();

        Map<Long, List<BookingItem>> itemsByBookingId;
        if (bookingIds.isEmpty()) {
            itemsByBookingId = Map.of();
        } else {
            List<BookingItem> allItems = bookingItemRepository.findByBookingIdInOrderByIdAsc(bookingIds);
            itemsByBookingId = allItems.stream()
                    .collect(Collectors.groupingBy(item -> item.getBooking().getId()));
        }

        Page<BookingResponse> responsePage = bookingPage.map(booking -> {
            List<BookingItem> items = itemsByBookingId.getOrDefault(booking.getId(), List.of());
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