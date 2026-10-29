package com.example.cinema.payment.service;

import com.example.cinema.auth.entity.User;
import com.example.cinema.auth.enums.Role;
import com.example.cinema.auth.repository.UserRepository;
import com.example.cinema.booking.entity.Booking;
import com.example.cinema.booking.entity.BookingItem;
import com.example.cinema.booking.enums.BookingStatus;
import com.example.cinema.booking.repository.BookingItemRepository;
import com.example.cinema.booking.repository.BookingRepository;
import com.example.cinema.common.dto.PageResponse;
import com.example.cinema.common.exception.AppException;
import com.example.cinema.common.exception.ErrorCode;
import com.example.cinema.payment.config.VnPayProperties;
import com.example.cinema.payment.config.VnPayUtil;
import com.example.cinema.payment.dto.request.PaymentCreateRequest;
import com.example.cinema.payment.dto.response.PaymentResponse;
import com.example.cinema.payment.dto.response.PaymentUrlResponse;
import com.example.cinema.payment.dto.response.VnPayIpnResponse;
import com.example.cinema.payment.dto.response.VnPayReturnResponse;
import com.example.cinema.payment.entity.Payment;
import com.example.cinema.payment.enums.PaymentProvider;
import com.example.cinema.payment.enums.PaymentRefundStatus;
import com.example.cinema.payment.enums.PaymentStatus;
import com.example.cinema.payment.mapper.PaymentMapper;
import com.example.cinema.payment.repository.PaymentRepository;
import com.example.cinema.showtime.entity.ShowtimeSeat;
import com.example.cinema.showtime.enums.ShowtimeSeatStatus;
import com.example.cinema.showtime.enums.ShowtimeStatus;
import com.example.cinema.showtime.repository.ShowtimeSeatRepository;
import com.example.cinema.voucher.service.VoucherService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class PaymentService {

    private static final int MAX_PAYMENT_ATTEMPTS = 3;

    PaymentRepository paymentRepository;
    BookingRepository bookingRepository;
    BookingItemRepository bookingItemRepository;
    ShowtimeSeatRepository showtimeSeatRepository;
    UserRepository userRepository;
    VoucherService voucherService;
    VnPayProperties vnPayProperties;
    PaymentMapper paymentMapper;
    ObjectMapper objectMapper;

    @Transactional
    public PaymentUrlResponse createVnPayPaymentUrl(
            String userEmail,
            PaymentCreateRequest request,
            String clientIp
    ) {
        LocalDateTime now = LocalDateTime.now();

        User currentUser = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        Booking booking = bookingRepository.findByIdForUpdate(request.bookingId())
                .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));

        if (!booking.getUser().getId().equals(currentUser.getId()) && currentUser.getRole() != Role.ADMIN) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        if (booking.getStatus() != BookingStatus.PENDING_PAYMENT) {
            throw new AppException(ErrorCode.BOOKING_NOT_PAYABLE);
        }

        if (!booking.getExpiresAt().isAfter(now)) {
            throw new AppException(ErrorCode.BOOKING_EXPIRED);
        }

        long existingAttempts = paymentRepository.countByBookingId(booking.getId());
        if (existingAttempts >= MAX_PAYMENT_ATTEMPTS) {
            throw new AppException(ErrorCode.PAYMENT_MAX_ATTEMPTS_EXCEEDED);
        }

        int attemptNumber = (int) existingAttempts + 1;
        String transactionRef = generateUniqueTransactionRef(booking.getBookingCode(), attemptNumber);

        Payment payment = Payment.builder()
                .booking(booking)
                .provider(PaymentProvider.VNPAY)
                .transactionRef(transactionRef)
                .amount(booking.getFinalAmount())
                .status(PaymentStatus.PENDING)
                .refundStatus(PaymentRefundStatus.NONE)
                .build();

        Payment savedPayment = paymentRepository.save(payment);

        Map<String, String> vnpParams = new HashMap<>();
        vnpParams.put("vnp_Version", vnPayProperties.getVersion());
        vnpParams.put("vnp_Command", vnPayProperties.getCommand());
        vnpParams.put("vnp_TmnCode", vnPayProperties.getTmnCode());
        vnpParams.put("vnp_Amount", String.valueOf(booking.getFinalAmount() * 100L));
        vnpParams.put("vnp_CurrCode", vnPayProperties.getCurrCode());
        vnpParams.put("vnp_TxnRef", transactionRef);
        vnpParams.put("vnp_OrderInfo", "Payment for booking " + booking.getBookingCode());
        vnpParams.put("vnp_OrderType", vnPayProperties.getOrderType());
        vnpParams.put("vnp_Locale", vnPayProperties.getLocale());
        vnpParams.put("vnp_ReturnUrl", vnPayProperties.getReturnUrl());
        vnpParams.put("vnp_IpAddr", clientIp);
        vnpParams.put("vnp_CreateDate", VnPayUtil.formatVnPayDate(now));
        vnpParams.put("vnp_ExpireDate", VnPayUtil.formatVnPayDate(booking.getExpiresAt()));

        if (request.bankCode() != null && !request.bankCode().isBlank()) {
            vnpParams.put("vnp_BankCode", request.bankCode().trim());
        }

        String paymentUrl = VnPayUtil.buildPaymentUrl(
                vnpParams,
                vnPayProperties.getPayUrl(),
                vnPayProperties.getHashSecret()
        );

        return PaymentUrlResponse.builder()
                .paymentId(savedPayment.getId())
                .bookingId(booking.getId())
                .bookingCode(booking.getBookingCode())
                .transactionRef(transactionRef)
                .amount(booking.getFinalAmount())
                .attemptNumber(attemptNumber)
                .remainingAttempts(MAX_PAYMENT_ATTEMPTS - attemptNumber)
                .bookingExpiresAt(booking.getExpiresAt())
                .paymentUrl(paymentUrl)
                .build();
    }


    @Transactional(readOnly = true)
    public VnPayReturnResponse handleVnPayReturn(Map<String, String> params) {
        boolean signatureValid = VnPayUtil.verifySignature(params, vnPayProperties.getHashSecret());
        String txnRef = params.get("vnp_TxnRef");
        String responseCode = params.get("vnp_ResponseCode");
        String transactionStatus = params.get("vnp_TransactionStatus");
        String transactionNo = normalizeTransactionNo(params.get("vnp_TransactionNo"));
        Long amount = parseVnPayAmountInVnd(params.get("vnp_Amount"));

        boolean gatewaySuccess = signatureValid
                && "00".equals(responseCode)
                && "00".equals(transactionStatus);

        Payment payment = (txnRef != null)
                ? paymentRepository.findByTransactionRef(txnRef).orElse(null)
                : null;

        if (!signatureValid) {
            return VnPayReturnResponse.builder()
                    .signatureValid(false)
                    .gatewaySuccess(false)
                    .transactionRef(txnRef)
                    .transactionNo(transactionNo)
                    .responseCode(responseCode)
                    .transactionStatus(transactionStatus)
                    .amount(amount)
                    .message("Invalid VNPay signature")
                    .build();
        }

        if (payment == null) {
            return VnPayReturnResponse.builder()
                    .signatureValid(true)
                    .gatewaySuccess(gatewaySuccess)
                    .transactionRef(txnRef)
                    .transactionNo(transactionNo)
                    .responseCode(responseCode)
                    .transactionStatus(transactionStatus)
                    .amount(amount)
                    .message("Payment record not found")
                    .build();
        }

        Booking booking = payment.getBooking();
        String message = gatewaySuccess
                ? "Payment submitted successfully. Final booking confirmation is processed via IPN."
                : "Payment failed or was cancelled by user.";

        return VnPayReturnResponse.builder()
                .signatureValid(true)
                .gatewaySuccess(gatewaySuccess)
                .transactionRef(txnRef)
                .transactionNo(transactionNo)
                .responseCode(responseCode)
                .transactionStatus(transactionStatus)
                .amount(payment.getAmount())
                .bookingId(booking.getId())
                .bookingCode(booking.getBookingCode())
                .bookingStatus(booking.getStatus())
                .paymentStatus(payment.getStatus())
                .refundStatus(payment.getRefundStatus())
                .message(message)
                .build();
    }


    @Transactional
    public VnPayIpnResponse processVnPayIpn(Map<String, String> params) {
        if (!VnPayUtil.verifySignature(params, vnPayProperties.getHashSecret())) {
            log.warn("[VNPay IPN] Invalid signature detected for params: {}", params);
            return VnPayIpnResponse.of("97", "Invalid Checksum");
        }

        String txnRef = params.get("vnp_TxnRef");
        if (txnRef == null || txnRef.isBlank()) {
            return VnPayIpnResponse.of("01", "Order not Found");
        }

        Payment unlockedPayment = paymentRepository.findByTransactionRef(txnRef.trim()).orElse(null);
        if (unlockedPayment == null) {
            log.warn("[VNPay IPN] TransactionRef not found: {}", txnRef);
            return VnPayIpnResponse.of("01", "Order not Found");
        }

        Long vnpAmountVnd = parseVnPayAmountInVnd(params.get("vnp_Amount"));
        if (vnpAmountVnd == null || !vnpAmountVnd.equals(unlockedPayment.getAmount())) {
            log.warn("[VNPay IPN] Amount mismatch for txnRef={}: expected={}, actual={}",
                    txnRef, unlockedPayment.getAmount(), vnpAmountVnd);
            return VnPayIpnResponse.of("04", "Invalid Amount");
        }

        if (unlockedPayment.getStatus() != PaymentStatus.PENDING) {
            log.info("[VNPay IPN] Idempotent hit (pre-lock) for txnRef={}, currentStatus={}",
                    txnRef, unlockedPayment.getStatus());
            return VnPayIpnResponse.of("02", "Order already confirmed");
        }

        Long bookingId = unlockedPayment.getBooking().getId();
        Booking booking = bookingRepository.findByIdForUpdate(bookingId)
                .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));

        Payment payment = paymentRepository.findByIdForUpdate(unlockedPayment.getId())
                .orElseThrow(() -> new AppException(ErrorCode.PAYMENT_NOT_FOUND));

        if (payment.getStatus() != PaymentStatus.PENDING) {
            log.info("[VNPay IPN] Idempotent hit (post-lock) for txnRef={}, currentStatus={}",
                    txnRef, payment.getStatus());
            return VnPayIpnResponse.of("02", "Order already confirmed");
        }

        String responseCode = params.get("vnp_ResponseCode");
        String transactionStatus = params.get("vnp_TransactionStatus");
        LocalDateTime payDate = VnPayUtil.parseVnPayDate(params.get("vnp_PayDate"));
        if (payDate == null) {
            payDate = LocalDateTime.now();
        }

        payment.setResponseCode(responseCode);
        payment.setTransactionStatus(transactionStatus);
        payment.setTransactionNo(normalizeTransactionNo(params.get("vnp_TransactionNo")));
        payment.setPayDate(payDate);
        payment.setRawPayload(serializeRawPayload(params));

        boolean isGatewaySuccess = "00".equals(responseCode) && "00".equals(transactionStatus);

        if (!isGatewaySuccess) {
            payment.setStatus(PaymentStatus.FAILED);
            payment.setRefundStatus(PaymentRefundStatus.NONE);
            paymentRepository.save(payment);
            log.info("[VNPay IPN] Payment FAILED for txnRef={}, responseCode={}", txnRef, responseCode);
            return VnPayIpnResponse.of("00", "Confirm Success");
        }

        List<BookingItem> bookingItems = bookingItemRepository.findByBookingIdOrderByIdAsc(booking.getId());
        Set<Long> seatIds = bookingItems.stream()
                .map(item -> item.getShowtimeSeat().getId())
                .collect(TreeSet::new, Set::add, Set::addAll);

        List<ShowtimeSeat> lockedSeats = showtimeSeatRepository.findByIdsForUpdateOrderByIdAsc(seatIds);

        boolean allSeatsHeldByThisBooking = lockedSeats.size() == seatIds.size()
                && lockedSeats.stream().allMatch(seat ->
                seat.getStatus() == ShowtimeSeatStatus.HELD
                        && booking.getId().equals(seat.getHeldByBookingId())
        );

        if (booking.getStatus() == BookingStatus.PENDING_PAYMENT && allSeatsHeldByThisBooking) {
            for (ShowtimeSeat seat : lockedSeats) {
                seat.setStatus(ShowtimeSeatStatus.BOOKED);
            }
            showtimeSeatRepository.saveAll(lockedSeats);

            voucherService.confirmVoucherIfPresent(booking);

            booking.setStatus(BookingStatus.CONFIRMED);
            bookingRepository.save(booking);

            payment.setStatus(PaymentStatus.SUCCESS);
            payment.setRefundStatus(PaymentRefundStatus.NONE);
            paymentRepository.save(payment);

            log.info("[VNPay IPN - TH1] Booking {} confirmed in-time via txnRef={}", booking.getBookingCode(), txnRef);
            return VnPayIpnResponse.of("00", "Confirm Success");
        }

        boolean paidOnTime = !payDate.isAfter(booking.getExpiresAt());
        boolean showtimeStillScheduled = booking.getShowtime().getStatus() == ShowtimeStatus.SCHEDULED;
        boolean allSeatsStillAvailable = lockedSeats.size() == seatIds.size()
                && lockedSeats.stream().allMatch(seat ->
                seat.getStatus() == ShowtimeSeatStatus.AVAILABLE
                        && seat.getHeldByBookingId() == null
        );

        if (booking.getStatus() == BookingStatus.EXPIRED
                && paidOnTime
                && showtimeStillScheduled
                && allSeatsStillAvailable
                && voucherService.tryReclaimAndConfirmVoucher(booking)) {

            for (ShowtimeSeat seat : lockedSeats) {
                seat.setStatus(ShowtimeSeatStatus.BOOKED);
                seat.setHeldByBookingId(booking.getId());
            }
            showtimeSeatRepository.saveAll(lockedSeats);

            booking.setStatus(BookingStatus.CONFIRMED);
            bookingRepository.save(booking);

            payment.setStatus(PaymentStatus.SUCCESS);
            payment.setRefundStatus(PaymentRefundStatus.NONE);
            paymentRepository.save(payment);

            log.info("[VNPay IPN - TH2] Late IPN recovered expired booking {} to CONFIRMED via txnRef={}",
                    booking.getBookingCode(), txnRef);
            return VnPayIpnResponse.of("00", "Confirm Success");
        }

        payment.setStatus(PaymentStatus.SUCCESS);
        payment.setRefundStatus(PaymentRefundStatus.REFUND_REQUIRED);
        paymentRepository.save(payment);

        log.warn("[VNPay IPN - TH3] Payment marked as SUCCESS with REFUND_REQUIRED for bookingCode={}, bookingStatus={}, txnRef={}",
                booking.getBookingCode(), booking.getStatus(), txnRef);
        return VnPayIpnResponse.of("00", "Confirm Success");
    }

    @Transactional(readOnly = true)
    public List<PaymentResponse> getPaymentsByBooking(String userEmail, Long bookingId) {
        User currentUser = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));

        if (!booking.getUser().getId().equals(currentUser.getId()) && currentUser.getRole() != Role.ADMIN) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        return paymentRepository.findByBookingIdOrderByCreatedAtAsc(bookingId).stream()
                .map(paymentMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public PageResponse<PaymentResponse> getAllPaymentsForAdmin(
            PaymentStatus status,
            PaymentRefundStatus refundStatus,
            int page,
            int size
    ) {
        Pageable pageable = PageRequest.of(page - 1, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Payment> paymentPage = paymentRepository.searchPayments(status, refundStatus, pageable);
        return PageResponse.from(paymentPage.map(paymentMapper::toResponse));
    }

    @Transactional
    public PaymentResponse confirmManualRefund(Long paymentId) {
        Payment payment = paymentRepository.findByIdForUpdate(paymentId)
                .orElseThrow(() -> new AppException(ErrorCode.PAYMENT_NOT_FOUND));

        if (payment.getRefundStatus() != PaymentRefundStatus.REFUND_REQUIRED) {
            throw new AppException(ErrorCode.PAYMENT_REFUND_NOT_REQUIRED);
        }

        payment.setRefundStatus(PaymentRefundStatus.REFUNDED);
        return paymentMapper.toResponse(paymentRepository.save(payment));
    }

    private String generateUniqueTransactionRef(String bookingCode, int attemptNumber) {
        String randomSuffix = UUID.randomUUID().toString().replace("-", "").substring(0, 6).toUpperCase();
        return bookingCode + "-A" + attemptNumber + "-" + randomSuffix;
    }

    private Long parseVnPayAmountInVnd(String vnpAmountRaw) {
        if (vnpAmountRaw == null || vnpAmountRaw.isBlank()) {
            return null;
        }
        try {
            long amountTimes100 = Long.parseLong(vnpAmountRaw.trim());
            if (amountTimes100 < 0 || amountTimes100 % 100 != 0) {
                return null;
            }
            return amountTimes100 / 100L;
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private String normalizeTransactionNo(String rawTxnNo) {
        if (rawTxnNo == null) {
            return null;
        }
        String trimmed = rawTxnNo.trim();
        if (trimmed.isEmpty() || trimmed.matches("^0+$")) {
            return null;
        }
        return trimmed;
    }

    private String serializeRawPayload(Map<String, String> params) {
        try {
            return objectMapper.writeValueAsString(params);
        } catch (JsonProcessingException e) {
            log.warn("Could not serialize VNPay IPN payload to JSON: {}", e.getMessage());
            return "{}";
        }
    }
}