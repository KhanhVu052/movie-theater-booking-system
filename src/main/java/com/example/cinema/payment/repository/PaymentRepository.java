package com.example.cinema.payment.repository;

import com.example.cinema.payment.entity.Payment;
import com.example.cinema.payment.enums.PaymentRefundStatus;
import com.example.cinema.payment.enums.PaymentStatus;
import jakarta.persistence.LockModeType;
import jakarta.persistence.QueryHint;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.QueryHints;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {

    long countByBookingId(Long bookingId);

    @EntityGraph(attributePaths = {"booking"})
    Optional<Payment> findByTransactionRef(String transactionRef);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @QueryHints({@QueryHint(name = "jakarta.persistence.lock.timeout", value = "3000")})
    @Query("SELECT p FROM Payment p JOIN FETCH p.booking WHERE p.id = :id")
    Optional<Payment> findByIdForUpdate(@Param("id") Long id);

    @EntityGraph(attributePaths = {"booking"})
    List<Payment> findByBookingIdOrderByCreatedAtAsc(Long bookingId);

    @EntityGraph(attributePaths = {"booking"})
    @Query("""
            SELECT p FROM Payment p
            WHERE (:status IS NULL OR p.status = :status)
              AND (:refundStatus IS NULL OR p.refundStatus = :refundStatus)
            """)
    Page<Payment> searchPayments(
            @Param("status") PaymentStatus status,
            @Param("refundStatus") PaymentRefundStatus refundStatus,
            Pageable pageable
    );
}