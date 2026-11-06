# AUDIT FIXES — KẾ HOẠCH SỬA LỖI TOÀN DIỆN SAU ĐỢT KIỂM TRA (PHASE 0, G2, G3)

> **Dành cho:** Developer và AI Coding Assistant trên Antigravity.  
> **Tài liệu tham chiếu bắt buộc:** `.antigravityrules` (hoặc `WORKSPACE_RULES`), `docs/SRS.md` (hiện tại v3.2 $\rightarrow$ nâng lên v3.3), `docs/ROADMAP.md`.  
> **Phạm vi:** 17 hạng mục khắc phục (`AF-01` đến `AF-17`) được phân loại theo mức độ nghiêm trọng từ `CRITICAL` đến `LOW`.

---

## 0. QUY TRÌNH LÀM VIỆC BẮT BUỘC VỚI AI (MANDATORY WORKFLOW)

1. **Thứ tự đọc tài liệu:** Đọc `.antigravityrules` $\rightarrow$ `docs/SRS.md` $\rightarrow$ `docs/ROADMAP.md` $\rightarrow$ `docs/AUDIT_FIXES.md` (Mục 0, 1, 2, 3 và mục chi tiết của task đang làm).
2. **Làm từng task (hoặc cụm task theo Đợt ở Mục 3):** Không gộp bừa bãi nhiều task không liên quan vào cùng một lần sửa.
3. **Đọc kỹ file trước khi sửa:** Mở tất cả các file liệt kê trong mục **"ĐỌC TRƯỚC"** của từng task. Nếu mã nguồn thực tế khác với mô tả, phải dừng lại và báo cáo ngay.
4. **Nguyên tắc TDD cho lỗi đồng thời (Concurrency TDD):** Với các lỗi Race Condition / Isolation (`AF-01`, `AF-03`, `AF-10`), bắt buộc thiết lập hạ tầng test (`AF-07`) và viết bài test tái hiện lỗi trước (xác nhận test ĐỎ), sau đó mới sửa code và chạy lại để xác nhận test XANH.
5. **Đồng bộ tài liệu tức thì:** Mỗi thay đổi về hành vi hệ thống phải được cập nhật ngay vào `docs/SRS.md` (theo bảng ở Mục 5), nâng phiên bản SRS, đánh dấu `DONE` vào bảng Mục 1 của file này và ghi 1 dòng vào `docs/CHANGELOG.md`.
6. **Bất biến hệ thống (TUYỆT ĐỐI KHÔNG ĐƯỢC PHÁ VỠ):**
   - **Thứ tự khóa chống Deadlock (Luồng khách đặt/hủy vé):** `users` $\rightarrow$ `showtimes` $\rightarrow$ `bookings` (`ORDER BY id ASC`) $\rightarrow$ `showtime_seats` (`ORDER BY id ASC`, trong **một** câu lệnh duy nhất) $\rightarrow$ `vouchers`.
   - **Thứ tự khóa chống Deadlock (Luồng Admin):** `movies` (`S`/`X`) $\rightarrow$ `rooms` (`X`) $\rightarrow$ `showtimes`.
   - **Giá vé do Server quyết định:** Giá từng ghế đóng băng tại thời điểm tạo suất chiếu (`showtime_seats.price`); Client chỉ hiển thị, không tự tính số tiền.
   - **Không xóa cứng (No Hard Delete):** Tuyệt đối không dùng lệnh `DELETE` vật lý với phim, phòng, ghế, suất chiếu, hóa đơn.
   - **Không chứa Secret trong Repository:** Mọi mật khẩu, khóa bí mật phải đọc từ biến môi trường / `.env`.
   - **Không Hardcode tham số nghiệp vụ:** Thời gian giữ ghế, thời gian dọn phòng, chu kỳ quét đơn hết hạn phải nằm trong `@ConfigurationProperties`.

---

## 1. BẢNG TỔNG HỢP TRẠNG THÁI 17 TASK (MASTER STATUS TABLE)

| ID | Mức độ | Tên Task & Tóm tắt Vấn đề | Quyết định | Trạng thái |
|---|---|---|---|---|
| **AF-01** | 🔴 CRITICAL | `createBooking`: Lỗi nạp `ShowtimeSeat` vào Hibernate L1 Cache trước khi khóa `FOR UPDATE` gây đọc dữ liệu cũ (stale snapshot); cần khóa toàn bộ ghế trong hàng trước rồi mới validate ghế đôi & ghế lẻ. | — | `DONE` |
| **AF-02** | 🔴 CRITICAL | `run-backend.bat` đang chứa cứng `JWT_SECRET`, `BOOTSTRAP_ADMIN_PASSWORD` và cấu hình DB trực tiếp trong file script được quản lý bởi Git. | — | `DONE` |
| **AF-03** | 🟠 HIGH | `RoomService.batchUpdateSeats`: Gọi `ss.setPrice(...)` + `saveAll()` không khóa dòng, khiến Hibernate ghi đè toàn bộ cột (`status=AVAILABLE`, `held_by_booking_id=null`) lên ghế khách vừa giữ (`HELD`). | — | `DONE` |
| **AF-04** | 🟠 HIGH | Kiểm tra tính hợp lệ của `pairGroup` khi cập nhật ghế và chặn bán ghế `COUPLE` bị thiếu `pairGroup` (xóa bỏ logic tự ghép chẵn/lẻ dự phòng). | D-07 | `DONE` |
| **AF-05** | 🟠 HIGH | Logic kiểm tra ghế lẻ (Orphan Seat) bị lệch giữa Client (`isActive`) và Server (`status` thô trước khi thu hồi đơn hết hạn); cần chuẩn hóa và dùng chung bộ test fixture JSON. | — | `DONE` |
| **AF-06** | 🟠 HIGH | `cancelShowtime`: Xóa cứng suất chiếu khi chưa có đơn vé (vi phạm bất biến Soft Delete) và chưa chặn hủy các suất chiếu đã/đang diễn ra (`startTime <= now`). | D-08 | `DONE` |
| **AF-07** | 🟠 HIGH | Thiếu kiểm thử đồng thời (Concurrency IT) trên MySQL thật (Testcontainers) và CI đang bỏ qua test backend (`-DskipTests`). | — | `DONE` |
| **AF-08** | 🟡 MEDIUM | Đưa toàn bộ tham số nghiệp vụ còn hardcode (`SEAT_HOLD_MINUTES=10`, `plusMinutes(15)`, chu kỳ scheduler, giá trong enum `SeatType`) ra `@ConfigurationProperties`. | D-09 | `TODO` |
| **AF-09** | 🟡 MEDIUM | Giá hiển thị trên sơ đồ ghế bị tính lại theo cấu hình hiện tại thay vì lấy giá đã đóng băng trong `showtime_seats`; Client còn hardcode nhãn phụ thu (`+15k`, `-10k`). | — | `TODO` |
| **AF-10** | 🟡 MEDIUM | Race condition giữa luồng Admin tạo suất chiếu mới và luồng ngừng chiếu phim (`ENDED`) hoặc tắt phòng chiếu (`isActive=false`). | — | `DONE` |
| **AF-11** | 🟡 MEDIUM | Báo cáo doanh thu (`getRevenueReport`): Công suất chưa lọc ghế `isActive=true`, tỷ lệ lấp đầy lệch cửa sổ thời gian phải dùng `Math.min(100.0)` che lỗi, nguy cơ NPE và nhân đôi dòng khi `JOIN Payment`. | D-10 | `TODO` |
| **AF-12** | 🟡 MEDIUM | Câu lệnh `findByIdsForUpdateOrderByIdAsc` dùng `JOIN FETCH ss.seat` kèm `FOR UPDATE` khiến MySQL khóa lan sang bảng vật lý `seats`. | — | `DONE` |
| **AF-13** | 🟡 MEDIUM | Kiểm chứng và ép thời gian chờ khóa tối đa (`innodb_lock_wait_timeout`) trên MySQL $\le 5$ giây. | — | `TODO` |
| **AF-14** | 🟡 MEDIUM | Đồng bộ hóa toàn bộ tài liệu (`SRS.md`, `ROADMAP.md`, `.antigravityrules`, `README.md`, `CHANGELOG.md`, `docker-compose.yml`). | — | `TODO` |
| **AF-15** | 🟡 MEDIUM | File test frontend `pricingPolicy.test.js` tự định nghĩa hàm giả lập bên trong file test thay vì import hàm thật từ `src/`. | — | `TODO` |
| **AF-16** | 🟡 MEDIUM | `GlobalExceptionHandler` thiếu các trình xử lý lỗi dữ liệu và tham số request (`DataIntegrityViolationException`, `HttpMessageNotReadableException`... — tương đương `G4-01`). | — | `TODO` |
| **AF-17** | 🟢 LOW | Dọn dẹp mã nguồn nhỏ: xóa hàm thừa, bỏ tạo ghế lười trong `getShowtimeSeats` (`G4-02`), sửa lỗi truy vấn N+1 trong `getMyBookings` (`G4-09`). | — | `TODO` |

---

## 2. BẢNG QUYẾT ĐỊNH NGHIỆP VỤ BỔ SUNG (DECISION LOG D-07 $\rightarrow$ D-10)

*(Các quyết định dưới đây đã được chốt theo phương án kiến trúc an toàn nhất để không làm gián đoạn quá trình sửa lỗi)*

| ID | Câu hỏi nghiệp vụ | Phương án đề xuất | Quyết định chốt |
|---|---|---|---|
| **D-07** | Ghế `COUPLE` chưa có `pairGroup`: chặn bán hay tự ghép theo số ghế chẵn/lẻ? | Chặn bán (`selectable = false`), bắt buộc Admin gán `pairGroup` hợp lệ (đúng 2 ghế `COUPLE` liền kề cùng hàng). | **Chặn bán & bắt buộc có `pairGroup` [ĐÃ CHỐT]** |
| **D-08** | Admin hủy suất chiếu đã/đang diễn ra: chặn hay cho phép? Hủy suất chưa có đơn: hủy mềm hay xóa cứng? | Chặn hủy suất đã bắt đầu (`409 Conflict`, mã `1313`); luôn hủy mềm (`status = CANCELLED`), tuyệt đối không xóa cứng. | **Chặn hủy suất đã bắt đầu & Luôn hủy mềm [ĐÃ CHỐT]** |
| **D-09** | Trần thời gian giữ ghế (`holdMinutes`) tối đa là bao nhiêu? | Cấu hình qua `BookingProperties`, kiểm tra `@Min(1) @Max(10)` (tối đa 10 phút). | **Cấu hình động, trần tối đa 10 phút [ĐÃ CHỐT]** |
| **D-10** | Tỷ lệ lấp đầy (`occupancyRate`) trong báo cáo doanh thu tính trên cửa sổ thời gian nào? | Tử số và mẫu số của `occupancyRate` cùng tính trên cửa sổ `showtimes.start_time` (suất `SCHEDULED`, ghế `isActive=true`); doanh thu thực nhận tính theo `payments.pay_date`. | **Cùng cửa sổ `start_time` cho tỷ lệ lấp đầy [ĐÃ CHỐT]** |

---

## 3. THỨ TỰ THỰC HIỆN TỐI ƯU (7 ĐỢT TRIỂN KHAI)

Để đảm bảo an toàn, không xung đột code và tuân thủ đúng TDD, hãy chạy lần lượt theo **7 đợt** sau:

- **Đợt 1 (Bảo mật khẩn cấp):** `AF-02` (Xử lý lộ secret trong `run-backend.bat`).
- **Đợt 2 (Hạ tầng Test đồng thời & Khắc phục Lỗi Khóa Cốt lõi):** `AF-07` (Cài đặt Testcontainers & viết test đồng thời) $\rightarrow$ `AF-01` (Khóa trước, validate sau trong `createBooking`) $\rightarrow$ `AF-12` (Bỏ `JOIN FETCH` khỏi câu lệnh `FOR UPDATE`) $\rightarrow$ `AF-03` (Sửa ghi đè ghế `HELD` trong `RoomService`).
- **Đợt 3 (Chuẩn hóa Luật Sơ đồ Ghế):** `AF-05` (Đồng bộ luật ghế lẻ Client/Server qua JSON fixture) $\rightarrow$ `AF-04` (Kiểm tra chặt `pairGroup` cho ghế đôi).
- **Đợt 4 (Khóa Luồng Admin & Hủy Suất Chiếu):** `AF-10` (Khóa `movies` $\rightarrow$ `rooms` khi tạo suất / ngừng chiếu) $\rightarrow$ `AF-06` (Hủy mềm suất chiếu & chặn hủy suất đã bắt đầu).
- **Đợt 5 (Cấu hình Động & Hiển thị Giá Đóng băng):** `AF-08` (Đưa tham số hardcode ra cấu hình) $\rightarrow$ `AF-09` (Hiển thị giá đóng băng & `priceTags`) $\rightarrow$ `AF-15` (Chuẩn hóa unit test `priceTags` ở Frontend).
- **Đợt 6 (Báo cáo Doanh thu, Timeout Khóa & Exception Handler):** `AF-11` (Sửa báo cáo doanh thu) $\rightarrow$ `AF-13` (Kiểm chứng `innodb_lock_wait_timeout` $\le 5\text{s}$) $\rightarrow$ `AF-16` (Bổ sung `GlobalExceptionHandler`).
- **Đợt 7 (Dọn dẹp & Đồng bộ Tài liệu Toàn cục):** `AF-17` (Dọn dẹp code & tối ưu N+1) $\rightarrow$ `AF-14` (Đồng bộ hóa toàn bộ tài liệu lên SRS v3.3).

---

## 4. CHI TIẾT KỸ THUẬT & HƯỚNG DẪN SỬA TỪNG TASK

---

### AF-01 — `createBooking`: Khóa trước, Validate sau (Chống Stale Snapshot & Race Condition) 🔴 CRITICAL

#### 1. ĐỌC TRƯỚC (BẮT BUỘC):
- `backend/src/main/java/com/example/cinema/booking/service/BookingService.java` (method `createBooking`, dòng ~64–200)
- `backend/src/main/java/com/example/cinema/booking/component/SeatSelectionValidator.java`
- `backend/src/main/java/com/example/cinema/showtime/repository/ShowtimeSeatRepository.java`
- `backend/src/main/java/com/example/cinema/booking/repository/BookingRepository.java` (method `findExpiredBookingIdsHoldingSeats`)

#### 2. PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ:
1. Tại dòng ~106 của `BookingService.createBooking`, hệ thống đang gọi `findByShowtimeIdOrderBySeatRowNameAscSeatSeatNumberAsc` để nạp toàn bộ entity `ShowtimeSeat` của suất chiếu vào **Hibernate Persistence Context (L1 Cache)** mà **không khóa**, đọc trên snapshot `REPEATABLE READ` của MySQL.
2. Tại dòng ~110–113, `validateCoupleSeats` và `validateOrphanSeats` chạy trước khi khóa và trước khi thu hồi các đơn hết hạn $\rightarrow$ hai khách hàng đặt vé song song trên cùng một hàng (ví dụ: người A đặt ghế 1–2, người B đặt ghế 4–5 trên hàng 5 ghế) đều thấy ghế của nhau còn trống trên snapshot cũ và cùng vượt qua bước kiểm tra, để lại ghế số 3 bị lẻ cô lập.
3. Nghiêm trọng hơn: Tại dòng ~126, khi truy vấn `findByIdsForUpdateOrderByIdAsc` chạy sau đó, vì các entity `ShowtimeSeat` đã tồn tại sẵn trong Hibernate L1 Cache từ bước 1, **Hibernate không ghi đè lại trạng thái mới từ DB vào instance trong bộ nhớ** (trừ khi gọi `entityManager.refresh()`). Hệ quả là kiểm tra `seat.getStatus() != AVAILABLE` ở dòng ~168 đọc trạng thái cũ trong bộ nhớ $\rightarrow$ **hai luồng có thể cùng giữ trùng một ghế**.

#### 3. YÊU CẦU KỸ THUẬT MỚI:
- **Tuyệt đối không nạp entity `ShowtimeSeat` vào Hibernate session trước khi chạy lệnh khóa `FOR UPDATE`.**
- Dùng truy vấn chiếu (projection query chỉ lấy `String rowName` và `Long id`) để xác định toàn bộ ID ghế thuộc các hàng (`rowName`) mà khách đang chọn.
- Tìm các `bookingId` đã hết hạn đang giữ bất kỳ ghế nào trong các hàng đó, khóa các `Booking` hết hạn (`ORDER BY id ASC`), sau đó **khóa toàn bộ `ShowtimeSeat` của các hàng liên quan (cộng với các ghế thuộc đơn hết hạn) trong duy nhất một câu lệnh `ORDER BY id ASC`**.
- Thực hiện thu hồi đơn hết hạn (chuyển booking sang `EXPIRED`, nhả ghế về `AVAILABLE`, hoàn lượt voucher) ngay trên tập ghế đã khóa.
- Thực hiện `validateCoupleSeats` và `validateOrphanSeats` trên danh sách ghế đã khóa và đã làm sạch đơn hết hạn, rồi mới kiểm tra `status == AVAILABLE` và `isActive`.

#### 4. CÁC BƯỚC TRIỂN KHAI & CODE MẪU:

**Bước 1:** Trong `ShowtimeSeatRepository.java`, thêm 2 truy vấn chỉ đọc giá trị vô hướng (không nạp entity `ShowtimeSeat`):
```java
@Query("SELECT DISTINCT ss.seat.rowName FROM ShowtimeSeat ss WHERE ss.showtime.id = :sid AND ss.id IN :ids")
Set<String> findRowNamesByIds(@Param("sid") Long showtimeId, @Param("ids") Collection<Long> ids);

@Query("SELECT ss.id FROM ShowtimeSeat ss WHERE ss.showtime.id = :sid AND ss.seat.rowName IN :rows ORDER BY ss.id ASC")
List<Long> findIdsByShowtimeAndRows(@Param("sid") Long showtimeId, @Param("rows") Collection<String> rows);
```

**Bước 2:** Trong `BookingService.java` (method `createBooking`), xóa bỏ hoàn toàn lời gọi `findByShowtimeIdOrderBySeatRowNameAscSeatSeatNumberAsc` và thay thế đoạn từ sau bước kiểm tra phim `ENDED` đến bước kiểm tra trạng thái ghế bằng luồng chuẩn sau:
```java
// (Giữ nguyên phía trên): Khóa User -> Đếm đơn PENDING -> Khóa Showtime (FOR SHARE) -> Kiểm tra Cutoff -> Kiểm tra Movie ENDED

// LƯU Ý BẤT BIẾN (AF-01): KHÔNG nạp entity ShowtimeSeat trước khi khóa FOR UPDATE để tránh Hibernate L1 Cache stale snapshot!
Set<String> rows = showtimeSeatRepository.findRowNamesByIds(showtime.getId(), uniqueRequestedSeatIds);
if (rows.isEmpty()) {
    throw new AppException(ErrorCode.SEAT_SELECTION_INVALID);
}

List<Long> rowSeatIds = showtimeSeatRepository.findIdsByShowtimeAndRows(showtime.getId(), rows); // Đã ORDER BY id ASC
if (!new HashSet<>(rowSeatIds).containsAll(uniqueRequestedSeatIds)) {
    throw new AppException(ErrorCode.SEAT_SELECTION_INVALID); // Có ghế không thuộc suất chiếu này
}

// Tìm các booking đã hết hạn đang giữ ghế trong các hàng liên quan
List<Long> expiredBookingIds = bookingRepository.findExpiredBookingIdsHoldingSeats(rowSeatIds, now);
List<Booking> lockedExpiredBookings = expiredBookingIds.isEmpty()
        ? List.of()
        : bookingRepository.findByIdsForUpdateOrderByIdAsc(expiredBookingIds); // Khóa bookings theo thứ tự ID tăng dần

Set<Long> allSeatIdsToLock = new TreeSet<>(rowSeatIds);
if (!expiredBookingIds.isEmpty()) {
    allSeatIdsToLock.addAll(showtimeSeatRepository.findIdsByHeldByBookingIdIn(expiredBookingIds));
}

// Khóa toàn bộ ShowtimeSeat liên quan trong ĐÚNG MỘT câu lệnh theo thứ tự ID tăng dần
List<ShowtimeSeat> lockedSeats = showtimeSeatRepository.findByIdsForUpdateOrderByIdAsc(allSeatIdsToLock);

// Thực hiện thu hồi các lockedExpiredBookings ngay tại đây:
// (Chuyển booking -> EXPIRED, các ghế tương ứng trong lockedSeats -> AVAILABLE & heldByBookingId = null, hoàn voucher)

// Lọc ra danh sách ghế thuộc các hàng mà khách chọn (đã được khóa và giải phóng hold hết hạn)
List<ShowtimeSeat> lockedRowSeats = lockedSeats.stream()
        .filter(ss -> rows.contains(ss.getSeat().getRowName()))
        .sorted(Comparator.comparing((ShowtimeSeat ss) -> ss.getSeat().getRowName())
                .thenComparing(ss -> ss.getSeat().getSeatNumber()))
        .toList();

// Validate ghế đôi và ghế lẻ trên dữ liệu đã khóa an toàn
seatSelectionValidator.validateCoupleSeats(lockedRowSeats, uniqueRequestedSeatIds);
if (bookingProperties.isOrphanSeatRuleEnabled()) {
    seatSelectionValidator.validateOrphanSeats(lockedRowSeats, uniqueRequestedSeatIds);
}

// Sau đó trích xuất các ghế được yêu cầu từ lockedRowSeats, kiểm tra status == AVAILABLE, isActive, tính giá và lưu Booking
```

#### 5. KIỂM THỬ & NGHIỆM THU:
- **Test đồng thời 1 (`SeatHoldingConcurrencyIT`):** 50 luồng cùng gửi yêu cầu giữ ghế `A1` $\rightarrow$ Đúng 1 luồng thành công, 49 luồng nhận lỗi `1504` (`SEAT_NOT_AVAILABLE`).
- **Test đồng thời 2 (`OrphanSeatConcurrencyIT`):** Hàng A có 5 ghế (`A1`..`A5`). Luồng 1 đặt `A1–A2`, Luồng 2 đặt `A4–A5` chạy song song cùng lúc $\rightarrow$ Đúng 1 luồng thành công, luồng thứ hai bị chặn với mã lỗi `1509` (`ORPHAN_SEAT_DETECTED`) vì ghế `A3` bị bỏ trống đơn độc.
- **Test đơn hết hạn:** Một booking đã quá hạn đang giữ ghế `A2`, khách mới vào chọn `A1–A2` $\rightarrow$ Thu hồi đơn cũ trước khi validate, đặt thành công mà không báo lỗi ghế lẻ hay ghế đã bị chiếm.

---

### AF-02 — `run-backend.bat` Chứa Secret và Mật khẩu Cứng 🔴 CRITICAL

#### 1. ĐỌC TRƯỚC (BẮT BUỘC):
- `run-backend.bat`
- `.env.example`
- `.gitignore`
- `README.md`

#### 2. PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ:
Trong file `run-backend.bat` (dòng 5, 6, 8) từng gán trực tiếp `JWT_SECRET` với chuỗi khóa cứng bị lộ, `DEV_TOOLS_ENABLED=true`, `BOOTSTRAP_ADMIN_PASSWORD` với mật khẩu mặc định công khai, và cấu hình DB cổng `3307` với mật khẩu rỗng. Điều này vi phạm nghiêm trọng nguyên tắc bảo mật `NFR-SEC-02`.

#### 3. CÁC BƯỚC TRIỂN KHAI & CODE MẪU:
1. Thay thế toàn bộ nội dung file `run-backend.bat` bằng đoạn script đọc biến môi trường từ file `.env`:
```bat
@echo off
if not exist .env (
  echo [ERROR] Khong tim thay file .env! Vui long tao file .env tu .env.example truoc khi chay.
  exit /b 2
)
for /f "usebackq eol=# tokens=1,* delims==" %%a in (".env") do set "%%a=%%b"
cd backend
call mvnw.cmd spring-boot:run
```
2. Trong `.gitignore`: Bổ sung dòng `run-backend.local.bat` (để dev có thể tạo script cá nhân nếu muốn mà không bị commit nhầm).
3. Trong `.env.example`: Cập nhật chú thích rõ cổng MySQL mặc định là `3306` (khớp `docker-compose.yml`), và mẫu `JWT_SECRET=CHANGE_ME_GENERATE_WITH_OPENSSL_RAND_BASE64_48`.
4. Trong `README.md`: Cập nhật hướng dẫn khởi chạy: *"Sao chép `.env.example` thành `.env`, điền khóa bí mật mới và chạy `run-backend.bat`"*.

#### 4. KIỂM THỬ & NGHIỆM THU:
- Chạy lệnh tìm kiếm: lệnh quét chuỗi secret/mật khẩu bị lộ (hoặc `Select-String` trên PowerShell) $\rightarrow$ Không còn bất kỳ file mã nguồn hay script nào chứa chuỗi mật khẩu/secret cũ.
- Khi chưa có file `.env`, chạy `run-backend.bat` thoát với mã lỗi `2` kèm thông báo rõ ràng.

---

### AF-03 — `RoomService.batchUpdateSeats` Ghi Đè Ghế Đang Giữ (`HELD`) 🟠 HIGH

#### 1. ĐỌC TRƯỚC (BẮT BUỘC):
- `backend/src/main/java/com/example/cinema/showtime/service/RoomService.java` (method `batchUpdateSeats`, dòng ~96–135)
- `backend/src/main/java/com/example/cinema/showtime/repository/ShowtimeSeatRepository.java` (`findFutureAvailableBySeatId`)
- `backend/src/main/java/com/example/cinema/showtime/entity/ShowtimeSeat.java`

#### 2. PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ:
Trong `RoomService.batchUpdateSeats`, kiểm tra `hasActiveReservations` và truy vấn `findFutureAvailableBySeatId` đều chạy không khóa. Ngay sau đó, code gọi `ss.setPrice(...)` rồi `showtimeSeatRepository.saveAll(...)`. Vì entity `ShowtimeSeat` không có `@DynamicUpdate` hay `@Version`, Hibernate sinh câu lệnh `UPDATE showtime_seats SET price=?, status='AVAILABLE', held_by_booking_id=NULL ...`. Nếu đúng tích tắc đó khách hàng vừa giữ ghế (`status='HELD'`), lệnh `saveAll` của Admin sẽ **ghi đè xóa mất trạng thái giữ ghế của khách**.

#### 3. CÁC BƯỚC TRIỂN KHAI & CODE MẪU:
**Bước 1:** Trong `ShowtimeSeatRepository.java`, thêm câu lệnh cập nhật nguyên tử (atomic conditional update) chỉ sửa cột `price` khi ghế thực sự đang `AVAILABLE`:
```java
@Modifying(clearAutomatically = true, flushAutomatically = true)
@Query("""
    UPDATE ShowtimeSeat ss
    SET ss.price = :price
    WHERE ss.id = :id
      AND ss.status = com.example.cinema.showtime.enums.ShowtimeSeatStatus.AVAILABLE
    """)
int repriceIfAvailable(@Param("id") Long id, @Param("price") long price);
```
**Bước 2:** Trong `RoomService.batchUpdateSeats`:
- Giữ nguyên kiểm tra `hasActiveReservations` ở đầu hàm làm rào chắn thông báo sớm.
- Khi cập nhật lại giá cho các suất chiếu tương lai, **tuyệt đối không sửa trực tiếp trên entity và không gọi `saveAll`**:
```java
for (ShowtimeSeat ss : showtimeSeatRepository.findFutureAvailableBySeatId(seat.getId(), now)) {
    long newPrice = pricingService.calculateSeatPrice(ss.getShowtime(), request.type());
    showtimeSeatRepository.repriceIfAvailable(ss.getId(), newPrice); // Chỉ UPDATE cột price nếu còn AVAILABLE
}
```

#### 4. KIỂM THỬ & NGHIỆM THU:
- **Test đồng thời (`SeatTypeChangeVsHoldIT`):** Luồng 1 (Admin) đổi ghế từ `NORMAL` sang `VIP` chạy song song với Luồng 2 (Khách) giữ cùng ghế đó $\rightarrow$ Nếu khách giữ thành công, ghế bắt buộc giữ nguyên `status = HELD` và `held_by_booking_id != null`, không bao giờ bị mất dấu giữ ghế.

---

### AF-04 — Kiểm Tra `pairGroup` và Chặn Bán Ghế `COUPLE` Thiếu `pairGroup` (D-07) 🟠 HIGH

#### 1. ĐỌC TRƯỚC (BẮT BUỘC):
- `backend/src/main/java/com/example/cinema/showtime/service/RoomService.java` (`batchUpdateSeats`, dòng ~130)
- `backend/src/main/java/com/example/cinema/showtime/dto/request/SeatBatchUpdateRequest.java`
- `backend/src/main/java/com/example/cinema/booking/component/SeatSelectionValidator.java` (`validateCoupleSeats`, dòng ~48)
- `backend/src/main/java/com/example/cinema/showtime/mapper/ShowtimeMapper.java` (`toSeatResponse`)
- `frontend/src/utils/seatGap.js` (`getCouplePartner`)

#### 2. PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ:
1. API `batchUpdateSeats` hiện cho phép gán `pairGroup` tùy ý mà không kiểm tra số lượng ghế (có thể gán 1 ghế hoặc 3 ghế vào cùng 1 cặp, gán 2 ghế cách xa nhau, hoặc gán `pairGroup` cho ghế `NORMAL`), và cho phép đổi `pairGroup` ngay cả khi ghế đang có người đặt.
2. Cả Backend (`SeatSelectionValidator`) và Frontend (`seatGap.js`) đang có nhánh dự phòng tự ghép cặp theo số ghế chẵn/lẻ (`seatNumber % 2`) khi `pairGroup == null`. Nếu phòng có số ghế lẻ hoặc cấu hình thiếu, khách có thể đặt lẻ 1 ghế `COUPLE`.

#### 3. CÁC BƯỚC TRIỂN KHAI & CODE MẪU:
1. **Trong `RoomService.batchUpdateSeats`:**
   - Trước khi cho phép thay đổi `type` hoặc `pairGroup`, kiểm tra xem các ghế trong `request.seatIds()` có đang `HELD` hoặc `BOOKED` ở bất kỳ suất chiếu `SCHEDULED` tương lai nào không. Nếu có $\rightarrow$ ném `ErrorCode.SEAT_NOT_AVAILABLE` (`1504`).
   - Khi `request.pairGroup() != null && request.pairGroup() > 0`:
     * Bắt buộc `seats.size() == 2`.
     * Cả 2 ghế sau cập nhật đều phải có loại hiệu lực là `SeatType.COUPLE`.
     * Cả 2 ghế phải cùng hàng (`rowName` giống nhau) và có số thứ tự liền kề nhau ($|s_1.\text{seatNumber} - s_2.\text{seatNumber}| = 1$).
     * Giá trị `pairGroup` này chưa từng được gán cho bất kỳ ghế nào khác trong cùng hàng của phòng đó.
     * Nếu vi phạm bất kỳ điều kiện nào $\rightarrow$ ném `new AppException(ErrorCode.VALIDATION_ERROR)` (kèm thông báo chi tiết).
2. **Trong `SeatSelectionValidator.validateCoupleSeats`:**
   - Xóa hoàn toàn nhánh dự phòng ghép theo chẵn/lẻ (`% 2`).
   - Nếu ghế được chọn có `type == SeatType.COUPLE` mà `pairGroup == null` (hoặc không tìm thấy đúng 1 ghế đối tác cùng hàng có cùng `pairGroup` trong danh sách ghế đang chọn) $\rightarrow$ ném `new AppException(ErrorCode.COUPLE_SEAT_MUST_BE_BOOKED_IN_PAIR)` (`1510`).
3. **Trong `ShowtimeMapper.toSeatResponse`:**
   - Cập nhật điều kiện `selectable`: Ghế chỉ `selectable = true` khi `status == AVAILABLE && seat.isActive() && !(seat.getType() == SeatType.COUPLE && seat.getPairGroup() == null)`.
4. **Trong `frontend/src/utils/seatGap.js` (`getCouplePartner`):**
   - Xóa nhánh dự phòng `% 2`. Nếu ghế `COUPLE` không có `pairGroup`, trả về `null` và `isCouplePairAvailable` trả về `false`.

#### 4. KIỂM THỬ & NGHIỆM THU:
- Gán `pairGroup` cho 3 ghế, hoặc 2 ghế không kề nhau, hoặc ghế `NORMAL` $\rightarrow$ Báo lỗi `400`.
- Đổi `pairGroup` khi ghế đang `HELD` $\rightarrow$ Báo lỗi `1504`.
- Đặt ghế `COUPLE` có `pairGroup = null` $\rightarrow$ Báo lỗi `1510`, trên sơ đồ ghế có `selectable = false`.
- Không còn phép tính `% 2` để tìm ghế đôi trong cả Backend và Frontend.

---

### AF-05 — Đồng Bộ Luật Ghế Lẻ Giữa Client và Server Qua Bộ Fixture Chung 🟠 HIGH

#### 1. ĐỌC TRƯỚC (BẮT BUỘC):
- `backend/src/main/java/com/example/cinema/booking/component/SeatSelectionValidator.java` (`isSeatEmpty`, dòng ~120–145)
- `frontend/src/utils/seatGap.js` (dòng ~8)
- `backend/src/main/java/com/example/cinema/showtime/mapper/ShowtimeMapper.java`
- `frontend/src/pages/SeatSelection.jsx`

#### 2. PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ:
- **Phía Server:** Trước khi có `AF-01`, `isSeatEmpty` chạy trước bước thu hồi đơn hết hạn nên coi ghế `HELD` đã quá hạn là "đã có người ngồi".
- **Phía Client:** Hàm `isSeatEmpty` trong `seatGap.js` kiểm tra `seat.isActive === false`, nhưng DTO từ Server trả về chỉ có trường `selectable` (không có trường `isActive`). Do đó `seat.isActive` luôn là `undefined`, khiến Client coi ghế đã bị khóa bảo trì là ghế trống!

#### 3. CÁC BƯỚC TRIỂN KHAI & CODE MẪU:
1. **Phía Server (`SeatSelectionValidator.java`):** Kết hợp với `AF-01` (đã giải phóng ghế hết hạn trước khi gọi validator), hàm `isSeatEmpty` kiểm tra: ghế có `seat.isActive() == true`, `status == AVAILABLE` và không nằm trong `selectedSeatIds`.
2. **Phía Client (`frontend/src/utils/seatGap.js`):**
   - Sửa hàm kiểm tra ghế trống:
     ```javascript
     function isSeatEmpty(seat, selectedIdSet) {
       if (!seat || seat.selectable === false) return false;
       if (selectedIdSet.has(seat.id)) return false;
       return seat.status === 'AVAILABLE';
     }
     ```
   - Xóa bỏ mọi tham chiếu tới `seat.isActive` trên Frontend.
3. **Tạo file Fixture dùng chung `docs/fixtures/seat-gap-cases.json`:**
   - Định nghĩa danh sách tối thiểu 8 kịch bản chuẩn:
     1. Để trống 1 ghế ở mép đầu hàng (`expectOrphan: true`).
     2. Để trống 1 ghế ở giữa 2 ghế đã đặt/đang chọn (`expectOrphan: true`).
     3. Hàng chỉ còn đúng 1 ghế trống sẵn từ trước, khách không chạm vào hàng đó hoặc chọn ghế khác (`expectOrphan: false`).
     4. Khách chọn hết toàn bộ ghế trống trong hàng (`expectOrphan: false`).
     5. Khoảng trống từ 2 ghế liên tiếp trở lên (`expectOrphan: false`).
     6. Ghế cạnh bên bị tắt bảo trì (`selectable: false`, `status: 'AVAILABLE'`) đóng vai trò như bức tường/ghế không khả dụng (`expectOrphan: true` nếu để kẹp 1 ghế trống giữa ghế bảo trì và ghế đang chọn).
     7. Hàng chỉ có duy nhất 1 ghế (`expectOrphan: false`).
     8. Cách quãng số ghế (lối đi ở giữa phòng chiếu).
4. **Cập nhật Unit Test ở cả 2 phía:**
   - Test JUnit (Backend) và Test Vitest (Frontend) cùng đọc trực tiếp file `../docs/fixtures/seat-gap-cases.json` và chạy kiểm chứng trên toàn bộ mảng test cases.

#### 4. KIỂM THỬ & NGHIỆM THU:
- Cả JUnit và Vitest đều đọc chung file `docs/fixtures/seat-gap-cases.json` và pass 100%.

---

### AF-06 — `cancelShowtime`: Luôn Hủy Mềm và Chặn Hủy Suất Đã Bắt Đầu (D-08) 🟠 HIGH

#### 1. ĐỌC TRƯỚC (BẮT BUỘC):
- `backend/src/main/java/com/example/cinema/showtime/service/ShowtimeService.java` (`cancelShowtime`, dòng ~189–235)
- `backend/src/main/java/com/example/cinema/showtime/repository/ShowtimeSeatRepository.java` (`deleteByShowtimeId`)
- `backend/src/test/java/com/example/cinema/showtime/ShowtimeWorkflowIntegrationTest.java`

#### 2. PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ:
1. Tại dòng ~209–210 của `ShowtimeService.cancelShowtime`, nếu suất chiếu chưa có booking nào, hệ thống gọi `showtimeSeatRepository.deleteByShowtimeId(id)` và `showtimeRepository.delete(showtime)` $\rightarrow$ **vi phạm trực tiếp bất biến không xóa cứng dữ liệu lịch sử (`NFR-DATA-01`)**.
2. Hàm `cancelShowtime` chưa kiểm tra `showtime.getStartTime()` so với thời điểm hiện tại $\rightarrow$ Admin có thể bấm hủy nhầm một suất chiếu đã chiếu xong từ hôm qua, biến toàn bộ vé đã xem của khách thành trạng thái chờ hoàn tiền (`REFUND_REQUIRED`).

#### 3. CÁC BƯỚC TRIỂN KHAI & CODE MẪU:
1. **Trong `ErrorCode.java`:** Thêm mã lỗi mới:
   ```java
   SHOWTIME_ALREADY_STARTED(1313, "Cannot cancel a showtime that has already started", HttpStatus.CONFLICT),
   ```
2. **Trong `ShowtimeService.cancelShowtime(Long id)`:**
   - Khóa `Showtime` bằng `findByIdForUpdate(id)`.
   - Nếu `showtime.getStatus() == ShowtimeStatus.CANCELLED` $\rightarrow$ ném `SHOWTIME_ALREADY_CANCELLED`.
   - Nếu `!showtime.getStartTime().isAfter(LocalDateTime.now())` $\rightarrow$ ném `SHOWTIME_ALREADY_STARTED` (`1313`).
   - **Luôn luôn cập nhật mềm:** `showtime.setStatus(ShowtimeStatus.CANCELLED); showtimeRepository.save(showtime);` (kể cả khi `bookingIds.isEmpty()`).
   - Khóa `bookings` (`ORDER BY id ASC`) và `showtime_seats` (`ORDER BY id ASC`), giải phóng ghế và xử lý hoàn tiền/voucher cho các đơn đang có như logic hiện tại.
3. **Dọn dẹp Repository:** Xóa method `deleteByShowtimeId` khỏi `ShowtimeSeatRepository` nếu không còn nơi nào sử dụng.
4. **Cập nhật Frontend (`AdminDashboard.jsx`):** Xử lý hiển thị thông báo khi gặp mã lỗi `1313` ("Không thể hủy suất chiếu đã bắt đầu").

#### 4. KIỂM THỬ & NGHIỆM THU:
- Cập nhật test trong `ShowtimeWorkflowIntegrationTest`: Hủy suất chiếu chưa có đơn đặt vé $\rightarrow$ Bản ghi `Showtime` vẫn tồn tại trong DB với `status = CANCELLED`, không bị xóa mất.
- Thêm test mới: Cố tình hủy suất chiếu có `startTime <= now` $\rightarrow$ Ném lỗi `1313` (`409 Conflict`).

---

### AF-07 — Kiểm Thử Đồng Thời với Testcontainers & Bật Test Backend trên CI 🟠 HIGH

#### 1. ĐỌC TRƯỚC (BẮT BUỘC):
- `backend/pom.xml`
- `.github/workflows/ci.yml`
- `backend/src/test/resources/application-test.yaml`
- Toàn bộ các class `*IntegrationTest.java` hiện có.

#### 2. PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ:
Toàn bộ các bài test tích hợp hiện tại đều gắn `@Transactional` ở cấp hàm/class (chạy trên 1 luồng duy nhất rồi rollback) và yêu cầu máy local phải cài sẵn MySQL ở `localhost:3306`. Do chạy 1 luồng nên các lỗi khóa `FOR UPDATE` và mức cô lập `REPEATABLE READ` (như `AF-01`, `AF-03`) hoàn toàn không được kiểm chứng. Đồng thời, file `.github/workflows/ci.yml` đang chạy `-DskipTests` nên CI không bảo vệ được Backend.

#### 3. CÁC BƯỚC TRIỂN KHAI & CODE MẪU:
1. **Trong `backend/pom.xml`:** Thêm dependencies cho Testcontainers (scope `test`):
   - `org.springframework.boot:spring-boot-testcontainers`
   - `org.testcontainers:junit-jupiter`
   - `org.testcontainers:mysql`
2. **Tạo lớp cơ sở `AbstractMySqlIT.java`:**
   ```java
   @SpringBootTest
   @ActiveProfiles("test")
   @Testcontainers
   public abstract class AbstractMySqlIT {
       @Container
       @ServiceConnection
       static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.0")
               .withDatabaseName("cinema_booking_db");
   }
   ```
   *(Cấu hình cho toàn bộ các Integration Test kế thừa từ `AbstractMySqlIT`)*.
3. **Tạo tiện ích `ConcurrencyTestSupport.java`:** Sử dụng `ExecutorService` và `CountDownLatch` (1 latch `ready`, 1 latch `start`, 1 latch `done`) để ép $N$ luồng xuất phát tại cùng một mili-giây và thu thập danh sách kết quả (thành công hoặc mã lỗi `AppException`).
4. **Viết 8 bộ Kiểm thử Đồng thời (Không gắn `@Transactional` ở cấp test method, tự dọn dữ liệu ở `@AfterEach`):**
   - `SeatHoldingConcurrencyIT`: 50 luồng giữ cùng 1 ghế $\rightarrow$ 1 thành công, 49 lỗi `1504`.
   - `OrphanSeatConcurrencyIT`: 2 luồng đặt `A1–A2` và `A4–A5` song song trên hàng 5 ghế $\rightarrow$ 1 thành công, 1 lỗi `1509`.
   - `PendingCapConcurrencyIT`: 1 user bắn 5 request tạo đơn song song $\rightarrow$ tối đa `maxPendingBookingsPerUser` (2) đơn thành công, còn lại lỗi `1508`.
   - `VoucherLimitConcurrencyIT`: Voucher còn $N$ lượt, $M > N$ đơn áp mã song song $\rightarrow$ đúng $N$ đơn thành công.
   - `IpnVsCancelShowtimeIT`: Luồng thanh toán IPN chạy đua với luồng Admin hủy suất chiếu $\rightarrow$ Không bao giờ xảy ra trạng thái đơn `CANCELLED` nhưng `Payment` là `SUCCESS` với `refundStatus = NONE`.
   - `CancelConfirmedVsCancelShowtimeIT`: Khách tự hủy vé đồng thời với Admin hủy suất chiếu $\rightarrow$ Trạng thái cuối cùng nhất quán, voucher chỉ được hoàn cộng 1 lần duy nhất.
   - `SeatTypeChangeVsHoldIT`: Admin đổi loại ghế song song với khách giữ ghế (`AF-03`) $\rightarrow$ Ghế khách đã giữ không bị mất trạng thái `HELD`.
   - `ShowtimeVsDiscontinueIT`: Admin tạo suất chiếu mới song song với ngừng chiếu phim (`AF-10`) $\rightarrow$ Không bao giờ tồn tại phim `ENDED` mà có suất `SCHEDULED` tương lai.
5. **Trong `.github/workflows/ci.yml`:** Đổi lệnh build backend từ `-DskipTests` sang `./mvnw -B verify`.

#### 4. KIỂM THỬ & NGHIỆM THU:
- Lệnh `cd backend && ./mvnw verify` tự động khởi chạy MySQL 8 container và vượt qua toàn bộ các bài test đơn luồng lẫn đa luồng.

---

### AF-08 — Đưa Toàn Bộ Tham Số Nghiệp Vụ Còn Hardcode Ra Cấu Hình (D-09) 🟡 MEDIUM

#### 1. ĐỌC TRƯỚC (BẮT BUỘC):
- `backend/src/main/java/com/example/cinema/booking/config/BookingProperties.java`
- `backend/src/main/java/com/example/cinema/booking/service/BookingService.java` (dòng ~60, 191)
- `backend/src/main/java/com/example/cinema/showtime/service/ShowtimeService.java` (dòng ~80)
- `backend/src/main/java/com/example/cinema/booking/scheduler/BookingExpirationScheduler.java` (dòng ~24, 30)
- `backend/src/main/java/com/example/cinema/showtime/enums/SeatType.java`
- `backend/src/main/java/com/example/cinema/showtime/config/PricingProperties.java`

#### 2. CÁC BƯỚC TRIỂN KHAI:
1. **Trong `BookingProperties.java`:** Gắn `@Validated` và bổ sung các thuộc tính:
   - `@Min(1) @Max(10) private int holdMinutes = 10;`
   - `private long expiryScanDelayMs = 30_000L;`
   - `private int expiryScanBatchSize = 100;`
2. **Tạo `ShowtimeProperties.java` (`@ConfigurationProperties(prefix = "app.showtime")`):**
   - `@Min(0) private int cleaningMinutes = 15;`
3. **Cập nhật `application.yaml` và `application-test.yaml`:** Khai báo đầy đủ `app.booking.hold-minutes: 10`, `expiry-scan-delay-ms: 30000`, `expiry-scan-batch-size: 100` và `app.showtime.cleaning-minutes: 15`.
4. **Thay thế trong Service & Scheduler:**
   - Xóa hằng số `SEAT_HOLD_MINUTES` trong `BookingService`; dùng `bookingProperties.getHoldMinutes()`.
   - Trong `ShowtimeService`: Thay `endTime.plusMinutes(15)` bằng `endTime.plusMinutes(showtimeProperties.getCleaningMinutes())`.
   - Trong `BookingExpirationScheduler`: Dùng `@Scheduled(fixedDelayString = "${app.booking.expiry-scan-delay-ms:30000}")` và `PageRequest.of(0, bookingProperties.getExpiryScanBatchSize())`.
   - Trong `ErrorCode.java`: Đổi thông điệp của mã `1506` thành `"Booking hold time has already expired"` (không viết cứng số 10).
   - Trong `SeatType.java`: Xóa method `calculatePrice` và các con số tiền cứng bên trong enum (vì toàn bộ việc tính giá đã do `PricingService` đảm nhiệm).
   - Trong `PricingProperties.java`: Xóa các getter/setter bí danh dư thừa (`primeTimeSurcharge`, `matineeDiscount`).

#### 3. KIỂM THỬ & NGHIỆM THU:
- Lệnh `grep -rn "SEAT_HOLD_MINUTES\|plusMinutes(15)\|20_000" backend/src/main` trả về rỗng.
- Test cấu hình: Đặt `hold-minutes = 11` $\rightarrow$ Validation báo lỗi ngay khi khởi tạo context.

---

### AF-09 — Giá Hiển Thị Khớp Giá Đã Đóng Băng & Chuẩn Hóa `priceTags` 🟡 MEDIUM

#### 1. ĐỌC TRƯỚC (BẮT BUỘC):
- `backend/src/main/java/com/example/cinema/showtime/mapper/ShowtimeMapper.java` (dòng ~48)
- `backend/src/main/java/com/example/cinema/showtime/service/PricingService.java`
- `backend/src/main/java/com/example/cinema/showtime/dto/response/ShowtimeResponse.java`
- `frontend/src/pages/SeatSelection.jsx` (dòng ~158–205)

#### 2. PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ:
Hiện tại `ShowtimeMapper` đang gọi `pricingService` để tính lại `seatTypePrices` mỗi lần lấy thông tin suất chiếu. Nếu Admin thay đổi cấu hình giá trong `application.yaml` sau khi suất chiếu đã được tạo, bảng chú thích giá trên giao diện sẽ hiển thị giá mới, trong khi giá thực tế của các ghế trong bảng `showtime_seats` đã được đóng băng theo giá cũ lúc tạo suất chiếu $\rightarrow$ gây lệch giá hiển thị và giá thanh toán. Ngoài ra, `SeatSelection.jsx` đang hardcode các con số `+15k`, `-10k`, `+10k` và giá dự phòng `60000`.

#### 3. CÁC BƯỚC TRIỂN KHAI & CODE MẪU:
1. **Trong `ShowtimeSeatRepository.java`:** Thêm truy vấn lấy bảng giá thực tế theo từng loại ghế từ kho ghế của suất chiếu:
   ```java
   @Query("SELECT ss.seat.type AS seatType, MIN(ss.price) AS price FROM ShowtimeSeat ss WHERE ss.showtime.id = :sid GROUP BY ss.seat.type")
   List<SeatTypePriceProjection> findPricesByType(@Param("sid") Long showtimeId);
   ```
   *(Tạo interface `SeatTypePriceProjection` gồm `SeatType getSeatType()` và `Long getPrice()`)*.
2. **Trong `PricingService.java`:** Thêm hàm `List<String> describePriceTags(LocalDateTime startTime)` trả về danh sách mã thẻ định giá đang áp dụng cho khung giờ đó: `"WEEKEND"`, `"EARLY_BIRD"`, `"PEAK_HOUR"` (không kèm số tiền cứng).
3. **Trong `ShowtimeResponse.java` và `ShowtimeMapper.java`:**
   - Thêm trường `List<String> priceTags` vào `ShowtimeResponse`.
   - Khi lấy danh sách suất chiếu (list view): Để `seatTypePrices = null` nhằm tránh truy vấn N+1.
   - Khi lấy chi tiết 1 suất chiếu (`getShowtimeById`): Nạp `seatTypePrices` từ `showtimeSeatRepository.findPricesByType(showtime.getId())` và gán `priceTags = pricingService.describePriceTags(showtime.getStartTime())`.
4. **Tạo `frontend/src/utils/priceTags.js` và cập nhật `SeatSelection.jsx`:**
   - Tạo hàm ánh xạ mã thẻ sang nhãn hiển thị thân thiện (không chứa số tiền cứng):
     * `WEEKEND` $\rightarrow$ `"Phụ thu cuối tuần"`
     * `PEAK_HOUR` $\rightarrow$ `"Khung giờ vàng"`
     * `EARLY_BIRD` $\rightarrow$ `"Ưu đãi suất chiếu sớm"`
   - Trong `SeatSelection.jsx`: Xóa toàn bộ hàm tự tính giờ/ngày và các con số dự phòng `60000`, `15000`, `10000`, `+15k`, `-10k`. Đọc trực tiếp từ `showtime.seatTypePrices`, `seat.price` và `showtime.priceTags`.

#### 4. KIỂM THỬ & NGHIỆM THU:
- Lệnh `grep -n "15k\|10k\|60000" frontend/src/pages/SeatSelection.jsx` không còn kết quả nào.
- Giá hiển thị ở bảng chú thích luôn khớp 100% với giá đóng băng của ghế trong DB.

---

### AF-10 — Chặn Race Condition Giữa Tạo Suất Chiếu và Ngừng Chiếu Phim / Tắt Phòng 🟡 MEDIUM

#### 1. ĐỌC TRƯỚC (BẮT BUỘC):
- `backend/src/main/java/com/example/cinema/showtime/service/ShowtimeService.java` (`createShowtime`, dòng ~64)
- `backend/src/main/java/com/example/cinema/movie/service/MovieService.java` (`updateMovie`, `discontinueMovie`)
- `backend/src/main/java/com/example/cinema/showtime/service/RoomService.java` (`toggleRoomStatus`, dòng ~141)
- `backend/src/main/java/com/example/cinema/movie/repository/MovieRepository.java`
- `backend/src/main/java/com/example/cinema/showtime/repository/RoomRepository.java`

#### 2. PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ:
Khi Admin A gọi `discontinueMovie` (chuyển phim sang `ENDED`), hệ thống kiểm tra không còn suất tương lai rồi mới cập nhật; cùng lúc đó Admin B gọi `createShowtime` chỉ đọc `movieRepository.findById` không khóa. Kết quả là cả hai cùng chạy qua bước kiểm tra và tạo ra một bộ phim `ENDED` nhưng lại có suất chiếu `SCHEDULED` trong tương lai. Tương tự với `toggleRoomStatus(false)`.

#### 3. CÁC BƯỚC TRIỂN KHAI & CODE MẪU:
1. **Trong `MovieRepository.java`:** Thêm 2 phương thức khóa:
   ```java
   @Lock(LockModeType.PESSIMISTIC_WRITE)
   @Query("SELECT m FROM Movie m WHERE m.id = :id")
   Optional<Movie> findByIdForUpdate(@Param("id") Long id);

   @Lock(LockModeType.PESSIMISTIC_READ)
   @Query("SELECT m FROM Movie m WHERE m.id = :id")
   Optional<Movie> findByIdForShare(@Param("id") Long id);
   ```
2. **Tuân thủ nghiêm ngặt thứ tự khóa luồng Admin (`movies` $\rightarrow$ `rooms` $\rightarrow$ `showtimes`):**
   - Trong `ShowtimeService.createShowtime`: Gọi `movieRepository.findByIdForShare(request.movieId())` trước, sau đó gọi `roomRepository.findByIdForUpdate(request.roomId())`, kiểm tra trạng thái rồi mới tạo `Showtime`.
   - Trong `MovieService.discontinueMovie` (và nhánh đổi trạng thái sang `ENDED` trong `updateMovie`): Gọi `movieRepository.findByIdForUpdate(id)` trước khi kiểm tra `existsFutureActiveShowtimes`.
   - Trong `RoomService.toggleRoomStatus`: Gọi `roomRepository.findByIdForUpdate(id)` trước khi kiểm tra suất chiếu tương lai và đổi trạng thái `isActive`.

#### 4. KIỂM THỬ & NGHIỆM THU:
- **Test đồng thời (`ShowtimeVsDiscontinueIT`):** 1 luồng tạo suất chiếu mới và 1 luồng ngừng chiếu phim chạy cùng lúc $\rightarrow$ Luôn được tuần tự hóa, không bao giờ sinh ra dữ liệu mâu thuẫn.

---

### AF-11 — Báo Cáo Doanh Thu: Lọc Ghế Hoạt Động, Chuẩn Hóa Cửa Sổ Tỷ Lệ Lấp Đầy & Chống NPE (D-10) 🟡 MEDIUM

#### 1. ĐỌC TRƯỚC (BẮT BUỘC):
- `backend/src/main/java/com/example/cinema/payment/service/PaymentService.java` (`getRevenueReport`, dòng ~496–595)
- `backend/src/main/java/com/example/cinema/showtime/repository/ShowtimeSeatRepository.java` (`countCapacityByMovie`)
- `backend/src/main/java/com/example/cinema/booking/repository/BookingItemRepository.java`
- `frontend/src/pages/AdminDashboard.jsx` (tab Revenue)

#### 2. PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ:
1. `countCapacityByMovie` chưa có điều kiện `AND ss.seat.isActive = true` $\rightarrow$ Ghế bảo trì vẫn bị cộng vào tổng công suất.
2. Tỷ lệ lấp đầy (`occupancyRate`) đang lấy số vé theo ngày thanh toán (`pay_date`) chia cho công suất theo ngày chiếu (`start_time`). Vì khách có thể mua vé trước nhiều ngày, tử số và mẫu số khác hệ quy chiếu khiến tỷ lệ vọt lên $> 100\%$ và code đang dùng `Math.min(100.0, ...)` để che giấu sai lệch.
3. Khi một bộ phim có vé bán trong kỳ nhưng không có suất chiếu nào diễn ra trong kỳ (`capacity == 0`), dòng ~562 tự gán cứng `totalScreenings = 1`.
4. Câu lệnh `JOIN Payment p ON p.booking = b` có nguy cơ nhân đôi số lượng vé nếu một booking có nhiều bản ghi payment thử lại; dòng ~581 `mapToLong(getTransactionCount)` có thể gây `NullPointerException`.

#### 3. CÁC BƯỚC TRIỂN KHAI & CODE MẪU:
1. **Trong `ShowtimeSeatRepository.countCapacityByMovie`:** Bổ sung điều kiện `AND ss.seat.isActive = true`.
2. **Trong `BookingItemRepository.java`:**
   - Đổi `JOIN Payment p` trong `countTicketsSoldByMovie` và `countTotalTicketsSold` sang mệnh đề `EXISTS (SELECT 1 FROM Payment p WHERE p.booking = b AND p.status = SUCCESS AND p.refundStatus = NONE AND p.payDate BETWEEN :startDate AND :endDate)` để tránh nhân bản dòng.
   - Thêm truy vấn đếm số vé theo cửa sổ suất chiếu (`start_time`) để phục vụ tính tỷ lệ lấp đầy chuẩn xác:
     ```java
     @Query("""
         SELECT s.movie.id AS movieId, COUNT(bi.id) AS ticketsSold
         FROM BookingItem bi JOIN bi.booking b JOIN b.showtime s
         WHERE b.status = com.example.cinema.booking.enums.BookingStatus.CONFIRMED
           AND s.status = com.example.cinema.showtime.enums.ShowtimeStatus.SCHEDULED
           AND s.startTime BETWEEN :startDate AND :endDate
         GROUP BY s.movie.id
         """)
     List<MovieTicketSalesProjection> countTicketsByShowtimeWindow(
             @Param("startDate") LocalDateTime startDate,
             @Param("endDate") LocalDateTime endDate);
     ```
3. **Trong `PaymentService.getRevenueReport`:**
   - Doanh thu (`revenue`) và số vé bán trong kỳ (`ticketsSold`) vẫn lấy theo cửa sổ `pay_date`.
   - Công suất (`capacity`), số suất chiếu (`totalScreenings`) và tỷ lệ lấp đầy (`occupancyRate`) tính theo cửa sổ `start_time`:
     $$\text{occupancyRate} = \text{capacity} > 0 \ ? \ \frac{\text{ticketsByShowtimeWindow} \times 100.0}{\text{capacity}} \ : \ 0.0$$
   - Xóa bỏ `Math.min(100.0, ...)` và xóa bỏ việc gán giả `totalScreenings = 1` (nếu không có suất chiếu thì trả về `0`).
   - Xử lý null-safe cho toàn bộ các phép cộng stream (`p.getTransactionCount() == null ? 0L : p.getTransactionCount()`).

#### 4. KIỂM THỬ & NGHIỆM THU:
- Ghế `isActive = false` không được tính vào `capacity`.
- Khoảng thời gian không có suất chiếu trả về `totalScreenings = 0` và `occupancyRate = 0.0`.
- Không còn `Math.min(100.0` trong `PaymentService.java`.

---

### AF-12 — Loại Bỏ `JOIN FETCH ss.seat` Khỏi Truy Vấn `FOR UPDATE` 🟡 MEDIUM

#### 1. ĐỌC TRƯỚC (BẮT BUỘC):
- `backend/src/main/java/com/example/cinema/showtime/repository/ShowtimeSeatRepository.java` (`findByIdsForUpdateOrderByIdAsc`)
- `backend/src/main/java/com/example/cinema/showtime/entity/Seat.java`

#### 2. PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ:
Trong MySQL InnoDB, khi chạy `SELECT ss, s FROM showtime_seats ss JOIN seats s ON ... FOR UPDATE`, MySQL sẽ đặt khóa độc quyền (`X-lock`) lên cả dòng trong bảng `showtime_seats` **lẫn dòng tương ứng trong bảng vật lý `seats`**. Hệ quả là hai khách hàng đặt vé ở **hai suất chiếu hoàn toàn khác nhau** nhưng chọn trùng vị trí ghế vật lý trong cùng phòng chiếu sẽ bị chặn khóa lẫn nhau không cần thiết.

#### 3. CÁC BƯỚC TRIỂN KHAI & CODE MẪU:
1. Trong `ShowtimeSeatRepository.findByIdsForUpdateOrderByIdAsc`: Bỏ `JOIN FETCH ss.seat`:
   ```java
   @Lock(LockModeType.PESSIMISTIC_WRITE)
   @Query("SELECT ss FROM ShowtimeSeat ss WHERE ss.id IN :ids ORDER BY ss.id ASC")
   List<ShowtimeSeat> findByIdsForUpdateOrderByIdAsc(@Param("ids") Collection<Long> ids);
   ```
2. Trong entity `Seat.java`: Thêm `@org.hibernate.annotations.BatchSize(size = 50)` ở cấp class để khi `BookingService` truy cập `ss.getSeat().getRowName()` sau khi khóa, Hibernate tải gom theo lô (batch) thay vì sinh N+1 câu lệnh.

#### 4. KIỂM THỬ & NGHIỆM THU:
- Câu SQL `FOR UPDATE` sinh ra chỉ khóa bảng `showtime_seats`, không còn `JOIN seats`. Toàn bộ test ở `AF-01` và `AF-07` chạy xanh.

---

### AF-13 — Kiểm Chứng và Giới Hạn Thời Gian Chờ Khóa Trên MySQL ($\le 5\text{s}$) 🟡 MEDIUM

#### 1. ĐỌC TRƯỚC (BẮT BUỘC):
- Các repository có dùng `@QueryHints(@QueryHint(name = "jakarta.persistence.lock.timeout", value = "3000"))`
- `backend/src/main/resources/application.yaml` và `application-test.yaml`
- `backend/src/main/java/com/example/cinema/common/exception/GlobalExceptionHandler.java`

#### 2. PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ:
MySQL JDBC Driver và InnoDB thường bỏ qua gợi ý `jakarta.persistence.lock.timeout` ở mức câu lệnh và dùng biến hệ thống `innodb_lock_wait_timeout` (mặc định 50 giây). Nếu một luồng giữ khóa lâu, các luồng sau phải treo 50 giây, gây cạn kiệt HikariCP connection pool.

#### 3. CÁC BƯỚC TRIỂN KHAI:
1. Thêm cấu hình khởi tạo phiên kết nối cho HikariCP trong cả `application.yaml` và `application-test.yaml`:
   ```yaml
   spring:
     datasource:
       hikari:
         connection-init-sql: SET SESSION innodb_lock_wait_timeout = 5
   ```
2. Đảm bảo `GlobalExceptionHandler` bắt `PessimisticLockingFailureException` (và `CannotAcquireLockException`, `LockTimeoutException`) trả về HTTP `409 Conflict` với mã `1004` (`RESOURCE_LOCKED`).
3. Viết bài test kiểm chứng trong bộ Testcontainers: Luồng 1 mở transaction giữ khóa dòng `User` trong 10 giây; Luồng 2 gọi `findByEmailForUpdate` $\rightarrow$ Khẳng định Luồng 2 ném ngoại lệ khóa trong khoảng thời gian $\le 6$ giây (không chờ tới 50 giây).

---

### AF-14 — Đồng Bộ Hóa Hệ Thống Tài Liệu Dự Án 🟡 MEDIUM

#### CÁC FILE CẦN CẬP NHẬT ĐỒNG BỘ:
1. **`docs/SRS.md`:** Cập nhật đầy đủ 11 hạng mục ở **Mục 5** bên dưới, nâng số phiên bản lên **v3.3**, ghi lịch sử thay đổi.
2. **`docs/ROADMAP.md`:**
   - Sửa tham chiếu tại Mục 9: Luật ghế lẻ là `FR-BOOK-01`; Ghế đôi là `FR-SEAT-02`; Mã lỗi `1509` (`ORPHAN_SEAT_DETECTED`) và `1510` (`COUPLE_SEAT_MUST_BE_BOOKED_IN_PAIR`) trả về HTTP `400 Bad Request` (sửa chỗ ghi nhầm `409`).
   - Bổ sung bảng tham chiếu sang `docs/AUDIT_FIXES.md` (`AF-01` $\rightarrow$ `AF-17`).
3. **`.antigravityrules`:** Bổ sung quy tắc đọc `docs/AUDIT_FIXES.md` khi thực hiện các task `AF-xx`.
4. **`README.md`:** Cập nhật phiên bản SRS tham chiếu lên `v3.3`, hướng dẫn tạo file `.env` trước khi chạy `run-backend.bat`, và lưu ý cần bật Docker Desktop khi chạy test tích hợp Backend (Testcontainers).
5. **`docker-compose.yml`:** Ghi chú rõ service Redis (nếu có) là tùy chọn mở rộng chưa sử dụng trong code hiện tại, hoặc giữ cấu hình tối giản khớp với `SRS.md`.
6. **`docs/CHANGELOG.md`:** Ghi nhận đầy đủ các task `AF-01` $\rightarrow$ `AF-17`.

---

### AF-15 — Chuẩn Hóa Unit Test Frontend (`pricingPolicy.test.js`) 🟡 MEDIUM

#### 1. ĐỌC TRƯỚC (BẮT BUỘC):
- `frontend/src/test/pricingPolicy.test.js`
- `frontend/src/utils/priceTags.js` (tạo ở `AF-09`)

#### 2. PHÂN TÍCH & CÁC BƯỚC SỬA:
- File `pricingPolicy.test.js` hiện đang tự khai báo `export function computePricingBadges` và `resolveSeatPrices` ngay bên trong file test rồi tự test chính hàm đó, không kiểm thử code thực tế của ứng dụng.
- **Cách sửa:** Sau khi hoàn tất `AF-09`, xóa 2 hàm tự định nghĩa trong `pricingPolicy.test.js`. Import hàm ánh xạ từ `src/utils/priceTags.js` và viết test kiểm chứng ánh xạ thẻ định giá (`WEEKEND`, `PEAK_HOUR`, `EARLY_BIRD`) cùng hiển thị giá ghế từ DTO.
- Kiểm tra bằng lệnh `grep -n "^export function" frontend/src/test/*.js` $\rightarrow$ Kết quả phải trống.

---

### AF-16 — Bổ Sung Đầy Đủ Trình Xử Lý Lỗi Trong `GlobalExceptionHandler` (= `G4-01`) 🟡 MEDIUM

#### 1. ĐỌC TRƯỚC (BẮT BUỘC):
- `backend/src/main/java/com/example/cinema/common/exception/ErrorCode.java`
- `backend/src/main/java/com/example/cinema/common/exception/GlobalExceptionHandler.java`

#### 2. CÁC BƯỚC TRIỂN KHAI:
1. Trong `ErrorCode.java`, bổ sung (nếu chưa có):
   - `DATA_CONFLICT(1005, "Data integrity violation or duplicate resource", HttpStatus.CONFLICT)`
   - `MALFORMED_REQUEST(1006, "Malformed request payload or invalid parameter type", HttpStatus.BAD_REQUEST)`
2. Trong `GlobalExceptionHandler.java`, thêm các `@ExceptionHandler` trả về đúng cấu trúc `ApiResponse` chuẩn hiện tại (`{code, message, data, errors, timestamp}`):
   - `DataIntegrityViolationException.class` $\rightarrow$ HTTP `409`, mã `1005`.
   - `HttpMessageNotReadableException.class` (sai cú pháp JSON / sai giá trị Enum) $\rightarrow$ HTTP `400`, mã `1006`.
   - `MethodArgumentTypeMismatchException.class` & `MissingServletRequestParameterException.class` $\rightarrow$ HTTP `400`, mã `1006`.
3. Viết test WebMvc / Integration xác nhận gửi JSON lỗi hoặc thiếu query param trả về HTTP `400` (`1006`) thay vì rơi vào lỗi `500 Internal Server Error` (`9999`).

---

### AF-17 — Dọn Dẹp Mã Nguồn Nhỏ & Tối Ưu Hiệu Năng (`G4-02`, `G4-09`) 🟢 LOW

1. **`ShowtimeService.getShowtimeSeats(Long showtimeId)`:**
   - Đổi sang `@Transactional(readOnly = true)`.
   - Xóa bỏ đoạn code "tạo kho ghế lười" (lazy seat generation khi đọc danh sách ghế) vì kho ghế `showtime_seats` đã luôn được khởi tạo đầy đủ ngay trong `createShowtime`. Nếu suất chiếu có 0 ghế, trả về danh sách rỗng hoặc báo lỗi dữ liệu thay vì ghi DB trong một thao tác `GET`.
2. **`BookingService.getMyBookings`:**
   - Sử dụng truy vấn có `@EntityGraph` hoặc `JOIN FETCH` (`showtime`, `movie`, `room`, `cinema`, `bookingItems`) để loại bỏ triệt để hiện tượng truy vấn N+1 khi khách xem lịch sử đặt vé.
3. **`PricingService` & `ShowtimeMapper`:**
   - Xóa hàm `calculateSeatPriceBigDecimal` nếu không còn nơi nào gọi.
   - Bỏ kiểm tra thừa `pricingService != null` trong `ShowtimeMapper`.
4. **`run-all-tests.bat`:** Kiểm tra cả biến `ADMIN_EMAIL` và `ADMIN_PASSWORD` trước khi chạy.

---

## 5. BẢNG TỔNG HỢP CẬP NHẬT VÀO `docs/SRS.md` (NÂNG LÊN PHIÊN BẢN 3.3)

Khi thực hiện các task trên, cần đảm bảo `docs/SRS.md` được cập nhật tương ứng theo bảng đối chiếu sau:

| Mục trong `SRS.md` | Nội dung cần bổ sung / chỉnh sửa | Thuộc Task |
|---|---|---|
| **FR-BOOK-02 & Mục 4.4** | Quy định rõ: Không nạp entity `ShowtimeSeat` trước khi khóa; khóa toàn bộ ghế thuộc các hàng liên quan trong **một** câu lệnh `ORDER BY id ASC` (chỉ khóa bảng `showtime_seats`, không `JOIN FETCH seats`); giải phóng đơn hết hạn trước khi chạy validator. | `AF-01`, `AF-12` |
| **FR-BOOK-01** | Chuẩn hóa định nghĩa "ghế trống" giữa Client và Server (dựa trên trạng thái hiệu lực sau khi thu hồi hold hết hạn và cờ `selectable`); tham chiếu bộ test case chuẩn `docs/fixtures/seat-gap-cases.json`. | `AF-05` |
| **FR-SEAT-02** | Quy tắc gán `pairGroup` (đúng 2 ghế `COUPLE` liền kề cùng hàng, chặn sửa khi đang có ghế `HELD`/`BOOKED`); ghế `COUPLE` thiếu `pairGroup` bị khóa bán (`selectable = false`); giá mỗi ghế đôi = `standardBasePrice + coupleSurcharge`. | `AF-04`, `AF-14` |
| **FR-SHOW-02** | `cancelShowtime` luôn thực hiện hủy mềm (`status = CANCELLED`), tuyệt đối không xóa cứng; chặn hủy suất chiếu đã bắt đầu (`startTime <= now`) với lỗi `409 Conflict` (mã `1313`). | `AF-06` |
| **FR-PRICE-01** | Bảng giá hiển thị trên sơ đồ ghế lấy trực tiếp từ giá đã đóng băng trong `showtime_seats`; Server trả về mảng `priceTags` (`WEEKEND`, `PEAK_HOUR`, `EARLY_BIRD`) không kèm số tiền cứng. | `AF-09` |
| **FR-REP-01** | Công suất ghế chỉ tính ghế `isActive = true` của các suất `SCHEDULED`; tỷ lệ lấp đầy (`occupancyRate`) dùng số vé thuộc các suất chiếu diễn ra trong kỳ (`start_time`) chia cho công suất cùng kỳ; không gán số suất giả khi `capacity = 0`. | `AF-11` |
| **FR-SHOW-01 & Mục 4.4** | Bổ sung chuỗi khóa luồng Admin: `movies` (`S`/`X`) $\rightarrow$ `rooms` (`X`) $\rightarrow$ `showtimes` để chống race condition khi tạo suất chiếu và ngừng chiếu phim / bảo trì phòng. | `AF-10` |
| **NFR-CONF-01 (Mới)** | Toàn bộ tham số vận hành (`holdMinutes` $\le 10$, `cleaningMinutes`, `expiryScanDelayMs`, `expiryScanBatchSize`) phải được cấu hình hóa qua `@ConfigurationProperties`. | `AF-08` |
| **NFR-SEC-02** | Script khởi động (`.bat`/`.sh`) không được chứa mật khẩu hoặc khóa bí mật; bắt buộc nạp từ `.env`. | `AF-02` |
| **NFR-CONC-01 & Mục 7.3** | Bắt buộc kiểm thử đa luồng bằng Testcontainers MySQL 8 trên CI; thời gian chờ khóa tối đa `innodb_lock_wait_timeout` $\le 5$ giây. | `AF-07`, `AF-13` |

---

