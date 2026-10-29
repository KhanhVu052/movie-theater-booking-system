package com.example.cinema.voucher.dto.response;

import com.example.cinema.voucher.enums.DiscountType;
import lombok.Builder;

import java.time.LocalDateTime;

@Builder
public record VoucherResponse(
        Long id,
        String code,
        DiscountType discountType,
        Long discountValue,
        Long maxDiscountAmount,
        Long minOrderValue,
        Integer usageLimit,
        Integer reservedCount,
        Integer usedCount,
        Integer remainingQuota,
        Integer perUserLimit,
        LocalDateTime startAt,
        LocalDateTime endAt,
        Boolean isActive,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}