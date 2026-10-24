package com.example.cinema.voucher.service;

import com.example.cinema.auth.entity.User;
import com.example.cinema.booking.entity.Booking;
import com.example.cinema.common.exception.AppException;
import com.example.cinema.common.exception.ErrorCode;
import com.example.cinema.voucher.dto.request.VoucherRequest;
import com.example.cinema.voucher.dto.response.VoucherResponse;
import com.example.cinema.voucher.entity.Voucher;
import com.example.cinema.voucher.entity.VoucherRedemption;
import com.example.cinema.voucher.enums.DiscountType;
import com.example.cinema.voucher.enums.VoucherRedemptionStatus;
import com.example.cinema.voucher.mapper.VoucherMapper;
import com.example.cinema.voucher.repository.VoucherRedemptionRepository;
import com.example.cinema.voucher.repository.VoucherRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class VoucherService {

    VoucherRepository voucherRepository;
    VoucherRedemptionRepository voucherRedemptionRepository;
    VoucherMapper voucherMapper;

    @Transactional
    public VoucherResponse createVoucher(VoucherRequest request) {
        if (!request.startAt().isBefore(request.endAt())) {
            throw new AppException(ErrorCode.VOUCHER_INVALID_DATE_RANGE);
        }

        if (request.discountType() == DiscountType.PERCENTAGE && request.discountValue() > 100) {
            throw new AppException(ErrorCode.VOUCHER_INVALID_PERCENTAGE);
        }

        String normalizedCode = request.code().trim().toUpperCase();
        if (voucherRepository.existsByCodeIgnoreCase(normalizedCode)) {
            throw new AppException(ErrorCode.VOUCHER_CODE_ALREADY_EXISTS);
        }

        Voucher voucher = voucherMapper.toEntity(request);
        return voucherMapper.toResponse(voucherRepository.save(voucher));
    }

    @Transactional(readOnly = true)
    public List<VoucherResponse> getAllVouchers() {
        return voucherRepository.findAll().stream()
                .map(voucherMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public VoucherResponse getVoucherByCode(String code) {
        Voucher voucher = voucherRepository.findByCodeIgnoreCase(code.trim())
                .orElseThrow(() -> new AppException(ErrorCode.VOUCHER_NOT_FOUND));
        return voucherMapper.toResponse(voucher);
    }

    @Transactional
    public VoucherResponse toggleVoucherStatus(Long id, boolean isActive) {
        Voucher voucher = voucherRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.VOUCHER_NOT_FOUND));
        voucher.setIsActive(isActive);
        return voucherMapper.toResponse(voucherRepository.save(voucher));
    }

    @Transactional
    public Voucher lockAndReserveVoucher(String code, User user, long subtotalAmount, LocalDateTime now) {
        Voucher voucher = voucherRepository.findByCodeForUpdate(code.trim())
                .orElseThrow(() -> new AppException(ErrorCode.VOUCHER_NOT_FOUND));

        if (Boolean.FALSE.equals(voucher.getIsActive())) {
            throw new AppException(ErrorCode.VOUCHER_INACTIVE);
        }

        if (now.isBefore(voucher.getStartAt()) || now.isAfter(voucher.getEndAt())) {
            throw new AppException(ErrorCode.VOUCHER_NOT_STARTED_OR_EXPIRED);
        }

        if (subtotalAmount < voucher.getMinOrderValue()) {
            throw new AppException(ErrorCode.VOUCHER_MIN_ORDER_NOT_MET);
        }

        if (voucher.getReservedCount() + voucher.getUsedCount() >= voucher.getUsageLimit()) {
            throw new AppException(ErrorCode.VOUCHER_USAGE_LIMIT_EXCEEDED);
        }

        long userUsedOrReserved = voucherRedemptionRepository.countActiveRedemptionsByUser(
                voucher.getId(),
                user.getId(),
                List.of(VoucherRedemptionStatus.RESERVED, VoucherRedemptionStatus.USED)
        );

        if (userUsedOrReserved >= voucher.getPerUserLimit()) {
            throw new AppException(ErrorCode.VOUCHER_USER_LIMIT_EXCEEDED);
        }

        voucher.setReservedCount(voucher.getReservedCount() + 1);
        return voucherRepository.save(voucher);
    }

    @Transactional
    public void createReservedRedemption(Voucher voucher, User user, Booking booking, long discountApplied) {
        VoucherRedemption redemption = VoucherRedemption.builder()
                .voucher(voucher)
                .user(user)
                .booking(booking)
                .discountApplied(discountApplied)
                .status(VoucherRedemptionStatus.RESERVED)
                .build();
        voucherRedemptionRepository.save(redemption);
    }

    @Transactional
    public void releaseVoucherIfPresent(Booking booking) {
        if (booking.getVoucher() == null) {
            return;
        }

        Voucher lockedVoucher = voucherRepository.findByIdForUpdate(booking.getVoucher().getId())
                .orElse(null);

        voucherRedemptionRepository.findByBookingId(booking.getId()).ifPresent(redemption -> {
            if (redemption.getStatus() == VoucherRedemptionStatus.RESERVED) {
                redemption.setStatus(VoucherRedemptionStatus.RELEASED);
                voucherRedemptionRepository.save(redemption);

                if (lockedVoucher != null && lockedVoucher.getReservedCount() > 0) {
                    lockedVoucher.setReservedCount(lockedVoucher.getReservedCount() - 1);
                    voucherRepository.save(lockedVoucher);
                }
            }
        });
    }

    @Transactional
    public void confirmVoucherIfPresent(Booking booking) {
        if (booking.getVoucher() == null) {
            return;
        }

        Voucher lockedVoucher = voucherRepository.findByIdForUpdate(booking.getVoucher().getId())
                .orElse(null);

        voucherRedemptionRepository.findByBookingId(booking.getId()).ifPresent(redemption -> {
            if (redemption.getStatus() == VoucherRedemptionStatus.RESERVED) {
                redemption.setStatus(VoucherRedemptionStatus.USED);
                voucherRedemptionRepository.save(redemption);

                if (lockedVoucher != null) {
                    if (lockedVoucher.getReservedCount() > 0) {
                        lockedVoucher.setReservedCount(lockedVoucher.getReservedCount() - 1);
                    }
                    lockedVoucher.setUsedCount(lockedVoucher.getUsedCount() + 1);
                    voucherRepository.save(lockedVoucher);
                }
            }
        });
    }

    @Transactional
    public boolean tryReclaimAndConfirmVoucher(Booking booking) {
        if (booking.getVoucher() == null) {
            return true;
        }

        Voucher lockedVoucher = voucherRepository.findByIdForUpdate(booking.getVoucher().getId())
                .orElse(null);
        if (lockedVoucher == null) {
            return false;
        }

        VoucherRedemption redemption = voucherRedemptionRepository.findByBookingId(booking.getId())
                .orElse(null);
        if (redemption == null) {
            return false;
        }

        if (redemption.getStatus() == VoucherRedemptionStatus.USED) {
            return true;
        }

        if (redemption.getStatus() == VoucherRedemptionStatus.RESERVED) {
            redemption.setStatus(VoucherRedemptionStatus.USED);
            voucherRedemptionRepository.save(redemption);
            if (lockedVoucher.getReservedCount() > 0) {
                lockedVoucher.setReservedCount(lockedVoucher.getReservedCount() - 1);
            }
            lockedVoucher.setUsedCount(lockedVoucher.getUsedCount() + 1);
            voucherRepository.save(lockedVoucher);
            return true;
        }

        if (lockedVoucher.getReservedCount() + lockedVoucher.getUsedCount() >= lockedVoucher.getUsageLimit()) {
            return false;
        }

        long activeUserRedemptions = voucherRedemptionRepository.countActiveRedemptionsByUser(
                lockedVoucher.getId(),
                booking.getUser().getId(),
                List.of(VoucherRedemptionStatus.RESERVED, VoucherRedemptionStatus.USED)
        );
        if (activeUserRedemptions >= lockedVoucher.getPerUserLimit()) {
            return false;
        }

        redemption.setStatus(VoucherRedemptionStatus.USED);
        voucherRedemptionRepository.save(redemption);

        lockedVoucher.setUsedCount(lockedVoucher.getUsedCount() + 1);
        voucherRepository.save(lockedVoucher);
        return true;
    }
}