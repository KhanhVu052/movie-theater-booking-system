package com.example.cinema.voucher.entity;

import com.example.cinema.voucher.enums.DiscountType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "vouchers")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Voucher {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @Column(nullable = false, unique = true, length = 50)
    String code;

    @Enumerated(EnumType.STRING)
    @Column(name = "discount_type", nullable = false, length = 20)
    DiscountType discountType;

    @Column(name = "discount_value", nullable = false)
    Long discountValue;

    @Column(name = "max_discount_amount")
    Long maxDiscountAmount;

    @Column(name = "min_order_value", nullable = false)
    @Builder.Default
    Long minOrderValue = 0L;

    @Column(name = "usage_limit", nullable = false)
    Integer usageLimit;

    @Column(name = "reserved_count", nullable = false)
    @Builder.Default
    Integer reservedCount = 0;

    @Column(name = "used_count", nullable = false)
    @Builder.Default
    Integer usedCount = 0;

    @Column(name = "per_user_limit", nullable = false)
    @Builder.Default
    Integer perUserLimit = 1;

    @Column(name = "start_at", nullable = false)
    LocalDateTime startAt;

    @Column(name = "end_at", nullable = false)
    LocalDateTime endAt;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    LocalDateTime updatedAt;

    public long calculateDiscount(long subtotalAmount) {
        if (discountType == DiscountType.PERCENTAGE) {
            long discount = (subtotalAmount * discountValue) / 100L;
            if (maxDiscountAmount != null && discount > maxDiscountAmount) {
                discount = maxDiscountAmount;
            }
            return Math.min(discount, subtotalAmount);
        }
        return Math.min(discountValue, subtotalAmount);
    }
}