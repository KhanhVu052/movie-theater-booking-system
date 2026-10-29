package com.example.cinema.voucher.repository;

import com.example.cinema.voucher.entity.VoucherRedemption;
import com.example.cinema.voucher.enums.VoucherRedemptionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VoucherRedemptionRepository extends JpaRepository<VoucherRedemption, Long> {

    @Query("""
            SELECT COUNT(vr) FROM VoucherRedemption vr
            WHERE vr.voucher.id = :voucherId
              AND vr.user.id = :userId
              AND vr.status IN :statuses
            """)
    long countActiveRedemptionsByUser(
            @Param("voucherId") Long voucherId,
            @Param("userId") Long userId,
            @Param("statuses") List<VoucherRedemptionStatus> statuses
    );

    Optional<VoucherRedemption> findByBookingId(Long bookingId);
}