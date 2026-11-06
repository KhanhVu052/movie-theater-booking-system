# Changelog

Định dạng: `YYYY-MM-DD — ID task — Tóm tắt một câu về việc đã làm — SRS mục tương ứng (nếu có)`

- 2026-11-06 — G4-04, G4-05, G4-06 — Triển khai hook useSeatMapPolling làm mới sơ đồ ghế mỗi 8s & tự nhả ghế bị người khác giữ, lọc tham số vnp_* trong VnPayUtil chống nhiễu chữ ký số, bổ sung trạng thái processing & Exponential Backoff (2s, 4s, 8s, 16s) tại PaymentResult, và hủy đơn PENDING_PAYMENT an toàn khi bấm Modify Selected Seats — G4-04, G4-05, G4-06, FR-BOOK-02, FR-PAY-01
- 2026-11-06 — FA-03, FA-04 — Vá kẽ hở tài khoản bị vô hiệu hóa isActive=false trong CustomUserDetailsService & BookingService, cấu hình HikariCP connection-timeout 10000ms & Jackson time-zone, tách biệt endpoint Voucher công khai vs /api/v1/vouchers/admin, tự động xác nhận đơn hàng 0 đồng (CONFIRMED & ghế BOOKED) và điều hướng thẳng tới /my-bookings — FA-03, FA-04, G4-03, G4-08, FR-VOUCH-01, FR-BOOK-02
- 2026-11-06 — FA-01, FA-02 — Kế thừa AbstractMySqlIT trong MovieTheaterBookingSystemApplicationTests giúp CI xanh, bổ sung đủ 5 bài test đồng thời & timeout Testcontainers (PendingCapConcurrencyIT, VoucherLimitConcurrencyIT, IpnVsCancelShowtimeIT, CancelConfirmedVsCancelShowtimeIT, LockWaitTimeoutIT) — AF-07, AF-13, G4-10, NFR-CONC-01, NFR-TEST-01
- 2026-11-06 — AF-11, AF-13, AF-16, AF-14, AF-17 — Chuẩn hóa logic báo cáo doanh thu FR-REP-01 (tỷ lệ lấp đầy tính trên cửa sổ start_time của suất SCHEDULED, chỉ tính ghế ss.seat.isActive = true, bỏ Math.min 100.0, bỏ số suất chiếu giả khi capacity = 0 per D-10), ép innodb_lock_wait_timeout <= 5s, hoàn thiện GlobalExceptionHandler (1004, 1005, 1006), dọn dẹp getShowtimeSeats chỉ đọc và khử N+1 trong getMyBookings, nâng toàn bộ tài liệu lên SRS v3.3 — FR-REP-01, NFR-CONC-01, G4-01, G4-02, G4-09, SRS v3.3
- 2026-11-06 — AF-08, AF-09, AF-15 — Đưa tham số hardcode ra BookingProperties (@Min(1) @Max(10) holdMinutes per D-09, scheduler) và ShowtimeProperties (cleaningMinutes), xóa logic tính giá cứng trong enum SeatType, hiển thị giá đóng băng từ kho showtime_seats qua projection và chuyển mảng priceTags DTO cho Frontend, bóc tách hàm ánh xạ sang utils/priceTags.js và chuẩn hóa test vitest — FR-BOOK-02, FR-SHOW-01, FR-PRICE-01

- 2026-11-06 — AF-10, AF-06 — Triển khai khóa luồng Admin chống race condition (movies S/X -> rooms X -> showtimes), ShowtimeService.cancelShowtime luôn hủy mềm (bảo toàn lịch sử), chặn hủy suất chiếu đã bắt đầu với mã 1313, xóa hoàn toàn hàm hard delete deleteByShowtimeId (D-08 [ĐÃ CHỐT]) — FR-SHOW-01, FR-SHOW-02, Mục 4.4, NFR-DATA-01
- 2026-11-06 — AF-05, AF-04 — Đồng bộ luật ghế lẻ giữa Client/Server qua bộ test fixture chung docs/fixtures/seat-gap-cases.json, kiểm tra nghiêm ngặt cấu hình ghế đôi (mã 1511), chặn bán ghế COUPLE thiếu pairGroup và loại bỏ triệt để logic tự ghép chẵn/lẻ dự phòng (D-07 [ĐÃ CHỐT]) — FR-BOOK-01, FR-SEAT-02
- 2026-11-06 — AF-07, AF-01, AF-12, AF-03 — Triển khai hạ tầng test đồng thời (Testcontainers MySQL 8, AbstractMySqlIT), khắc phục stale snapshot và đảo thứ tự khóa trước validate sau trong createBooking, loại bỏ JOIN FETCH khi FOR UPDATE để tránh khóa lan sang bảng seats, chống ghi đè ghế HELD trong RoomService qua repriceIfAvailable — FR-BOOK-02, Mục 4.4, NFR-CONC-01
- 2026-11-06 — AF-02 — Xóa secret và mật khẩu cứng trong run-backend.bat, nạp cấu hình từ .env và cập nhật hướng dẫn khởi chạy — NFR-SEC-02
- 2026-11-06 — G3-03 — Áp dụng ma trận giá tự động (Pricing Policy) theo loại ghế, ngày cuối tuần và khung giờ — SRS v3.2 (FR-PRICE-01)
- 2026-11-06 — G3-02 — Ghế đôi (Couple Seats): bắt buộc chọn nguyên cặp & tính giá chuẩn theo pair_group — SRS v3.1 (FR-SEAT-02, FR-BOOK-07)
- 2026-11-06 — G3-01 — Luật ghế lẻ (Orphan Seat Detection): chặn đặt vé để lại 1 ghế trống đơn độc — SRS v3.0 (FR-BOOK-01)
- 2026-11-06 — G2-06 — Báo cáo doanh thu: đếm đúng số vé và công suất ghế thực tế — SRS v2.9 (FR-REP-01)
- 2026-11-06 — G2-05 — Cho phép khách tự hủy vé đã thanh toán trước giờ chiếu 60 phút — SRS v2.8 (FR-BOOK-08)
- 2026-11-06 — G2-04 — Chặn kết thúc phim khi còn suất tương lai & chặn đặt vé phim đã kết thúc — SRS v2.7 (FR-SHOW-01, FR-BOOK-02)
- 2026-11-06 — G2-03 — Hạn chót đặt vé 15 phút trước giờ chiếu & lọc suất còn bán — SRS v2.6 (FR-BOOK-05)
- 2026-11-06 — G2-02 — Ghế/phòng không hoạt động: chặn bán + cập nhật giá suất tương lai — SRS v2.5 (FR-BOOK-02, FR-SHOW-01)
- 2026-11-06 — G2-01 — Giới hạn số đơn chờ thanh toán tối đa 2 đơn/user — SRS v2.5 (FR-BOOK-04)
- 2026-11-06 — R-01 — Xóa email/password admin mặc định trong application-test.yaml; script QA bắt buộc nhận biến môi trường ADMIN_EMAIL và ADMIN_PASSWORD (thoát mã 2 nếu thiếu) — NFR-SEC-02
- 2026-11-06 — R-02 — Tách riêng revertUsedVoucherIfPresent (USED -> RELEASED, giảm usedCount) khỏi releaseVoucherIfPresent (RESERVED -> RELEASED, giảm reservedCount) trong VoucherService và ShowtimeService — FR-SHOW-02, Mục 4.4
- 2026-11-06 — R-03 — Bỏ @EntityGraph khỏi findByIdForShare trong ShowtimeRepository để chỉ khóa dòng showtimes khi createBooking, tránh khóa lan sang movies/rooms/cinemas — FR-BOOK-02, Mục 4.4
- 2026-11-06 — R-04 — Cập nhật SRS v2.4 (Mục 4.4 thứ tự khóa có showtimes ở đầu, Mục 7.3 trạng thái triển khai, Mục 8 Lịch sử thay đổi) và đồng bộ README.md — SRS v2.4, Mục 4.4, Mục 7.3
- 2026-11-06 — R-05 — Viết lại ShowtimeWorkflowIntegrationTest với fixtures cô lập (UUID cinema/room/seats/movies), không gọi findAll(), thêm test xác minh release không hoàn voucher USED — FR-SHOW-02
- 2026-11-06 — R-06 — Tích hợp onSearchTextChange và onMovieFilterChange từ utils/showtimeFilters.js vào AdminDashboard.jsx thay thế handler inline — FR-SHOW-01
- 2026-11-06 — R-07 — Sửa script test-admin-suite.js dùng localDateStr() theo múi giờ địa phương và kế thừa SkipError extends Error — FR-SHOW-01, FR-REP-01
- 2026-11-06 — R-08 — Dọn bỏ null-check showtime thừa trong BookingMapper và xóa hoàn toàn mã lỗi deprecated SHOWTIME_HAS_ACTIVE_BOOKINGS (1311) — FR-SHOW-02
- 2026-11-06 — R-09 — Xóa sạch toàn bộ 26 thẻ trích dẫn [cite: ...] trong tài liệu docs/SRS.md — docs/SRS.md
- 2026-11-06 — R-10 — Bổ sung hướng dẫn cấu hình biến môi trường DB cho test (DB_URL, DB_USERNAME, DB_PASSWORD) và yêu cầu credentials cho test suite trong README.md — README.md
