# Changelog

Định dạng: `YYYY-MM-DD — ID task — Tóm tắt một câu về việc đã làm — SRS mục tương ứng (nếu có)`

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
