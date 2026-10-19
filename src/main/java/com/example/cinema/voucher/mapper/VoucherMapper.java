package com.example.cinema.voucher.mapper;

import com.example.cinema.voucher.dto.request.VoucherRequest;
import com.example.cinema.voucher.dto.response.VoucherResponse;
import com.example.cinema.voucher.entity.Voucher;
import org.springframework.stereotype.Component;

@Component
public class VoucherMapper {

    public Voucher toEntity(VoucherRequest request) {
        return Voucher.builder()
                .code(request.code().trim().toUpperCase())
                .discountType(request.discountType())
                .discountValue(request.discountValue())
                .maxDiscountAmount(request.maxDiscountAmount())
                .minOrderValue(request.minOrderValue())
                .usageLimit(request.usageLimit())
                .reservedCount(0)
                .usedCount(0)
                .perUserLimit(request.perUserLimit())
                .startAt(request.startAt())
                .endAt(request.endAt())
                .isActive(true)
                .build();
    }

    public VoucherResponse toResponse(Voucher voucher) {
        int remaining = Math.max(0, voucher.getUsageLimit() - (voucher.getReservedCount() + voucher.getUsedCount()));
        return VoucherResponse.builder()
                .id(voucher.getId())
                .code(voucher.getCode())
                .discountType(voucher.getDiscountType())
                .discountValue(voucher.getDiscountValue())
                .maxDiscountAmount(voucher.getMaxDiscountAmount())
                .minOrderValue(voucher.getMinOrderValue())
                .usageLimit(voucher.getUsageLimit())
                .reservedCount(voucher.getReservedCount())
                .usedCount(voucher.getUsedCount())
                .remainingQuota(remaining)
                .perUserLimit(voucher.getPerUserLimit())
                .startAt(voucher.getStartAt())
                .endAt(voucher.getEndAt())
                .isActive(voucher.getIsActive())
                .createdAt(voucher.getCreatedAt())
                .updatedAt(voucher.getUpdatedAt())
                .build();
    }
}