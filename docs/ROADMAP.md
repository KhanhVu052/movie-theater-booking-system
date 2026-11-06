# ROADMAP — Movie Theater Booking System (GoToro Cinema)

> **Dành cho:** developer và AI coding assistant.
> **Phiên bản roadmap:** 1.0 — lập sau lần review thứ 2 (SRS đang ở v2.3 + FR-SHOW-02).
> **Nguyên tắc số 1:** `docs/SRS.md` là nguồn sự thật. Roadmap này chỉ nói *làm gì tiếp*; mọi thay đổi hành vi phải được ghi lại vào SRS (xem mục 9).

---

## 0. Cách dùng file này (BẮT BUỘC với AI)

1. Đọc theo thứ tự: `WORKSPACE_RULES` → `docs/SRS.md` → file này.
2. Chọn **đúng một** task theo thứ tự ưu tiên ở mục 2 (Phase 0 → Nhóm 2 → Nhóm 3 → Nhóm 4). Không gộp nhiều task vào một lần sửa. Không làm task có trạng thái `BLOCKED (cần quyết định)` cho tới khi người dùng chốt ở mục 8.
3. Trước khi sửa: mở **mọi file ghi ở "ĐỌC TRƯỚC"** của task. Nếu code thực tế khác mô tả trong roadmap, **dừng lại và báo**, đừng tự suy diễn.
4. Làm theo các bước, viết test đi kèm (mục "Test"), cập nhật tài liệu (mục "Tài liệu").
5. Chạy các lệnh ở mục 10. Chỉ đánh dấu `[x]` khi đạt toàn bộ **Tiêu chí nghiệm thu**.
6. Cập nhật bảng trạng thái (mục 2) và ghi một dòng vào `docs/CHANGELOG.md` (tạo nếu chưa có): `ngày — ID task — tóm tắt — SRS đã sửa`.

**Definition of Done cho mọi task:** code biên dịch; test mới + test cũ đều xanh; không phá bất biến ở mục 3; SRS/README khớp với hành vi mới; không có secret trong repo; không để `TODO` mơ hồ.

---

## 1. Bối cảnh kỹ thuật (đã xác minh trên code)

**Stack:** Backend Spring Boot 3 / Java 21 / MySQL 8 / Flyway / JWT / VNPay sandbox. Frontend React 19 + Vite + Tailwind + Vitest.

**Backend (`backend/src/main/java/com/example/cinema/`)** — package theo feature: `auth`, `movie`, `showtime`, `booking`, `payment`, `voucher`, `review`, `common`.
- Lỗi nghiệp vụ: `throw new AppException(ErrorCode.X)`. Enum `common/exception/ErrorCode.java`, mỗi mã có HTTP status. Dải mã: `10xx` chung, `11xx` auth, `12xx` movie, `13xx` showtime/room (đã dùng 1301–1310, 1311 sắp bị xoá), `14xx` voucher (1401–1409), `15xx` booking (đã dùng 1501–1506, **kế tiếp 1507**), `16xx` payment (1601–1606, **kế tiếp 1607**), `17xx` review (1701–1704). Mã mới = số trống kế tiếp trong dải, không đánh lại số cũ.
- Class dùng `@RequiredArgsConstructor` + `@FieldDefaults(level = PRIVATE, makeFinal = true)`. **Không dùng `@Value` trên field của các class này** (field sẽ thành `final` và bị đưa vào constructor). Cấu hình mới = class `@Configuration @ConfigurationProperties(prefix = "app.xxx")` có getter/setter (mẫu: `payment/config/VnPayProperties`, `common/config/DevToolsProperties`, `auth/config/BootstrapAdminProperties`).
- Repository khoá dòng: `@Lock(PESSIMISTIC_WRITE)` + `@QueryHints(jakarta.persistence.lock.timeout=3000)`, ví dụ `findByIdsForUpdateOrderByIdAsc`, `findByShowtimeIdForUpdate`.
- Scheduler giải phóng ghế: `booking/component/BookingExpirationScheduler` (mỗi 30 giây) gọi `BookingService.expireSingleBookingIsolated` (REQUIRES_NEW từng đơn).
- Cấu hình test: `backend/src/test/resources/application-test.yaml` + `@ActiveProfiles("test")`. Test hiện có: `MovieTheaterBookingSystemApplicationTests`, `showtime/ShowtimeWorkflowIntegrationTest`.
- Migration: `V1__init_schema.sql`, `V2__seed_movies_data.sql` → **migration mới bắt đầu từ `V3`**. Hibernate `ddl-auto: validate`. Mọi FK là `ON DELETE RESTRICT`.
- Cấu hình chạy: biến môi trường (`.env.example`): `JWT_SECRET` (bắt buộc, Base64 ≥ 32 byte), `BOOTSTRAP_ADMIN_EMAIL/PASSWORD`, `DEV_TOOLS_ENABLED`, `DB_*`, `VNPAY_*`.

**Frontend (`frontend/src/`)** — `pages/` (Home, MovieDetail, SeatSelection, Payment, PaymentResult, MyBookings, Login, AdminDashboard…), `components/`, `api/` (`axiosClient`, `movieApi`, `bookingApi`, `paymentApi`, `adminApi`, `authApi`), `utils/` (`formatters`, `dates`, `navigation`, `showtimeFilters`), `context/ToastContext`, test Vitest trong `src/test/`.
- Ngày giờ: backend dùng `LocalDateTime` múi giờ Asia/Ho_Chi_Minh, JSON dạng ISO **không có offset**. Frontend **không** dùng `toISOString()` để lấy ngày (dùng `utils/dates.js`).

**QA ngoài unit test:** `scripts/test-admin-suite.js` (cần backend đang chạy), `npm run test:all`, `run-all-tests.bat`.

---

## 2. Bảng trạng thái

Trạng thái: `DONE` · `PARTIAL` · `TODO` · `BLOCKED` (chờ quyết định ở mục 8).

| ID | Task | Ưu tiên | Trạng thái |
|---|---|---|---|
| — | Nhóm 1: simulate-success gating, admin bootstrap, JWT secret ra env, review `movieId`, lỗi ngày UTC, `?redirect=`, `AuthWatcher`, `secondsRemaining` | — | DONE |
| — | `cancelShowtime` có khoá + hoàn tiền + hoàn voucher (FR-SHOW-02), 4 test integration, `application-test.yaml`, test frontend dùng code thật | — | DONE |
| R-01 | Test không được tạo admin trong DB thật; script QA không có mật khẩu mặc định | P0 | DONE |
| R-02 | Tách `revertUsedVoucherIfPresent` khỏi `releaseVoucherIfPresent` | P0 | DONE |
| R-03 | Bỏ EntityGraph khỏi truy vấn khoá chia sẻ của `createBooking` | P0 | DONE |
| R-04 | Cập nhật SRS: thứ tự khoá mục 4.4, bump v2.4, mục 7.3, changelog | P0 | DONE |
| R-05 | Test không phụ thuộc dữ liệu thật trong DB | P0 | DONE |
| R-06 | `AdminDashboard` dùng `onSearchTextChange` / `onMovieFilterChange` (hoặc xoá hàm + test) | P0 | DONE |
| R-07 | Script QA: ngày theo giờ địa phương, `throw new Error` | P0 | DONE |
| R-08 | Dọn: `BookingMapper`, xoá `SHOWTIME_HAS_ACTIVE_BOOKINGS` | P0 | DONE |
| R-09 | Xoá `[cite: …]` trong SRS | P0 | DONE |
| R-10 | README: hướng dẫn chạy test, biến môi trường cho DB test | P0 | DONE |
| G2-01 | Giới hạn số đơn chờ thanh toán / user | P1 | DONE |
| G2-02 | Ghế/phòng không hoạt động: chặn bán + cập nhật giá | P1 | DONE |
| G2-03 | Hạn chót đặt vé + lọc suất chiếu còn bán | P1 | DONE |
| G2-04 | Phim `ENDED` không còn bán được | P1 | DONE |
| G2-05 | Khách tự hủy vé đã thanh toán (cửa sổ hoàn tiền) | P2 | DONE |
| G2-06 | Báo cáo doanh thu: đếm đúng vé và công suất | P1 | TODO |
| G3-01 | Luật ghế lẻ (orphan seat) | P2 | TODO |
| G3-02 | Ghế đôi (couple) | P2 | BLOCKED (D-01, D-02) |
| G3-03 | `PricingPolicy` (cuối tuần, giờ vàng, suất sáng) | P2 | BLOCKED (D-05) |
| G4-01 | `GlobalExceptionHandler` đủ loại lỗi | P3 | TODO |
| G4-02 | `getShowtimeSeats` chỉ đọc | P3 | TODO |
| G4-03 | Voucher: danh sách công khai vs admin, đơn 0 đồng | P3 | TODO |
| G4-04 | Sơ đồ ghế tự làm mới (polling) | P3 | TODO |
| G4-05 | Trang kết quả thanh toán có trạng thái "đang xác nhận" + lọc `vnp_*` | P3 | TODO |
| G4-06 | Luồng "Modify seats" | P3 | TODO |
| G4-07 | Bảo mật đăng nhập (throttle, mật khẩu ≥ 8) | P3 | BLOCKED (D-06 một phần) |
| G4-08 | Kiểm chứng và sửa cấu hình hạ tầng | P3 | TODO |
| G4-09 | Hiệu năng và dọn dẹp (N+1, page size, `Clock`, audit hoàn tiền) | P3 | TODO |
| G4-10 | Testcontainers + test đồng thời + CI chạy test | P3 | TODO |
| G4-11 | Hoàn thiện tài liệu | P3 | TODO |

**Thứ tự đề xuất:** Phase 0 → G2-01, G2-02, G2-03, G2-06 → (sau khi chốt D-03) G2-04 → (D-05) G3-03 → G3-01 → (D-01/D-02) G3-02 → G2-05 → Nhóm 4. Mỗi task chức năng phải kèm test của nó; G4-10 là hạ tầng test dùng chung và có thể làm sớm hơn nếu muốn.

---

## 3. Bất biến (KHÔNG được phá)

1. **Thứ tự khoá chống deadlock:** `users` (chỉ trong `createBooking`, luôn khoá đầu tiên, xem G2-01) → `showtimes` → `bookings` (ORDER BY id) → `showtime_seats` (ORDER BY id, **một câu lệnh** cho mọi ghế cần khoá) → `vouchers`. IPN và scheduler khoá `bookings → showtime_seats → vouchers` và không khoá `showtimes`.
2. **Giá do server tính.** Request chỉ chứa ID. Giá lưu cứng vào `showtime_seats.price` và `booking_items` tại thời điểm giữ ghế; không bao giờ tin `totalAmount` từ client.
3. **Không xoá cứng dữ liệu lịch sử.** FK `ON DELETE RESTRICT`; không dùng `CASCADE`. Suất chiếu có booking thì chuyển `CANCELLED`, chỉ suất chưa có booking nào mới xoá cứng.
4. **Chỉ IPN (hoặc công cụ dev đã bật `DEV_TOOLS_ENABLED`) mới được xác nhận thanh toán.** Return URL chỉ hiển thị kết quả.
5. **Không secret trong repo.** Không in mật khẩu/secret vào log. `DEV_TOOLS_ENABLED` mặc định `false`.
6. **Idempotency của IPN** (xử lý trước và sau khi khoá) và các nhánh TH1/TH2/TH3 trong `PaymentService.processVnPayIpn` không được đổi hành vi nếu task không yêu cầu.
7. **Mỗi thay đổi hành vi ⇒ SRS đổi theo** (mục 9).

---

## 4. PHASE 0 — Tồn đọng từ lần review thứ 2 (làm trước)

### R-01 — Test không được tạo admin trong DB thật
- **Vấn đề:** `AdminSeeder` là `CommandLineRunner`, chạy khi Spring context khởi động *kể cả trong test*, nằm ngoài transaction của test. `application-test.yaml` đang có `bootstrap-admin` với mật khẩu `Admin123@Password`, nên chạy test sẽ ghi một admin có mật khẩu công khai vào DB mà test đang trỏ tới. `scripts/test-admin-suite.js` cũng đặt mặc định `Admin123@Password`.
- **ĐỌC TRƯỚC:** `backend/src/test/resources/application-test.yaml`, `auth/component/AdminSeeder.java`, `scripts/test-admin-suite.js`.
- **Bước:**
  1. Xoá khối `bootstrap-admin` khỏi `application-test.yaml` (hoặc đặt `email: ""`, `password: ""`). Test tự tạo user cần thiết trong transaction của nó.
  2. Trong `scripts/test-admin-suite.js`: bỏ giá trị mặc định cho `ADMIN_EMAIL` và `ADMIN_PASSWORD`. Nếu thiếu biến thì in hướng dẫn (`ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/test-admin-suite.js`) và `process.exit(2)`.
  3. Cập nhật `run-all-tests.bat` và README (R-10) để nhắc cần hai biến này.
- **Nghiệm thu:** trên DB trống, chạy `./mvnw test` rồi `SELECT COUNT(*) FROM users WHERE role='ADMIN'` trả `0`. Chạy script không có biến môi trường thì thoát với thông báo rõ ràng.

### R-02 — Tách `revertUsedVoucherIfPresent`
- **Vấn đề:** `VoucherService.releaseVoucherIfPresent` hiện còn nhả cả redemption `USED`. Hàm này được gọi ở nhiều luồng (hết hạn, hủy đơn chờ, hủy suất); chỉ luồng hủy suất cho đơn đã thanh toán mới được phép hoàn voucher đã dùng. Gọi nhầm sẽ trả voucher đã dùng cho khách.
- **ĐỌC TRƯỚC:** `voucher/service/VoucherService.java`, `showtime/service/ShowtimeService.cancelShowtime`, `ShowtimeWorkflowIntegrationTest`.
- **Bước:**
  1. `releaseVoucherIfPresent`: chỉ xử lý `RESERVED → RELEASED` (xoá nhánh `USED`).
  2. Thêm `@Transactional public void revertUsedVoucherIfPresent(Booking booking)`: khoá voucher bằng `voucherRepository.findByIdForUpdate`, tìm redemption theo `bookingId`; nếu `USED` thì `RELEASED`, `usedCount - 1` (chỉ khi > 0).
  3. `cancelShowtime`: nhánh `CONFIRMED` gọi `revertUsedVoucherIfPresent`; nhánh `PENDING_PAYMENT` giữ `releaseVoucherIfPresent`.
- **Test:** test integration cũ vẫn xanh; thêm test "release trên redemption `USED` không đổi `usedCount`".
- **Tài liệu:** FR-SHOW-02 không đổi nội dung; chỉ chắc chắn mô tả khớp.

### R-03 — Bỏ EntityGraph khỏi truy vấn khoá chia sẻ
- **Vấn đề:** `ShowtimeRepository.findByIdForReadLock` vừa `PESSIMISTIC_READ` vừa `@EntityGraph(movie, room, room.cinema)`. Trên MySQL, `FOR SHARE` áp lên mọi bảng trong JOIN, nên mỗi `createBooking` giữ khoá chia sẻ cả dòng `movies`, `rooms`, `cinemas`, xung đột với `rooms FOR UPDATE` của FR-SHOW-01 và với admin sửa phim.
- **ĐỌC TRƯỚC:** `showtime/repository/ShowtimeRepository.java`, `booking/service/BookingService.createBooking`.
- **Bước:**
  1. Đổi `findByIdForReadLock` thành `findByIdForShare` chỉ khoá bảng `showtimes` (bỏ `@EntityGraph`).
  2. Trong `createBooking`, sau khi khoá: dùng `showtimeRepository.findDetailById(id)` (đã có) hoặc truy cập lazy trong cùng transaction để lấy movie/room/cinema.
- **Nghiệm thu:** bật `spring.jpa.show-sql`, câu SELECT có `for share` không còn JOIN. Test integration vẫn xanh.

### R-04 — Cập nhật SRS cho khớp thực tế
- **ĐỌC TRƯỚC:** `docs/SRS.md` (mục 4.4, FR-SHOW-02, mục 7.3, dòng tiêu đề phiên bản).
- **Bước:**
  1. Mục 4.4: thêm `showtimes` vào đầu chuỗi khoá cho luồng hủy suất và đặt chia sẻ khoá ở `createBooking`: `showtimes (X ở hủy suất / S ở createBooking) → bookings → showtime_seats → vouchers`.
  2. Tiêu đề: `Phiên bản 2.3` → `2.4`. Thêm mục "Lịch sử thay đổi" ở cuối: v2.3 (FR-DEV-01, NFR-SEC-02, 7.3), v2.4 (FR-SHOW-02, thứ tự khoá).
  3. Mục 7.3: cập nhật "Đã triển khai": thêm hủy suất kèm hoàn tiền, 5 test integration backend (`ShowtimeWorkflowIntegrationTest`), test Vitest và script QA. "Chưa triển khai" giữ: Notification/RabbitMQ, Redis, Swagger, IT-01…IT-04 (xoá dòng nào đã làm khi G4-10 xong).
  4. README: đổi `(v2.3)` thành `(v2.4)`.
- **Nghiệm thu:** `grep -n "Phiên bản" docs/SRS.md` và README cùng một số phiên bản; không còn câu mâu thuẫn với code.

### R-05 — Test không phụ thuộc dữ liệu thật
- **Vấn đề:** `ShowtimeWorkflowIntegrationTest` dùng `roomRepository.findAll().getFirst()`, `movieRepository.findAll()` (toàn bộ catalog seed rất lớn). Kết quả phụ thuộc DB đang có gì.
- **Bước:** trong `@BeforeEach` luôn tạo `Cinema`/`Room`/`Seat` riêng cho test (tên có UUID); tạo `Movie` `NOW_SHOWING` và `ENDED` riêng (đủ cột NOT NULL: `releaseDate`, `ageRating`, `originalLanguage`, `durationMinutes`, `status`). Mọi thứ nằm trong transaction test (tự rollback). Không gọi `findAll()` trên `movies`.
- **Nghiệm thu:** test xanh trên DB mới migrate (không có dữ liệu thêm tay) và trên DB đang có dữ liệu.

### R-06 — `AdminDashboard` dùng hàm đã tách
- **Vấn đề:** `onSearchTextChange` và `onMovieFilterChange` nằm trong `utils/showtimeFilters.js` và được test, nhưng `AdminDashboard` không dùng (có logic riêng), nên test không bảo vệ hành vi thật.
- **Bước:** thay các handler inline của ô tìm kiếm và dropdown phim trong `AdminDashboard` bằng hai hàm này (qua `setShowtimeSearchText`, `setFilterMovieId`… theo tên state hiện có). Nếu hành vi thật khác, sửa hàm + test theo hành vi thật. Không để hàm "chỉ có trong test".
- **Nghiệm thu:** `grep -rn "onSearchTextChange" frontend/src` có kết quả ngoài `utils/` và `test/`.

### R-07 — Script QA: ngày địa phương
- **Vấn đề:** `scripts/test-admin-suite.js` dùng `new Date().toISOString().slice(0,10)` (UTC), đúng loại lỗi đã sửa ở frontend.
- **Bước:** thêm hàm `localDateStr(d = new Date())` (getFullYear/getMonth/getDate, pad 2 chữ số) và dùng cho `todayStr`, `startDate`, `endDate`, `futureDate`. Đổi `throw { isSkip: true, ... }` thành `class SkipError extends Error` có `reason`.
- **Nghiệm thu:** `TZ=Asia/Ho_Chi_Minh node scripts/test-admin-suite.js` lúc 00:30 vẫn dùng đúng ngày địa phương.

### R-08 — Dọn dẹp nhỏ
1. `booking/mapper/BookingMapper.java`: bỏ null-check còn sót ở dòng `showtimeStatus` (khoá ngoại `showtime` không bao giờ null).
2. Tìm `SHOWTIME_HAS_ACTIVE_BOOKINGS` (`grep -rn`). Nếu không còn chỗ dùng thì xoá khỏi `ErrorCode` (để trống số 1311, ghi chú trong CHANGELOG) và xoá câu lưu ý tương ứng trong FR-SHOW-02.

### R-09 — Xoá `[cite: …]` trong SRS
- Chạy `sed -E -i 's/ ?\[cite: ?[0-9, ]+\]//g' docs/SRS.md`, xem `git diff` để chắc chỉ xoá các thẻ trích dẫn, không đụng nội dung.

### R-10 — README
- Thay ghi chú `-DDB_URL=...` bằng hướng dẫn biến môi trường `DB_URL`/`DB_USERNAME`/`DB_PASSWORD`; nêu rõ test integration chạy với profile `test` và cần MySQL; nêu `test:all` cần backend đang chạy và `ADMIN_EMAIL`/`ADMIN_PASSWORD`.

---

## 5. NHÓM 2 — Toàn vẹn dữ liệu và vận hành

### G2-01 — Giới hạn số đơn chờ thanh toán / user
- **Vấn đề:** mới giới hạn 8 ghế mỗi đơn (FR-BOOK-02). Một tài khoản có thể giữ hết ghế nhiều suất liên tục (mỗi lần 10 phút).
- **ĐỌC TRƯỚC:** `booking/service/BookingService.createBooking`, `auth/repository/UserRepository`, `booking/repository/BookingRepository`.
- **Bước:**
  1. `UserRepository`: `@Lock(PESSIMISTIC_WRITE) @Query("SELECT u FROM User u WHERE u.email = :email") Optional<User> findByEmailForUpdate(@Param("email") String email)`.
  2. `BookingRepository`: `long countByUserIdAndStatusAndExpiresAtAfter(Long userId, BookingStatus status, LocalDateTime now)`.
  3. Class `booking/config/BookingProperties` (`app.booking`): `maxPendingPerUser = 2` (thêm vào `application.yaml` dưới `app.booking`).
  4. `createBooking`: thay `findByEmail` bằng `findByEmailForUpdate` (khoá **đầu tiên**, trước khi khoá showtime). Đếm đơn `PENDING_PAYMENT` còn hạn; nếu `>= maxPendingPerUser` ném `TOO_MANY_PENDING_BOOKINGS`.
  5. `ErrorCode.TOO_MANY_PENDING_BOOKINGS(1507, "Please pay or cancel your existing reservations first", HttpStatus.TOO_MANY_REQUESTS)`.
  6. Frontend `SeatSelection.jsx`: bắt mã `1507` hiển thị toast với đường dẫn tới `/my-bookings`.
- **Test:** (a) có 2 đơn chờ → đơn thứ 3 bị 429/1507; (b) đơn quá hạn không tính; (c) 20 request song song cùng user → tối đa `maxPendingPerUser` thành công (làm trong G4-10 nếu chưa có Testcontainers).
- **Tài liệu:** thêm **FR-BOOK-04** "Giới hạn đơn chờ thanh toán" (lỗi 429, nghiệm thu như trên); bổ sung vào danh sách lỗi của FR-BOOK-02.

### G2-02 — Ghế/phòng không hoạt động
- **Vấn đề:** `createBooking` chỉ kiểm tra `status` của `showtime_seats`, không kiểm tra `seats.is_active`. Đổi loại ghế không cập nhật giá các suất đã tạo. Tắt phòng không ảnh hưởng suất đã tạo.
- **ĐỌC TRƯỚC:** `booking/service/BookingService` (vòng lặp kiểm tra ghế), `showtime/service/RoomService.batchUpdateSeats` và `toggleRoomStatus`, `showtime/service/ShowtimeService.getShowtimeSeats`, `ShowtimeSeatResponse`, `ShowtimeSeatRepository`.
- **Bước:**
  1. `createBooking`: nếu `!Boolean.TRUE.equals(ss.getSeat().getIsActive())` ném `SEAT_NOT_AVAILABLE`.
  2. `getShowtimeSeats`: ghế `is_active = false` trả về trạng thái hiển thị không chọn được (nếu `ShowtimeSeatResponse` chưa có cách biểu diễn, thêm `boolean selectable` và cập nhật `SeatSelection.jsx`).
  3. `RoomService.batchUpdateSeats`: khi đổi `type` của ghế, (a) từ chối nếu tồn tại `showtime_seats` của ghế đó ở suất `SCHEDULED` tương lai đang `HELD`/`BOOKED`; (b) với các hàng `AVAILABLE` của suất tương lai, cập nhật `price = type.calculatePrice(showtime.getBasePrice())` (đọc `Showtime` để lấy đúng tên trường giá cơ sở). Thêm repository method `findFutureAvailableBySeatId(Long seatId, LocalDateTime now)`. Khi G3-03 xong, đổi sang `PricingPolicy`.
  4. `toggleRoomStatus(id, false)`: nếu còn suất `SCHEDULED` tương lai trong phòng thì ném `ROOM_HAS_FUTURE_SHOWTIMES(1312, ..., CONFLICT)` (thêm `ShowtimeRepository.existsByRoomIdAndStatusAndStartTimeAfter`).
- **Test:** ghế tắt không đặt được; đổi VIP → giá suất tương lai `AVAILABLE` đổi, ghế `HELD` thì bị chặn; tắt phòng còn suất tương lai bị 409.
- **Tài liệu:** bổ sung lỗi vào FR-BOOK-02; thêm điều kiện "phòng không có suất tương lai khi tắt" vào mô tả phòng/FR-SHOW-01.

### G2-03 — Hạn chót đặt vé và danh sách suất còn bán
- **Vấn đề:** chỉ kiểm tra `startTime > now`; khách mua được vé 10 giây trước giờ chiếu. Danh sách công khai vẫn hiện suất đã bắt đầu.
- **ĐỌC TRƯỚC:** `BookingService.createBooking`, `showtime/controller/ShowtimeController` (`GET /showtimes`), `ShowtimeRepository.searchShowtimes`, `frontend/src/api/movieApi.js` (`getShowtimes`), `Home.jsx`, `MovieDetail.jsx`, `SeatSelection.jsx`.
- **Bước:**
  1. `BookingProperties.cutoffMinutes = 15` (`app.booking.cutoff-minutes`).
  2. `createBooking`: điều kiện cho phép = `showtime.status == SCHEDULED && now.isBefore(startTime.minusMinutes(cutoff))`; ngược lại `SHOWTIME_NOT_AVAILABLE_FOR_BOOKING`. Sửa message của mã 1502: "Showtime is cancelled or the booking window has closed".
  3. `GET /showtimes`: thêm `@RequestParam(defaultValue = "false") boolean bookableOnly`; khi `true`, thêm điều kiện `s.startTime > :bookableAfter` (= `now + cutoff`) vào `searchShowtimes`.
  4. Frontend: `movieApi.getShowtimes` truyền `bookableOnly: true` ở Home/MovieDetail; admin không truyền. `SeatSelection` hiển thị trạng thái "Đã đóng bán vé" khi nhận mã 1502.
- **Test:** suất bắt đầu sau 10 phút → từ chối; sau 20 phút → cho phép; `bookableOnly=true` ẩn suất đã qua mốc.
- **Tài liệu:** thêm **FR-BOOK-05** "Hạn chót đặt vé"; cập nhật mô tả `GET /showtimes`.

### G2-04 — Phim `ENDED` (DONE)
- **ĐỌC TRƯỚC:** `movie/service/MovieService.discontinueMovie`, `ShowtimeService.createShowtime` (đã chặn tạo suất cho phim `ENDED`), `AdminDashboard` (tab Ended).
- **Bước (theo phương án mặc định "chặn"):**
  1. `ShowtimeRepository.existsByMovieIdAndStatusAndStartTimeAfter(Long movieId, ShowtimeStatus status, LocalDateTime time)`.
  2. `discontinueMovie`: nếu còn suất `SCHEDULED` tương lai thì ném `MOVIE_HAS_FUTURE_SHOWTIMES(1207, ..., CONFLICT)`; admin phải hủy suất trước.
  3. `createBooking`: thêm `showtime.getMovie().getStatus() == MovieStatus.ENDED` → `SHOWTIME_NOT_AVAILABLE_FOR_BOOKING` (phòng thủ nhiều lớp).
- **Test:** kết thúc phim còn suất tương lai → 409; hủy suất rồi kết thúc → thành công.
- **Tài liệu:** thêm quy tắc vào mô tả Movie và FR-SHOW-01.

### G2-05 — Khách tự hủy vé đã thanh toán (DONE)
- **ĐỌC TRƯỚC:** `BookingController`, `BookingService.cancelBooking`, `ShowtimeService.cancelShowtime` (cách đã xử lý hoàn tiền), `MyBookings.jsx`.
- **Bước:**
  1. `BookingProperties.refundCutoffMinutes = 60`.
  2. `BookingService.cancelConfirmedBooking(String userEmail, Long bookingId)` `@Transactional`: khoá `bookings` → `showtime_seats` (qua `findByHeldByBookingIdForUpdate`) → voucher. Chỉ chủ đơn hoặc ADMIN; trạng thái phải `CONFIRMED`; `now.isBefore(startTime.minusMinutes(refundCutoff))` nếu không ném `BOOKING_CANCELLATION_WINDOW_CLOSED(1508, ..., CONFLICT)`. Ghế → `AVAILABLE`, `held_by_booking_id = null`; payment `SUCCESS` + `NONE` → `REFUND_REQUIRED`; `revertUsedVoucherIfPresent`; booking → `CANCELLED`.
  3. Endpoint `POST /api/v1/bookings/{id}/cancel-confirmed` (theo quy ước controller hiện có).
  4. `MyBookings.jsx`: nút "Cancel & request refund" chỉ hiện khi còn trong cửa sổ; sau khi hủy hiển thị "Đang chờ hoàn tiền".
- **Test:** trong cửa sổ → hủy thành công và REFUND_REQUIRED; ngoài cửa sổ → 409; người khác hủy → 403.
- **Tài liệu:** thêm **FR-BOOK-08**.

### G2-06 — Báo cáo doanh thu đúng KPI
- **Vấn đề:** `PaymentService.getRevenueReport` đếm số booking/payment thay vì số ghế, và công suất dùng hằng số 25 ghế.
- **ĐỌC TRƯỚC:** `PaymentService.getRevenueReport`, `RevenueReportResponse`, các repository liên quan, tab Revenue trong `AdminDashboard.jsx`. **Giữ nguyên tên field của DTO** để frontend không vỡ.
- **Bước:**
  1. `BookingItemRepository`: truy vấn số vé theo phim — chỉ tính booking `CONFIRMED` có payment `SUCCESS` và `refund_status = NONE` trong khoảng `pay_date`.
  2. `ShowtimeSeatRepository`: tổng số ghế (`COUNT`) theo phim của các suất `SCHEDULED` có `start_time` trong khoảng.
  3. `occupancy = tickets / capacity * 100`, làm tròn 1 chữ số, `0` nếu `capacity = 0`; `totalTicketsSold = tổng số vé`.
  4. UI ghi rõ doanh thu tính theo ngày thanh toán, công suất tính theo ngày chiếu.
- **Test:** suất 25 ghế, 2 đơn (3 ghế + 2 ghế) → tickets = 5, occupancy = 20.0%; đơn `REFUND_REQUIRED` không tính.
- **Tài liệu:** cập nhật FR-REP-01 (định nghĩa vé, công suất, hai cửa sổ thời gian).

---

## 6. NHÓM 3 — Luật sơ đồ ghế và giá

### G3-01 — Luật ghế lẻ (orphan seat)
- **Quy tắc:** sau khi đặt, không được để lại một ghế trống đơn lẻ bị kẹp giữa ghế đã chiếm/lối đi/mép hàng, **trừ** những ghế lẻ đã tồn tại sẵn trước lần đặt này (không phạt khách vì lỗi người khác).
- **ĐỌC TRƯỚC:** `BookingService.createBooking` (cách khoá ghế), `ShowtimeSeatRepository`, `SeatSelection.jsx`.
- **Bước:**
  1. Tạo `booking/component/SeatGapValidator` (`@Component`, hàm thuần): `void validate(List<ShowtimeSeat> rowSeats, Set<Long> selectedIds)`. Nhóm theo `seat.rowName`, sắp theo `seatNumber`. Ghế "đã chiếm" = `status != AVAILABLE` hoặc đã được chọn hoặc ghế không hoạt động. Ghế liền kề chỉ khi `seatNumber` chênh đúng 1 (khoảng nhảy = lối đi). `orphans(row, ∅)` là tập trước, `orphans(row, selected)` là tập sau; nếu `sau − trước ≠ ∅` ném `SEAT_ORPHAN_GAP`.
  2. **Khoá:** xác định các hàng chứa ghế được chọn (một lần đọc thường), sau đó khoá **toàn bộ ghế của các hàng đó** bằng *một* câu `ORDER BY ss.id` (`ShowtimeSeatRepository.lockRows(showtimeId, rows)`), thay cho câu khoá theo danh sách ID hiện tại; kiểm tra ghế yêu cầu ⊂ tập đã khoá. Không tách thành hai lượt khoá (phá bất biến 1).
  3. `ErrorCode.SEAT_ORPHAN_GAP(1509, "Your selection would leave a single isolated seat", HttpStatus.CONFLICT)`. Bật/tắt bằng `app.booking.orphan-seat-rule-enabled` (mặc định `true`).
  4. Frontend: `utils/seatGap.js` (cùng thuật toán) để cảnh báo trước khi bấm giữ ghế; backend vẫn là nguồn quyết định.
- **Test (bảng ca, hàng A1..A8 trống):** chọn A2 → từ chối (A1 kẹt ở mép); chọn A1–A2 → cho phép; chọn A3–A4 khi A1–A2 đã chiếm → cho phép; chọn A4 khi A3 và A5 đã chiếm → cho phép (không để lại ghế trống); chọn A2 khi A1 đã chiếm → cho phép; ghế lẻ có sẵn trước đó không làm khách khác bị từ chối. Thêm test Vitest cho `seatGap.js` với cùng bảng ca.
- **Tài liệu:** thêm **FR-BOOK-06**; cập nhật FR-BOOK-02 (bước khoá theo hàng).

### G3-02 — Ghế đôi (BLOCKED bởi D-01, D-02)
- **Phương án A (mỗi sofa = 2 hàng trong `seats`):**
  1. Migration `V3__seat_pair_group.sql`: `ALTER TABLE seats ADD COLUMN pair_group INT NULL; CREATE INDEX idx_seats_room_pair ON seats (room_id, pair_group);`
  2. `Seat` thêm `Integer pairGroup`; `SeatResponse`/`SeatBatchUpdateRequest` thêm trường tương ứng (đọc DTO trước, giữ tương thích).
  3. `RoomService.batchUpdateSeats`: ghế `COUPLE` phải đi theo cặp liền kề cùng hàng, cùng `pairGroup`; sai thì `VALIDATION_ERROR`.
  4. `createBooking`: nhóm ghế `COUPLE` được chọn theo `pairGroup`; mỗi nhóm phải đủ 2 ghế, nếu không ném `COUPLE_SEAT_MUST_BE_PAIR(1510, ..., CONFLICT)`.
  5. Giá: theo D-02.
  6. Frontend `SeatSelection`: chọn một ghế đôi thì tự chọn cả cặp; bỏ chọn bỏ cả cặp.
  7. `SeatGapValidator` (G3-01) coi một cặp là một đơn vị.
- **Phương án B (mỗi sofa = 1 hàng):** không cần migration; giữ hệ số giá theo D-02, chỉ làm rõ UI ("1 ghế = 2 người") và tài liệu.
- **Tài liệu:** thêm **FR-BOOK-07**; cập nhật mô tả bảng `seats` nếu chọn A.

### G3-03 — `PricingPolicy` (BLOCKED bởi D-05)
- **Vấn đề:** `SeatType` gán cứng VIP +20.000, COUPLE ×2; không có phụ thu cuối tuần/giờ vàng; legend ở `SeatSelection.jsx` tự tính lại các hằng số.
- **ĐỌC TRƯỚC:** `showtime/enums/SeatType.java`, `ShowtimeService.createShowtime` và nhánh khởi tạo kho ghế, `ShowtimeResponse`, `SeatSelection.jsx` (legend).
- **Bước:**
  1. `showtime/config/PricingProperties` (`app.pricing`): `vipSurcharge`, `weekendSurcharge`, `primeTimeSurcharge`, `matineeDiscount`, `primeStartHour`, `primeEndHour`, `matineeEndHour`.
  2. `showtime/component/PricingPolicy`: `long effectiveBase(long base, LocalDateTime start)` và `long seatPrice(SeatType type, long effectiveBase)`; không âm giá.
  3. Thay mọi chỗ gọi `SeatType.calculatePrice` bằng `PricingPolicy` (tạo suất, khởi tạo kho ghế, G2-02).
  4. `ShowtimeResponse` thêm bảng giá theo loại ghế (ví dụ `Map<SeatType, Long> seatTypePrices`); legend frontend đọc từ đây, xoá `basePrice + 20000` và `basePrice * 2`.
  5. Giá đã lưu ở `showtime_seats.price` không đổi sau khi tạo (bất biến 2).
- **Test:** `PricingPolicyTest` dạng bảng (thứ 2 sáng, thứ 6 tối, chủ nhật, VIP, COUPLE); test legend.
- **Tài liệu:** thêm **FR-PRICE-01**; ghi chú vào FR-SHOW-01.

---

## 7. NHÓM 4 — Dọn dẹp, chất lượng, kiểm thử

### G4-01 — `GlobalExceptionHandler`
- **ĐỌC TRƯỚC:** `common/exception/GlobalExceptionHandler.java`, `ApiResponse`.
- **Bước:** thêm `ErrorCode.DATA_CONFLICT(1005, ..., CONFLICT)` và `MALFORMED_REQUEST(1006, ..., BAD_REQUEST)`. Handler cho: `DataIntegrityViolationException` → 409; `HttpMessageNotReadableException`, `MethodArgumentTypeMismatchException`, `MissingServletRequestParameterException` → 400; các lỗi Spring có sẵn status (`NoResourceFoundException`, `HttpRequestMethodNotSupportedException`, `HttpMediaTypeNotSupportedException`) giữ nguyên status qua `ErrorResponse`. Log `warn` cho 4xx, `error` cho 5xx. Không để lộ message nội bộ của DB ra client.
- **Test:** `MockMvc` gửi JSON sai, enum sai, thiếu tham số, đường dẫn không tồn tại → status đúng, không phải 500.

### G4-02 — `getShowtimeSeats` chỉ đọc
- **Vấn đề:** `getShowtimeSeats` là `@Transactional` ghi dữ liệu (tạo kho ghế lười) trên một GET công khai; hai khách đầu tiên cùng lúc có thể va unique key.
- **Bước:** đổi thành `@Transactional(readOnly = true)`, bỏ phần tạo kho ghế khi rỗng (kho đã được tạo ở `createShowtime`). Nếu cần sửa dữ liệu cũ, tạo endpoint ADMIN riêng, khoá `showtimes` (X).
- **Test:** gọi song song 20 lần lên suất chưa có kho → không có exception, không ghi dữ liệu.

### G4-03 — Voucher
- **Vấn đề:** `GET /vouchers` công khai trả cả voucher không hoạt động và số liệu hạn mức. Đơn có tổng 0 đồng không thể đi qua VNPay.
- **ĐỌC TRƯỚC:** `voucher/controller/VoucherController`, `SecurityConfig` (matcher `GET /api/v1/vouchers/**`), `PaymentService.createVnPayPaymentUrl`, `SeatSelection.jsx`.
- **Bước:** `GET /vouchers` chỉ trả voucher `isActive`, trong thời hạn và chưa hết lượt; thêm `GET /vouchers/admin` (ADMIN) trả đầy đủ và cập nhật `AdminDashboard`. Giới hạn tần suất cho `GET /vouchers/code/{code}`. Với `finalAmount == 0` xử lý như xác nhận ngay (khoá ghế → `BOOKED`, `confirmVoucherIfPresent`, booking `CONFIRMED`, không gọi gateway) — chỉ làm khi đã ĐỌC kỹ luồng hiện tại và SRS FR-PAY-01.
- **Tài liệu:** cập nhật FR-VOUC-01 và FR-PAY-01.

### G4-04 — Sơ đồ ghế tự làm mới
- **Bước:** tạo `frontend/src/hooks/useSeatMapPolling.js` (thư mục `hooks/` tạo nếu chưa có). Chu kỳ 8 giây, tạm dừng khi `document.hidden`, giữ dữ liệu cũ nếu request lỗi, chỉ cập nhật state khi dữ liệu đổi. Khi ghế đang chọn bị người khác lấy: bỏ khỏi danh sách chọn và hiện toast "Seat X was just taken". Dọn interval khi unmount.
- **Test:** Vitest với fake timers (gọi lại sau 8s, dừng khi hidden, bỏ ghế bị lấy).

### G4-05 — Kết quả thanh toán và chữ ký VNPay
- **ĐỌC TRƯỚC:** `PaymentResult.jsx`, `VnPayReturnResponse`, `PaymentController` (`vnpay-return`, `vnpay-ipn`), `VnPayUtil.verifySignature`.
- **Bước:**
  1. Backend: chỉ lấy tham số bắt đầu bằng `vnp_` khi tạo chuỗi băm/kiểm chữ ký (cả `vnpay-return` và `vnpay-ipn`).
  2. Frontend: ba trạng thái `success` / `processing` / `failed`. Cổng báo thành công nhưng booking còn `PENDING_PAYMENT` ⇒ `processing` ("Đã nhận thanh toán, đang xác nhận ghế…"), polling tối đa ~30 giây với backoff, có nút "Kiểm tra lại".
- **Test:** unit test lọc `vnp_*` (thêm tham số lạ không làm sai chữ ký); test trạng thái `processing` ở frontend.

### G4-06 — Luồng "Modify seats"
- **ĐỌC TRƯỚC:** nút "Modify Selected Seats" ở `Payment.jsx` và logic chọn ghế ở `SeatSelection.jsx`.
- **Bước:** gọi hủy đơn chờ (`bookingApi.cancelBooking`) trước khi quay lại chọn ghế, hoặc cho phép ghế `HELD` của chính đơn hiện tại được chọn lại. Chọn một cách và ghi vào SRS FR-BOOK-02.

### G4-07 — Bảo mật đăng nhập (một phần BLOCKED bởi D-06)
- **Bước:**
  1. Throttle đăng nhập sai theo email (5 lần/15 phút): thêm `ErrorCode.TOO_MANY_LOGIN_ATTEMPTS(1105, ..., TOO_MANY_REQUESTS)`; dùng `ConcurrentHashMap` kèm dọn định kỳ hoặc thêm phụ thuộc Caffeine.
  2. Mật khẩu tối thiểu 8 ký tự ở `RegisterRequest` và form đăng ký; cập nhật SRS NFR-SEC-01.
  3. JWT hiện lưu `localStorage`: giữ nguyên nếu D-06 = giữ; ghi rõ rủi ro XSS trong README.
- **Test:** 6 lần sai liên tiếp → 429; đăng nhập đúng reset bộ đếm.

### G4-08 — Kiểm chứng và sửa cấu hình hạ tầng (kiểm chứng trước, sửa sau)
- **ĐỌC TRƯỚC:** `common/config/AppConfig.java` (bean `ObjectMapper`), `TimeZoneConfig`, các `@QueryHints(lock.timeout)`.
- **Bước:** (1) Nếu bean `ObjectMapper` tự tạo làm mất module JSR-310 hoặc `spring.jackson.*`, xoá bean và inject mapper của Boot. (2) Đặt múi giờ qua `spring.jpa.properties.hibernate.jdbc.time_zone=Asia/Ho_Chi_Minh`, `spring.jackson.time-zone=Asia/Ho_Chi_Minh` và JVM arg `-Duser.timezone=Asia/Ho_Chi_Minh` thay cho `@PostConstruct`. (3) Kiểm tra bằng test thực tế xem `jakarta.persistence.lock.timeout` có hiệu lực với MySQL; nếu không, đặt `spring.datasource.hikari.connection-init-sql=SET SESSION innodb_lock_wait_timeout=5`. Chỉ đổi khi đã có bằng chứng; ghi kết quả vào PR.

### G4-09 — Hiệu năng và dọn dẹp
1. N+1 ở `BookingService.getMyBookings`: thêm `BookingItemRepository.findByBookingIdIn(Collection<Long> ids)` với `@EntityGraph(showtimeSeat, showtimeSeat.seat)`, gom theo `bookingId`.
2. `MovieController`: giới hạn `size` tối đa 100 (hiện `@Max(1000)`); kiểm tra frontend phân trang theo đó.
3. Migration `V4__payment_refund_audit.sql`: thêm `refunded_at DATETIME NULL, refunded_by BIGINT NULL, refund_note VARCHAR(255) NULL` vào `payments`; `confirmManualRefund` điền từ người dùng đang đăng nhập; `PaymentResponse` và `AdminDashboard` hiển thị.
4. Bean `Clock` (`Asia/Ho_Chi_Minh`) và thay dần `LocalDateTime.now()` trong `BookingService`, `PaymentService`, scheduler, review để test xác định được thời gian.
5. Đưa TTL giữ ghế (10 phút) vào `BookingProperties` (đọc trước mọi chỗ đang hard-code 10).
6. (Tùy chọn) thời gian quảng cáo/trailer: thêm `ads_minutes` cho suất chiếu, `end_time = start + ads + duration` — **chỉ khi** cập nhật FR-SHOW-01 đồng thời.

### G4-10 — Testcontainers, test đồng thời, CI
- **Phụ thuộc test:** `org.testcontainers:mysql`, `org.testcontainers:junit-jupiter`, `spring-boot-testcontainers`.
- **Bước:** tạo lớp nền `AbstractMySqlIT` dùng container MySQL 8, `@DynamicPropertySource` đặt URL/user/password, profile `test`, Flyway chạy migration. Test đồng thời **không** gắn `@Transactional` ở cấp class (mỗi luồng một transaction thật); dọn dữ liệu trong `@AfterEach`. Dùng `ExecutorService` + `CountDownLatch` để các luồng bắt đầu cùng lúc.
- **Các test bắt buộc:**
  1. `SeatHoldingConcurrencyIT`: 50 luồng cùng giữ ghế A1 → đúng 1 booking, 49 nhận `SEAT_NOT_AVAILABLE` (đúng tiêu chí nghiệm thu FR-BOOK-02).
  2. `ShowtimeOverlapConcurrencyIT`: 2 admin tạo 2 suất giao giờ cùng phòng → chỉ 1 thành công (FR-SHOW-01).
  3. `IpnVsCancelShowtimeIT`: IPN thành công chạy đua với `cancelShowtime`; bất biến sau cùng: **không có** booking `CANCELLED` mà payment `SUCCESS` với `refund_status = NONE`; không có ghế `BOOKED` thuộc suất `CANCELLED`.
  4. `PendingCapConcurrencyIT` (G2-01) và `VoucherLimitConcurrencyIT` (voucher giới hạn lượt không bị rút quá).
- **CI:** `.github/workflows/ci.yml` hiện build với `-DskipTests`. Đổi để backend chạy `./mvnw verify` (runner GitHub có Docker) và frontend chạy `npm test`. `scripts/test-admin-suite.js` không chạy trong CI mặc định.
- **Tài liệu:** cập nhật SRS 7.3 (đánh dấu IT-01…IT-04 đã có) và README.

### G4-11 — Hoàn thiện tài liệu
- Cập nhật `README.md` (tính năng, cách chạy, cách test, bảng biến môi trường), `docs/SRS.md` (phiên bản mới + lịch sử), `docs/CHANGELOG.md`. Kiểm tra mọi FR được nhắc trong README có tồn tại trong SRS.

---

## 8. Quyết định cần chốt (Decision log)

| ID | Câu hỏi | Mặc định đề xuất | Chốt |
|---|---|---|---|
| D-01 | Sofa đôi là 2 hàng trong bảng `seats` (A) hay 1 hàng (B)? | A nếu sơ đồ phòng vẽ từng ghế riêng | Phương án A (ghép cặp qua pair_group) |
| D-02 | Giá ghế đôi: mỗi ghế = giá cơ sở × 2 (hiện tại) hay mỗi ghế = giá cơ sở (cặp = 2×)? | Mỗi ghế = giá cơ sở × hệ số cấu hình | Mỗi ghế = giá cơ sở (cặp = tổng 2 ghế) |
| D-03 | Kết thúc phim còn suất tương lai: chặn hay tự hủy các suất đó? | Chặn kèm thông báo | Chặn kèm thông báo (409 Conflict) [ĐÃ CHỐT] |
| D-04 | Có cho khách tự hủy vé đã thanh toán không? Hạn chót bao lâu? | Có, trước giờ chiếu 60 phút | Có, trước giờ chiếu 60 phút [ĐÃ CHỐT] |
| D-05 | Quy tắc giá: phụ thu cuối tuần (Thứ 6–CN hay Thứ 7–CN?), giờ vàng (18:00–22:00?), giảm suất sáng (trước 12:00?) và số tiền | Theo `PricingProperties` mặc định | Theo `PricingProperties` (T7-CN +15k, tối +10k, sáng -10k) |
| D-06 | JWT lưu `localStorage` (hiện tại) hay cookie HttpOnly? | Giữ `localStorage`, ghi rủi ro vào README | Giữ `localStorage`, ghi nhận rủi ro XSS |

## 9. Quy trình đồng bộ tài liệu

Mỗi task đổi hành vi phải làm đủ:
1. **SRS:** thêm/sửa mục FR/NFR tương ứng theo mẫu của file (tên, mô tả, "• Lỗi:", "• Nghiệm thu:"). Mã mới theo bảng: `FR-BOOK-04` đơn chờ, `FR-BOOK-05` hạn chót, `FR-BOOK-06` ghế lẻ, `FR-BOOK-07` ghế đôi, `FR-BOOK-08` hủy vé đã thanh toán, `FR-PRICE-01` chính sách giá. Task nào sửa mục sẵn có (FR-BOOK-02, FR-REP-01, FR-VOUC-01, FR-PAY-01) thì sửa tại chỗ.
2. Tăng số phiên bản SRS khi thêm FR/NFR (v2.4 → v2.5 …) và thêm dòng vào "Lịch sử thay đổi".
3. Cập nhật danh sách "Specification Compliance" trong README và số phiên bản SRS.
4. Cập nhật mục 7.3 SRS nếu trạng thái triển khai đổi.
5. Cập nhật `docs/CHANGELOG.md`.
6. Mã lỗi mới: ghi vào mục "• Lỗi:" của FR liên quan, đúng số trong `ErrorCode`.

---

## 10. Lệnh kiểm tra

```bash
# Backend (cần MySQL đang chạy; profile test dùng application-test.yaml)
cd backend && ./mvnw clean verify

# Frontend
cd frontend && npm ci && npm run lint && npm test && npm run build

# QA API (cần backend đang chạy + tài khoản admin)
ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/test-admin-suite.js

# Kiểm tra không còn secret / mã chết
grep -rn "Admin123" --include=* . | grep -v node_modules
grep -rn "SHOWTIME_HAS_ACTIVE_BOOKINGS" backend/src
```
