package com.example.cinema.payment.repository;

import com.example.cinema.payment.dto.projection.DailyRevenueProjection;
import com.example.cinema.payment.dto.projection.MovieRevenueProjection;
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

import java.time.LocalDateTime;
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
    List<Payment> findByBookingId(Long bookingId);

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

    @Query("""
            SELECT COALESCE(SUM(p.amount), 0)
            FROM Payment p
            WHERE p.status = com.example.cinema.payment.enums.PaymentStatus.SUCCESS
              AND p.refundStatus = com.example.cinema.payment.enums.PaymentRefundStatus.NONE
              AND p.payDate BETWEEN :startDate AND :endDate
            """)
    Long calculateTotalNetRevenue(
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );

    @Query("""
            SELECT 
                DATE(p.payDate) AS reportDate, 
                SUM(p.amount) AS totalRevenue, 
                COUNT(p.id) AS transactionCount
            FROM Payment p
            WHERE p.status = com.example.cinema.payment.enums.PaymentStatus.SUCCESS
              AND p.refundStatus = com.example.cinema.payment.enums.PaymentRefundStatus.NONE
              AND p.payDate BETWEEN :startDate AND :endDate
            GROUP BY DATE(p.payDate)
            ORDER BY reportDate ASC
            """)
    List<DailyRevenueProjection> getDailyRevenueStatistics(
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );

    @Query("""
            SELECT 
                m.id AS movieId, 
                m.title AS movieTitle, 
                SUM(p.amount) AS totalRevenue, 
                COUNT(DISTINCT b.id) AS totalBookings
            FROM Payment p
            JOIN p.booking b
            JOIN b.showtime s
            JOIN s.movie m
            WHERE p.status = com.example.cinema.payment.enums.PaymentStatus.SUCCESS
              AND p.refundStatus = com.example.cinema.payment.enums.PaymentRefundStatus.NONE
              AND p.payDate BETWEEN :startDate AND :endDate
            GROUP BY m.id, m.title
            ORDER BY totalRevenue DESC
            """)
    List<MovieRevenueProjection> getRevenueByMovie(
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );
}
