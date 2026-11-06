# KẾ HOẠCH HOÀN THIỆN CUỐI CÙNG (FINAL AUDIT FIXES & GROUP 4)

> **Dành cho:** Developer và AI Coding Assistant trên Antigravity.  
> **Cơ sở dữ liệu đối chiếu:** Mã nguồn thực tế trên nhánh `main` (`movie-theater-booking-system-main.zip`), `docs/SRS.md` (v3.3 $\rightarrow$ nâng lên v3.4), `docs/ROADMAP.md`.  
> **Mục tiêu:** Giải quyết triệt để lỗi CI đỏ (`1/2`), bổ sung các bài kiểm thử đồng thời còn thiếu trong `AF-07`, vá các kẽ hở bảo mật/tài nguyên nâng cao và hoàn thành nốt các tính năng `TODO` của **Nhóm 4 (`G4-03` $\rightarrow$ `G4-09`)** để dự án đạt chuẩn 100% đưa vào CV Fresher/Junior Java Backend.

---

## 1. BỨC TRANH TỔNG THỂ TRÊN NHÁNH `main` HIỆN TẠI

Qua quá trình quét toàn bộ cây thư mục trong `movie-theater-booking-system-main.zip`, dưới đây là trạng thái thực tế của dự án:

1. **Những phần đã hoàn thành rất tốt:**
   - Toàn bộ **Phase 0 (`R-01` $\rightarrow$ `R-10`)**, **Nhóm 2 (`G2-01` $\rightarrow$ `G2-06`)**, **Nhóm 3 (`G3-01` $\rightarrow$ `G3-03`)** đã được triển khai đầy đủ.
   - Các sửa đổi cốt lõi của **Audit Fixes (`AF-01` $\rightarrow$ `AF-17`)** đã có mặt trong code: `BookingService` đã khóa trước validate sau, `RoomService` đã dùng `repriceIfAvailable`, `ShowtimeService` đã hủy mềm và chặn hủy suất đã bắt đầu, bộ fixture JSON ghế lẻ đã đồng bộ giữa JUnit và Vitest.
2. **Những việc CẦN LÀM NGAY để dự án hoàn hảo 100% (Chia làm 2 nhóm):**
   - **Nhóm A — Khắc phục CI, Kiểm thử đồng thời còn thiếu & Vá kẽ hở kiến trúc (`FA-01` $\rightarrow$ `FA-04`):**
     * `FA-01`: Sửa `MovieTheaterBookingSystemApplicationTests.java` chưa kế thừa `AbstractMySqlIT` khiến GitHub Actions bị đỏ (`1/2`).
     * `FA-02`: Bổ sung 5 bài Integration Test đồng thời & khóa còn thiếu so với đặc tả `AF-07`/`AF-13` (trong code hiện mới có 4/8 bài test đồng thời).
     * `FA-03`: Chặn tài khoản bị khóa (`isActive = false`) tiếp tục sử dụng JWT cũ tại `JwtAuthenticationFilter` / `CustomUserDetailsService` và cấu hình Fail-Fast cho HikariCP (`connection-timeout: 10000`) kèm dọn dẹp cấu hình `G4-08`.
     * `FA-04`: Hoàn thiện `G4-03` — Tách danh sách Voucher công khai vs Admin, kiểm soát thứ tự khóa Voucher và xử lý đơn hàng $0\text{ đ}$ (`finalAmount == 0`) không cần qua cổng VNPay.
   - **Nhóm B — Hoàn thiện nốt các tính năng UX & Bảo mật của Nhóm 4 (`G4-04` $\rightarrow$ `G4-09`):**
     * `G4-04`: Tự động làm mới sơ đồ ghế (`useSeatMapPolling.js` mỗi $8\text{ giây}$).
     * `G4-05`: Lọc tham số `vnp_*` khi kiểm tra chữ ký VNPay và thêm trạng thái `processing` (Exponential Backoff polling) trên `PaymentResult.jsx`.
     * `G4-06`: Sửa luồng nút *"Modify Selected Seats"* tại `Payment.jsx` (tự động hủy đơn chờ hiện tại trước khi quay lại chọn ghế).
     * `G4-07`: Bảo mật đăng nhập (Rate limit/Throttle đăng nhập sai $5\text{ lần}/15\text{ phút}$ trả mã `1105`, mật khẩu $\ge 8$ ký tự, ghi chú rủi ro XSS của `localStorage` vào `README.md`).
     * `G4-09` (Phần còn lại): Giới hạn kích thước trang `@Max(100)` ở `MovieController` và thêm Migration `V4__payment_refund_audit.sql` lưu vết người hoàn tiền.

---

## 2. BẢNG THEO DÕI TRẠNG THÁI (MASTER CHECKLIST)

| Mã Task | Mức độ | Hạng mục công việc | Trạng thái |
|---|---|---|---|
| **FA-01** | 🔴 CRITICAL | Sửa `MovieTheaterBookingSystemApplicationTests` kế thừa `AbstractMySqlIT` để GitHub CI xanh `2/2` | `DONE` |
| **FA-02** | 🟠 HIGH | Bổ sung 5 bài test đồng thời còn thiếu (`PendingCapConcurrencyIT`, `VoucherLimitConcurrencyIT`, `IpnVsCancelShowtimeIT`, `CancelConfirmedVsCancelShowtimeIT`, `LockWaitTimeoutIT`) | `DONE` |
| **FA-03** | 🟠 HIGH | Kiểm tra `user.isActive` trong Security Filter, cấu hình Hikari `connection-timeout: 10000` & chuẩn hóa cấu hình (`G4-08`) | `TODO` |
| **FA-04** | 🟠 HIGH | `G4-03`: Tách API Voucher Public vs Admin, khóa Voucher cuối chuỗi và tự động xác nhận đơn $0\text{ đ}$ (`finalAmount == 0`) | `TODO` |
| **G4-04** | 🟡 MEDIUM | Tự động làm mới sơ đồ ghế định kỳ mỗi $8\text{ giây}$ (`useSeatMapPolling.js`) | `TODO` |
| **G4-05** | 🟡 MEDIUM | Lọc tham số `vnp_*` khi băm chữ ký VNPay & thêm trạng thái `processing` trên `PaymentResult.jsx` | `TODO` |
| **G4-06** | 🟡 MEDIUM | Luồng *"Modify Selected Seats"* hủy đơn `PENDING_PAYMENT` trước khi quay về trang chọn ghế | `TODO` |
| **G4-07** | 🟡 MEDIUM | Chống Brute-force đăng nhập ($5\text{ lần}/15\text{ phút}$, mã `1105`), mật khẩu $\ge 8$ ký tự & tài liệu hóa `D-06` | `TODO` |
| **G4-09** | 🟢 LOW | Giới hạn `size <= 100` ở `MovieController` & thêm `V4__payment_refund_audit.sql` lưu vết hoàn tiền | `TODO` |

---

## 3. HƯỚNG DẪN KỸ THUẬT CHI TIẾT TỪNG HẠNG MỤC

---

### FA-01 — Sửa `MovieTheaterBookingSystemApplicationTests` Để GitHub Actions Xanh `2/2` 🔴 CRITICAL

#### 1. ĐỌC TRƯỚC:
- `backend/src/test/java/com/example/cinema/MovieTheaterBookingSystemApplicationTests.java`
- `backend/src/test/java/com/example/cinema/common/AbstractMySqlIT.java`

#### 2. VẤN ĐỀ HIỆN TẠI:
Trong file zip hiện tại, `MovieTheaterBookingSystemApplicationTests` chỉ gắn `@SpringBootTest` và `@ActiveProfiles("test")` mà **không kế thừa `AbstractMySqlIT`**. Khi chạy `./mvnw -B verify` trên GitHub Actions (môi trường Ubuntu không có MySQL cài sẵn ở cổng `3306`), bài test này cố kết nối vào `localhost:3306` và bị lỗi `Connection refused`, làm gãy pipeline Backend.

#### 3. CÁCH SỬA CHI TIẾT:
Sửa toàn bộ file `backend/src/test/java/com/example/cinema/MovieTheaterBookingSystemApplicationTests.java` thành:
```java
package com.example.cinema;

import com.example.cinema.common.AbstractMySqlIT;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class MovieTheaterBookingSystemApplicationTests extends AbstractMySqlIT {

    @Test
    void contextLoads() {
    }
}
```

#### 4. TIÊU CHÍ NGHIỆM THU:
- Chạy `./mvnw test -Dtest=MovieTheaterBookingSystemApplicationTests` khởi động qua Testcontainers thành công.
- Sau khi push lên GitHub, mục Check status của nhánh `main` hiển thị tích xanh `2 / 2`.

---

### FA-02 — Bổ Sung 5 Bài Kiểm Thử Đồng Thời & Khóa Còn Thiếu (`AF-07`, `AF-13`, `G4-10`) 🟠 HIGH

#### 1. ĐỌC TRƯỚC:
- `backend/src/test/java/com/example/cinema/common/AbstractMySqlIT.java`
- `backend/src/test/java/com/example/cinema/common/ConcurrencyTestSupport.java`
- `backend/src/test/java/com/example/cinema/booking/SeatHoldingConcurrencyIT.java`
- `backend/src/main/java/com/example/cinema/payment/service/PaymentService.java`
- `backend/src/main/java/com/example/cinema/showtime/service/ShowtimeService.java`

#### 2. VẤN ĐỀ HIỆN TẠI:
Trong `docs/AUDIT_FIXES.md` (mục `AF-07` và `AF-13`) và `docs/ROADMAP.md` (`G4-10`) yêu cầu 8 bài kiểm thử đồng thời và 1 bài kiểm thử thời gian chờ khóa $\le 5\text{ giây}$, nhưng trong thư mục `backend/src/test` hiện mới chỉ có 4 file (`SeatHoldingConcurrencyIT`, `OrphanSeatConcurrencyIT`, `SeatTypeChangeVsHoldIT`, `ShowtimeVsDiscontinueIT`). Còn thiếu 5 bài kiểm thử quan trọng để bảo vệ các bất biến hệ thống.

#### 3. CÁCH SỬA CHI TIẾT:
Tạo bổ sung 5 class kiểm thử kế thừa `AbstractMySqlIT` (không gắn `@Transactional` ở cấp class, tự dọn dẹp dữ liệu trong `@AfterEach`):

1. **`backend/src/test/java/com/example/cinema/booking/PendingCapConcurrencyIT.java`:**
   - **Kịch bản:** 1 tài khoản khách hàng gửi đồng thời $10$ request `createBooking` (mỗi request chọn 1 ghế khác nhau trên cùng suất chiếu).
   - **Khẳng định (Assert):** Chỉ đúng `maxPendingPerUser` ($2$) đơn được tạo thành công ở trạng thái `PENDING_PAYMENT`; $8$ request còn lại nhận `AppException` với `ErrorCode.TOO_MANY_PENDING_BOOKINGS` (`1507`).
2. **`backend/src/test/java/com/example/cinema/voucher/VoucherLimitConcurrencyIT.java`:**
   - **Kịch bản:** Tạo 1 Voucher có `usageLimit = 3`, `perUserLimit = 1`. Cho $15$ khách hàng khác nhau cùng gửi request `createBooking` áp dụng mã voucher đó tại cùng một thời điểm.
   - **Khẳng định:** Đúng $3$ đơn đặt vé thành công, $12$ đơn nhận lỗi hết lượt voucher; trong DB `reserved_count` của voucher bằng đúng $3$ (không bao giờ vượt quá `usageLimit`).
3. **`backend/src/test/java/com/example/cinema/payment/IpnVsCancelShowtimeIT.java`:**
   - **Kịch bản:** Đơn đặt vé đang ở trạng thái `PENDING_PAYMENT` và đã có bản ghi `Payment` (`PENDING`). Luồng 1 gọi `paymentService.processVnPayIpn(...)` (báo thanh toán thành công `00`) chạy song song cùng lúc với Luồng 2 gọi `showtimeService.cancelShowtime(...)`.
   - **Khẳng định bất biến sau khi cả 2 luồng kết thúc:**
     * Suất chiếu có trạng thái `CANCELLED`, toàn bộ ghế của suất chiếu có trạng thái `AVAILABLE` (`held_by_booking_id == null`).
     * Đơn hàng có trạng thái `CANCELLED`.
     * Nếu giao dịch `Payment` có trạng thái `SUCCESS`, thì trường `refundStatus` **bắt buộc phải là `REFUND_REQUIRED`** (tuyệt đối không được tồn tại đơn `CANCELLED` mà `Payment` là `SUCCESS` kèm `refundStatus == NONE`).
4. **`backend/src/test/java/com/example/cinema/booking/CancelConfirmedVsCancelShowtimeIT.java`:**
   - **Kịch bản:** Đơn đặt vé đã `CONFIRMED` và có áp dụng Voucher (`used_count = 1`, redemption `USED`). Luồng 1 (Khách) gọi `bookingService.cancelConfirmedBooking(...)` chạy đua cùng lúc với Luồng 2 (Admin) gọi `showtimeService.cancelShowtime(...)`.
   - **Khẳng định:** Không phát sinh Deadlock không xử lý được; sau khi kết thúc, đơn ở trạng thái `CANCELLED`, ghế về `AVAILABLE`, `Payment` ở trạng thái `REFUND_REQUIRED`, và `used_count` của Voucher giảm về đúng $0$ (chỉ hoàn 1 lần duy nhất, không bị trừ âm hay hoàn 2 lần).
5. **`backend/src/test/java/com/example/cinema/common/LockWaitTimeoutIT.java` (`AF-13`):**
   - **Kịch bản:** Luồng 1 dùng `TransactionTemplate` mở một transaction, gọi `userRepository.findByEmailForUpdate(email)` và giữ khóa bằng `Thread.sleep(7000)`. Luồng 2 (khởi chạy sau 200ms) gọi `userRepository.findByEmailForUpdate(email)` và đo thời gian chờ bằng `System.nanoTime()`.
   - **Khẳng định:** Luồng 2 bị ném ngoại lệ khóa (`PessimisticLockingFailureException` / `CannotAcquireLockException`) trong khoảng thời gian từ $3\text{ giây}$ đến $\le 6.5\text{ giây}$ (chứng minh cấu hình `innodb_lock_wait_timeout = 5` hoạt động thực tế trên MySQL 8).

---

### FA-03 — Bảo Vệ Tài Khoản Bị Khóa (`isActive = false`) & Chuẩn Hóa Hạ Tầng (`G4-08`) 🟠 HIGH

#### 1. ĐỌC TRƯỚC:
- `backend/src/main/java/com/example/cinema/auth/security/CustomUserDetailsService.java`
- `backend/src/main/java/com/example/cinema/auth/security/UserPrincipal.java`
- `backend/src/main/java/com/example/cinema/auth/security/JwtAuthenticationFilter.java`
- `backend/src/main/java/com/example/cinema/booking/service/BookingService.java`
- `backend/src/main/java/com/example/cinema/common/config/AppConfig.java`
- `backend/src/main/resources/application.yaml`

#### 2. VẤN ĐỀ HIỆN TẠI:
1. Nếu một tài khoản đang có sẵn JWT còn hạn nhưng bị Admin khóa (`users.is_active = false`), cần đảm bảo `UserPrincipal.isEnabled()` trả về `Boolean.TRUE.equals(user.getIsActive())` và `JwtAuthenticationFilter` chỉ xác thực khi `userDetails.isEnabled() == true`, đồng thời trong `BookingService.createBooking` sau khi khóa `findByEmailForUpdate` cần kiểm tra `!Boolean.TRUE.equals(user.getIsActive())` để chặn đặt vé ngay lập tức.
2. Trong `application.yaml`, HikariCP đã có `connection-init-sql: SET SESSION innodb_lock_wait_timeout = 5`, nhưng chưa đặt `connection-timeout: 10000` (mặc định 30 giây sẽ làm treo request lâu nếu pool cạn).
3. Kiểm tra `AppConfig.java` và `TimeZoneConfig.java` theo đúng yêu cầu `G4-08`: Đảm bảo `ObjectMapper` có đăng ký `JavaTimeModule` và tắt `WRITE_DATES_AS_TIMESTAMPS` (hoặc dùng `Jackson2ObjectMapperBuilder` của Spring Boot) để không làm hỏng định dạng ISO `LocalDateTime`, và cấu hình `spring.jackson.time-zone: Asia/Ho_Chi_Minh` trong `application.yaml`.

#### 3. CÁCH SỬA CHI TIẾT:
1. **Trong `UserPrincipal.java` và `JwtAuthenticationFilter.java`:**
   - Đảm bảo `isEnabled()` trả về `Boolean.TRUE.equals(user.getIsActive())`.
   - Trong `JwtAuthenticationFilter`: Nếu `!userDetails.isEnabled()`, không gán vào `SecurityContextHolder` (để Spring Security từ chối với mã `401`/`403`).
2. **Trong `BookingService.createBooking`:**
   - Ngay sau dòng `User user = userRepository.findByEmailForUpdate(userEmail)...`, thêm kiểm tra:
     ```java
     if (!Boolean.TRUE.equals(user.getIsActive())) {
         throw new AppException(ErrorCode.USER_INACTIVE); // Hoặc UNAUTHORIZED (1003)
     }
     ```
3. **Trong `application.yaml` và `application-test.yaml`:**
   ```yaml
   spring:
     jackson:
       time-zone: Asia/Ho_Chi_Minh
     datasource:
       hikari:
         connection-timeout: 10000
         connection-init-sql: SET SESSION innodb_lock_wait_timeout = 5
   ```

---

### FA-04 (`G4-03`) — Voucher Công Khai vs Admin, Khóa Voucher Chuẩn & Đơn Hàng $0\text{ đ}$ 🟠 HIGH

#### 1. ĐỌC TRƯỚC:
- `backend/src/main/java/com/example/cinema/voucher/controller/VoucherController.java`
- `backend/src/main/java/com/example/cinema/voucher/service/VoucherService.java`
- `backend/src/main/java/com/example/cinema/voucher/repository/VoucherRepository.java`
- `backend/src/main/java/com/example/cinema/auth/security/SecurityConfig.java`
- `backend/src/main/java/com/example/cinema/booking/service/BookingService.java`
- `frontend/src/api/adminApi.js`, `frontend/src/pages/AdminDashboard.jsx`, `frontend/src/pages/SeatSelection.jsx`

#### 2. VẤN ĐỀ HIỆN TẠI:
1. Endpoint công khai `GET /api/v1/vouchers` hiện đang trả về tất cả các voucher (bao gồm cả voucher đã tắt `isActive = false`, đã hết hạn, hoặc đã hết sạch lượt sử dụng) và lộ số liệu quản trị.
2. Khi khách hàng áp dụng một mã giảm giá cố định lớn khiến tổng tiền thanh toán cuối cùng bằng $0\text{ đ}$ (`finalAmount == 0`), cổng thanh toán VNPay không chấp nhận giao dịch $0\text{ đ}$, khiến khách không thể hoàn tất đơn vé miễn phí 100%.

#### 3. CÁCH SỬA CHI TIẾT:
1. **Tách danh sách Voucher công khai và Admin:**
   - Trong `VoucherService`:
     * `getPublicVouchers()`: Chỉ trả về các voucher thỏa mãn `isActive = true`, `startAt <= now`, `endAt >= now`, và `(reservedCount + usedCount) < usageLimit`.
     * `getAllVouchersForAdmin()`: Trả về toàn bộ danh sách voucher cho trang quản trị.
   - Trong `VoucherController`:
     * `GET /api/v1/vouchers` gọi `getPublicVouchers()`.
     * Thêm `GET /api/v1/vouchers/admin` (yêu cầu quyền `ADMIN` trong `SecurityConfig`) gọi `getAllVouchersForAdmin()`.
   - Trong `frontend/src/api/adminApi.js`: Đổi đường dẫn lấy danh sách voucher của Admin sang `/vouchers/admin`.
2. **Xử lý đơn hàng $0\text{ đ}$ (`finalAmount == 0`) trong `BookingService.createBooking`:**
   - Tuân thủ đúng thứ tự khóa: `users` $\rightarrow$ `showtimes` $\rightarrow$ `bookings` $\rightarrow$ `showtime_seats` $\rightarrow$ `vouchers`.
   - Sau khi tính `finalAmount = subtotalAmount - discountAmount`:
     * **Trường hợp `finalAmount > 0` (Thông thường):** Giữ nguyên trạng thái đơn là `PENDING_PAYMENT`, ghế là `HELD`, voucher redemption là `RESERVED`.
     * **Trường hợp `finalAmount == 0` (Miễn phí 100%):** Xác nhận đơn ngay lập tức trong cùng transaction:
       - Đặt `booking.setStatus(BookingStatus.CONFIRMED)`.
       - Đặt toàn bộ ghế được chọn sang `ShowtimeSeatStatus.BOOKED` (`heldByBookingId = booking.getId()`).
       - Gọi `voucherService.confirmVoucherIfPresent(booking)` để chuyển redemption từ `RESERVED` $\rightarrow$ `USED` (giảm `reservedCount`, tăng `usedCount`).
   - Trên Frontend (`SeatSelection.jsx` / `Payment.jsx`): Nếu `booking.status === 'CONFIRMED'` (hoặc `booking.finalAmount === 0`), chuyển thẳng người dùng tới trang `/my-bookings` kèm thông báo *"Đặt vé thành công (Miễn phí 100%)"* thay vì gọi tạo URL VNPay.

#### 4. KIỂM THỬ & NGHIỆM THU:
- Viết test trong `voucher` / `booking`:
  * `GET /api/v1/vouchers` ẩn các voucher `isActive = false`, hết hạn hoặc hết lượt; `GET /api/v1/vouchers/admin` trả đầy đủ cho Admin.
  * Tạo booking áp dụng voucher giảm 100% (`finalAmount == 0`) $\rightarrow$ Booking chuyển thẳng sang `CONFIRMED`, ghế chuyển sang `BOOKED`, voucher chuyển sang `USED`.

---

### G4-04 — Sơ Đồ Ghế Tự Làm Mới Định Kỳ (`useSeatMapPolling.js`) 🟡 MEDIUM

#### 1. ĐỌC TRƯỚC:
- `frontend/src/pages/SeatSelection.jsx`
- `frontend/src/api/movieApi.js` (hoặc nơi gọi `getShowtimeSeats`)

#### 2. YÊU CẦU KỸ THUẬT:
Khi nhiều khách hàng cùng đang mở màn hình chọn ghế của một suất chiếu, sơ đồ ghế cần tự động cập nhật mỗi $8\text{ giây}$ để hiển thị các ghế vừa bị người khác đặt mà không cần F5 trang.

#### 3. CÁCH SỬA CHI TIẾT:
1. Tạo custom hook `frontend/src/hooks/useSeatMapPolling.js`:
   - Nhận vào `(showtimeId, enabled = true, intervalMs = 8000, onSeatsUpdated)`.
   - Thiết lập bộ đếm `setInterval` mỗi `intervalMs` ($8000\text{ ms}$).
   - Lắng nghe sự kiện `visibilitychange` của `document`: Nếu `document.hidden === true` (người dùng chuyển sang tab khác), tạm dừng gọi API để tiết kiệm tài nguyên cho Server; khi quay lại tab thì làm mới ngay.
   - Nếu request polling gặp lỗi mạng tạm thời, giữ nguyên dữ liệu sơ đồ ghế hiện tại (không xóa trắng màn hình).
   - Dọn dẹp `clearInterval` và `removeEventListener` khi component unmount.
2. Tích hợp vào `frontend/src/pages/SeatSelection.jsx`:
   - Khi nhận được danh sách ghế mới từ hook polling:
     * Kiểm tra các ghế trong mảng `selectedSeats` hiện tại của người dùng.
     * Nếu bất kỳ ghế nào đang chọn mà trên dữ liệu mới đã chuyển sang `status !== 'AVAILABLE'` hoặc `selectable === false` (tức vừa bị người khác nhanh tay giữ trước):
       - Tự động loại bỏ ghế đó (và ghế đối tác nếu là ghế đôi `COUPLE`) khỏi `selectedSeats`.
       - Hiển thị thông báo toast rõ ràng: *"Ghế [Tên ghế] vừa được khách hàng khác đặt!"*.
3. **Test (`frontend/src/test/seatPolling.test.js`):**
   - Dùng `vi.useFakeTimers()` trong Vitest kiểm chứng: gọi lại sau $8\text{ giây}$, tạm dừng khi `document.hidden = true`, và tự động bỏ chọn ghế khi ghế đó đổi sang `HELD`.

---

### G4-05 — Lọc Tham Số `vnp_*` Khi Kiểm Tra Chữ Ký & Trạng Thái `processing` Trên `PaymentResult.jsx` 🟡 MEDIUM

#### 1. ĐỌC TRƯỚC:
- `backend/src/main/java/com/example/cinema/payment/config/VnPayUtil.java`
- `backend/src/main/java/com/example/cinema/payment/service/PaymentService.java`
- `frontend/src/pages/PaymentResult.jsx`

#### 2. VẤN ĐỀ HIỆN TẠI:
1. Trong `VnPayUtil.verifySignature`, nếu trình duyệt hoặc reverse proxy gắn thêm các query param ngoài luồng (ví dụ `utm_source`, `fbclid`) vào Return URL, việc đưa cả các param không bắt đầu bằng `vnp_` vào chuỗi băm HMAC-SHA512 sẽ làm sai lệch chữ ký.
2. Khi khách thanh toán xong trên VNPay và được redirect về `PaymentResult.jsx`, đôi khi bản tin Server-to-Server IPN đến chậm hơn vài giây so với trình duyệt redirect (đơn hàng vẫn đang `PENDING_PAYMENT`). Cần hiển thị trạng thái *"Đang xác nhận giao dịch..."* và tự động hỏi lại (polling với backoff) thay vì báo lỗi hoặc bắt người dùng tự tải lại trang.

#### 3. CÁCH SỬA CHI TIẾT:
1. **Phía Backend (`VnPayUtil.java`):**
   - Khi lọc danh sách tham số để tạo chuỗi dữ liệu kiểm tra chữ ký (`verifySignature` / `hashAllFields`), chỉ lấy các key có `key != null && key.startsWith("vnp_")` (và loại trừ `vnp_SecureHash`, `vnp_SecureHashType`).
2. **Phía Frontend (`PaymentResult.jsx`):**
   - Hỗ trợ 3 trạng thái giao diện: `success`, `processing`, `failed`.
   - Nếu VNPay Return trả về `vnp_ResponseCode === '00'` nhưng trạng thái đơn hàng trong DB vẫn đang là `PENDING_PAYMENT`:
     * Chuyển giao diện sang trạng thái `processing` (*"Đã nhận thông tin thanh toán, hệ thống đang xác nhận ghế của bạn..."*).
     * Thực hiện polling kiểm tra trạng thái đơn hàng theo chiến thuật **Exponential Backoff** (ví dụ: sau $2\text{s}, 4\text{s}, 8\text{s}, 16\text{s}$ — tối đa khoảng $30\text{ giây}$) kèm nút bấm *"Kiểm tra lại ngay"*.
     * Ngay khi đơn chuyển sang `CONFIRMED`, lập tức đổi giao diện sang `success`.
3. **Test:**
   - JUnit test cho `VnPayUtil`: Truyền thêm tham số `utm_source=test` vào map params $\rightarrow$ Chữ ký `vnp_SecureHash` vẫn hợp lệ 100%.
   - Vitest test cho `PaymentResult`: Kiểm chứng trạng thái `processing`.

---

### G4-06 — Luồng "Modify Selected Seats" Giải Phóng Đơn Chờ Hiện Tại 🟡 MEDIUM

#### 1. ĐỌC TRƯỚC:
- `frontend/src/pages/Payment.jsx`
- `frontend/src/pages/SeatSelection.jsx`
- `frontend/src/api/bookingApi.js`

#### 2. VẤN ĐỀ HIỆN TẠI:
Tại trang `Payment.jsx`, khi khách hàng đang có một đơn giữ ghế (`PENDING_PAYMENT`) và bấm nút *"Modify Selected Seats"* (Đổi ghế) để quay lại trang `SeatSelection.jsx`, đơn hàng cũ chưa được hủy nên các ghế khách vừa chọn vẫn đang bị khóa ở trạng thái `HELD` trong 10 phút $\rightarrow$ Khách không thể chọn lại chính các ghế đó và còn bị tốn 1 lượt trong hạn mức `maxPendingPerUser = 2`.

#### 3. CÁCH SỬA CHI TIẾT:
- Trong `Payment.jsx`, tại hàm xử lý sự kiện bấm nút *"Modify Selected Seats"*:
  1. Nếu đơn hàng hiện tại đang ở trạng thái `PENDING_PAYMENT`, gọi `await bookingApi.cancelBooking(booking.id)` để giải phóng ngay các ghế đang giữ về `AVAILABLE` và hủy đơn nháp hiện tại.
  2. Sau đó điều hướng (`navigate`) người dùng quay lại `/showtimes/${booking.showtimeId}/seats` (hoặc đường dẫn chọn ghế tương ứng của suất chiếu đó).
- Cập nhật mục `FR-BOOK-02` trong `docs/SRS.md` ghi rõ hành vi hủy đơn nháp khi khách chủ động bấm đổi ghế.

---

### G4-07 — Bảo Mật Đăng Nhập (Rate Limiting / Throttle & Độ Dài Mật Khẩu) 🟡 MEDIUM

#### 1. ĐỌC TRƯỚC:
- `backend/src/main/java/com/example/cinema/auth/service/AuthService.java`
- `backend/src/main/java/com/example/cinema/auth/dto/request/RegisterRequest.java`
- `backend/src/main/java/com/example/cinema/common/exception/ErrorCode.java`
- `frontend/src/pages/Register.jsx`, `frontend/src/pages/Login.jsx`
- `README.md`

#### 2. CÁCH SỬA CHI TIẾT:
1. **Trong `ErrorCode.java`:**
   - Thêm mã lỗi:
     ```java
     TOO_MANY_LOGIN_ATTEMPTS(1105, "Too many failed login attempts. Please try again in 15 minutes", HttpStatus.TOO_MANY_REQUESTS),
     ```
2. **Tạo component `LoginAttemptService.java` (trong package `auth/component` hoặc `auth/security`):**
   - Sử dụng `ConcurrentHashMap<String, AttemptRecord>` lưu số lần đăng nhập sai và thời điểm mở khóa theo `email.toLowerCase()` (kèm cơ chế tự xóa các bản ghi đã hết hạn $15\text{ phút}$ để chống rò rỉ bộ nhớ).
   - Cấu hình ngưỡng qua `AuthProperties` (mặc định: tối đa $5\text{ lần sai}$ trong cửa sổ $15\text{ phút}$).
   - Trong `AuthService.login`:
     * Trước khi xác thực: Kiểm tra `loginAttemptService.checkNotLocked(email)`. Nếu đã vượt ngưỡng $\rightarrow$ ném `new AppException(ErrorCode.TOO_MANY_LOGIN_ATTEMPTS)` (`1105`, HTTP `429`).
     * Nếu sai mật khẩu: Gọi `loginAttemptService.recordFailedAttempt(email)` rồi ném lỗi xác thực.
     * Nếu đăng nhập thành công: Gọi `loginAttemptService.resetAttempts(email)`.
3. **Độ dài mật khẩu tối thiểu $\ge 8$ ký tự:**
   - Trong `RegisterRequest.java`: Đặt `@Size(min = 8, max = 100, message = "Password must be at least 8 characters")`.
   - Trong `frontend/src/pages/Register.jsx`: Đồng bộ kiểm tra mật khẩu tối thiểu $8$ ký tự.
4. **Tài liệu hóa Quyết định `D-06` trong `README.md`:**
   - Thêm mục nhỏ *"Security Notes (JWT Storage - D-06)"* giải thích rõ: Hệ thống hiện lưu JWT trong `localStorage` để đơn giản hóa kiến trúc SPA demo, kèm ghi nhận rủi ro XSS và hướng nâng cấp lên `HttpOnly SameSite=Strict Cookie` trong môi trường Production.

#### 3. KIỂM THỬ & NGHIỆM THU:
- Viết Integration / Unit Test: Đăng nhập sai liên tiếp $5$ lần $\rightarrow$ Lần thứ $6$ (kể cả nhập đúng mật khẩu) nhận HTTP `429` với mã lỗi `1105`. Đăng nhập đúng trước lần thứ $5$ sẽ reset bộ đếm về $0$.

---

### G4-09 (Phần còn lại) — Giới Hạn Phân Trang & Lưu Vết Hoàn Tiền (`V4__payment_refund_audit.sql`) 🟢 LOW

#### 1. ĐỌC TRƯỚC:
- `backend/src/main/java/com/example/cinema/movie/controller/MovieController.java`
- `backend/src/main/java/com/example/cinema/payment/entity/Payment.java`
- `backend/src/main/java/com/example/cinema/payment/service/PaymentService.java` (`confirmManualRefund`)
- `backend/src/main/java/com/example/cinema/payment/dto/response/PaymentResponse.java`
- `frontend/src/pages/AdminDashboard.jsx`

#### 2. CÁCH SỬA CHI TIẾT:
1. **Trong `MovieController.java`:**
   - Đổi giới hạn tham số phân trang `size` từ `@Max(1000)` xuống `@Max(100)` để tránh client gửi request kéo sập bộ nhớ. Kiểm tra các lời gọi `getMovies` ở Frontend đảm bảo truyền `size <= 100`.
2. **Tạo Migration `backend/src/main/resources/db/migration/V4__payment_refund_audit.sql`:**
   ```sql
   ALTER TABLE payments
       ADD COLUMN refunded_at DATETIME NULL,
       ADD COLUMN refunded_by VARCHAR(150) NULL,
       ADD COLUMN refund_note VARCHAR(255) NULL;
   ```
3. **Cập nhật `Payment.java`, `PaymentService.confirmManualRefund`, `PaymentResponse.java`:**
   - Khi Admin bấm xác nhận đã hoàn tiền thủ công (`confirmManualRefund`), ghi nhận:
     * `payment.setRefundedAt(LocalDateTime.now())`
     * `payment.setRefundedBy(adminEmail)` (lấy từ `SecurityContextHolder`)
     * `payment.setRefundNote(note)` (nếu có)
   - Trả 3 trường này ra `PaymentResponse` và hiển thị trên bảng lịch sử giao dịch ở `AdminDashboard.jsx`.

---

## 4. CẬP NHẬT & ĐỒNG BỘ TÀI LIỆU CUỐI CÙNG (`G4-11`)

Sau khi hoàn thành các task trên:
1. Cập nhật `docs/SRS.md` lên **Phiên bản 3.4**:
   - Bổ sung quy tắc đơn $0\text{ đ}$ vào `FR-VOUC-01` / `FR-PAY-01`.
   - Bổ sung làm mới sơ đồ ghế `G4-04` vào `FR-BOOK-01` và luồng đổi ghế `G4-06` vào `FR-BOOK-02`.
   - Bổ sung giới hạn đăng nhập sai ($5\text{ lần}/15\text{ phút}$, mã `1105`) và mật khẩu $\ge 8$ ký tự vào `NFR-SEC-01`.
   - Bổ sung 3 cột audit hoàn tiền (`refunded_at`, `refunded_by`, `refund_note`) vào Từ điển dữ liệu Bảng 16 (`payments`).
   - Cập nhật Mục 7.3: Đánh dấu hoàn thành đầy đủ bộ Integration Test `IT-01` $\rightarrow$ `IT-04`.
2. Cập nhật `docs/ROADMAP.md`: Chuyển toàn bộ các task `G4-03` $\rightarrow$ `G4-11` sang trạng thái `DONE`.
3. Cập nhật `docs/CHANGELOG.md` và `README.md` đồng bộ với phiên bản **SRS v3.4**.