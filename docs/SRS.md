TÀI LIỆU ĐẶC TẢ YÊU CẦU PHẦN MỀM (SRS)
Tên dự án: Hệ thống Đặt vé Xem phim – Movie Theater Booking System (Phiên bản 3.2)
1. Giới thiệu Dự án (Introduction)
   1.1. Mục tiêu và Phạm vi
   Dự án là hệ thống đặt vé xem phim dành cho một rạp chiếu duy nhất, cung cấp phân hệ quản trị (Admin) để quản lý phim, phòng chiếu, lịch chiếu, khuyến mãi, doanh thu và phân hệ khách hàng (Customer) để tra cứu phim, chọn ghế, đặt vé, thanh toán qua cổng VNPay Sandbox.
   Trọng tâm cốt lõi của hệ thống là giải quyết bài toán tranh chấp đồng thời (Concurrency) khi nhiều khách hàng cùng giữ một ghế, kiểm soát chặt chẽ vòng đời đơn hàng (10 phút giữ ghế) và đảm bảo tính nhất quán dữ liệu (Idempotency & Data Consistency) trong giao dịch thanh toán trực tuyến.
   1.2. Quy ước Kỹ thuật Chung
   Múi giờ chuẩn: Toàn bộ tầng ứng dụng (Spring Boot) và cơ sở dữ liệu (MySQL 8+) thống nhất sử dụng múi giờ Asia/Ho_Chi_Minh (GMT+7) để đồng bộ khi so sánh hạn giữ ghế (expires_at) với thời gian thanh toán của VNPay (vnp_PayDate).
   Đơn vị tiền tệ: Lưu trữ bằng kiểu số nguyên lớn (BIGINT) theo đơn vị Đồng (VND), không sử dụng kiểu số thực dấu phẩy động để tránh sai số làm tròn.
2. Kiến trúc Hệ thống & Cấu trúc Module (System Architecture)
   2.1. Kiến trúc Tổng thể (Modular Monolith kết hợp Layered Architecture)
   Hệ thống triển khai theo kiến trúc Modular Monolith trên nền tảng Spring Boot REST API (Java 21), giao tiếp với Frontend và sử dụng Relational Database (MySQL 8+) làm nguồn dữ liệu chuẩn duy nhất (Single Source of Truth).
   Các module nghiệp vụ trong hệ thống bao gồm:
   Auth Module: Quản lý đăng ký, đăng nhập (JWT) và phân quyền người dùng với Relational Database.
   Movie Module: Quản lý danh mục phim, thể loại, diễn viên trong Relational Database.
   Showtime Module: Quản lý rạp, phòng chiếu, sơ đồ ghế vật lý và lịch chiếu trong Relational Database.
   Booking Module: Xử lý sơ đồ ghế theo suất chiếu, giữ ghế 10 phút, thu hồi ghế quá hạn với Relational Database, kết hợp Redis hỗ trợ caching và kết nối sang Notification.
   Payment Module: Tích hợp cổng thanh toán VNPay Sandbox, quản lý các lượt thử thanh toán (payment attempts), xử lý IPN callback và đối soát hoàn tiền với Relational Database.
   Voucher Module: Quản lý mã khuyến mãi và kiểm soát hạn mức sử dụng trong Relational Database.
   Review Module: Quản lý đánh giá và chấm điểm phim từ khách hàng đã mua vé trong Relational Database.
   Notification Module: Gửi thông báo xác nhận đặt vé và vé điện tử, hỗ trợ mở rộng bất đồng bộ qua RabbitMQ.
   2.2. Tổ chức Package (Package by Feature + 3-Layer bên trong)
   Plaintext
   com.example.cinema
   ├── common                  # Cấu hình chung (Security, JWT, GlobalExceptionHandler, BaseResponse)
   ├── auth                    # Module xác thực & phân quyền (controller, service, repository, entity, dto)
   ├── movie                   # Module phim, thể loại, diễn viên (controller, service, repository, entity, dto)
   ├── showtime                # Module rạp, phòng, ghế vật lý, suất chiếu (controller, service, repository, entity, dto)
   ├── booking                 # Module sơ đồ ghế, giữ ghế 10 phút, đơn hàng (controller, service, repository, entity, dto)
   ├── payment                 # Module tích hợp VNPay, IPN handler, hoàn tiền (controller, service, repository, entity, dto)
   ├── voucher                 # Module khuyến mãi & hạn mức sử dụng (controller, service, repository, entity, dto)
   ├── review                  # Module đánh giá phim (controller, service, repository, entity, dto)
   └── notification            # Module gửi thông báo & email xác nhận

3. Vai trò Người dùng (Actors)
   Customer (Khách hàng): Xem thông tin chi tiết phim và lịch chiếu, xem sơ đồ ghế theo suất chiếu, thực hiện giữ ghế tạm thời trong 10 phút, áp dụng mã giảm giá (Voucher), thanh toán trực tuyến qua cổng VNPay Sandbox, xem lịch sử đặt vé và viết đánh giá (Review/Rating) sau khi suất chiếu kết thúc.
   Admin (Quản trị viên): Quản lý thông tin phim, đạo diễn, diễn viên, thể loại; quản lý phòng chiếu và cấu hình ghế vật lý; xếp lịch chiếu (có kiểm soát chống trùng giờ); quản lý chương trình khuyến mãi; tra cứu lịch sử giao dịch thanh toán, xác nhận hoàn tiền thủ công và xem báo cáo thống kê doanh thu.
4. Quy trình Nghiệp vụ Cốt lõi & Vòng đời Trạng thái (Core Flows & State Machines)
   4.1. Luồng Giữ ghế Đồng thời (Seat Hold Concurrency Flow)
   Khi nhiều khách hàng cùng gửi yêu cầu giữ một ghế (ví dụ: Customer A và Customer B cùng chọn ghế A1), BookingService khởi tạo transaction và thực hiện khóa bản ghi ghế A1 trong Database (SELECT ... FOR UPDATE).
   Nếu ghế đang ở trạng thái HELD nhưng đơn hàng đang giữ ghế đó đã quá hạn (bookings.expires_at < NOW()), hệ thống khóa đơn hàng cũ, chuyển đơn hàng cũ sang EXPIRED, giải phóng lượt giữ voucher (nếu có) và đưa ghế về trạng thái AVAILABLE.
   Database xác nhận ghế A1 đang AVAILABLE cho yêu cầu được khóa trước (Customer A).
   BookingService tạo đơn hàng PENDING_PAYMENT, chuyển trạng thái ghế A1 thành HELD, thực hiện Commit transaction và trả kết quả giữ ghế thành công về cho Customer A.
   Ngay sau đó, khi luồng của Customer B đọc trạng thái ghế A1, Database trả về trạng thái HELD và BookingService từ chối yêu cầu với thông báo ghế không còn khả dụng.
   4.2. Luồng Thanh toán VNPay (Return URL vs IPN Handler)
   Khi khách hàng xác nhận giữ ghế và thanh toán, Booking API đảm bảo đơn hàng ở trạng thái PENDING_PAYMENT, tạo bản ghi lượt thử thanh toán (payment attempt) ở trạng thái PENDING trong Database và trả về URL thanh toán VNPay.
   Khách hàng thực hiện thanh toán trên cổng VNPay và trình duyệt được chuyển hướng (Redirect) về Return URL.
   Tại Return URL, hệ thống chỉ hiển thị trạng thái giao dịch cho người dùng, tuyệt đối không tự xác nhận đơn hàng dựa trên thông tin redirect.
   Cổng VNPay gọi trực tiếp (Server-to-Server) tới Payment IPN Handler để thông báo kết quả giao dịch.
   Payment IPN Handler xác minh chữ ký (vnp_SecureHash) và dữ liệu, sau đó truy vấn Database để kiểm tra thông tin đơn hàng, số tiền và trạng thái hiện tại.
   Sau khi kiểm tra hợp lệ, Payment IPN Handler ghi nhận kết quả thanh toán, cập nhật trạng thái booking trong Database và trả phản hồi theo giao thức của VNPay.
   4.3. Bảng Vòng đời Trạng thái (State Machines)
   Bảng dữ liệu
   Cột trạng thái
   Các giá trị hợp lệ
   Quy tắc chuyển đổi trạng thái (State Transitions)
   showtime_seats
   status
   AVAILABLE, HELD, BOOKED
   • AVAILABLE  HELD: Khi tạo booking mới, gán held_by_booking_id = booking.id.

• HELD  BOOKED: Khi nhận IPN thanh toán thành công hợp lệ.

• HELD  AVAILABLE: Khi booking chuyển sang EXPIRED hoặc CANCELLED (xóa held_by_booking_id = NULL).
bookings
status
PENDING_PAYMENT, CONFIRMED, CANCELLED, EXPIRED
• Khởi tạo ở PENDING_PAYMENT kèm mốc thời hạn chuẩn expires_at = NOW() + 10 phút.

• PENDING_PAYMENT  CONFIRMED: Khi IPN hợp lệ báo thanh toán thành công trong hạn.

• EXPIRED  CONFIRMED: Khi khách thanh toán đúng hạn (pay_date <= expires_at) nhưng IPN đến trễ, đồng thời toàn bộ ghế của đơn vẫn đang AVAILABLE và voucher (nếu có) vẫn còn hạn mức.

• PENDING_PAYMENT  CANCELLED: Khách chủ động hủy đơn khi chưa thanh toán.

• PENDING_PAYMENT  EXPIRED: Quá thời hạn expires_at mà chưa có xác nhận thanh toán.
payments
status
PENDING, SUCCESS, FAILED
• Khởi tạo ở PENDING mỗi khi tạo lượt thanh toán VNPay.

• PENDING  SUCCESS: Khi IPN hợp lệ có vnp_ResponseCode = '00' và vnp_TransactionStatus = '00'.

• PENDING  FAILED: Khi IPN hợp lệ trả về mã lỗi khác '00'.

• Quy tắc độc lập: Không tự động chuyển payments.status sang FAILED khi booking hết hạn; trạng thái payment chỉ được cập nhật khi có kết quả xác thực từ VNPay.
payments
refund_status
NONE, REFUND_REQUIRED, REFUNDED
• Mặc định là NONE khi khởi tạo.

• NONE  REFUND_REQUIRED: Khi payments.status = 'SUCCESS' nhưng rơi vào: (1) Đơn hàng đã EXPIRED/CANCELLED và không còn đủ ghế hoặc hạn mức voucher để khôi phục, hoặc (2) Đơn hàng đã được CONFIRMED trước đó bởi một lượt thanh toán khác (thanh toán trùng 2 lần).

• REFUND_REQUIRED  REFUNDED: Admin xác nhận đã hoàn tiền thủ công cho giao dịch này.
voucher_redemptions
status
RESERVED, USED, RELEASED
• RESERVED (khi tạo booking PENDING_PAYMENT)  USED (khi booking CONFIRMED) hoặc  RELEASED (khi booking EXPIRED hoặc CANCELLED).

4.4. Quy tắc Thứ tự Khóa (Lock Ordering) & Xử lý Deadlock
Để triệt tiêu nguy cơ Deadlock khi nhiều luồng (Giữ ghế, Hủy suất chiếu, Scheduler quét đơn hết hạn, Xử lý IPN) cùng truy cập cơ sở dữ liệu, các Transaction bắt buộc thực hiện khóa bản ghi theo thứ tự nhất quán:
1. Khóa bảng users: PESSIMISTIC_WRITE (chỉ trong createBooking, luôn khóa đầu tiên để kiểm tra hạn mức đơn chờ và chống đặt vé đồng thời trên cùng tài khoản).
2. Khóa bảng showtimes: PESSIMISTIC_WRITE (khi Hủy suất chiếu) hoặc PESSIMISTIC_READ / FOR SHARE (khi tạo đơn đặt vé createBooking để ngăn chặn chèn booking đồng thời trong khi đang hủy).
3. Khóa bảng bookings (SELECT ... FOR UPDATE theo thứ tự id ASC).
4. Khóa bảng showtime_seats (SELECT ... FOR UPDATE theo thứ tự id ASC).
5. Khóa bảng vouchers (SELECT ... FOR UPDATE).
Do InnoDB vẫn có thể phát sinh Deadlock trên các index phụ hoặc gap lock, tầng Service bắt buộc cấu hình bắt lỗi CannotAcquireLockException / DeadlockLoserDataAccessException để tự động rollback và retry tối đa 2 lần (đối với IPN và tác vụ nền) hoặc trả về mã 409 Conflict rõ ràng cho người dùng.
5. Đặc tả Yêu cầu Chức năng (FR) & Phi chức năng (NFR)
   5.1. Yêu cầu Chức năng (Functional Requirements)
   Mã YC
   Tên yêu cầu
   Mô tả quy tắc nghiệp vụ & Điều kiện xử lý
   Xử lý lỗi & Tiêu chí nghiệm thu (Acceptance Criteria)
   FR-SHOW-01
   Tạo suất chiếu & Chống trùng lịch phòng
   Admin tạo suất chiếu cho phim (NOW_SHOWING, COMING_SOON) tại một phòng chiếu. Hệ thống tự tính end_time = start_time + duration_minutes và cleaning_end_time = end_time + 15 phút. Bắt buộc khóa bản ghi rooms (FOR UPDATE), kiểm tra không có suất chiếu SCHEDULED nào trong cùng phòng vi phạm: existing.start_time < new.cleaning_end_time AND new.start_time < existing.cleaning_end_time. Sau khi tạo, tự động khởi tạo danh sách showtime_seats từ các ghế có is_active = true của phòng.
   • Lỗi: Trùng khung giờ hoặc phòng không hoạt động -> 409 Conflict. Vô hiệu hóa phòng khi còn suất chiếu SCHEDULED trong tương lai -> 409 Conflict (Mã lỗi 1312: ROOM_HAS_FUTURE_SHOWTIMES). Ngừng chiếu phim khi còn suất tương lai -> 409 Conflict (Mã lỗi 1207: MOVIE_HAS_FUTURE_SHOWTIMES).

• Nghiệm thu: 2 Admin gửi request đồng thời xếp 2 suất chiếu giao giờ nhau trong cùng 1 phòng -> Chỉ 1 request thành công. Admin không thể tắt phòng đang có suất chiếu tương lai. Admin không thể ngừng chiếu phim khi còn suất chiếu SCHEDULED trong tương lai; phim ENDED bị chặn đặt vé hoàn toàn.
FR-SHOW-02
Hủy suất chiếu & Điều phối hoàn tiền tự động (Showtime Cancellation & Refund Pipeline)
Admin thực hiện hủy một suất chiếu đang SCHEDULED. Hệ thống tuân thủ nghiêm ngặt thứ tự khóa tài nguyên chống Deadlock (SRS mục 4.4):
1. Khóa suất chiếu (showtimes) bằng PESSIMISTIC_WRITE (đồng thời phía createBooking sử dụng PESSIMISTIC_READ để ngăn chặn chèn booking đồng thời trong khi đang hủy).
2. Lấy danh sách ID các booking thuộc suất chiếu và khóa FOR UPDATE theo thứ tự booking_id ASC.
3. Nếu không có booking nào: xóa toàn bộ showtime_seats và xóa cứng bản ghi showtimes.
4. Nếu đã có booking (CONFIRMED, PENDING_PAYMENT, EXPIRED, CANCELLED):
   - Chuyển trạng thái suất chiếu sang CANCELLED (Soft Cancellation để bảo đảm toàn vẹn khóa ngoại dữ liệu lịch sử).
   - Khóa và cập nhật toàn bộ showtime_seats thuộc suất chiếu về AVAILABLE, đặt held_by_booking_id = null.
   - Với đơn CONFIRMED: chuyển booking sang CANCELLED, tìm các giao dịch thanh toán SUCCESS có refund_status = NONE để chuyển sang REFUND_REQUIRED, đồng thời giải phóng và hoàn lại voucher đã sử dụng (USED -> RELEASED, giảm used_count).
   - Với đơn PENDING_PAYMENT: chuyển booking sang CANCELLED, giải phóng voucher đang giữ (RESERVED -> RELEASED, giảm reserved_count).
• Lỗi: Suất chiếu không tồn tại -> 404 Not Found. Suất chiếu đã CANCELLED -> 409 Conflict.

• Nghiệm thu: Hủy suất chiếu có đơn CONFIRMED đã thanh toán -> Đơn chuyển CANCELLED, giao dịch chuyển REFUND_REQUIRED, ghế được trả về trống, voucher được hoàn lại.
FR-BOOK-01
Hiển thị sơ đồ ghế và Luật ghế lẻ (Orphan Seat Detection – cập nhật v3.0)
Trả về danh sách ghế của suất chiếu (showtime_seats) kèm vị trí hàng/cột, hạng ghế (NORMAL, VIP, COUPLE), giá vé và trạng thái hiển thị. Nếu ghế có status = 'HELD' nhưng đơn đang giữ ghế đó đã quá hạn (bookings.expires_at < NOW()), hệ thống trả về trạng thái hiển thị là AVAILABLE.

Quy tắc Luật ghế lẻ (Orphan Seat Detection):
Khi khách hàng chọn danh sách ghế trong cùng một hàng (row), hệ thống kiểm tra và tuyệt đối không cho phép để lại ĐÚNG 1 GHẾ TRỐNG ĐƠN ĐỘC (AVAILABLE) ở:
a) Giữa 2 ghế không còn trống (đã BOOKED, đang HELD, hoặc nằm trong danh sách ghế khách đang chọn).
b) Giữa mép hàng (đầu hàng / cuối hàng / lối đi) và một ghế không còn trống.
Khoảng trống từ 2 ghế trở lên (>= 2 ghế liên tiếp) là hoàn toàn hợp lệ vì nhóm khách khác vẫn có thể ngồi cạnh nhau. Nếu ghế lẻ đã tồn tại sẵn từ trước lần đặt này (do người khác để lại), khách hàng không bị từ chối oan.
Cấu hình bật/tắt luật ghế lẻ qua `app.booking.orphan-seat-rule-enabled` (mặc định: true).
• Lỗi: 
  - Suất chiếu không tồn tại → 404 Not Found (mã 1301).
  - Chọn ghế để lại 1 ghế trống đơn độc → 400 Bad Request (mã 1509: ORPHAN_SEAT_DETECTED).
• Nghiệm thu: 
  - Ghế đã hết hạn giữ 10 phút dù Scheduler chưa chạy vẫn hiển thị là ghế trống.
  - Khách chọn ghế tạo ra ghế lẻ đơn độc ở mép hàng hoặc giữa các ghế đã chọn/đã chiếm bị cảnh báo ngay từ client (cảnh báo toast) và bị từ chối ở backend với mã lỗi 1509.
  - Khách chọn toàn bộ hàng hoặc để lại khoảng trống >= 2 ghế được chấp thuận bình thường.

FR-SEAT-02 / FR-BOOK-07
Quy tắc ghế đôi (Couple Seats / Sofa đôi – cập nhật v3.1)
Ghế đôi (COUPLE) được triển khai theo Phương án A (Quyết định D-01): Mỗi sofa đôi gồm 2 bản ghi vật lý riêng biệt trong bảng `seats`, liên kết với nhau bằng trường `pair_group` (cùng phòng chiếu `room_id`, cùng hàng `row_name`, và cùng `pair_group`).

1. Tính nguyên tử khi chọn ghế (Atomic Pair Selection):
   - Khách hàng không thể đặt lẻ 1 ghế trong cặp. Khi chọn hoặc bỏ chọn một ghế đôi, cả 2 ghế cấu thành cặp sẽ được tự động chọn/bỏ chọn đồng thời.
   - Nếu client gửi request `createBooking` chỉ chứa 1 ghế của cặp đôi, hệ thống từ chối ngay với mã lỗi 1510 (`COUPLE_SEAT_MUST_BE_BOOKED_IN_PAIR: 400 Bad Request`).
   - Nếu 1 trong 2 ghế đã bị giữ (HELD) hoặc đã bán (BOOKED), cả cặp ghế coi như không khả dụng và bị vô hiệu hóa trên sơ đồ ghế.

2. Quy tắc tính giá chuẩn (Quyết định D-02):
   - Mỗi ghế trong cặp mang giá cơ sở của loại ghế `COUPLE` (`calculatePrice(basePrice) = basePrice`).
   - Tổng tiền cho cả cặp ghế = giá ghế 1 + giá ghế 2 (server tự tính khi giữ ghế và lưu cứng vào `booking_items`, tuyệt đối không nhân đôi 2 lần).

3. Khóa đồng thời và chống Deadlock:
   - Khi khóa ghế trong `createBooking`, cả 2 ghế trong cặp được đưa vào danh sách khóa được sắp xếp tăng dần theo ID (`ORDER BY id ASC`) và khóa trong một câu lệnh duy nhất.

• Lỗi: 
  - Gửi request chỉ chứa 1 ghế của cặp ghế đôi → 400 Bad Request (mã 1510: COUPLE_SEAT_MUST_BE_BOOKED_IN_PAIR).
  - Một trong 2 ghế của cặp đã bị chiếm (HELD hoặc BOOKED) → 409 Conflict (mã 1504: SEAT_NOT_AVAILABLE).

• Nghiệm thu: 
  - Click vào ghế đôi trên giao diện sơ đồ tự động toggle cả 2 ghế cùng lúc.
  - Sơ đồ ghế hiển thị các cặp ghế đôi liền khối (bo góc pill-shape), phân biệt rõ với ghế đơn.
  - Nếu 1 ghế trong cặp bị chiếm, cả cặp chuyển màu xám/vô hiệu hóa.
  - Đặt thành công 1 cặp ghế đôi tạo đúng 2 bản ghi `booking_items` với tổng tiền bằng đúng tổng 2 ghế.

FR-PRICE-01
Chính sách ma trận định giá tự động theo ngày, giờ và loại ghế (Pricing Policy Matrix – cập nhật v3.2)
Hệ thống tính toán giá vé theo ma trận phụ thu và giảm giá động tập trung qua `PricingService` và cấu hình linh hoạt trong `PricingProperties` (`app.pricing` trong `application.yaml`), tuyệt đối không hardcode giá vé tại controller hay client (Quyết định D-05 [ĐÃ CHỐT]):
1. Giá cơ sở (Base Price): Lấy từ giá cơ sở của suất chiếu (`showtime.basePrice`), nếu chưa cấu hình sẽ sử dụng giá chuẩn mặc định (`app.pricing.standard-base-price`, mặc định 60.000đ).
2. Phụ thu loại ghế (Seat Type Surcharge):
   - Ghế thường (NORMAL): +0đ.
   - Ghế VIP: phụ thu `vip-surcharge` (mặc định +15.000đ).
   - Ghế đôi (COUPLE): phụ thu `couple-surcharge` (mặc định +10.000đ cho mỗi ghế cấu thành cặp).
3. Phụ thu ngày cuối tuần (Weekend Surcharge):
   - Áp dụng cho các suất chiếu diễn ra vào Thứ Bảy (SATURDAY) hoặc Chủ Nhật (SUNDAY): phụ thu `weekend-surcharge` (mặc định +15.000đ).
4. Khung giờ trong ngày (Time-of-day Adjustment):
   - Suất chiếu sáng (trước 12:00 / `morning-cutoff-time`): giảm giá suất sớm `morning-discount` (mặc định -10.000đ).
   - Khung giờ vàng (từ 18:00 đến trước 22:00 / [`peak-hour-start-time`, `peak-hour-end-time`)): phụ thu giờ cao điểm `peak-hour-surcharge` (mặc định +10.000đ).
   - Các khung giờ chiều thông thường (12:00 - 18:00) hoặc đêm muộn (>= 22:00): không điều chỉnh phụ thu theo giờ (+0đ).
5. Sàn giá tối thiểu (Minimum Seat Price Floor):
   - Sau khi tổng hợp toàn bộ phụ thu và khấu trừ, giá vé không được thấp hơn ngưỡng sàn `min-seat-price` (mặc định 40.000đ) nhằm bảo vệ doanh thu.
6. Thời điểm áp giá & Nguyên tắc Bất biến (Single Source of Truth):
   - Giá từng ghế được tính toán và lưu cố định vào trường `showtime_seats.price` ngay tại thời điểm tạo suất chiếu (`ShowtimeService.createShowtime`) và khi cập nhật hàng loạt loại ghế trong phòng (`RoomService.batchUpdateSeats`).
   - Khi tạo đơn đặt vé (`BookingService.createBooking`), Backend đọc giá trực tiếp từ `showtime_seats.price` để tính tổng tiền và lưu vào `booking_items.price`. Tuyệt đối không tin cậy hay nhận giá từ phía client.
   - API chi tiết suất chiếu (`GET /api/v1/showtimes/{id}`) trả về trường `seatTypePrices` (Map<SeatType, Long>) đại diện cho giá của từng hạng ghế tương ứng suất chiếu đó để giao diện hiển thị bảng giá chuẩn.
• Lỗi: 
  - Suất chiếu hoặc cấu hình giá không hợp lệ → 400 Bad Request.
• Tiêu chí nghiệm thu:
  - Giá vé suất thường sáng ngày thường (T4 09:30): 60.000 - 10.000 = 50.000đ.
  - Giá vé VIP giờ vàng tối ngày thường (T4 19:45): 60.000 + 15.000 + 10.000 = 85.000đ.
  - Giá vé thường chiều cuối tuần (CN 14:00): 60.000 + 15.000 = 75.000đ.
  - Giá vé VIP giờ vàng tối cuối tuần (T7 20:00): 60.000 + 15.000 + 15.000 + 10.000 = 100.000đ.
  - Giá vé sau khi giảm không bao giờ thấp hơn mức sàn 40.000đ.
  - Giao diện `SeatSelection` hiển thị các badge trực quan theo đúng lịch chiếu ("Cuối tuần (+15k)", "Ưu đãi suất sớm (-10k)", "Giờ vàng (+10k)") và bảng chú thích giá (Legend) phản ánh đúng giá vé động.

FR-BOOK-02
Giữ ghế đồng thời & Thu hồi có điều kiện
Khách chọn từ 1–8 ghế trong cùng một showtime_id. Trong Transaction:

1. Nếu có ghế đang HELD bởi booking cũ đã quá hạn (expires_at < NOW()), hệ thống khóa booking cũ, chuyển booking cũ sang EXPIRED, nhả voucher của booking cũ (nếu có) và đưa các ghế thuộc booking cũ về AVAILABLE.

2. Sắp xếp showtime_seat_id tăng dần và khóa FOR UPDATE kèm điều kiện showtime_id.

3. Nếu tất cả ghế đều AVAILABLE, tạo bookings (PENDING_PAYMENT, expires_at = NOW() + 10 phút), lưu cứng giá vé vào booking_items và cập nhật ghế sang HELD.
   • Lỗi: Bất kỳ ghế nào đang BOOKED, đang HELD (còn hạn), không thuộc showtime_id yêu cầu, hoặc ghế vật lý bị vô hiệu hóa (is_active = false) -> Rollback toàn bộ và trả về 409 Conflict (mã 1504: SEAT_NOT_AVAILABLE); Khách hàng đã đạt giới hạn tối đa 2 đơn chờ thanh toán (max-pending-per-user) -> 429 Too Many Requests (mã 1507).

• Nghiệm thu: 50 request đồng thời cùng giữ ghế A1 của suất chiếu S1 -> Đúng 1 booking được tạo, 49 request nhận 409 Conflict. Ghế có is_active = false không thể đặt và hiển thị vô hiệu hóa trên sơ đồ ghế. Đổi loại ghế vật lý tự động cập nhật lại giá cho các suất chiếu SCHEDULED tương lai ở trạng thái AVAILABLE.
FR-BOOK-03
Giải phóng tự động đơn giữ ghế quá hạn
Tác vụ nền (@Scheduled chạy mỗi 30 giây) tìm các đơn PENDING_PAYMENT có expires_at < NOW(). Với từng đơn, khóa theo thứ tự bookings  showtime_seats  vouchers, chuyển đơn sang EXPIRED, giải phóng các ghế đang gắn với held_by_booking_id = booking.id về AVAILABLE, và chuyển voucher_redemptions sang RELEASED (giảm reserved_count).
• Quy tắc: Không thay đổi trạng thái của các bản ghi payments đang PENDING.

• Nghiệm thu: Sau 10 phút không thanh toán, ghế và hạn mức voucher được giải phóng chính xác.
FR-BOOK-04
Giới hạn đơn chờ thanh toán / tài khoản (Pending Reservation Limit)
Mỗi tài khoản khách hàng chỉ được phép duy trì tối đa 2 đơn giữ vé ở trạng thái PENDING_PAYMENT còn hiệu lực (expires_at > NOW()).
Khi tạo booking (createBooking), hệ thống thực hiện khóa bi quan bản ghi users (FOR UPDATE) đầu tiên trong chuỗi giao dịch và đếm số lượng đơn PENDING_PAYMENT còn hạn của user. Nếu số lượng >= maxPendingPerUser (mặc định cấu hình app.booking.max-pending-per-user: 2), hệ thống từ chối tạo đơn mới.
• Lỗi: Vượt quá giới hạn đơn chờ -> 429 Too Many Requests (Mã lỗi 1507: "Please pay or cancel your existing reservations first").
• Nghiệm thu:
  + Khách đã có 2 đơn PENDING_PAYMENT còn hạn -> Yêu cầu đặt đơn thứ 3 bị từ chối với HTTP 429 (mã 1507).
  + Đơn PENDING_PAYMENT đã quá hạn (expires_at < NOW()) không bị tính vào giới hạn, khách tiếp tục đặt được vé mới.
FR-BOOK-05
Hạn chót đặt vé và Danh sách suất còn bán (Showtime Booking Cutoff & Bookable Showtimes)
Khách hàng chỉ được phép đặt vé cho các suất chiếu còn cách giờ bắt đầu ít nhất `cutoffMinutes` phút (mặc định 15 phút, cấu hình qua `app.booking.cutoff-minutes: 15`).
- Khi tạo booking (`createBooking`), hệ thống kiểm tra `showtime.status == SCHEDULED` và `now < showtime.startTime - cutoffMinutes`. Nếu vi phạm (suất chiếu đã bắt đầu, đã bị hủy, hoặc nằm trong khoảng thời gian đóng cổng bán vé), hệ thống từ chối với lỗi 409 Conflict (Mã 1502: "Showtime is cancelled or the booking window has closed").
- Endpoint tra cứu suất chiếu `GET /api/v1/showtimes` bổ sung tham số truy vấn `bookableOnly` (kiểu boolean, mặc định `false`):
  + Khi `bookableOnly = true`: chỉ trả về các suất chiếu có `status = SCHEDULED` và `startTime > NOW() + cutoffMinutes`. Được sử dụng bởi giao diện khách hàng (Trang chủ, Chi tiết phim).
  + Khi `bookableOnly = false`: trả về toàn bộ suất chiếu theo các bộ lọc thông thường. Được sử dụng bởi giao diện quản trị (Admin Dashboard).
• Nghiệm thu:
  + Suất chiếu cách hiện tại 10 phút (< 15 phút cutoff): gọi đặt vé nhận lỗi 409 (mã 1502).
  + Suất chiếu cách hiện tại 20 phút (> 15 phút cutoff): gọi đặt vé thành công tạo đơn PENDING_PAYMENT.
  + Gọi `GET /api/v1/showtimes?bookableOnly=true`: các suất chiếu bắt đầu trong vòng 15 phút bị loại bỏ khỏi danh sách kết quả.
FR-BOOK-08
Khách tự hủy vé đã thanh toán & Cửa sổ hoàn tiền (Customer Self-Cancellation & Refund Window)
Khách hàng được phép tự hủy đơn đặt vé đã thanh toán (`status = CONFIRMED`) nếu thời điểm hủy còn cách giờ chiếu ít nhất `refundCutoffMinutes` phút (mặc định 60 phút, cấu hình qua `app.booking.refund-cutoff-minutes: 60`, theo Quyết định D-04 [ĐÃ CHỐT]).
- Endpoint thực hiện: `POST /api/v1/bookings/{id}/cancel-confirmed`.
- Kiểm tra quyền: Chỉ chủ sở hữu đơn (email trùng khớp với tài khoản đăng nhập) hoặc người dùng có vai trò ADMIN mới được phép hủy đơn. Người dùng khác cố tình thao tác sẽ nhận mã lỗi 403 Forbidden (Mã 1003: UNAUTHORIZED).
- Kiểm tra điều kiện: Đơn phải ở trạng thái `CONFIRMED`. Nếu thời gian hiện tại không trước giờ chiếu trừ đi `refundCutoffMinutes` (`!now.isBefore(startTime - refundCutoffMinutes)`), hệ thống từ chối yêu cầu với lỗi 409 Conflict (Mã 1508: BOOKING_CANCELLATION_WINDOW_CLOSED - "Booking cancellation window has closed").
- Quy trình giải phóng & hoàn tiền (tuân thủ bất biến thứ tự khóa: `bookings` -> `showtime_seats` -> `vouchers`):
  1. Khóa đơn hàng `bookings` bằng `findByIdForUpdate`.
  2. Khóa và chuyển toàn bộ ghế liên quan của đơn (`showtime_seats`) về trạng thái `AVAILABLE`, đặt `held_by_booking_id = null`.
  3. Cập nhật các giao dịch thanh toán thành công (`status == SUCCESS` và `refundStatus == NONE`) của đơn sang trạng thái `REFUND_REQUIRED`.
  4. Thu hồi và hoàn trả voucher đã sử dụng qua `voucherService.revertUsedVoucherIfPresent(booking)` (chuyển `USED` -> `RELEASED`, giảm `used_count`).
  5. Chuyển trạng thái đơn sang `CANCELLED`.
• Lỗi: Quá thời hạn hủy vé -> 409 Conflict (Mã lỗi 1508). Không có quyền hủy đơn người khác -> 403 Forbidden (Mã lỗi 1003). Đơn không ở trạng thái CONFIRMED -> 409 Conflict (Mã lỗi 1505).
• Nghiệm thu:
  + Khách hủy vé CONFIRMED trước 60 phút -> Đơn chuyển sang CANCELLED, ghế về AVAILABLE, payment chuyển sang REFUND_REQUIRED, voucher được hoàn lượt dùng.
  + Khách hủy vé khi cách giờ chiếu dưới 60 phút -> Bị từ chối với HTTP 409 (Mã 1508).
  + Khách khác cố tình gửi request hủy đơn -> Nhận lỗi HTTP 403 Forbidden.
FR-VOUC-01
Áp dụng & Giữ hạn mức Voucher
Khi khách áp dụng mã giảm giá lúc tạo booking: Khóa dòng vouchers (FOR UPDATE), kiểm tra is_active = true, thời hạn (start_at <= NOW() <= end_at), giá trị đơn tối thiểu (subtotal_amount >= min_order_value), tổng hạn mức (reserved_count + used_count < usage_limit) và giới hạn mỗi khách (COUNT(RESERVED, USED) < per_user_limit). Hợp lệ thì tăng reserved_count + 1 và tạo voucher_redemptions (RESERVED).
• Lỗi: Hết lượt dùng hoặc không đủ điều kiện  400 Bad Request / 409 Conflict.

• Nghiệm thu: Voucher còn 1 lượt cuối, 10 khách cùng áp dụng đồng thời  Đúng 1 đơn giữ được mã.
FR-PAY-01
Tạo lượt thanh toán VNPay & Retry
Với một booking đang PENDING_PAYMENT và còn hạn (expires_at > NOW()), khách được tạo tối đa 3 lượt thử thanh toán (payments ở trạng thái PENDING, refund_status = 'NONE') với mã transaction_ref (vnp_TxnRef) duy nhất và nhận URL chuyển hướng sang VNPay Sandbox.
• Quy tắc: Nếu lần thử 1 thất bại (FAILED), booking vẫn giữ ghế đến expires_at để khách thử thanh toán lại.

• Nghiệm thu: Return URL chỉ hiển thị giao diện chờ/kết quả, không tự xác nhận đơn hàng từ redirect.
FR-PAY-02
Xử lý VNPay IPN Callback & Đối soát hoàn tiền
Khi nhận request tại IPN Handler:

1. Xác minh chữ ký vnp_SecureHash.

2. Đối chiếu tồn tại vnp_TxnRef và khớp số tiền (vnp_Amount == payment.amount * 100).

3. Idempotency: Nếu payment.status != 'PENDING', trả về mã đã ghi nhận mà không xử lý lại.

4. Chuyển đổi vnp_PayDate (yyyyMMddHHmmss) sang DATETIME lưu vào pay_date.

5. Nếu thành công (vnp_ResponseCode == '00' và vnp_TransactionStatus == '00'):

• TH1 (Trong hạn): booking.status == 'PENDING_PAYMENT' và ghế vẫn thuộc đơn  payment = SUCCESS, booking = CONFIRMED, ghế = BOOKED, voucher = USED.

• TH2 (IPN đến trễ nhưng cứu được đơn): booking.status == 'EXPIRED', pay_date <= booking.expires_at, toàn bộ ghế vẫn AVAILABLE và voucher (nếu có) vẫn còn hạn mức  Khôi phục nguyên tử booking = CONFIRMED, ghế = BOOKED, voucher = USED, payment = SUCCESS.

• TH3 (Thanh toán sau hạn mất ghế/voucher HOẶC Thanh toán trùng lần 2 khi đơn đã CONFIRMED): Ghi nhận payment = SUCCESS và bật payment.refund_status = 'REFUND_REQUIRED', giữ nguyên trạng thái ghế hiện tại.

6. Nếu mã khác '00': Cập nhật payment = FAILED.
   • Lỗi: Sai chữ ký hoặc lệch số tiền  Từ chối cập nhật và ghi log cảnh báo.

• Nghiệm thu: Xử lý đúng khi IPN gọi lặp nhiều lần, khách tắt trình duyệt sau khi trả tiền, IPN đến trễ sau khi hết hạn, hoặc khách thanh toán thành công 2 lần cho cùng 1 đơn.
FR-REV-01
Đánh giá phim đã xem
Khách hàng gửi điểm (1..5) và bình luận cho bộ phim. Hệ thống kiểm tra tài khoản có ít nhất 1 booking thuộc phim đó ở trạng thái CONFIRMED và thời điểm hiện tại đã qua giờ kết thúc suất chiếu (NOW() > showtimes.end_time). Mỗi khách chỉ đánh giá 1 lần trên mỗi phim (UNIQUE(user_id, movie_id)).
• Lỗi: Chưa mua vé hoặc suất chiếu chưa kết thúc  403 Forbidden.
FR-REP-01
Báo cáo doanh thu và công suất ghế thực tế (cập nhật v2.9)
Admin truy vấn thống kê tài chính và hiệu suất hoạt động theo khoảng thời gian [startDate 00:00:00, endDate 23:59:59] (múi giờ Asia/Ho_Chi_Minh). Hệ thống phân định rõ ràng hai cửa sổ thời gian tính toán:
1. Cửa sổ ngày thanh toán (payments.pay_date):
   - Doanh thu thực nhận (totalRevenue, totalRealizedRevenue, revenue): Tính tổng payments.amount của các giao dịch có status = 'SUCCESS' và refund_status = 'NONE'.
   - Số vé bán ra (ticketsSold, totalTicketsSold): Đếm chính xác số lượng vé (BookingItem) thực tế thuộc các đơn CONFIRMED có giao dịch thanh toán thành công (SUCCESS, refund_status = NONE) trong kỳ thanh toán, không đếm theo số giao dịch/đơn hàng.
2. Cửa sổ thời gian suất chiếu diễn ra (showtimes.start_time):
   - Tổng công suất ghế (capacity) & số suất chiếu (totalScreenings): Tính tổng số ghế thực tế (ShowtimeSeat) và số suất chiếu có status = 'SCHEDULED' diễn ra trong khoảng thời gian đã chọn. Bỏ hoàn toàn quy ước hằng số 25 ghế cũ.
   - Tỷ lệ lấp đầy bình quân (occupancyRate): Tính theo công thức occupancy = (ticketsSold * 100.0) / totalCapacity, làm tròn 1 chữ số thập phân. Nếu totalCapacity == 0, tỷ lệ lấp đầy trả về 0.0, không xảy ra lỗi chia cho 0.
• Nghiệm thu: Các đơn PENDING_PAYMENT, EXPIRED, CANCELLED hoặc các giao dịch có trạng thái hoàn tiền (REFUND_REQUIRED / REFUNDED) bị loại trừ hoàn toàn, không làm sai lệch doanh thu hay số vé đã phát hành. Giao diện báo cáo hiển thị chú thích rõ ràng về hai quy tắc tính toán này.
FR-DEV-01
Công cụ giả lập chỉ dành cho môi trường phát triển (bổ sung v2.3)
Hai endpoint phục vụ demo/kiểm thử cục bộ: giả lập thanh toán thành công (POST /api/v1/payments/simulate-success) và tua nhanh suất chiếu để thử đánh giá phim (PATCH /api/v1/reviews/showtime/{showtimeId}/simulate-ended, chỉ Admin). Mặc định TẮT; chỉ hoạt động khi cấu hình app.dev-tools.enabled = true (biến môi trường DEV_TOOLS_ENABLED=true). Khi bật, giả lập thanh toán phải tuân thủ đúng điều kiện của nhánh IPN TH1 trong FR-PAY-02: booking đang PENDING_PAYMENT, còn hạn (expires_at > NOW()) và mọi ghế vẫn HELD bởi chính booking đó; sau đó mới chuyển booking = CONFIRMED, ghế = BOOKED, voucher = USED. Giao dịch giả lập mang transaction_ref bắt đầu bằng "SIM-". Giao diện chỉ hiển thị lựa chọn này ở bản chạy chế độ phát triển (npm run dev), không có trong bản build production.
• Lỗi: Tính năng đang tắt → 403 Forbidden (mã 1606); booking không còn PENDING_PAYMENT → 409 Conflict; booking đã hết hạn giữ ghế → 409 Conflict; ghế không còn thuộc đơn → 409 Conflict.
• Nghiệm thu: Khi DEV_TOOLS_ENABLED=false, mọi lời gọi simulate-success đều bị từ chối và không thay đổi dữ liệu; khi bật, không thể "xác nhận" một booking đã EXPIRED hoặc CANCELLED và không ghi đè ghế đã thuộc về khách khác.

5.2. Yêu cầu Phi chức năng (Non-Functional Requirements)
NFR-CONC-01 (Kiểm soát đồng thời): Sử dụng Database Transaction kết hợp Pessimistic Write Lock (SELECT ... FOR UPDATE) và thứ tự khóa chuẩn hóa để đảm bảo không bao giờ xảy ra tình trạng đặt trùng ghế hoặc vượt hạn mức voucher.
NFR-REL-01 (Độ tin cậy & Idempotency): Luồng xử lý thanh toán IPN đảm bảo tính Idempotent, hoạt động chính xác ngay cả khi callback bị gửi lặp hoặc mất kết nối phía trình duyệt của khách hàng.
NFR-SEC-01 (Bảo mật): Mật khẩu băm bằng BCrypt; xác thực và phân quyền bằng Spring Security + JWT (CUSTOMER, ADMIN); mọi phép tính giá vé và giảm giá voucher thực hiện hoàn toàn ở Backend.
NFR-SEC-02 (Quản lý bí mật & tài khoản quản trị đầu tiên – bổ sung v2.3): Không lưu bí mật trong mã nguồn. JWT secret (JWT_SECRET, Base64, tối thiểu 32 byte) bắt buộc cấu hình qua biến môi trường và ứng dụng từ chối khởi động nếu thiếu hoặc quá yếu. Tài khoản ADMIN đầu tiên chỉ được tạo khi CSDL chưa có ADMIN và có cấu hình BOOTSTRAP_ADMIN_EMAIL / BOOTSTRAP_ADMIN_PASSWORD (tối thiểu 8 ký tự); mật khẩu không được ghi cứng và không được ghi vào log.
NFR-DATA-01 (Bảo toàn lịch sử giao dịch): Không sử dụng xóa dây chuyền (ON DELETE CASCADE) đối với dữ liệu đặt vé và thanh toán; lưu cố định giá vé tại thời điểm mua trong booking_items.price.
6. Thiết kế Cơ sở Dữ liệu Chi tiết – Từ điển Dữ liệu 17 Bảng (Database Schema & Data Dictionary)
   Lưu ý kỹ thuật khi khởi tạo bảng (Migration Order): Giữa bảng showtime_seats (có cột held_by_booking_id) và bảng bookings (được tham chiếu bởi booking_items) có mối quan hệ tham chiếu qua lại. Khi viết script SQL tạo bảng, bảng showtime_seats được tạo trước mà chưa khai báo khóa ngoại trên cột held_by_booking_id; sau khi tạo xong bảng bookings mới sử dụng lệnh ALTER TABLE showtime_seats ADD CONSTRAINT fk_ss_booking ... để nối khóa ngoại.
   MODULE 1: AUTH & USER
   Bảng 1: users (Quản lý tài khoản người dùng)
   Thuộc tính (Column)
   Kiểu dữ liệu
   Ràng buộc / Mặc định
   Ý nghĩa nghiệp vụ
   id
   BIGINT
   PK, AUTO_INCREMENT
   Mã định danh duy nhất của người dùng.
   email
   VARCHAR(150)
   NOT NULL, UNIQUE
   Địa chỉ email dùng để đăng nhập và nhận vé điện tử.
   password_hash
   VARCHAR(255)
   NOT NULL
   Mật khẩu đã được băm bằng thuật toán BCrypt.
   full_name
   VARCHAR(100)
   NOT NULL
   Họ và tên đầy đủ của người dùng.
   phone
   VARCHAR(20)
   NOT NULL
   Số điện thoại liên hệ của người dùng.
   avatar_url
   VARCHAR(500)
   NULL
   Đường dẫn ảnh đại diện.
   role
   VARCHAR(20)
   NOT NULL, DEFAULT 'CUSTOMER', CHECK (role IN ('CUSTOMER', 'ADMIN'))
   Phân quyền vai trò người dùng trong hệ thống.
   is_active
   BOOLEAN
   NOT NULL, DEFAULT TRUE
   Trạng thái kích hoạt tài khoản (hỗ trợ khóa/vô hiệu hóa mềm).
   created_at
   DATETIME
   NOT NULL, DEFAULT CURRENT_TIMESTAMP
   Thời điểm tạo tài khoản.
   updated_at
   DATETIME
   NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
   Thời điểm cập nhật tài khoản gần nhất.

MODULE 2: MOVIE, GENRE & ACTOR
Bảng 2: movies (Thông tin bộ phim)
Thuộc tính (Column)
Kiểu dữ liệu
Ràng buộc / Mặc định
Ý nghĩa nghiệp vụ
id
BIGINT
PK, AUTO_INCREMENT
Mã định danh bộ phim.
title
VARCHAR(255)
NOT NULL
Tên bộ phim.
description
TEXT
NULL
Mô tả tóm tắt nội dung phim.
director
VARCHAR(150)
NULL
Tên đạo diễn bộ phim.
duration_minutes
INT
NOT NULL, CHECK (duration_minutes > 0)
Thời lượng phim tính bằng phút (dùng để tính giờ kết thúc suất chiếu).
release_date
DATE
NOT NULL
Ngày khởi chiếu chính thức.
age_rating
VARCHAR(10)
NOT NULL, DEFAULT 'P', CHECK (age_rating IN ('P', 'K', 'T13', 'T16', 'T18'))
Phân loại độ tuổi được phép xem phim.
original_language
VARCHAR(50)
NOT NULL
Ngôn ngữ gốc của bộ phim.
poster_url
VARCHAR(500)
NULL
Đường dẫn ảnh poster phim.
trailer_url
VARCHAR(500)
NULL
Đường dẫn video trailer phim.
status
VARCHAR(20)
NOT NULL, DEFAULT 'COMING_SOON', CHECK (status IN ('COMING_SOON', 'NOW_SHOWING', 'ENDED'))
Trạng thái phát hành của bộ phim.
created_at
DATETIME
NOT NULL, DEFAULT CURRENT_TIMESTAMP
Thời điểm tạo bản ghi phim.
updated_at
DATETIME
NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
Thời điểm cập nhật thông tin phim gần nhất.

Bảng 3: genres (Danh mục thể loại phim)
Thuộc tính (Column)
Kiểu dữ liệu
Ràng buộc / Mặc định
Ý nghĩa nghiệp vụ
id
BIGINT
PK, AUTO_INCREMENT
Mã định danh thể loại.
name
VARCHAR(100)
NOT NULL, UNIQUE
Tên thể loại phim (Hành động, Kinh dị, Tâm lý, Hoạt hình...).
created_at
DATETIME
NOT NULL, DEFAULT CURRENT_TIMESTAMP
Thời điểm tạo thể loại.

Bảng 4: movie_genres (Bảng trung gian Phim – Thể loại)
Thuộc tính (Column)
Kiểu dữ liệu
Ràng buộc / Mặc định
Ý nghĩa nghiệp vụ
movie_id
BIGINT
PK (kép), FK -> movies(id)
Mã bộ phim.
genre_id
BIGINT
PK (kép), FK -> genres(id)
Mã thể loại gắn với bộ phim.

Bảng 5: actors (Danh mục diễn viên)
Thuộc tính (Column)
Kiểu dữ liệu
Ràng buộc / Mặc định
Ý nghĩa nghiệp vụ
id
BIGINT
PK, AUTO_INCREMENT
Mã định danh diễn viên.
name
VARCHAR(150)
NOT NULL
Họ tên diễn viên.
avatar_url
VARCHAR(500)
NULL
Đường dẫn ảnh chân dung diễn viên.
created_at
DATETIME
NOT NULL, DEFAULT CURRENT_TIMESTAMP
Thời điểm thêm diễn viên.

Bảng 6: movie_actors (Bảng trung gian Phim – Diễn viên)
Thuộc tính (Column)
Kiểu dữ liệu
Ràng buộc / Mặc định
Ý nghĩa nghiệp vụ
movie_id
BIGINT
PK (kép), FK -> movies(id)
Mã bộ phim.
actor_id
BIGINT
PK (kép), FK -> actors(id)
Mã diễn viên tham gia bộ phim.

MODULE 3: CINEMA, ROOM, SEAT & SHOWTIME
Bảng 7: cinemas (Thông tin rạp chiếu)
Thuộc tính (Column)
Kiểu dữ liệu
Ràng buộc / Mặc định
Ý nghĩa nghiệp vụ
id
BIGINT
PK, AUTO_INCREMENT
Mã định danh rạp chiếu.
name
VARCHAR(150)
NOT NULL
Tên rạp chiếu phim (giữ có chủ đích cho mô hình 1 rạp để chuẩn hóa cấu trúc).
address
VARCHAR(300)
NOT NULL
Địa chỉ chi tiết của rạp chiếu.
hotline
VARCHAR(20)
NULL
Số điện thoại đường dây nóng của rạp.
created_at
DATETIME
NOT NULL, DEFAULT CURRENT_TIMESTAMP
Thời điểm khởi tạo thông tin rạp.
updated_at
DATETIME
NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
Thời điểm cập nhật gần nhất.

Bảng 8: rooms (Phòng chiếu phim)
Thuộc tính (Column)
Kiểu dữ liệu
Ràng buộc / Mặc định
Ý nghĩa nghiệp vụ
id
BIGINT
PK, AUTO_INCREMENT
Mã định danh phòng chiếu.
cinema_id
BIGINT
NOT NULL, FK -> cinemas(id)
Mã rạp sở hữu phòng chiếu này.
name
VARCHAR(100)
NOT NULL, UNIQUE(cinema_id, name)
Tên phòng chiếu (Phòng 01, Phòng 02...).
total_rows
INT
NOT NULL, CHECK (total_rows > 0)
Tổng số hàng ghế trong phòng.
total_columns
INT
NOT NULL, CHECK (total_columns > 0)
Tổng số ghế tối đa trên mỗi hàng.
is_active
BOOLEAN
NOT NULL, DEFAULT TRUE
Trạng thái hoạt động của phòng chiếu.
created_at
DATETIME
NOT NULL, DEFAULT CURRENT_TIMESTAMP
Thời điểm tạo phòng chiếu.
updated_at
DATETIME
NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
Thời điểm cập nhật phòng chiếu.

Bảng 9: seats (Sơ đồ ghế vật lý trong phòng)
Thuộc tính (Column)
Kiểu dữ liệu
Ràng buộc / Mặc định
Ý nghĩa nghiệp vụ
id
BIGINT
PK, AUTO_INCREMENT
Mã định danh ghế vật lý.
room_id
BIGINT
NOT NULL, FK -> rooms(id)
Thuộc phòng chiếu nào.
row_name
VARCHAR(5)
NOT NULL
Ký hiệu hàng ghế (A, B, C...).
seat_number
INT
NOT NULL, CHECK (seat_number > 0)
Số thứ tự ghế trong hàng (1, 2, 3...).
type
VARCHAR(20)
NOT NULL, DEFAULT 'NORMAL', CHECK (type IN ('NORMAL', 'VIP', 'COUPLE'))
Hạng ghế vật lý (Thường, VIP, Ghế đôi).
is_active
BOOLEAN
NOT NULL, DEFAULT TRUE
Trạng thái sử dụng của ghế (ghế hỏng đặt false để không mở bán).
pair_group
INT
NULL
Định danh nhóm cặp ghế đôi (D-01). Hai ghế kề nhau có cùng room_id, row_name và pair_group tạo thành một sofa đôi trọn vẹn.
created_at
DATETIME
NOT NULL, DEFAULT CURRENT_TIMESTAMP
Thời điểm tạo ghế.
updated_at
DATETIME
NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
Thời điểm cập nhật trạng thái ghế.
(Ràng buộc ghép)


UNIQUE(room_id, row_name, seat_number)
Đảm bảo không trùng vị trí ghế trong cùng một phòng.

Bảng 10: showtimes (Lịch chiếu / Suất chiếu cụ thể)
Thuộc tính (Column)
Kiểu dữ liệu
Ràng buộc / Mặc định
Ý nghĩa nghiệp vụ
id
BIGINT
PK, AUTO_INCREMENT
Mã định danh suất chiếu.
movie_id
BIGINT
NOT NULL, FK -> movies(id)
Bộ phim được trình chiếu.
room_id
BIGINT
NOT NULL, FK -> rooms(id)
Phòng chiếu diễn ra suất chiếu.
format
VARCHAR(10)
NOT NULL, DEFAULT '2D', CHECK (format IN ('2D', '3D', 'IMAX'))
Định dạng trình chiếu của suất chiếu.
translation_type
VARCHAR(20)
NOT NULL, DEFAULT 'SUBTITLE', CHECK (translation_type IN ('SUBTITLE', 'DUBBED'))
Hình thức dịch thuật (Phụ đề hoặc Lồng tiếng).
start_time
DATETIME
NOT NULL
Thời điểm bắt đầu chiếu phim.
end_time
DATETIME
NOT NULL, CHECK (start_time < end_time)
Thời điểm kết thúc phim (start_time + duration_minutes).
cleaning_end_time
DATETIME
NOT NULL, CHECK (end_time <= cleaning_end_time)
Thời điểm phòng chiếu sẵn sàng cho suất tiếp theo (end_time + 15 phút dọn phòng).
base_price
BIGINT
NOT NULL, CHECK (base_price >= 0)
Giá vé cơ sở của suất chiếu (VND).
status
VARCHAR(20)
NOT NULL, DEFAULT 'SCHEDULED', CHECK (status IN ('SCHEDULED', 'CANCELLED'))
Trạng thái của suất chiếu.
created_at
DATETIME
NOT NULL, DEFAULT CURRENT_TIMESTAMP
Thời điểm tạo lịch chiếu.
updated_at
DATETIME
NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
Thời điểm cập nhật lịch chiếu.

MODULE 4: BOOKING & SEAT INVENTORY
Bảng 11: showtime_seats (Trạng thái ghế theo từng suất chiếu – Bảng khóa đồng thời)
Thuộc tính (Column)
Kiểu dữ liệu
Ràng buộc / Mặc định
Ý nghĩa nghiệp vụ
id
BIGINT
PK, AUTO_INCREMENT
Mã định danh ghế của suất chiếu.
showtime_id
BIGINT
NOT NULL, FK -> showtimes(id)
Thuộc suất chiếu nào.
seat_id
BIGINT
NOT NULL, FK -> seats(id)
Tham chiếu tới ghế vật lý trong phòng.
price
BIGINT
NOT NULL, CHECK (price >= 0)
Giá bán thực tế của ghế trong suất chiếu này (VND).
status
VARCHAR(20)
NOT NULL, DEFAULT 'AVAILABLE', CHECK (status IN ('AVAILABLE', 'HELD', 'BOOKED'))
Trạng thái ghế hiện tại: Trống, Đang giữ 10 phút, hoặc Đã đặt thành công.
held_by_booking_id
BIGINT
NULL, FK -> bookings(id)
Mã đơn hàng đang giữ hoặc sở hữu ghế này (NULL khi ghế AVAILABLE).
updated_at
DATETIME
NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
Thời điểm thay đổi trạng thái ghế gần nhất.
(Ràng buộc ghép)


UNIQUE(showtime_id, seat_id)
Mỗi ghế vật lý chỉ xuất hiện đúng 1 lần trong 1 suất chiếu.
(Ràng buộc kiểm tra)


CHECK ((status = 'AVAILABLE' AND held_by_booking_id IS NULL) OR (status IN ('HELD', 'BOOKED') AND held_by_booking_id IS NOT NULL))
Đảm bảo tính nhất quán giữa trạng thái ghế và đơn hàng sở hữu ghế.

Bảng 12: bookings (Đơn đặt vé)
Thuộc tính (Column)
Kiểu dữ liệu
Ràng buộc / Mặc định
Ý nghĩa nghiệp vụ
id
BIGINT
PK, AUTO_INCREMENT
Mã định danh đơn đặt vé.
booking_code
VARCHAR(20)
NOT NULL, UNIQUE
Mã đặt chỗ duy nhất hiển thị cho khách hàng check-in.
user_id
BIGINT
NOT NULL, FK -> users(id)
Khách hàng thực hiện đặt vé.
showtime_id
BIGINT
NOT NULL, FK -> showtimes(id)
Suất chiếu của đơn đặt vé.
voucher_id
BIGINT
NULL, FK -> vouchers(id)
Mã khuyến mãi áp dụng cho đơn (nếu có).
subtotal_amount
BIGINT
NOT NULL, CHECK (subtotal_amount >= 0)
Tổng tiền vé trước khi áp dụng giảm giá (VND).
discount_amount
BIGINT
NOT NULL, DEFAULT 0, CHECK (discount_amount >= 0)
Số tiền được giảm giá từ voucher (VND).
final_amount
BIGINT
NOT NULL, CHECK (final_amount >= 0 AND final_amount = subtotal_amount - discount_amount)
Tổng số tiền thực tế khách phải thanh toán (VND).
status
VARCHAR(25)
NOT NULL, DEFAULT 'PENDING_PAYMENT', CHECK (status IN ('PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'EXPIRED'))
Trạng thái vòng đời của đơn đặt vé.
expires_at
DATETIME
NOT NULL
Thời điểm hết hạn giữ ghế (10 phút kể từ lúc tạo đơn).
created_at
DATETIME
NOT NULL, DEFAULT CURRENT_TIMESTAMP
Thời điểm tạo đơn hàng.
updated_at
DATETIME
NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
Thời điểm cập nhật đơn hàng gần nhất.

Bảng 13: booking_items (Chi tiết từng ghế trong đơn đặt vé)
Thuộc tính (Column)
Kiểu dữ liệu
Ràng buộc / Mặc định
Ý nghĩa nghiệp vụ
id
BIGINT
PK, AUTO_INCREMENT
Mã định danh dòng chi tiết đơn hàng.
booking_id
BIGINT
NOT NULL, FK -> bookings(id)
Tham chiếu về đơn đặt vé tổng.
showtime_seat_id
BIGINT
NOT NULL, FK -> showtime_seats(id)
Tham chiếu tới ghế của suất chiếu được chọn.
price
BIGINT
NOT NULL, CHECK (price >= 0)
Giá vé được lưu cố định tại thời điểm khách đặt ghế (VND).
created_at
DATETIME
NOT NULL, DEFAULT CURRENT_TIMESTAMP
Thời điểm tạo bản ghi.
(Ràng buộc ghép)


UNIQUE(booking_id, showtime_seat_id)
Ngăn một đơn hàng chứa trùng lặp cùng một ghế (không đặt UNIQUE đơn lẻ trên showtime_seat_id để cho phép đặt lại ghế sau khi đơn cũ hết hạn).

MODULE 5: VOUCHER & REDEMPTION
Bảng 14: vouchers (Chương trình mã giảm giá)
Thuộc tính (Column)
Kiểu dữ liệu
Ràng buộc / Mặc định
Ý nghĩa nghiệp vụ
id
BIGINT
PK, AUTO_INCREMENT
Mã định danh voucher.
code
VARCHAR(50)
NOT NULL, UNIQUE
Mã code giảm giá khách hàng nhập.
discount_type
VARCHAR(20)
NOT NULL, CHECK (discount_type IN ('PERCENTAGE', 'FIXED_AMOUNT'))
Loại giảm giá: Theo phần trăm hay số tiền cố định.
discount_value
BIGINT
NOT NULL, CHECK (discount_value > 0)
Giá trị giảm (% hoặc số tiền VND).
max_discount_amount
BIGINT
NULL, CHECK (max_discount_amount IS NULL OR max_discount_amount >= 0)
Mức giảm tối đa (áp dụng cho loại giảm theo phần trăm).
min_order_value
BIGINT
NOT NULL, DEFAULT 0, CHECK (min_order_value >= 0)
Giá trị đơn hàng tối thiểu để áp dụng mã (VND).
usage_limit
INT
NOT NULL, CHECK (usage_limit > 0)
Tổng số lượt sử dụng tối đa trên toàn hệ thống.
reserved_count
INT
NOT NULL, DEFAULT 0, CHECK (reserved_count >= 0)
Số lượt đang được giữ tạm thời bởi các đơn PENDING_PAYMENT.
used_count
INT
NOT NULL, DEFAULT 0, CHECK (used_count >= 0)
Số lượt đã sử dụng thành công trong các đơn CONFIRMED.
per_user_limit
INT
NOT NULL, DEFAULT 1, CHECK (per_user_limit > 0)
Số lần tối đa mỗi tài khoản được phép sử dụng mã này.
start_at
DATETIME
NOT NULL
Thời điểm bắt đầu có hiệu lực.
end_at
DATETIME
NOT NULL, CHECK (start_at < end_at)
Thời điểm kết thúc hiệu lực.
is_active
BOOLEAN
NOT NULL, DEFAULT TRUE
Trạng thái kích hoạt của mã giảm giá.
created_at
DATETIME
NOT NULL, DEFAULT CURRENT_TIMESTAMP
Thời điểm tạo mã giảm giá.
updated_at
DATETIME
NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
Thời điểm cập nhật gần nhất.
(Ràng buộc kiểm tra)


CHECK ((reserved_count + used_count) <= usage_limit)
Đảm bảo tổng số lượt đang giữ và đã dùng không bao giờ vượt quá hạn mức.

Bảng 15: voucher_redemptions (Lịch sử giữ và sử dụng voucher)
Thuộc tính (Column)
Kiểu dữ liệu
Ràng buộc / Mặc định
Ý nghĩa nghiệp vụ
id
BIGINT
PK, AUTO_INCREMENT
Mã định danh lượt sử dụng voucher.
voucher_id
BIGINT
NOT NULL, FK -> vouchers(id)
Tham chiếu tới mã giảm giá.
user_id
BIGINT
NOT NULL, FK -> users(id)
Khách hàng áp dụng mã.
booking_id
BIGINT
NOT NULL, UNIQUE, FK -> bookings(id)
Đơn hàng áp dụng mã (mỗi đơn chỉ gắn với tối đa 1 bản ghi redemption).
discount_applied
BIGINT
NOT NULL, CHECK (discount_applied >= 0)
Số tiền thực tế đã giảm trên đơn hàng (VND).
status
VARCHAR(20)
NOT NULL, DEFAULT 'RESERVED', CHECK (status IN ('RESERVED', 'USED', 'RELEASED'))
Trạng thái lượt dùng: Đang giữ (RESERVED), Đã dùng (USED), hoặc Đã giải phóng (RELEASED).
created_at
DATETIME
NOT NULL, DEFAULT CURRENT_TIMESTAMP
Thời điểm giữ mã giảm giá.
updated_at
DATETIME
NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
Thời điểm cập nhật trạng thái lượt dùng.

MODULE 6: PAYMENT
Bảng 16: payments (Lịch sử các lần thử thanh toán & Đối soát hoàn tiền)
Thuộc tính (Column)
Kiểu dữ liệu
Ràng buộc / Mặc định
Ý nghĩa nghiệp vụ
id
BIGINT
PK, AUTO_INCREMENT
Mã định danh lượt thanh toán.
booking_id
BIGINT
NOT NULL, FK -> bookings(id)
Đơn đặt vé liên kết với lượt thanh toán này.
provider
VARCHAR(20)
NOT NULL, DEFAULT 'VNPAY', CHECK (provider IN ('VNPAY'))
Cổng thanh toán sử dụng.
transaction_ref
VARCHAR(100)
NOT NULL, UNIQUE
Mã tham chiếu giao dịch do hệ thống merchant tự sinh (vnp_TxnRef) cho mỗi lần thử thanh toán.
transaction_no
VARCHAR(100)
NULL, UNIQUE
Mã giao dịch bên phía VNPay trả về (vnp_TransactionNo).
amount
BIGINT
NOT NULL, CHECK (amount >= 0)
Số tiền của giao dịch thanh toán (VND).
status
VARCHAR(20)
NOT NULL, DEFAULT 'PENDING', CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED'))
Trạng thái thanh toán của lần thử này.
refund_status
VARCHAR(25)
NOT NULL, DEFAULT 'NONE', CHECK (refund_status IN ('NONE', 'REFUND_REQUIRED', 'REFUNDED'))
Trạng thái đối soát hoàn tiền (dùng khi thanh toán muộn đã mất ghế hoặc thanh toán trùng 2 lần).
response_code
VARCHAR(20)
NULL
Mã phản hồi từ VNPay (vnp_ResponseCode).
transaction_status
VARCHAR(20)
NULL
Mã trạng thái giao dịch từ VNPay (vnp_TransactionStatus).
pay_date
DATETIME
NULL
Thời điểm khách thanh toán thành công (chuyển đổi từ chuỗi vnp_PayDate yyyyMMddHHmmss theo múi giờ GMT+7 để so sánh với bookings.expires_at và thống kê doanh thu).
raw_payload
JSON
NULL
Lưu nguyên bản toàn bộ dữ liệu IPN callback từ VNPay để phục vụ đối soát.
created_at
DATETIME
NOT NULL, DEFAULT CURRENT_TIMESTAMP
Thời điểm tạo lượt thử thanh toán.
updated_at
DATETIME
NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
Thời điểm cập nhật kết quả từ IPN.

MODULE 7: REVIEW
Bảng 17: reviews (Đánh giá và bình luận bộ phim)
Thuộc tính (Column)
Kiểu dữ liệu
Ràng buộc / Mặc định
Ý nghĩa nghiệp vụ
id
BIGINT
PK, AUTO_INCREMENT
Mã định danh bài đánh giá.
user_id
BIGINT
NOT NULL, FK -> users(id)
Khách hàng viết đánh giá.
movie_id
BIGINT
NOT NULL, FK -> movies(id)
Bộ phim được đánh giá.
booking_id
BIGINT
NOT NULL, FK -> bookings(id)
Đơn đặt vé CONFIRMED chứng minh khách đã mua vé xem phim.
rating
INT
NOT NULL, CHECK (rating BETWEEN 1 AND 5)
Điểm đánh giá từ 1 sao đến 5 sao.
comment
TEXT
NULL
Nội dung bình luận chi tiết.
status
VARCHAR(20)
NOT NULL, DEFAULT 'VISIBLE', CHECK (status IN ('VISIBLE', 'HIDDEN'))
Trạng thái hiển thị bài đánh giá (hỗ trợ Admin ẩn bình luận vi phạm).
created_at
DATETIME
NOT NULL, DEFAULT CURRENT_TIMESTAMP
Thời điểm gửi đánh giá.
updated_at
DATETIME
NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
Thời điểm chỉnh sửa gần nhất.
(Ràng buộc ghép)


UNIQUE(user_id, movie_id)
Mỗi khách hàng chỉ được đánh giá tối đa 1 lần cho mỗi bộ phim.

7. Kế hoạch Triển khai & Kịch bản Kiểm thử Trọng tâm (Roadmap & Test Plan)
   7.1. Thứ tự Triển khai 5 Giai đoạn
   Giai đoạn 1 — Nền tảng nghiệp vụ: Khởi tạo project Spring Boot, kết nối MySQL, chạy Migration 17 bảng, xây dựng Authentication/JWT, phân quyền Admin/Customer và CRUD Phim, Phòng, Ghế, Suất chiếu.
   Giai đoạn 2 — Booking & Concurrency: Triển khai xem sơ đồ ghế, giữ ghế 10 phút với Pessimistic Locking, thu hồi ghế quá hạn và viết Integration Test kiểm chứng đồng thời.
   Giai đoạn 3 — Thanh toán VNPay: Tích hợp VNPay Sandbox, tách biệt Return URL và IPN Handler, xác minh chữ ký số, xử lý callback trùng, thanh toán trễ và đối soát hoàn tiền.
   Giai đoạn 4 — Hoàn thiện nghiệp vụ: Triển khai áp dụng Voucher, Đánh giá phim, Báo cáo doanh thu; bổ sung Redis caching và gửi thông báo qua RabbitMQ.
   Giai đoạn 5 — Đóng gói & Tài liệu hóa: Hoàn thiện bộ Integration Test, cấu hình Swagger/OpenAPI, Docker Compose và viết README.md phục vụ phỏng vấn.
   7.2. Danh sách Kịch bản Kiểm thử Tích hợp (Key Integration Tests)
   IT-01 (Đặt ghế đồng thời): Giả lập 50 luồng gửi yêu cầu giữ cùng ghế A1 của suất chiếu S1 tại một thời điểm  Chỉ đúng 1 booking PENDING_PAYMENT được tạo, 49 yêu cầu nhận mã 409 Conflict.
   IT-02 (Thu hồi ghế quá hạn an toàn): Đơn A hết hạn lúc 12:10:00 nhưng Scheduler chưa chạy; lúc 12:10:01 Khách B bấm giữ ghế đó  Đơn A tự động chuyển sang EXPIRED và Khách B giữ ghế thành công.
   IT-03 (VNPay IPN gọi lặp - Idempotency): Gửi cùng một bản tin IPN thành công 5 lần liên tiếp cho 1 giao dịch  Hệ thống chỉ xác nhận lần đầu, 4 lần sau không phát sinh lỗi hay thay đổi dữ liệu.
   IT-04 (Thanh toán muộn mất ghế & Thanh toán trùng 2 lần): Khi IPN báo thành công nhưng ghế đã thuộc về khách hàng khác (hoặc đơn đã được xác nhận bởi attempt trước đó)  Bản ghi payments chuyển sang SUCCESS kèm refund_status = 'REFUND_REQUIRED', không ghi đè quyền sở hữu ghế.
   7.3. Trạng thái Triển khai so với Kế hoạch (cập nhật v2.4)
   Mục này ghi lại phần nào của kế hoạch ở trên đã làm và chưa làm, để tài liệu khớp với mã nguồn hiện tại.
   Đã triển khai: Auth/JWT, Movie, Showtime (chống trùng lịch + 15 phút dọn phòng, hủy suất chiếu & điều phối hoàn tiền tự động FR-SHOW-02), Booking (giữ ghế 10 phút bằng Pessimistic Lock, scheduler thu hồi mỗi 30 giây), Payment (VNPay Sandbox, IPN idempotent, TH1/TH2/TH3, hoàn tiền thủ công), Voucher, Review, Báo cáo doanh thu, Docker Compose (MySQL); bộ Integration Test backend cho quy trình suất chiếu (ShowtimeWorkflowIntegrationTest với 5 ca kiểm thử cô lập); bộ Unit/Integration Test frontend (Vitest) cho các quy tắc giao diện và lọc suất chiếu; Script QA kiểm thử tích hợp giao diện quản trị (scripts/test-admin-suite.js).
   Chưa triển khai: Notification Module và gửi thông báo qua RabbitMQ; Redis caching (Redis hiện chỉ có trong docker-compose, chưa được mã nguồn sử dụng); Swagger/OpenAPI; bộ Integration Test tải/đồng thời cao IT-01 → IT-04 (dự kiến thực hiện ở giai đoạn tiếp theo G4-10).

8. Lịch sử Thay đổi (Changelog)
- Phiên bản 3.2 (2026-11-06):
  + Bổ sung G3-03 & FR-PRICE-01: Chính sách ma trận định giá tự động theo ngày, giờ và loại ghế (Pricing Policy Matrix) qua PricingProperties (app.pricing) và PricingService theo Quyết định D-05 [ĐÃ CHỐT].
  + Cấu hình ma trận: chuẩn cơ sở 60k, phụ thu VIP +15k, phụ thu ghế đôi +10k/ghế, phụ thu cuối tuần (T7-CN) +15k, ưu đãi suất sớm (trước 12:00) -10k, phụ thu giờ vàng (18:00-22:00) +10k, sàn giá tối thiểu 40k.
  + Áp giá cố định vào showtime_seats.price khi tạo suất chiếu và đổi hạng ghế phòng chiếu; mở rộng ShowtimeResponse chứa trường seatTypePrices (Map<SeatType, Long>).
  + Cập nhật SeatSelection.jsx: Hiển thị các badge ma trận giá trực quan (Cuối tuần, Suất sớm, Giờ vàng) trên Header Bar và cập nhật bảng chú thích giá Legend đọc trực tiếp từ server.
  + Bổ sung bộ kiểm thử PricingPolicyTest (backend) và pricingPolicy.test.js (frontend).
- Phiên bản 3.1 (2026-11-06):
  + Bổ sung G3-02 & FR-SEAT-02 / FR-BOOK-07: Quy tắc ghế đôi (Couple Seats / Sofa đôi) theo Phương án A (D-01) và cách tính giá chuẩn theo D-02 [ĐÃ CHỐT].
  + Thêm cột `pair_group` vào bảng `seats` (Migration V3__seat_pair_group.sql), mở rộng DTO SeatResponse/ShowtimeSeatResponse.
  + Bổ sung mã lỗi 1510 (COUPLE_SEAT_MUST_BE_BOOKED_IN_PAIR: 400 Bad Request) khi chọn lẻ 1 ghế trong cặp ghế đôi.
  + Điều chỉnh SeatType.COUPLE: Mỗi ghế trong cặp mang giá cơ sở, tổng cả cặp = giá ghế 1 + giá ghế 2 (server tự tính, tránh nhân sai hệ số).
  + Cập nhật SeatSelection.jsx: Tự động chọn/bỏ chọn nguyên cặp ghế đôi, hiển thị nối viền liền khối (pill shape), vô hiệu hóa cả cặp nếu 1 ghế đã bị giữ/đặt.
  + Bổ sung bộ kiểm thử CoupleSeatIntegrationTest (backend) và coupleSeat.test.js (frontend).
- Phiên bản 3.0 (2026-11-06):
  + Bổ sung G3-01 & cập nhật FR-BOOK-01: Luật ghế lẻ (Orphan Seat Detection) chặn chọn ghế để lại 1 ghế trống đơn độc ở mép hàng hoặc kẹp giữa các ghế đã chiếm/đã chọn.
  + Thêm mã lỗi 1509 (ORPHAN_SEAT_DETECTED: 400 Bad Request) và cấu hình bật/tắt app.booking.orphan-seat-rule-enabled (mặc định: true).
  + Bổ sung client-side validation và warning toast/modal trên SeatSelection.jsx và tiện ích utils/seatGap.js.
  + Bổ sung bộ kiểm thử tích hợp OrphanSeatIntegrationTest (backend) và unit test seatGap.test.js (frontend).
- Phiên bản 2.9 (2026-11-06):
  + Bổ sung G2-06 & hoàn thiện FR-REP-01: Báo cáo doanh thu chuẩn xác KPI (đếm đúng số vé bán ra BookingItem và tính công suất ghế thực tế ShowtimeSeat).
  + Phân định rõ hai cửa sổ thời gian: Doanh thu & số vé bán theo ngày thanh toán (payments.pay_date); Tổng số ghế & tỷ lệ lấp đầy theo thời gian suất chiếu diễn ra (showtimes.start_time).
  + Loại bỏ quy ước hằng số 25 ghế, tính occupancy = (tickets / capacity) * 100 làm tròn 1 chữ số thập phân, gán 0.0 nếu capacity = 0.
  + Bổ sung chú thích quy tắc tính toán trên giao diện AdminDashboard và bộ kiểm thử tích hợp RevenueReportIntegrationTest.
- Phiên bản 2.8 (2026-11-06):
  + Bổ sung G2-05 & FR-BOOK-08: Cho phép khách hàng tự hủy vé đã thanh toán (CONFIRMED) trước giờ chiếu tối thiểu 60 phút (app.booking.refund-cutoff-minutes: 60) theo Quyết định D-04 [ĐÃ CHỐT].
  + Triển khai endpoint POST /api/v1/bookings/{id}/cancel-confirmed, giải phóng ghế về AVAILABLE, chuyển payment sang REFUND_REQUIRED, hoàn trả voucher USED -> RELEASED.
  + Bổ sung mã lỗi 1508 (BOOKING_CANCELLATION_WINDOW_CLOSED) và bộ kiểm thử tích hợp BookingRefundWindowIntegrationTest.
- Phiên bản 2.7 (2026-11-06):
  + Bổ sung G2-04 (FR-SHOW-01): Chặn thao tác kết thúc/ngừng chiếu phim khi còn suất chiếu SCHEDULED trong tương lai (Mã lỗi 1207: MOVIE_HAS_FUTURE_SHOWTIMES) theo Quyết định D-03.
  + Thêm lớp phòng thủ nhiều tầng trong BookingService.createBooking chặn đặt vé vào suất chiếu thuộc phim có trạng thái ENDED (mã lỗi 1502).
  + Bổ sung kiểm thử tích hợp MovieDiscontinueIntegrationTest xác thực toàn diện quy trình ngừng chiếu phim.
- Phiên bản 2.6 (2026-11-06):
  + Bổ sung G2-03 & FR-BOOK-05: Hạn chót đặt vé (cutoff 15 phút trước giờ chiếu, cấu hình app.booking.cutoff-minutes: 15) và cập nhật thông điệp mã lỗi 1502 thành "Showtime is cancelled or the booking window has closed".
  + Bổ sung tham số truy vấn bookableOnly trên endpoint GET /api/v1/showtimes để lọc danh sách suất chiếu còn mở bán cho khách hàng.
  + Bổ sung kiểm thử tích hợp ShowtimeCutoffIntegrationTest xác thực hạn chót đặt vé và bộ lọc bookableOnly.
- Phiên bản 2.5 (2026-11-06):
  + Bổ sung G2-02: Chặn đặt ghế không hoạt động (is_active = false, mã 1504), tự động tính lại giá các suất chiếu tương lai khi đổi loại ghế, và chặn vô hiệu hóa phòng khi còn suất chiếu tương lai (mã 1312).
  + Bổ sung FR-BOOK-04: Giới hạn tối đa 2 đơn giữ vé PENDING_PAYMENT còn hiệu lực trên mỗi tài khoản khách hàng, trả về HTTP 429 (Mã 1507) khi vượt hạn mức.
  + Bổ sung mã lỗi 1507 vào FR-BOOK-02 và hoàn thiện khóa bi quan bảng users ở đầu chuỗi giao dịch createBooking.
  + Cập nhật mục 4.4: Bổ sung khóa bảng users (FOR UPDATE) đầu tiên trong chuỗi khóa chống Deadlock.
- Phiên bản 2.4 (2026-11-06):
  + Bổ sung FR-SHOW-02: Quy trình Hủy suất chiếu & Điều phối hoàn tiền tự động (chống deadlock, hoàn tiền tự động cho đơn CONFIRMED, thu hồi/hoàn voucher phù hợp).
  + Cập nhật mục 4.4 (Thứ tự khóa): Bổ sung khóa bảng showtimes (X ở hủy suất, S ở tạo booking) vào đầu chuỗi khóa tài nguyên chống Deadlock.
  + Loại bỏ mã lỗi deprecated SHOWTIME_HAS_ACTIVE_BOOKINGS (1311).
  + Cập nhật mục 7.3: Bổ sung bộ Integration Test backend (ShowtimeWorkflowIntegrationTest) và bộ test frontend/QA script.
- Phiên bản 2.3 (2026-11-05):
  + Bổ sung FR-DEV-01 (Môi trường Dev Tools giả lập thanh toán & quản lý suất chiếu).
  + Bổ sung NFR-SEC-02 (Bảo mật cấu hình & biến môi trường JWT / VNPay / Seeded Admin).
  + Bổ sung mục 7.3 (Trạng thái triển khai thực tế so với kế hoạch).
- Phiên bản 2.2 (2026-11-04):
  + Bổ sung quy tắc hủy suất chiếu và dọn phòng 15 phút.


