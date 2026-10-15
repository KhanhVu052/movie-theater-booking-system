TÀI LIỆU ĐẶC TẢ YÊU CẦU PHẦN MỀM (SRS)
Tên dự án: Hệ thống Đặt vé Xem phim – Movie Theater Booking System (Phiên bản 2.2)
1. Giới thiệu Dự án (Introduction)
   1.1. Mục tiêu và Phạm vi
   Dự án là hệ thống đặt vé xem phim dành cho một rạp chiếu duy nhất, cung cấp phân hệ quản trị (Admin) để quản lý phim, phòng chiếu, lịch chiếu, khuyến mãi, doanh thu và phân hệ khách hàng (Customer) để tra cứu phim, chọn ghế, đặt vé, thanh toán qua cổng VNPay Sandbox.
   Trọng tâm cốt lõi của hệ thống là giải quyết bài toán tranh chấp đồng thời (Concurrency) khi nhiều khách hàng cùng giữ một ghế, kiểm soát chặt chẽ vòng đời đơn hàng (10 phút giữ ghế) và đảm bảo tính nhất quán dữ liệu (Idempotency & Data Consistency) trong giao dịch thanh toán trực tuyến[cite: 2, 3, 4].
   1.2. Quy ước Kỹ thuật Chung
   Múi giờ chuẩn: Toàn bộ tầng ứng dụng (Spring Boot) và cơ sở dữ liệu (MySQL 8+) thống nhất sử dụng múi giờ Asia/Ho_Chi_Minh (GMT+7) để đồng bộ khi so sánh hạn giữ ghế (expires_at) với thời gian thanh toán của VNPay (vnp_PayDate).
   Đơn vị tiền tệ: Lưu trữ bằng kiểu số nguyên lớn (BIGINT) theo đơn vị Đồng (VND), không sử dụng kiểu số thực dấu phẩy động để tránh sai số làm tròn.
2. Kiến trúc Hệ thống & Cấu trúc Module (System Architecture)
   2.1. Kiến trúc Tổng thể (Modular Monolith kết hợp Layered Architecture)
   Hệ thống triển khai theo kiến trúc Modular Monolith trên nền tảng Spring Boot REST API (Java 21), giao tiếp với Frontend và sử dụng Relational Database (MySQL 8+) làm nguồn dữ liệu chuẩn duy nhất (Single Source of Truth)[cite: 2, 5].
   Các module nghiệp vụ trong hệ thống bao gồm:
   Auth Module: Quản lý đăng ký, đăng nhập (JWT) và phân quyền người dùng với Relational Database.
   Movie Module: Quản lý danh mục phim, thể loại, diễn viên trong Relational Database[cite: 2, 5].
   Showtime Module: Quản lý rạp, phòng chiếu, sơ đồ ghế vật lý và lịch chiếu trong Relational Database[cite: 2, 5].
   Booking Module: Xử lý sơ đồ ghế theo suất chiếu, giữ ghế 10 phút, thu hồi ghế quá hạn với Relational Database, kết hợp Redis hỗ trợ caching và kết nối sang Notification[cite: 2, 3, 5].
   Payment Module: Tích hợp cổng thanh toán VNPay Sandbox, quản lý các lượt thử thanh toán (payment attempts), xử lý IPN callback và đối soát hoàn tiền với Relational Database[cite: 2, 4, 5].
   Voucher Module: Quản lý mã khuyến mãi và kiểm soát hạn mức sử dụng trong Relational Database[cite: 2, 5].
   Review Module: Quản lý đánh giá và chấm điểm phim từ khách hàng đã mua vé trong Relational Database[cite: 2, 5].
   Notification Module: Gửi thông báo xác nhận đặt vé và vé điện tử, hỗ trợ mở rộng bất đồng bộ qua RabbitMQ[cite: 2, 5].
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
   Customer (Khách hàng): Xem thông tin chi tiết phim và lịch chiếu, xem sơ đồ ghế theo suất chiếu, thực hiện giữ ghế tạm thời trong 10 phút, áp dụng mã giảm giá (Voucher), thanh toán trực tuyến qua cổng VNPay Sandbox, xem lịch sử đặt vé và viết đánh giá (Review/Rating) sau khi suất chiếu kết thúc[cite: 2, 3, 4].
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

• HELD  BOOKED: Khi nhận IPN thanh toán thành công hợp lệ[cite: 2, 4].

• HELD  AVAILABLE: Khi booking chuyển sang EXPIRED hoặc CANCELLED (xóa held_by_booking_id = NULL).
bookings
status
PENDING_PAYMENT, CONFIRMED, CANCELLED, EXPIRED
• Khởi tạo ở PENDING_PAYMENT kèm mốc thời hạn chuẩn expires_at = NOW() + 10 phút[cite: 2, 4].

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
Để giảm thiểu nguy cơ Deadlock khi nhiều luồng (Giữ ghế, Scheduler quét đơn hết hạn, Xử lý IPN) cùng truy cập cơ sở dữ liệu, các Transaction bắt buộc thực hiện khóa bản ghi theo thứ tự nhất quán:
Khóa bảng bookings (SELECT ... FOR UPDATE).
Khóa bảng showtime_seats (SELECT ... FOR UPDATE theo thứ tự id ASC).
Khóa bảng vouchers (SELECT ... FOR UPDATE).
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
   • Lỗi: Trùng khung giờ hoặc phòng không hoạt động  409 Conflict.

• Nghiệm thu: 2 Admin gửi request đồng thời xếp 2 suất chiếu giao giờ nhau trong cùng 1 phòng  Chỉ 1 request thành công.
FR-BOOK-01
Hiển thị sơ đồ ghế theo suất chiếu
Trả về danh sách ghế của suất chiếu (showtime_seats) kèm vị trí hàng/cột, hạng ghế (NORMAL, VIP, COUPLE), giá vé và trạng thái hiển thị. Nếu ghế có status = 'HELD' nhưng đơn đang giữ ghế đó đã quá hạn (bookings.expires_at < NOW()), hệ thống trả về trạng thái hiển thị là AVAILABLE.
• Lỗi: Suất chiếu không tồn tại  404 Not Found.

• Nghiệm thu: Ghế đã hết hạn giữ 10 phút dù Scheduler chưa chạy vẫn hiển thị là ghế trống.
FR-BOOK-02
Giữ ghế đồng thời & Thu hồi có điều kiện
Khách chọn từ 1–8 ghế trong cùng một showtime_id. Trong Transaction:

1. Nếu có ghế đang HELD bởi booking cũ đã quá hạn (expires_at < NOW()), hệ thống khóa booking cũ, chuyển booking cũ sang EXPIRED, nhả voucher của booking cũ (nếu có) và đưa các ghế thuộc booking cũ về AVAILABLE.

2. Sắp xếp showtime_seat_id tăng dần và khóa FOR UPDATE kèm điều kiện showtime_id.

3. Nếu tất cả ghế đều AVAILABLE, tạo bookings (PENDING_PAYMENT, expires_at = NOW() + 10 phút), lưu cứng giá vé vào booking_items và cập nhật ghế sang HELD[cite: 2, 3, 4].
   • Lỗi: Bất kỳ ghế nào đang BOOKED, đang HELD (còn hạn) hoặc không thuộc showtime_id yêu cầu  Rollback toàn bộ và trả về 409 Conflict.

• Nghiệm thu: 50 request đồng thời cùng giữ ghế A1 của suất chiếu S1  Đúng 1 booking được tạo, 49 request nhận 409 Conflict.
FR-BOOK-03
Giải phóng tự động đơn giữ ghế quá hạn
Tác vụ nền (@Scheduled chạy mỗi 30 giây) tìm các đơn PENDING_PAYMENT có expires_at < NOW(). Với từng đơn, khóa theo thứ tự bookings  showtime_seats  vouchers, chuyển đơn sang EXPIRED, giải phóng các ghế đang gắn với held_by_booking_id = booking.id về AVAILABLE, và chuyển voucher_redemptions sang RELEASED (giảm reserved_count).
• Quy tắc: Không thay đổi trạng thái của các bản ghi payments đang PENDING.

• Nghiệm thu: Sau 10 phút không thanh toán, ghế và hạn mức voucher được giải phóng chính xác.
FR-VOUC-01
Áp dụng & Giữ hạn mức Voucher
Khi khách áp dụng mã giảm giá lúc tạo booking: Khóa dòng vouchers (FOR UPDATE), kiểm tra is_active = true, thời hạn (start_at <= NOW() <= end_at), giá trị đơn tối thiểu (subtotal_amount >= min_order_value), tổng hạn mức (reserved_count + used_count < usage_limit) và giới hạn mỗi khách (COUNT(RESERVED, USED) < per_user_limit). Hợp lệ thì tăng reserved_count + 1 và tạo voucher_redemptions (RESERVED).
• Lỗi: Hết lượt dùng hoặc không đủ điều kiện  400 Bad Request / 409 Conflict.

• Nghiệm thu: Voucher còn 1 lượt cuối, 10 khách cùng áp dụng đồng thời  Đúng 1 đơn giữ được mã.
FR-PAY-01
Tạo lượt thanh toán VNPay & Retry
Với một booking đang PENDING_PAYMENT và còn hạn (expires_at > NOW()), khách được tạo tối đa 3 lượt thử thanh toán (payments ở trạng thái PENDING, refund_status = 'NONE') với mã transaction_ref (vnp_TxnRef) duy nhất và nhận URL chuyển hướng sang VNPay Sandbox[cite: 2, 4].
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
Báo cáo doanh thu thực tế
Admin truy vấn thống kê doanh thu theo ngày/tháng hoặc theo phim dựa trên cột payments.pay_date. Doanh thu thực nhận chỉ tính tổng payments.amount của các giao dịch có status = 'SUCCESS' và refund_status = 'NONE'.
• Nghiệm thu: Các đơn PENDING_PAYMENT, EXPIRED hoặc giao dịch cần hoàn tiền (REFUND_REQUIRED / REFUNDED) không làm sai lệch doanh thu.

5.2. Yêu cầu Phi chức năng (Non-Functional Requirements)
NFR-CONC-01 (Kiểm soát đồng thời): Sử dụng Database Transaction kết hợp Pessimistic Write Lock (SELECT ... FOR UPDATE) và thứ tự khóa chuẩn hóa để đảm bảo không bao giờ xảy ra tình trạng đặt trùng ghế hoặc vượt hạn mức voucher[cite: 2, 3].
NFR-REL-01 (Độ tin cậy & Idempotency): Luồng xử lý thanh toán IPN đảm bảo tính Idempotent, hoạt động chính xác ngay cả khi callback bị gửi lặp hoặc mất kết nối phía trình duyệt của khách hàng.
NFR-SEC-01 (Bảo mật): Mật khẩu băm bằng BCrypt; xác thực và phân quyền bằng Spring Security + JWT (CUSTOMER, ADMIN); mọi phép tính giá vé và giảm giá voucher thực hiện hoàn toàn ở Backend[cite: 2, 5].
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
Bảng 11: showtime_seats (Trạng thái ghế theo từng suất chiếu – Bảng khóa đồng thời)[cite: 2, 3]
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
Trạng thái ghế hiện tại: Trống, Đang giữ 10 phút, hoặc Đã đặt thành công[cite: 2, 3].
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
Trạng thái vòng đời của đơn đặt vé[cite: 2, 4].
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
Bảng 16: payments (Lịch sử các lần thử thanh toán & Đối soát hoàn tiền)[cite: 2, 4]
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
Cổng thanh toán sử dụng[cite: 2, 4].
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
Trạng thái thanh toán của lần thử này[cite: 2, 4].
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
   Giai đoạn 1 — Nền tảng nghiệp vụ: Khởi tạo project Spring Boot, kết nối MySQL, chạy Migration 17 bảng, xây dựng Authentication/JWT, phân quyền Admin/Customer và CRUD Phim, Phòng, Ghế, Suất chiếu[cite: 2, 5].
   Giai đoạn 2 — Booking & Concurrency: Triển khai xem sơ đồ ghế, giữ ghế 10 phút với Pessimistic Locking, thu hồi ghế quá hạn và viết Integration Test kiểm chứng đồng thời[cite: 2, 3].
   Giai đoạn 3 — Thanh toán VNPay: Tích hợp VNPay Sandbox, tách biệt Return URL và IPN Handler, xác minh chữ ký số, xử lý callback trùng, thanh toán trễ và đối soát hoàn tiền[cite: 2, 4, 5].
   Giai đoạn 4 — Hoàn thiện nghiệp vụ: Triển khai áp dụng Voucher, Đánh giá phim, Báo cáo doanh thu; bổ sung Redis caching và gửi thông báo qua RabbitMQ[cite: 2, 5].
   Giai đoạn 5 — Đóng gói & Tài liệu hóa: Hoàn thiện bộ Integration Test, cấu hình Swagger/OpenAPI, Docker Compose và viết README.md phục vụ phỏng vấn.
   7.2. Danh sách Kịch bản Kiểm thử Tích hợp (Key Integration Tests)
   IT-01 (Đặt ghế đồng thời): Giả lập 50 luồng gửi yêu cầu giữ cùng ghế A1 của suất chiếu S1 tại một thời điểm  Chỉ đúng 1 booking PENDING_PAYMENT được tạo, 49 yêu cầu nhận mã 409 Conflict.
   IT-02 (Thu hồi ghế quá hạn an toàn): Đơn A hết hạn lúc 12:10:00 nhưng Scheduler chưa chạy; lúc 12:10:01 Khách B bấm giữ ghế đó  Đơn A tự động chuyển sang EXPIRED và Khách B giữ ghế thành công.
   IT-03 (VNPay IPN gọi lặp - Idempotency): Gửi cùng một bản tin IPN thành công 5 lần liên tiếp cho 1 giao dịch  Hệ thống chỉ xác nhận lần đầu, 4 lần sau không phát sinh lỗi hay thay đổi dữ liệu.
   IT-04 (Thanh toán muộn mất ghế & Thanh toán trùng 2 lần): Khi IPN báo thành công nhưng ghế đã thuộc về khách hàng khác (hoặc đơn đã được xác nhận bởi attempt trước đó)  Bản ghi payments chuyển sang SUCCESS kèm refund_status = 'REFUND_REQUIRED', không ghi đè quyền sở hữu ghế.


