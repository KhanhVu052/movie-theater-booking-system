package com.example.cinema.voucher.controller;

import com.example.cinema.common.dto.ApiResponse;
import com.example.cinema.common.dto.StatusToggleRequest;
import com.example.cinema.voucher.dto.request.VoucherRequest;
import com.example.cinema.voucher.dto.response.VoucherResponse;
import com.example.cinema.voucher.service.VoucherService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/vouchers")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class VoucherController {

    VoucherService voucherService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<VoucherResponse>>> getPublicVouchers() {
        return ResponseEntity.ok(ApiResponse.success(voucherService.getPublicVouchers()));
    }

    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<VoucherResponse>>> getAllVouchersForAdmin() {
        return ResponseEntity.ok(ApiResponse.success(voucherService.getAllVouchersForAdmin()));
    }

    @GetMapping("/code/{code}")
    public ResponseEntity<ApiResponse<VoucherResponse>> getVoucherByCode(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.success(voucherService.getVoucherByCode(code)));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<VoucherResponse>> createVoucher(@Valid @RequestBody VoucherRequest request) {
        VoucherResponse response = voucherService.createVoucher(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Voucher created successfully", response));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<VoucherResponse>> toggleVoucherStatus(
            @PathVariable Long id,
            @Valid @RequestBody StatusToggleRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success("Voucher status updated", voucherService.toggleVoucherStatus(id, request.isActive())));
    }
}