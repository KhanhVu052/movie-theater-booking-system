package com.example.cinema.voucher.dto.request;

import com.example.cinema.voucher.enums.DiscountType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public record VoucherRequest(
        @NotBlank(message = "Voucher code must not be blank")
        @Size(max = 50, message = "Voucher code must not exceed 50 characters")
        String code,

        @NotNull(message = "Discount type is required (PERCENTAGE, FIXED_AMOUNT)")
        DiscountType discountType,

        @NotNull(message = "Discount value is required")
        @Min(value = 1, message = "Discount value must be greater than 0")
        Long discountValue,

        @Min(value = 0, message = "Max discount amount cannot be negative")
        Long maxDiscountAmount,

        @NotNull(message = "Min order value is required")
        @Min(value = 0, message = "Min order value cannot be negative")
        Long minOrderValue,

        @NotNull(message = "Usage limit is required")
        @Min(value = 1, message = "Usage limit must be at least 1")
        Integer usageLimit,

        @NotNull(message = "Per user limit is required")
        @Min(value = 1, message = "Per user limit must be at least 1")
        Integer perUserLimit,

        @NotNull(message = "Start time is required")
        LocalDateTime startAt,

        @NotNull(message = "End time is required")
        LocalDateTime endAt
) {
}