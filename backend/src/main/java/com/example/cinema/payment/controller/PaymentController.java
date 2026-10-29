package com.example.cinema.payment.controller;

import com.example.cinema.common.component.DeadlockRetryExecutor;
import com.example.cinema.common.dto.ApiResponse;
import com.example.cinema.common.dto.PageResponse;
import com.example.cinema.payment.config.VnPayUtil;
import com.example.cinema.payment.dto.request.PaymentCreateRequest;
import com.example.cinema.payment.dto.response.PaymentResponse;
import com.example.cinema.payment.dto.response.PaymentUrlResponse;
import com.example.cinema.payment.dto.response.VnPayIpnResponse;
import com.example.cinema.payment.dto.response.VnPayReturnResponse;
import com.example.cinema.payment.enums.PaymentRefundStatus;
import com.example.cinema.payment.enums.PaymentStatus;
import com.example.cinema.payment.service.PaymentService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@Validated
@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class PaymentController {

    PaymentService paymentService;
    DeadlockRetryExecutor deadlockRetryExecutor;

    @PostMapping("/vnpay/create")
    public ResponseEntity<ApiResponse<PaymentUrlResponse>> createVnPayPaymentUrl(
            Authentication authentication,
            @Valid @RequestBody PaymentCreateRequest request,
            HttpServletRequest httpServletRequest
    ) {
        String clientIp = VnPayUtil.extractClientIp(httpServletRequest);
        PaymentUrlResponse response = deadlockRetryExecutor.executeWithRetry(
                "CreateVnPayPayment-" + request.bookingId(),
                () -> paymentService.createVnPayPaymentUrl(authentication.getName(), request, clientIp)
        );
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("VNPay payment URL generated successfully", response));
    }

    @GetMapping("/vnpay-return")
    public ResponseEntity<ApiResponse<VnPayReturnResponse>> handleVnPayReturn(
            @RequestParam Map<String, String> params
    ) {
        VnPayReturnResponse response = paymentService.handleVnPayReturn(params);
        return ResponseEntity.ok(ApiResponse.success(response.message(), response));
    }

    @GetMapping("/vnpay-ipn")
    public ResponseEntity<VnPayIpnResponse> handleVnPayIpn(
            @RequestParam Map<String, String> params
    ) {
        VnPayIpnResponse response = deadlockRetryExecutor.executeWithRetry(
                "VnPayIpn-" + params.getOrDefault("vnp_TxnRef", "UNKNOWN"),
                () -> paymentService.processVnPayIpn(params)
        );
        return ResponseEntity.ok(response);
    }

    @GetMapping("/booking/{bookingId}")
    public ResponseEntity<ApiResponse<List<PaymentResponse>>> getPaymentsByBooking(
            Authentication authentication,
            @PathVariable Long bookingId
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                paymentService.getPaymentsByBooking(authentication.getName(), bookingId)
        ));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<PageResponse<PaymentResponse>>> getAllPaymentsForAdmin(
            @RequestParam(required = false) PaymentStatus status,
            @RequestParam(required = false) PaymentRefundStatus refundStatus,
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "10") @Min(1) @Max(100) int size
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                paymentService.getAllPaymentsForAdmin(status, refundStatus, page, size)
        ));
    }

    @PatchMapping("/{id}/refund")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<PaymentResponse>> confirmManualRefund(@PathVariable Long id) {
        PaymentResponse response = deadlockRetryExecutor.executeWithRetry(
                "ConfirmRefund-" + id,
                () -> paymentService.confirmManualRefund(id)
        );
        return ResponseEntity.ok(ApiResponse.success("Payment marked as REFUNDED successfully", response));
    }
}