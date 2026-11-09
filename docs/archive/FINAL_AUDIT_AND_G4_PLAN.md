> **WARNING:** This document is archived for historical purposes. It contains outdated architectural claims (e.g., automated refunds, Redis dependencies) that have been deprecated or replaced in the current production codebase. Do not use this as a reference for the current system state.
# KẾ HOẠCH HOÀN THIỆN CUỐI CÙNG & VÁ LỖI CHUYÊN SÂU (FINAL DEEP-DIVE REMEDIATION)

> **Dành cho:** Developer và AI Coding Assistant trên Antigravity.
>
> **Tài liệu tham chiếu bắt buộc:** `WORKSPACE_RULES`, `docs/SRS.md` (v3.4), `docs/ROADMAP.md`, `docs/CHANGELOG.md`.
>
> **Mục tiêu:** Khắc phục triệt để 6 vấn đề kỹ thuật tinh vi (`HP-01` đến `HP-06`) phát hiện qua đợt rà soát toàn diện sau khi hoàn thành Nhóm 4, đảm bảo hệ thống đạt độ toàn vẹn 100% về Concurrency, Memory Safety và UX trước khi đóng gói vào CV.

---

## 1. BẢNG TRẠNG THÁI TỔNG HỢP (MASTER CHECKLIST)

### 1.1. Các hạng mục Nhóm 4 đã hoàn thành (`FA-01` $\rightarrow$ `G4-11`)

| Mã Task | Mức độ | Hạng mục công việc | Trạng thái |
| ----- | ----- | ----- | ----- |
| **FA-01** | 🔴 CRITICAL | Sửa `MovieTheaterBookingSystemApplicationTests` kế thừa `AbstractMySqlIT` để GitHub CI xanh `2/2` | `DONE` |
| **FA-02** | 🟠 HIGH | Bổ sung 5 bài test đồng thời (`PendingCapConcurrencyIT`, `VoucherLimitConcurrencyIT`, `IpnVsCancelShowtimeIT`, `CancelConfirmedVsCancelShowtimeIT`, `LockWaitTimeoutIT`) | `DONE` |
| **FA-03** | 🟠 HIGH | Kiểm tra `user.isActive` trong Security Filter / BookingService, cấu hình Hikari `connection-timeout: 10000` (`G4-08`) | `DONE` |
| **FA-04** | 🟠 HIGH | `G4-03`: Tách API Voucher Public vs Admin, khóa Voucher cuối chuỗi và xác nhận đơn $0\text{ đ}$ (`finalAmount == 0`) | `DONE` |
| **G4-04** | 🟡 MEDIUM | Tự động làm mới sơ đồ ghế định kỳ mỗi $8\text{ giây}$ (`useSeatMapPolling.js`) | `DONE` |
| **G4-05** | 🟡 MEDIUM | Lọc tham số `vnp_*` khi băm chữ ký VNPay & thêm trạng thái `processing` trên `PaymentResult.jsx` | `DONE` |
| **G4-06** | 🟡 MEDIUM | Luồng *"Modify Selected Seats"* hủy đơn `PENDING_PAYMENT` trước khi quay về trang chọn ghế | `DONE` |
| **G4-07** | 🟡 MEDIUM | Chống Brute-force đăng nhập ($5\text{ lần}/15\text{ phút}$, mã `1105`), mật khẩu $\ge 8$ ký tự & tài liệu hóa `D-06` | `DONE` |
| **G4-09** | 🟢 LOW | Giới hạn `size <= 100` ở `MovieController` & thêm `V4__payment_refund_audit.sql` lưu vết hoàn tiền | `DONE` |
| **G4-11** | 🟢 LOW | Đồng bộ hóa tài liệu lên phiên bản SRS v3.4 | `DONE` |

### 1.2. Đợt Tinh chỉnh Chuyên sâu Cuối cùng (`HP-01` $\rightarrow$ `HP-06` — CẦN THỰC HIỆN NGAY)

| Mã Task | Mức độ | Tên Task & Tóm tắt Vấn đề | Trạng thái |
| ----- | ----- | ----- | ----- |
| **HP-01** | 🔴 CRITICAL | `ShowtimeService.cancelShowtime`: Đang khóa `showtime_seats` (dòng 218) **trước** khi khóa `bookings` (dòng 227), ngược với bất biến chuỗi khóa `showtimes -> bookings -> showtime_seats -> vouchers`, gây nguy cơ AB-BA Deadlock với luồng IPN và hủy vé. | `DONE` |
| **HP-02** | 🟠 HIGH | `BookingRepository`: Hai truy vấn `findByIdForUpdate` và `findByIdsForUpdateOrderByIdAsc` dùng `LEFT JOIN FETCH b.voucher` kèm `FOR UPDATE` khiến MySQL khóa lan sớm sang bảng `vouchers` trước khi khóa `showtime_seats`. | `DONE` |
| **HP-03** | 🟡 MEDIUM | `BookingService.createBooking`: Đơn hàng $0\text{ đ}$ (`finalAmount == 0L`) chưa sinh bản ghi `Payment` (`amount = 0, status = SUCCESS, payDate = now`), khiến vé miễn phí 100% bị lọt khỏi thống kê `countTicketsSoldByMovie` / `countTotalTicketsSold`. | `DONE` |
| **HP-04** | 🟡 MEDIUM | `LoginAttemptService`: `ConcurrentHashMap` không có giới hạn kích thước tối đa (`MAX_CACHE_SIZE`), có nguy cơ bị tấn công làm tràn bộ nhớ (`OutOfMemoryError`) nếu bot gửi hàng triệu email ngẫu nhiên. | `DONE` |
| **HP-05** | 🟡 MEDIUM | `useSeatMapPolling.js`: Mảng `selectedSeatIds` nằm trong dependency của `useEffect` khởi tạo `SeatMapPoller`, khiến bộ đếm $8\text{ giây}$ bị stop/start lại từ đầu mỗi khi người dùng click chọn ghế. | `DONE` |
| **HP-06** | 🟢 LOW | `PaymentResult.jsx`: Vòng lặp bất đồng bộ Exponential Backoff (`2s, 4s, 8s, 16s`) chưa có cờ hủy (`cancelled`) khi component unmount, dẫn đến gọi API ngầm sau khi người dùng đã chuyển trang. | `DONE` |

---

## 2. CHI TIẾT KỸ THUẬT & HƯỚNG DẪN SỬA TỪNG TASK (`HP-01` $\rightarrow$ `HP-06`)

### HP-01 — Sửa Thứ Tự Khóa Trong `ShowtimeService.cancelShowtime` & Bọc Retry Deadlock 🔴 CRITICAL

#### 1. ĐỌC TRƯỚC (BẮT BUỘC):
* `backend/src/main/java/com/example/cinema/showtime/service/ShowtimeService.java` (method `cancelShowtime`, dòng `202–255`)
* `backend/src/main/java/com/example/cinema/showtime/controller/ShowtimeController.java` (method `cancelShowtime`, dòng `56–62`)
* `backend/src/main/java/com/example/cinema/common/component/DeadlockRetryExecutor.java`

#### 2. PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ:
* Theo mục 4.4 của `docs/SRS.md`, thứ tự khóa bắt buộc là:
  $$\text{users} \rightarrow \text{showtimes} \rightarrow \text{bookings (ORDER BY id ASC)} \rightarrow \text{showtime\_seats (ORDER BY id ASC)} \rightarrow \text{vouchers}$$
* Trong `PaymentService.processVnPayIpn`, `BookingService.cancelBooking`, `BookingService.cancelConfirmedBooking` và `BookingService.expireSingleBookingIsolated`, tất cả đều khóa `bookings` **trước**, sau đó mới khóa `showtime_seats`.
* Thế nhưng trong `ShowtimeService.cancelShowtime`:
  - Dòng `218`: Gọi `showtimeSeatRepository.findByShowtimeIdForUpdate(id)` (khóa `showtime_seats` trước).
  - Dòng `227`: Gọi `bookingRepository.findByIdsForUpdateOrderByIdAsc(bookingIds)` (khóa `bookings` sau).
* Khi `processVnPayIpn` (hoặc `cancelConfirmedBooking`) chạy song song với `cancelShowtime`, một luồng giữ `bookings` chờ `showtime_seats`, luồng kia giữ `showtime_seats` chờ `bookings` $\rightarrow$ phát sinh **AB-BA Deadlock**.

#### 3. CÁC BƯỚC SỬA CHI TIẾT:

**Bước 1:** Trong `ShowtimeService.java`, sửa lại method `cancelShowtime(Long id)` để khóa `bookings` (`ORDER BY id ASC`) trước, rồi mới khóa `showtime_seats` (`ORDER BY id ASC`):

```java
    @Transactional
    public void cancelShowtime(Long id) {
        Showtime showtime = showtimeRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new AppException(ErrorCode.SHOWTIME_NOT_FOUND));

        if (showtime.getStatus() == ShowtimeStatus.CANCELLED) {
            throw new AppException(ErrorCode.SHOWTIME_ALREADY_CANCELLED);
        }

        if (!showtime.getStartTime().isAfter(LocalDateTime.now())) {
            throw new AppException(ErrorCode.SHOWTIME_ALREADY_STARTED);
        }

        // Always soft-cancel to preserve historical data (AF-06, D-08)
        showtime.setStatus(ShowtimeStatus.CANCELLED);
        showtimeRepository.save(showtime);

        // Lock Ordering Invariant (SRS 4.4): showtimes -> bookings (ASC) -> showtime_seats (ASC) -> vouchers
        List<Long> bookingIds = bookingRepository.findIdsByShowtimeId(id);
        List<Booking> bookings = bookingIds.isEmpty()
                ? List.of()
                : bookingRepository.findByIdsForUpdateOrderByIdAsc(bookingIds);

        List<ShowtimeSeat> seats = showtimeSeatRepository.findByShowtimeIdForUpdate(id);
        for (ShowtimeSeat seat : seats) {
            seat.setStatus(ShowtimeSeatStatus.AVAILABLE);
            seat.setHeldByBookingId(null);
        }
        showtimeSeatRepository.saveAll(seats);

        for (Booking booking : bookings) {
            if (booking.getStatus() == BookingStatus.CONFIRMED) {
                booking.setStatus(BookingStatus.CANCELLED);
                bookingRepository.save(booking);

                List<Payment> payments = paymentRepository.findByBookingId(booking.getId());
                for (Payment payment : payments) {
                    if (payment.getStatus() == PaymentStatus.SUCCESS
                            && payment.getRefundStatus() == PaymentRefundStatus.NONE) {
                        payment.setRefundStatus(PaymentRefundStatus.REFUND_REQUIRED);
                        paymentRepository.save(payment);
                    }
                }
                voucherService.revertUsedVoucherIfPresent(booking);
            } else if (booking.getStatus() == BookingStatus.PENDING_PAYMENT) {
                booking.setStatus(BookingStatus.CANCELLED);
                bookingRepository.save(booking);
                voucherService.releaseVoucherIfPresent(booking);
            }
        }
        log.info("Cancelled showtime id={} and processed {} associated bookings", id, bookings.size());
    }
```

**Bước 2:** Trong `ShowtimeController.java`, inject `DeadlockRetryExecutor` và bọc lời gọi `showtimeService.cancelShowtime(id)` bằng `deadlockRetryExecutor.execute(() -> showtimeService.cancelShowtime(id))` để tự động thử lại nếu có xung đột khóa thoáng qua.

---

### HP-02 — Loại Bỏ `LEFT JOIN FETCH b.voucher` Khỏi Câu Lệnh `FOR UPDATE` Của `BookingRepository` 🟠 HIGH

#### 1. ĐỌC TRƯỚC (BẮT BUỘC):
* `backend/src/main/java/com/example/cinema/booking/repository/BookingRepository.java` (dòng `27–35`)
* `backend/src/main/java/com/example/cinema/voucher/entity/Voucher.java`

#### 2. PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ:
* Trong `BookingRepository.java`, hai phương thức `findByIdForUpdate` và `findByIdsForUpdateOrderByIdAsc` đang sử dụng `LEFT JOIN FETCH b.voucher` đi kèm `@Lock(LockModeType.PESSIMISTIC_WRITE)`.
* Trên MySQL InnoDB, `SELECT ... FROM bookings b LEFT JOIN vouchers v ... FOR UPDATE` sẽ đặt khóa độc quyền (`X-lock`) lên cả dòng trong bảng `bookings` lẫn dòng trong bảng `vouchers` ngay tại bước khóa `bookings` (trước khi khóa `showtime_seats`).
* Điều này làm bảng `vouchers` bị khóa sớm hơn `showtime_seats`, gây nguy cơ Deadlock chéo với luồng `createBooking` (vốn khóa `showtime_seats` trước rồi mới khóa `vouchers`).

#### 3. CÁC BƯỚC SỬA CHI TIẾT:

**Bước 1:** Trong `BookingRepository.java`, bỏ `LEFT JOIN FETCH b.voucher` khỏi 2 phương thức khóa `FOR UPDATE`:

```java
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @QueryHints({@QueryHint(name = "jakarta.persistence.lock.timeout", value = "3000")})
    @Query("SELECT b FROM Booking b WHERE b.id = :id")
    Optional<Booking> findByIdForUpdate(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @QueryHints({@QueryHint(name = "jakarta.persistence.lock.timeout", value = "3000")})
    @Query("SELECT b FROM Booking b WHERE b.id IN :ids ORDER BY b.id ASC")
    List<Booking> findByIdsForUpdateOrderByIdAsc(@Param("ids") Collection<Long> ids);
```

**Bước 2:** Trong `backend/src/main/java/com/example/cinema/voucher/entity/Voucher.java`, thêm annotation `@BatchSize(size = 50)` (của `org.hibernate.annotations.BatchSize`) ở cấp class (tương tự như entity `Seat.java`) để tránh truy vấn N+1 khi truy cập `booking.getVoucher()` trong transaction.

---

### HP-03 — Tạo Bản Ghi `Payment` $0\text{ đ}$ (`SUCCESS`) Cho Đơn Hàng Miễn Phí 100% (`finalAmount == 0L`) 🟡 MEDIUM

#### 1. ĐỌC TRƯỚC (BẮT BUỘC):
* `backend/src/main/java/com/example/cinema/booking/service/BookingService.java` (method `createBooking`, dòng `210–255`)
* `backend/src/main/java/com/example/cinema/booking/repository/BookingItemRepository.java` (dòng `27–65`)
* `backend/src/main/java/com/example/cinema/payment/repository/PaymentRepository.java`

#### 2. PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ:
* Trong `BookingItemRepository.java`, các truy vấn thống kê số vé bán ra theo kỳ thanh toán (`countTicketsSoldByMovie` và `countTotalTicketsSold`) kiểm tra điều kiện:
  `EXISTS (SELECT p.id FROM Payment p WHERE p.booking = b AND p.status = SUCCESS AND p.refundStatus = NONE AND p.payDate BETWEEN :startDate AND :endDate)`.
* Khi đơn hàng có `finalAmount == 0L` (áp dụng voucher giảm 100%) được tự động chuyển sang `CONFIRMED` trong `BookingService.createBooking`, hệ thống chưa tạo bản ghi `Payment` tương ứng $\rightarrow$ Số vé miễn phí này không được đếm vào `totalTicketsSold` của báo cáo doanh thu.

#### 3. CÁC BƯỚC SỬA CHI TIẾT:

Trong `BookingService.java`:
1. Inject thêm `PaymentRepository paymentRepository` (nếu chưa có).
2. Trong method `createBooking`, ngay sau khi lưu `bookingItemRepository.saveAll(bookingItems)` (khoảng dòng `250`), nếu `finalAmount == 0L` thì khởi tạo và lưu một bản ghi `Payment` $0\text{ đ}$ ở trạng thái `SUCCESS`:

```java
        if (finalAmount == 0L) {
            Payment zeroPayment = Payment.builder()
                    .booking(savedBooking)
                    .provider(com.example.cinema.payment.enums.PaymentProvider.VNPAY)
                    .transactionRef("FREE-" + savedBooking.getBookingCode())
                    .transactionNo("VOUCHER_100_" + savedBooking.getId())
                    .amount(0L)
                    .status(com.example.cinema.payment.enums.PaymentStatus.SUCCESS)
                    .refundStatus(com.example.cinema.payment.enums.PaymentRefundStatus.NONE)
                    .responseCode("00")
                    .transactionStatus("00")
                    .payDate(now)
                    .build();
            paymentRepository.save(zeroPayment);
        }
```
3. Cập nhật `VoucherIntegrationTest`: Khẳng định rằng khi đặt đơn $0\text{ đ}$ thành công, không chỉ `booking.status == CONFIRMED` và ghế `BOOKED`, mà còn có đúng 1 bản ghi `Payment` với `amount == 0L`, `status == SUCCESS` được lưu trong DB.

---

### HP-04 — Chống Tràn Bộ Nhớ (Bounded Cache Eviction) Trong `LoginAttemptService` 🟡 MEDIUM

#### 1. ĐỌC TRƯỚC (BẮT BUỘC):
* `backend/src/main/java/com/example/cinema/auth/service/LoginAttemptService.java`
* `backend/src/test/java/com/example/cinema/auth/service/LoginAttemptServiceTest.java`

#### 2. PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ:
* `LoginAttemptService` hiện lưu các lần đăng nhập sai trong `ConcurrentHashMap<String, AttemptInfo>` mà không giới hạn kích thước tối đa. Nếu kẻ tấn công gửi hàng loạt request với email ngẫu nhiên, map sẽ tăng kích thước không giới hạn gây `OutOfMemoryError`.

#### 3. CÁC BƯỚC SỬA CHI TIẾT:

Cập nhật `LoginAttemptService.java` bổ sung hằng số `MAX_CACHE_SIZE = 10_000` và hàm `evictExpiredEntries(now)`:

```java
package com.example.cinema.auth.service;

import com.example.cinema.common.exception.AppException;
import com.example.cinema.common.exception.ErrorCode;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class LoginAttemptService {

    public static final int MAX_ATTEMPTS = 5;
    public static final long LOCK_DURATION_MS = 15 * 60 * 1000L; // 15 minutes
    public static final int MAX_CACHE_SIZE = 10_000;

    private final Map<String, AttemptInfo> attemptsCache = new ConcurrentHashMap<>();

    public void checkLoginAllowed(String email) {
        if (email == null) return;
        String key = email.trim().toLowerCase();
        AttemptInfo info = attemptsCache.get(key);

        if (info != null) {
            long now = System.currentTimeMillis();
            if (now - info.lastAttemptTime > LOCK_DURATION_MS) {
                attemptsCache.remove(key, info);
            } else if (info.count >= MAX_ATTEMPTS) {
                throw new AppException(ErrorCode.TOO_MANY_LOGIN_ATTEMPTS);
            }
        }
    }

    public void recordFailedAttempt(String email) {
        if (email == null) return;
        String key = email.trim().toLowerCase();
        long now = System.currentTimeMillis();

        if (attemptsCache.size() >= MAX_CACHE_SIZE) {
            evictExpiredEntries(now);
        }

        attemptsCache.compute(key, (k, current) -> {
            if (current == null || (now - current.lastAttemptTime > LOCK_DURATION_MS)) {
                return new AttemptInfo(1, now);
            } else {
                return new AttemptInfo(current.count + 1, now);
            }
        });
    }

    public void resetAttempts(String email) {
        if (email == null) return;
        attemptsCache.remove(email.trim().toLowerCase());
    }

    public int getFailedAttempts(String email) {
        if (email == null) return 0;
        AttemptInfo info = attemptsCache.get(email.trim().toLowerCase());
        if (info == null || (System.currentTimeMillis() - info.lastAttemptTime > LOCK_DURATION_MS)) {
            return 0;
        }
        return info.count;
    }

    private void evictExpiredEntries(long now) {
        attemptsCache.entrySet().removeIf(entry -> now - entry.getValue().lastAttemptTime > LOCK_DURATION_MS);
        if (attemptsCache.size() >= MAX_CACHE_SIZE) {
            attemptsCache.clear();
        }
    }

    private static class AttemptInfo {
        final int count;
        final long lastAttemptTime;

        AttemptInfo(int count, long lastAttemptTime) {
            this.count = count;
            this.lastAttemptTime = lastAttemptTime;
        }
    }
}
```

---

### HP-05 — Không Reset Bộ Đếm `setInterval` 8 Giây Khi Người Dùng Click Chọn Ghế Trong `useSeatMapPolling.js` 🟡 MEDIUM

#### 1. ĐỌC TRƯỚC (BẮT BUỘC):
* `frontend/src/hooks/useSeatMapPolling.js` (dòng `135–175`)
* `frontend/src/test/useSeatMapPolling.test.jsx`

#### 2. PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ:
* Trong hook `useSeatMapPolling`, `useEffect` khởi tạo và gọi `poller.start()` đang đặt `[showtimeId, intervalMs, enabled, onSeatsUpdated, onSeatUnavailable, selectedSeatIds]` vào mảng dependency.
* Mỗi lần khách hàng click chọn một ghế trên sơ đồ, mảng `selectedSeatIds` thay đổi $\rightarrow$ `useEffect` chạy cleanup `poller.stop()` và tạo lại `SeatMapPoller` mới, làm bộ đếm $8\text{ giây}$ bị reset về $0$.

#### 3. CÁC BƯỚC SỬA CHI TIẾT:

Trong `frontend/src/hooks/useSeatMapPolling.js`, tách riêng `useEffect` cập nhật options (`pollerRef.current.updateOptions(...)`) khỏi `useEffect` quản lý vòng đời `start()/stop()` của timer:

```javascript
export function useSeatMapPolling({
  showtimeId,
  intervalMs = 8000,
  enabled = true,
  onSeatsUpdated,
  onSeatUnavailable,
  selectedSeatIds = [],
}) {
  const pollerRef = useRef(null);
  const latestOptionsRef = useRef({
    onSeatsUpdated,
    onSeatUnavailable,
    selectedSeatIds,
  });

  useEffect(() => {
    latestOptionsRef.current = {
      onSeatsUpdated,
      onSeatUnavailable,
      selectedSeatIds,
    };
    if (pollerRef.current) {
      pollerRef.current.updateOptions({
        onSeatsUpdated,
        onSeatUnavailable,
        selectedSeatIds,
      });
    }
  }, [onSeatsUpdated, onSeatUnavailable, selectedSeatIds]);

  useEffect(() => {
    const poller = new SeatMapPoller({
      showtimeId,
      intervalMs,
      enabled,
      onSeatsUpdated: latestOptionsRef.current.onSeatsUpdated,
      onSeatUnavailable: latestOptionsRef.current.onSeatUnavailable,
      selectedSeatIds: latestOptionsRef.current.selectedSeatIds,
    });
    pollerRef.current = poller;
    poller.start();

    return () => {
      poller.stop();
      pollerRef.current = null;
    };
  }, [showtimeId, intervalMs, enabled]);

  const pollSeats = useCallback(() => {
    if (pollerRef.current) {
      return pollerRef.current.poll();
    }
  }, []);

  return { pollSeats };
}
```

---

### HP-06 — Bổ Sung Cờ Hủy (`Unmount Cancellation Guard`) Cho Vòng Lặp Backoff Trong `PaymentResult.jsx` 🟢 LOW

#### 1. ĐỌC TRƯỚC (BẮT BUỘC):
* `frontend/src/pages/PaymentResult.jsx` (dòng `85–185`)

#### 2. PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ:
* Khi đơn hàng đang ở trạng thái `PENDING_PAYMENT`, vòng lặp `for` chờ `2s, 4s, 8s, 16s` trong `verifyPaymentAndBooking` chưa kiểm tra xem component `PaymentResult` còn đang mount hay không. Nếu người dùng chuyển sang trang khác trong lúc đang chờ backoff, hàm vẫn tiếp tục gọi API và gọi `setState`.

#### 3. CÁC BƯỚC SỬA CHI TIẾT:

Trong `frontend/src/pages/PaymentResult.jsx`:
* Truyền tham số `signal = { cancelled: false }` vào `verifyPaymentAndBooking(signal)`.
* Trước và sau mỗi lệnh `await` (đặc biệt trong vòng lặp `for (let i = 0; i < delays.length; i++)`), kiểm tra `if (signal.cancelled) return;`.
* Trong `useEffect`, khởi tạo `const signal = { cancelled: false }; verifyPaymentAndBooking(signal);` và trả về cleanup `return () => { signal.cancelled = true; };`.

---

## 3. ĐỒNG BỘ HÓA TÀI LIỆU & KIỂM THỬ NGHIỆM THU CUỐI CÙNG

1. **Cập nhật tài liệu:**
   * Đánh dấu `DONE` toàn bộ `HP-01` $\rightarrow$ `HP-06` trong bảng Mục 1.2 của `docs/FINAL_AUDIT_AND_G4_PLAN.md`.
   * Ghi nhận đợt tinh chỉnh `HP-01` $\rightarrow$ `HP-06` vào `docs/CHANGELOG.md` và `docs/ROADMAP.md`.
2. **Chạy toàn bộ lệnh kiểm thử nghiệm thu:**
   * Backend: `cd backend && ./mvnw clean verify` (Đảm bảo toàn bộ 18+ test suites bao gồm Testcontainers Concurrency IT đều xanh 100%).
   * Frontend: `cd frontend && npm test -- --run && npm run lint && npm run build` (Đảm bảo 100% unit tests pass, 0 lỗi ESLint và build production thành công).