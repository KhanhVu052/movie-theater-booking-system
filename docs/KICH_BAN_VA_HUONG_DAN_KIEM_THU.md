# BỘ KỊCH BẢN & CẨM NANG HƯỚNG DẪN KIỂM THỬ TOÀN DIỆN GOTORO CINEMA
> **Phiên bản:** Enterprise Quality Assurance & Tester Handbook v5.0  
> **Môi trường thực thi:** Local Environment  
> * **Frontend (Giao diện Web):** `http://localhost:5173`  
> * **Backend (API Service):** `http://localhost:8080`  
> * **Database & Cache:** MySQL 8.0 (`localhost:3306`) & Redis 7 (`localhost:6379`)

---

## 📌 1. BẢNG TÀI KHOẢN & DỮ LIỆU ĐĂNG NHẬP SẴN

| Vai trò | Email đăng nhập | Mật khẩu | Mục đích sử dụng |
|---|---|---|---|
| **ADMIN (Quản trị viên)** | `admin@cinema.com` | `GoToroAdminSecure2026@Password` | Toàn quyền kiểm thử Admin Console: Phim, Suất chiếu, Voucher, Hoàn tiền, Báo cáo |
| **CUSTOMER 1 (Khách A)** | `customer1@cinema.com` | `Customer@12345` | Đặt vé chính, giữ ghế, áp voucher, hủy vé cá nhân |
| **CUSTOMER 2 (Khách B)** | `customer2@cinema.com` | `Customer@12345` | Kiểm thử tranh chấp đồng thời (mở trình duyệt ẩn danh hoặc cửa sổ thứ 2) |

---

## 🧭 2. BẢN ĐỒ ĐIỀU HƯỚNG NHANH CHO TESTER (CHEAT SHEET)

| Bạn muốn kiểm tra chức năng gì? | Đường dẫn URL | Thao tác trên giao diện |
|---|---|---|
| **Đăng ký tài khoản** | `/register` | Form đăng ký ở giữa màn hình |
| **Đăng nhập tài khoản** | `/login` | Form đăng nhập ở giữa màn hình |
| **Xem danh sách phim & đặt vé nhanh** | `/` | Thanh Quick Booking ở đầu trang hoặc mục "Now & Upcoming Releases" |
| **Xem chi tiết phim & Trailer YouTube** | `/movies/:id` | Bấm vào bất kỳ thẻ Poster phim nào ở trang chủ |
| **Sơ đồ chọn ghế & Áp voucher** | `/booking/seat-selection/:showtimeId` | Chọn suất chiếu tại trang chủ hoặc trang chi tiết phim |
| **Màn hình Thanh toán & Giữ ghế 10p** | `/payment/:bookingId` | Bấm nút "Reserve Seats & Checkout" tại màn hình chọn ghế |
| **Xem vé đã đặt & Hủy vé (> 60p)** | `/my-bookings` | Bấm nút **`🎟️ My Tickets`** ở góc trên cùng bên phải Header |
| **Quản trị phim & URL Trailer** | `/admin` | Chọn Tab **`Movie Catalog`** -> Bấm nút vàng **`+ Publish Movie`** |
| **Tạo suất chiếu & Hủy suất chiếu** | `/admin` | Chọn Tab **`Showtime Scheduling`** -> Bấm nút vàng **`+ Schedule Showtime`** |
| **Quản lý Hoàn tiền thủ công** | `/admin` | Chọn Tab **`Payments & Refunds`** -> Bảng danh sách đơn hàng |
| **Quản lý Mã giảm giá (Vouchers)** | `/admin` | Chọn Tab **`Promotional Vouchers`** -> Bấm nút **`+ Create Voucher`** |
| **Báo cáo Doanh thu & Công suất phòng** | `/admin` | Chọn Tab **`Revenue Reports`** -> Chọn khoảng ngày -> Bấm Apply Filter |

---

# PHẦN 1: KỊCH BẢN PHÍA KHÁCH HÀNG (CLIENT PORTAL)

---

### MODULE 1.1: XÁC THỰC & ĐĂNG NHẬP (AUTH & RATE LIMITING)

#### Case 1.1.1: Đăng ký tài khoản hợp lệ
* **Vị trí thao tác:** `http://localhost:5173/register` (hoặc bấm nút "Sign Up" góc trên bên phải trang chủ).
* **Các bước thực hiện:**
  1. Nhập Full Name: `Test Customer`.
  2. Nhập Email: `tester_new@cinema.com` (chưa từng đăng ký).
  3. Nhập Password: `SecurePass@2026`.
  4. Bấm nút màu vàng **"Create Account"**.
* **Kỳ vọng:** Đăng ký thành công, tự động lưu phiên đăng nhập và điều hướng về trang chủ. Góc trên bên phải hiển thị tên `Test Customer` và nút `🎟️ My Tickets`.

#### Case 1.1.2: Đăng ký không hợp lệ (Dữ liệu biên & Validation)
* **Vị trí thao tác:** `http://localhost:5173/register`
* **Các bước thực hiện:**
  * **Trường hợp A (Email trùng):** Nhập email đã tồn tại `customer1@cinema.com` -> Bấm Đăng ký -> **Kỳ vọng:** Báo lỗi `Email already exists (Mã 1002)`.
  * **Trường hợp B (Mật khẩu dưới 8 ký tự):** Nhập mật khẩu `1234567` -> Bấm Đăng ký -> **Kỳ vọng:** Báo lỗi validation mật khẩu phải từ 8 ký tự.
  * **Trường hợp C (Email sai định dạng):** Nhập email `abc@@xyz` -> Form tự động cảnh báo định dạng email không hợp lệ.

#### Case 1.1.3: Đăng nhập hợp lệ
* **Vị trí thao tác:** `http://localhost:5173/login`
* **Các bước thực hiện:** Nhập `customer1@cinema.com` / `Customer@12345` -> Bấm **"Sign In"**.
* **Kỳ vọng:** Đăng nhập thành công, chuyển về trang chủ, góc phải hiển thị tên `nguyen van A`.

#### Case 1.1.4: Chặn Brute-Force Rate Limiting (Tối đa 5 lần sai/15 phút)
* **Vị trí thao tác:** `http://localhost:5173/login`
* **Các bước thực hiện:**
  1. Nhập email: `customer1@cinema.com`.
  2. Nhập mật khẩu SAI liên tiếp 5 lần (ví dụ: `sai_mat_khau_1`, `sai_mat_khau_2`,...).
  3. Đến lần thứ 6, nhập đúng mật khẩu `Customer@12345` và bấm Sign In.
* **Kỳ vọng:** Hệ thống từ chối đăng nhập với thông báo: `Too many failed login attempts. Please try again after 15 minutes (Mã 1105)`. Tài khoản bị tạm khóa 15 phút.

---

### MODULE 1.2: KHÁM PHÁ PHIM & BẢO MẬT XSS TRAILER

#### Case 1.2.1: Lọc và tìm kiếm phim
* **Vị trí thao tác:** Trang chủ `http://localhost:5173/` (cuộn xuống mục *Now & Upcoming Releases*).
* **Các bước thực hiện:**
  1. Bấm tab **`Now Showing`** để xem các phim đang khởi chiếu.
  2. Bấm tab **`Coming Soon`** để xem các phim sắp ra mắt.
  3. Bấm vào các tag thể loại: `Action`, `Drama`, `Sci-Fi`...
  4. Gõ từ khóa vào thanh tìm kiếm trên Navbar: ví dụ `Spider` -> Nhấn Enter.
* **Kỳ vọng:** Danh sách phim tự động lọc chính xác theo từ khóa và thể loại. Các phim đã ngừng chiếu (`ENDED`) không xuất hiện trong danh sách bán vé.
* 💡 **Ghi chú về phim `COMING_SOON` & 3 Gợi ý tối ưu vé đặt trước (Pre-Sale):**
  1. *Phim sắp chiếu chưa mở bán:* Sẽ được ẩn thanh 7 ngày rỗng và thay bằng banner hiển thị rõ ngày công chiếu (`releaseDate`).
  2. *Phim sắp chiếu có bán vé đặt trước (Pre-Sale):* Sẽ áp dụng 3 cơ chế tối ưu:
     * (1) Gắn huy hiệu `🔥 VÉ ĐẶT TRƯỚC (PRE-SALE)`.
     * (2) Thanh ngày chỉ hiện các ngày thực tế có suất chiếu (Dynamic Date Filter) để khách không bao giờ gặp ngày rỗng.
     * (3) Banner kêu gọi đặt vé sớm giữ chỗ đẹp nhất.  
     *(Chi tiết xem tại file `docs/BUG_LOG_QA_TESTING.md` mục `FEAT-UX-COMING-SOON-PRE-SALE-02`)*.

#### Case 1.2.2: Xem chi tiết phim & Kiểm tra iframe Trailer an toàn (Chống XSS)
* **Vị trí thao tác:** Click vào một phim bất kỳ ở trang chủ (ví dụ phim *Spider-Man: Brand New Day* để vào `/movies/1`).
* **Các bước thực hiện:**
  1. Trang chi tiết mở ra, hiển thị đầy đủ Đạo diễn, Diễn viên, Thời lượng, Nhãn độ tuổi và Tóm tắt nội dung.
  2. Bấm nút **"Watch Trailer"** (có icon Play).
  3. Modal xem trailer hiện lên, video YouTube phát mượt mà.
  4. Mở Developer Tools (bấm phím `F12`) -> Chọn thẻ `Elements` -> Tìm đến thẻ `<iframe>`:
* **Kỳ vọng:** Thẻ `<iframe>` có thuộc tính bảo mật `sandbox="allow-scripts allow-same-origin allow-presentation"` để ngăn chặn tấn công injection mã độc.

---

### MODULE 1.3: CHỌN SUẤT CHIẾU & HẠN CHÓT ĐẶT VÉ (CUTOFF 15 PHÚT)

#### Case 1.3.1: Xem lịch chiếu theo ngày
* **Vị trí thao tác:** Trang chi tiết phim `/movies/:id` (cuộn xuống phần *Select Date & Showtime*).
* **Các bước thực hiện:**
  1. Bấm chọn các nút ngày: `Today`, `Tomorrow`, hoặc các ngày tiếp theo trong tuần.
  2. Lọc theo Rạp chiếu (Cinema): Chọn `All Cinemas` hoặc `Cinema Central Hanoi`.
* **Kỳ vọng:** Danh sách các khung giờ chiếu hiển thị rõ ràng kèm định dạng: `IMAX • SUBTITLE`, `2D • DUBBED`...

#### Case 1.3.2: Chặn đặt vé suất chiếu cận giờ (Cutoff 15 phút)
* **Trạng thái:** ⏳ **CHƯA TEST (PENDING TEST) - Sẽ kiểm thử sau** (do hiện tại chưa có suất chiếu rơi vào khung giờ cận < 15 phút).
* **Vị trí thao tác:** Trang chi tiết phim hoặc thanh Quick Booking ở Trang chủ.
* **Các bước thực hiện:** Tìm một suất chiếu có giờ bắt đầu cách thời điểm hiện tại dưới 15 phút (hoặc suất chiếu đã qua giờ).
* **Kỳ vọng:** Suất chiếu đó bị làm mờ (disabled) hoặc không xuất hiện trong danh sách bookable; nếu cố tình gọi API thì hệ thống từ chối: `Showtime has already started or is within cutoff period (Mã 1309)`.
* 💡 *Mẹo test nhanh:* Chạy lệnh tạo suất chiếu sau 8 phút nữa:  
  `docker exec cinema_mysql mysql -u root -proot cinema_booking_db -e "INSERT INTO showtimes (movie_id, room_id, start_time, end_time, base_price, status) VALUES (1, 1, DATE_ADD(NOW(), INTERVAL 8 MINUTE), DATE_ADD(NOW(), INTERVAL 128 MINUTE), 100000, 'SCHEDULED');"`

---

### MODULE 1.4: SƠ ĐỒ GHẾ, LUẬT GHẾ LẺ (ORPHAN SEAT) & GHẾ ĐÔI (COUPLE SEAT)

#### Case 1.4.1: Hiển thị bảng giá đóng băng theo ma trận giá
* **Vị trí thao tác:** Chọn một suất chiếu bất kỳ để vào `/booking/seat-selection/:showtimeId`.
* **Các bước thực hiện:**
  1. Quan sát phần Chú thích (Legend) ở đáy sơ đồ ghế.
* **Kỳ vọng:** Hiển thị rõ giá từng hạng ghế:
  * Ghế thường (Regular / Standard): ví dụ `130,000 VND`
  * Ghế VIP (+20.000đ): ví dụ `150,000 VND`
  * Ghế Couple (Ghế đôi): ví dụ `520,000 VND/cặp` (đã gồm phụ phí và nhân đôi giá)
  * Suất chiếu vào thứ 7, Chủ Nhật tự động có nhãn `Weekend Surcharge`.

#### Case 1.4.2: Kiểm tra Luật ghế lẻ (Orphan Seat Detection) — [BỊ CHẶN]
* **Vị trí thao tác:** Màn hình chọn ghế `/booking/seat-selection/:showtimeId`.
* **Các kịch bản kiểm tra:**
  * **Kịch bản A (Để trống 1 ghế đầu hàng):** Hàng B có ghế B1, B2 đang trống. Khách bấm chọn ghế `B2` (để lại ghế `B1` đơn độc).
    * 👉 **Kỳ vọng:** Hệ thống hiện thông báo cảnh báo: `Cannot leave a single empty seat (orphan seat). Please select adjacent seats.` và ghế B2 tự động hủy chọn hoặc nút Đặt vé bị chặn.
  * **Kịch bản B (Để trống 1 ghế cuối hàng):** Hàng có 8 ghế. Khách bấm chọn ghế số `7` (để lại ghế số `8` đơn độc).
    * 👉 **Kỳ vọng:** Cảnh báo không được để lại 1 ghế trống lẻ ở cuối hàng.
  * **Kịch bản C (Để trống đúng 1 ghế ở giữa):** Ghế B4 và B6 đã được đặt (hoặc đang chọn). Khách cố tình chọn B4 và B6 nhưng chừa lại duy nhất ghế `B5`.
    * 👉 **Kỳ vọng:** Cảnh báo phát hiện ghế trống lẻ kẹp giữa hai ghế đã chọn.

#### Case 1.4.3: Chọn ghế liền kề hợp lệ — [HỢP LỆ]
* **Vị trí thao tác:** Màn hình chọn ghế.
* **Các bước thực hiện:** Bấm chọn 2 ghế liền nhau: ví dụ `B5` và `B6` (hoặc `B1` và `B2`).
* **Kỳ vọng:** Ghế chuyển sang màu vàng (Selected), khung Booking Summary bên phải hiển thị danh sách ghế kèm tổng tiền tạm tính. Nút **"Reserve Seats & Checkout"** sáng lên cho phép click.
* ⏳ *Ghi chú:* Ghế thường/VIP đã test OK. Riêng kiểm thử chọn ghế đôi (Couple) tạm thời **CHƯA TEST ĐƯỢC** do hàng E đang bị mờ/lỗi.

#### Case 1.4.4: Kiểm tra Luật Ghế Đôi (Couple Seat Rules & Pricing)
* **Trạng thái:** ⏳ **CHƯA TEST (PENDING TEST) - Sẽ kiểm thử sau khi sửa Lỗi #4 & #5** (do hàng ghế đôi E đang bị mờ/khóa toàn bộ và giá ghế đôi đang bị nhân 2 hai lần).
* **Vị trí thao tác:** Chọn suất chiếu phòng có ghế đôi (hoặc phòng chiếu IMAX hàng E).
* **Kịch bản kiểm tra:**
  * Bấm vào 1 ghế thuộc cặp ghế đôi:
  * 👉 **Kỳ vọng:** Hệ thống tự động chọn luôn cả ghế đối tác cùng cặp `pairGroup` (chọn cả đôi cùng lúc), không cho phép mua lẻ 1 chiếc trong cặp ghế đôi (Theo Quyết định D-07).
  * 👉 **Kỳ vọng về Giá vé:** Với phòng có giá cơ sở 80k/vé thường, giá cho 1 cặp đôi phải là `160.000đ/cặp` (80k x 2 chỗ ngồi), không bị nhân đôi 2 lần thành `320.000đ/cặp` (Lỗi `BUG-SEAT-COUPLE-PRICE-DOUBLE-MULTIPLICATION-05`).

---

### MODULE 1.5: GIỮ GHẾ 10 PHÚT & GIỚI HẠN ĐƠN CHỜ (PENDING CAP)

#### Case 1.5.1: Đếm ngược thời gian giữ ghế (10 phút)
* **Vị trí thao tác:** Sau khi chọn ghế hợp lệ, bấm nút vàng **"Reserve Seats & Checkout"** để sang màn hình `/payment/:bookingId`.
* **Các bước thực hiện:**
  1. Nhìn vào thanh thông báo ở đỉnh trang: `Seats Held Exclusively For You`.
  2. Quan sát ô `TIME REMAINING: 09:59` chạy đếm lùi từng giây.
* **Kỳ vọng:** Ghế của bạn đang được khóa an toàn (người khác vào sẽ thấy ghế màu xám có icon người/ổ khóa). Khi đồng hồ về `00:00`, đơn hàng hết hạn, hệ thống tự động nhả ghế về `AVAILABLE`.

#### Case 1.5.2: Giới hạn tối đa 2 đơn chờ thanh toán (Max 2 Pending Bookings)
* **Vị trí thao tác:** Trình duyệt của `customer1@cinema.com`.
* **Các bước thực hiện:**
  1. Chọn ghế suất 1 -> Bấm Reserve -> Vào màn hình thanh toán (đây là Đơn #1 `PENDING_PAYMENT`).
  2. Mở tab trình duyệt mới -> Vào chọn ghế suất khác -> Bấm Reserve -> Vào màn hình thanh toán (đây là Đơn #2 `PENDING_PAYMENT`).
  3. Mở tiếp tab trình duyệt thứ 3 -> Chọn ghế suất khác -> Bấm Reserve -> Cố tình tạo đơn thứ 3.
* **Kỳ vọng:** Hệ thống chặn lại và báo lỗi: `You have too many pending bookings. Please complete or cancel existing pending reservations before creating a new one (Mã 1506)`.

---

### MODULE 1.6: ÁP DỤNG VOUCHER (ĐƠN THƯỜNG & ĐƠN 0 ĐỒNG)

#### Case 1.6.1: Áp dụng Voucher không hợp lệ
* **Vị trí thao tác:** Khung "Promotional Voucher" tại màn hình Chọn ghế hoặc màn hình Thanh toán.
* **Các bước thực hiện:**
  * **Mã không tồn tại:** Nhập mã `VOUCHER_KHONG_CO_THAT` -> Bấm **Apply**.
    * 👉 **Kỳ vọng:** Thông báo lỗi `Voucher not found (Mã 1701)`.
  * **Mã chưa đủ điều kiện đơn tối thiểu:** Nhập mã yêu cầu đơn >= 200k khi tổng vé chỉ có 130k.
    * 👉 **Kỳ vọng:** Thông báo lỗi `Minimum order value not reached (Mã 1704)`.
  * **Mã đã hết hạn:** Nhập mã có thời hạn đã qua.
    * 👉 **Kỳ vọng:** Thông báo lỗi mã không còn hiệu lực.

#### Case 1.6.2: Áp dụng Voucher giảm giá hợp lệ
* **Vị trí thao tác:** Màn hình Chọn ghế hoặc Thanh toán.
* **Các bước thực hiện:**
  1. Bấm nút **"Browse Available Vouchers"** để xem danh sách mã đang có sẵn.
  2. Hoặc nhập mã voucher hợp lệ (ví dụ: các mã đang hiển thị trong mục Vouchers ở Trang chủ như `SALE20`, `GIAM10`).
  3. Bấm **Apply**.
* **Kỳ vọng:** Dòng *Discount* xuất hiện số tiền giảm, dòng *Total Payable* tự động trừ đi số tiền tương ứng.

#### Case 1.6.3: Áp dụng Voucher giảm 100% (Đơn hàng 0 đồng)
* **Các bước thực hiện:** Áp dụng mã giảm giá chiết khấu 100% (hoặc tiền giảm lớn hơn hoặc bằng tổng tiền vé).
* **Kỳ vọng:**
  * Số tiền `Total Payable` chuyển thành **`0 VND`**.
  * Cổng thanh toán VNPay được ẩn đi/bỏ qua, nút thanh toán chuyển thành **"Confirm Booking (0 VND)"**.
  * Bấm nút -> Đơn hàng tự động `CONFIRMED` ngay lập tức mà không cần chuyển hướng sang cổng ngân hàng, ghế chuyển thành `BOOKED`.

---

### MODULE 1.7: THANH TOÁN VNPAY & GIẢ LẬP THANH TOÁN

#### Case 1.7.1: Giả lập thanh toán thành công (Instant Simulation)
* **Vị trí thao tác:** Màn hình thanh toán `http://localhost:5173/payment/:bookingId`.
* **Các bước thực hiện:**
  1. Tại khung "Select Payment Gateway", chọn tùy chọn đầu tiên:  
     **`Instant Test Payment (Direct Simulation)`** (có nhãn vàng *Dev only*).
  2. Bấm nút màu vàng: **`Pay ... VND (Instant Test)`**.
* **Kỳ vọng:** Không cần nhập thẻ ngân hàng, hệ thống xác nhận thanh toán thành công tức thì và chuyển hướng đến trang `/payment/result` hiển thị dấu tích xanh `Payment Successful`, kèm mã đơn hàng và nút xem vé điện tử.

#### Case 1.7.2: Kiểm tra hủy đơn khi quay lại sửa ghế
* **Vị trí thao tác:** Màn hình thanh toán `/payment/:bookingId`.
* **Các bước thực hiện:**
  1. Nhìn xuống đáy khung thông tin đơn hàng bên phải, tìm dòng nút: **`Modify Selected Seats`** (hoặc nút **`Cancel Reservation`** ở bên trái).
  2. Bấm nút **"Modify Selected Seats"** (hoặc "Cancel Reservation").
* **Kỳ vọng:** Đơn hàng `PENDING_PAYMENT` được hủy an toàn, hệ thống giải phóng ghế lập tức về trạng thái `AVAILABLE` và điều hướng bạn quay lại trang chọn ghế để bạn chọn lại ghế mới.

---

### MODULE 1.8: VÉ CỦA TÔI & QUYỀN TỰ HỦY VÉ TRƯỚC 60 PHÚT

#### Case 1.8.1: Xem danh sách vé đã đặt & QR Code
* **Vị trí thao tác:** Bấm nút **`🎟️ My Tickets`** ở góc trên bên phải thanh Header (hoặc truy cập `http://localhost:5173/my-bookings`).
* **Các bước thực hiện:**
  1. Xem danh sách vé đã mua thành công (trạng thái `CONFIRMED`).
  2. Bấm nút màu vàng **"View E-Ticket"** tại một đơn hàng bất kỳ.
* **Kỳ vọng:** Modal Vé điện tử hiện lên với mã QR Code sắc nét, đầy đủ thông tin: Tên phim, Rạp, Phòng chiếu, Số ghế, Ngày giờ chiếu và Mã đặt vé.

#### Case 1.8.2: Tự hủy vé trước giờ chiếu > 60 phút — [HỢP LỆ]
* **Vị trí thao tác:** Trang `/my-bookings`.
* **Các bước thực hiện:**
  1. Tìm một đơn hàng có suất chiếu cách thời điểm hiện tại hơn 60 phút (ví dụ: suất chiếu ngày mai).
  2. Bấm nút màu đỏ: **"Cancel & request refund"**.
  3. Hộp thoại xác nhận hiện ra -> Bấm **"Yes, Cancel"**.
* **Kỳ vọng:**
  * Vé chuyển trạng thái sang **`REFUND_REQUIRED`** (Chờ Admin hoàn tiền).
  * Ghế trong phòng chiếu lập tức được nhả về màu trống (`AVAILABLE`) để khách khác có thể đặt.

#### Case 1.8.3: Chặn hủy vé cận giờ chiếu (<= 60 phút) — [BỊ CHẶN]
* **Vị trí thao tác:** Trang `/my-bookings`.
* **Các bước thực hiện:** Kiểm tra đơn hàng có suất chiếu sắp diễn ra trong vòng 60 phút tới (hoặc đã bắt đầu).
* **Kỳ vọng:** Nút hủy vé bị vô hiệu hóa / biến mất, hoặc khi cố tình gọi API hủy thì hệ thống từ chối với thông báo: `Ticket cannot be cancelled within 60 minutes before showtime (Mã 1507)`.

---

### MODULE 1.9: ĐÁNH GIÁ PHIM (REVIEW & RATING)

#### Case 1.9.1: Viết đánh giá cho phim đã xem
* **Vị trí thao tác:** Trang `/my-bookings`.
* **Các bước thực hiện:**
  1. Tại một vé đã mua thành công, bấm nút **"Review"** (có icon ngôi sao vàng).
  2. Modal đánh giá hiện ra: Bấm chọn số sao (1 đến 5 sao), nhập nhận xét (Comment).
  3. Bấm **"Submit Review"**.
* **Kỳ vọng:** Đánh giá được gửi thành công, điểm đánh giá trung bình của bộ phim trên trang chi tiết phim được cập nhật.

---

# PHẦN 2: KỊCH BẢN PHÍA QUẢN TRỊ VIÊN (ADMIN PORTAL)

> **Lưu ý quan trọng:** Đăng nhập tài khoản Admin trước khi thực hiện:  
> Email: `admin@cinema.com` | Password: `GoToroAdminSecure2026@Password`  
> Truy cập Console tại: `http://localhost:5173/admin`

---

### MODULE 2.1: PHÂN QUYỀN RBAC & CHẶN TRUY CẬP TRÁI PHÉP

#### Case 2.1.1: Khách hàng thường cố tình vào trang Admin
* **Các bước thực hiện:**
  1. Đăng nhập bằng tài khoản khách: `customer1@cinema.com`.
  2. Trên thanh địa chỉ trình duyệt, gõ URL: `http://localhost:5173/admin` -> Nhấn Enter.
* **Kỳ vọng:** Hệ thống chặn ngay lập tức, hiển thị trang lỗi hoặc tự động điều hướng về trang chủ; không để lộ bất kỳ dữ liệu quản trị nào.

#### Case 2.1.2: Đăng nhập Quản trị viên hợp lệ
* **Các bước thực hiện:** Đăng nhập bằng `admin@cinema.com` -> Bấm vào nút **`🛡️ Admin Console`** màu đỏ ở góc trên Header.
* **Kỳ vọng:** Vào thẳng màn hình Quản trị viên `Admin Operations Console`, hiển thị đầy đủ 6 tabs: *Revenue Reports, Showtime Scheduling, Payments & Refunds, Movie Catalog, Promotional Vouchers, Review Moderation*.

---

### MODULE 2.2: QUẢN LÝ THỂ LOẠI (GENRE) & KHÔI PHỤC SOFT-DELETE

> ℹ️ *Ghi chú cho Tester:* Hiện tại Backend đã hoàn thiện 100% API cho Genre (`POST/GET/PUT/DELETE /api/v1/genres`), trong khi Frontend đang chờ bổ sung tab riêng trên UI (mã theo dõi `FEAT-ADMIN-GENRE-MANAGEMENT-UI-07` trong Bug Log). Bạn có thể kiểm tra trực tiếp qua API hoặc công cụ Swagger/Postman/cURL; tab giao diện này sẽ được xây dựng bổ sung đầy đủ vào Admin Dashboard khi chuyển sang giai đoạn fix code.

#### Case 2.2.1: Thêm thể loại mới
* **Cách thực hiện (cURL):**
  ```bash
  curl -X POST http://localhost:8080/api/v1/genres -H "Content-Type: application/json" -H "Authorization: Bearer <TOKEN_ADMIN>" -d "{\"name\":\"Sci-Fi 2026\"}"
  ```
* **Kỳ vọng:** Trả về HTTP 201 Created, thể loại `Sci-Fi 2026` được tạo thành công với `isActive = true`.

#### Case 2.2.2: Xóa mềm Thể loại đang được sử dụng — [BỊ CHẶN]
* **Cách thực hiện:** Thử gọi API xóa thể loại `Action` (ID 1, đang được gắn với các phim trong hệ thống):
  ```bash
  curl -X DELETE http://localhost:8080/api/v1/genres/1 -H "Authorization: Bearer <TOKEN_ADMIN>"
  ```
* **Kỳ vọng:** Hệ thống từ chối xóa và trả về mã lỗi: `Genre is currently associated with active movies (Mã 1205)`.

#### Case 2.2.3: Xóa mềm và tự động Khôi phục khi thêm lại trùng tên
* **Cách thực hiện:**
  1. Xóa thể loại `Sci-Fi 2026` (chưa gắn phim nào) -> Xóa thành công (chuyển sang `isActive = false`).
  2. Gửi request tạo lại thể loại với đúng tên: `Sci-Fi 2026`.
* **Kỳ vọng:** Hệ thống tự động kích hoạt lại bản ghi cũ (`isActive = true`), không bị lỗi trùng tên `GENRE_ALREADY_EXISTS`.

---

### MODULE 2.3: QUẢN LÝ PHIM & CHẶN KẾT THÚC PHIM CÒN LỊCH CHIẾU

#### Case 2.3.1: Thêm phim mới với URL Trailer hợp lệ
* **Trạng thái:** ⏳ **CHƯA TEST ĐƯỢC (TẠM HOÃN - CHỜ SỬA LỖI #8 TRÊN MODAL ADMIN)**  
* **Vị trí thao tác:** Admin Console -> Bấm vào Tab thứ 4: **`Movie Catalog`**.
* **Hiện tượng phát hiện:** Modal thêm phim hiện tại bị thiếu ô nhập **Trailer URL** (Lỗi `BUG-ADMIN-MOVIE-MODAL-MISSING-TRAILER-INPUT-08`). Do đó phim tạo mới có `trailerUrl = ""` và phía Client không hiện nút "Watch Official Trailer".
* **Các bước thực hiện khi sửa xong lỗi #8:**
  1. Bấm nút màu vàng: **`+ Publish Movie`** (ở góc trên bên phải bảng danh sách phim).
  2. Modal "Publish New Movie Title" hiện lên:
     * Title: `Avatar 3: Fire and Ash`
     * Duration (Mins): `180`
     * Age Rating: Chọn `T16`
     * Status: `NOW_SHOWING`
     * Poster URL: Nhập link ảnh bất kỳ (hoặc `https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500`)
     * **Trailer URL:** Nhập link chuẩn YouTube: `https://www.youtube.com/watch?v=dQw4w9WgXcQ` (hoặc `https://youtu.be/dQw4w9WgXcQ`).
  3. Bấm **"Publish to Catalog"**.
* **Kỳ vọng:** Phim được tạo thành công, xuất hiện ngay trong bảng danh mục phim. Ra ngoài Client bấm vào phim có hiện nút "Watch Official Trailer" để phát trailer an toàn qua iframe.

#### Case 2.3.2: Thêm phim với URL Trailer độc hại (Chống XSS/Phishing) — [BỊ CHẶN]
* **Trạng thái:** ⏳ **CHƯA TEST ĐƯỢC (TẠM HOÃN - CHỜ SỬA LỖI #8 TRÊN MODAL ADMIN)**  
* **Vị trí thao tác:** Modal `+ Publish Movie` trong tab `Movie Catalog`.
* **Các bước thực hiện:**
  1. Nhập thông tin phim, nhưng tại ô **Trailer URL**, cố tình nhập script độc hại: `javascript:alert(1)` hoặc một link không thuộc domain YouTube: `https://malicious-website.com/phishing`.
  2. Bấm **"Publish to Catalog"**.
* **Kỳ vọng:** Form chặn submit ngay lập tức với thông báo lỗi validation: URL Trailer phải là link YouTube hợp lệ (`https://www.youtube.com/...` hoặc `https://youtu.be/...`).

#### Case 2.3.3: Chặn kết thúc phim khi còn suất chiếu tương lai
* **Vị trí thao tác:** Tab **`Movie Catalog`**.
* **Các bước thực hiện:**
  1. Tìm một phim đang có suất chiếu trong tương lai (ví dụ phim *Spider-Man: Brand New Day*).
  2. Nhìn sang cột Action ngoài cùng bên phải của dòng phim đó, bấm nút màu đỏ: **`Discontinue`**.
  3. Hộp thoại xác nhận hiện ra -> Bấm **"Confirm Discontinue"**.
* **Kỳ vọng:** Hệ thống chặn lại và hiển thị thông báo lỗi màu đỏ:  
  `Movie still has scheduled future showtimes. Please cancel these showtimes before discontinuing the movie (Mã 1207 / 1206)`.

---

### MODULE 2.4: QUẢN LÝ PHÒNG CHIẾU & ĐỊNH GIÁ GHẾ

#### Case 2.4.1: Kiểm tra cấu hình ghế phòng chiếu
* **Trạng thái:** ⏳ **CHƯA TEST (ĐANG BỊ LỖI - PENDING TEST)**
* **Ghi chú lỗi:** Đang bị lỗi do ảnh hưởng từ 2 lỗi cốt lõi đã phát hiện:
  1. Toàn bộ hàng ghế E (COUPLE) có `pair_group = NULL` (Lỗi `BUG-SEAT-ROW-E-COUPLE-NULL-04`).
  2. Giá ghế đôi bị nhân đôi 2 lần từ 80k thành 320k/cặp (Lỗi `BUG-SEAT-COUPLE-PRICE-DOUBLE-MULTIPLICATION-05`).
* **Kỳ vọng sau khi sửa:** Phòng chiếu đảm bảo các ghế đôi (COUPLE) có gán đúng cặp `pairGroup` và giá ghế tương ứng được định giá chính xác (160k/cặp cho phòng 80k). Sẽ kiểm thử nghiệm thu sau khi sửa dữ liệu.

#### Case 2.4.2: Chặn vô hiệu hóa phòng khi còn suất chiếu tương lai
* **Trạng thái:** ℹ️ **ĐÃ GHI NHẬN: TƯƠNG ĐỒNG LOGIC VỚI CASE 2.3.3** (Mã `NOTE-CASE-2.4.2-ROOM-DEACTIVATE`)
* **Phân tích:**
  * Về mặt nghiệp vụ: Tương đồng với Case 2.3.3 (triết lý an toàn dữ liệu: không cho phép vô hiệu hóa thực thể khi vẫn còn lịch chiếu `SCHEDULED` trong tương lai).
  * Về mặt giao diện: Khác với Case 2.3.3 đã có nút `Discontinue` trên UI `Movie Catalog`, Case 2.4.2 hiện tại Frontend chưa có màn hình Quản lý Phòng riêng để bấm nút tắt phòng. Nghiệp vụ này đang được bảo vệ ở tầng Backend qua API `PATCH /api/v1/rooms/:id/status` (Mã lỗi `1403: ROOM_HAS_FUTURE_SHOWTIMES`).
* **Kỳ vọng:** Khi phòng chiếu đang có lịch chiếu chưa diễn ra, hệ thống từ chối tắt hoạt động của phòng để tránh ảnh hưởng đến vé đã bán của khách hàng (`Mã 1403`).

---

### MODULE 2.5: QUẢN LÝ SUẤT CHIẾU (SHOWTIME WORKFLOW)

#### Case 2.5.1: Chặn trùng lịch chiếu & Quy tắc đệm dọn dẹp vệ sinh phòng 15 phút
* **Vị trí thao tác:** Admin Console -> Bấm vào Tab thứ 2: **`Showtime Scheduling (FR-SHOW-01)`**.
* **Các bước thực hiện:**
  1. Xem một suất chiếu đang có sẵn: Ví dụ suất chiếu tại phòng `IMAX Hall 2149` từ `13:00` đến `15:25` (Thời gian dọn dẹp kết thúc: `15:40`).
  2. Bấm nút màu vàng: **`+ Schedule Showtime`**.
  3. Trong modal tạo suất chiếu:
     * Chọn Cinema: `Cinema Central Hanoi`
     * Chọn Hall: `IMAX Hall 2149`
     * Nhập ngày giờ bắt đầu nằm trong khoảng trùng hoặc chưa đủ 15 phút dọn dẹp: Ví dụ lúc `15:30` cùng ngày.
     * Bấm **"Confirm & Initialize Seats"**.
* **Kỳ vọng:** Hệ thống từ chối và báo lỗi xung đột:  
  `Room collision detected: This auditorium room is already booked for another showtime during this window (including the 15-minute cleanup buffer) (Mã 1303 / HTTP 409 Conflict)`.

#### Case 2.5.2: Hủy suất chiếu an toàn (Soft Cancel Showtime)
* **Vị trí thao tác:** Tab **`Showtime Scheduling`** -> Tab con **`Upcoming & Live`**.
* **Các bước thực hiện:**
  1. Tìm một suất chiếu **chưa diễn ra trong tương lai** (có nhãn xanh `UPCOMING`).
  2. Nhìn sang cột Action bên phải, bấm nút Thùng rác đỏ: **`Trash`**.
  3. Hộp thoại xác nhận hiện ra: Thông báo các vé đã đặt sẽ được tự động hủy và đưa vào danh sách hoàn tiền -> Bấm **"Yes, Cancel Showtime"**.
* **Kỳ vọng:**
  * Suất chiếu chuyển trạng thái màu đỏ **`CANCELLED`** (không bị xóa mất khỏi hệ thống).
  * Tất cả vé khách đã mua của suất này tự động chuyển sang `REFUND_REQUIRED`.
  * Các voucher khách đã áp dụng được hoàn trả lại lượt sử dụng.
  * *(Lưu ý: Không bấm nút xóa đối với các suất ở tab Past Screenings vì suất đã diễn ra trong quá khứ là lịch sử tài chính cấm hủy)*.

---

### MODULE 2.6: QUẢN LÝ VOUCHER & BẢO MẬT DỮ LIỆU

#### Case 2.6.1: Tạo Voucher và chuẩn hóa chữ hoa tự động — [✅ TEST THÀNH CÔNG]
* **Trạng thái:** ✅ **ĐÃ TEST THÀNH CÔNG** (Mã code tự động uppercase chuẩn).
* **Vị trí thao tác:** Admin Console -> Bấm vào Tab thứ 5: **`Promotional Vouchers`**.
* **Các bước thực hiện:**
  1. Bấm nút màu vàng: **`+ Create Voucher`**.
  2. Trong modal tạo mã:
     * Nhập Voucher Code bằng chữ thường: `tet2026_sale`
     * Discount Type: `PERCENTAGE` (20%)
     * Max Discount Amount: `50,000`
     * Min Order Value: `100,000`
     * Usage Limit: `50`
     * Start Date / End Date: Chọn thời gian hợp lệ trong tương lai.
  3. Bấm **"Create Voucher"**.
* **Kỳ vọng:** Voucher được tạo thành công và mã tự động chuyển thành chữ hoa chuẩn: **`TET2026_SALE`**.
* 💡 **Đề xuất cải tiến UX phát hiện khi test:** Khi tài khoản khách hàng đã chạm giới hạn dùng mã (`perUserLimit`), modal chọn voucher phía Client cần làm mờ và khóa nút Apply kèm thông báo rõ ràng (mã theo dõi `FEAT-UX-VOUCHER-USER-USAGE-DIMMING-10` trong Bug Log).

#### Case 2.6.2: Bảo mật thông tin Voucher nội bộ — [✅ TEST THÀNH CÔNG]
* **Trạng thái:** ✅ **ĐÃ TEST THÀNH CÔNG** (Bảo mật thông tin nội bộ của voucher thành công).
* **Kỳ vọng:** Người dùng chưa đăng nhập khi tra cứu mã voucher chỉ nhận được thông tin công khai cần thiết (Code, Tỷ lệ giảm, Giá trị đơn tối thiểu), không thể xem các tham số thống kê nội bộ của Admin.

---

### MODULE 2.7: KIỂM TOÁN HOÀN TIỀN THỦ CÔNG (MANUAL REFUND AUDIT)

#### Case 2.7.1: Xác nhận hoàn tiền cho đơn hủy
* **Vị trí thao tác:** Admin Console -> Bấm vào Tab thứ 3: **`Payments & Refunds`**.
* **Các bước thực hiện:**
  1. Xem danh sách các giao dịch thanh toán.
  2. Tìm đơn hàng đang có trạng thái hoàn tiền: **`REFUND_REQUIRED`** (do khách hủy vé hoặc do rạp hủy suất chiếu).
  3. Bấm nút **"Process Refund"** (hoặc Xác nhận hoàn tiền).
  4. Nhập ghi chú hoàn tiền: `Đã chuyển khoản trả khách qua Vietcombank lúc 22:30`.
  5. Bấm Xác nhận.
* **Kỳ vọng:**
  * Đơn hàng chuyển trạng thái thành **`REFUNDED`**.
  * Hệ thống lưu vết kiểm toán chính xác: Thời gian hoàn tiền (`refundedAt`), Tài khoản thực hiện (`refundedBy: admin@cinema.com`) và Ghi chú (`refundNote`).

---

### MODULE 2.8: BÁO CÁO DOANH THU & TỶ LỆ LẤP ĐẦY GHẾ

#### Case 2.8.1: Báo cáo công suất và doanh thu chuẩn
* **Vị trí thao tác:** Admin Console -> Bấm vào Tab đầu tiên: **`Revenue Reports (FR-REP-01)`**.
* **Các bước thực hiện:**
  1. Chọn khoảng ngày (Date Window): Từ ngày `01/10/2026` đến ngày hiện tại.
  2. Bấm nút **`Apply Filter`**.
* **Kỳ vọng:**
  * Thẻ **REALIZED REVENUE** hiển thị chính xác tổng doanh thu thực tế từ các giao dịch thanh toán thành công (`SUCCESS`).
  * Thẻ **SUCCESSFUL TRANSACTIONS** hiển thị tổng số giao dịch thành công.
  * Thẻ **TICKETS ISSUED** hiển thị tổng số vé đã phát hành.
  * Biểu đồ tỷ lệ lấp đầy ghế (Occupancy Rate) chỉ tính toán trên các ghế đang hoạt động (`isActive = true`) của các suất chiếu hợp lệ.

---

# PHẦN 3: KỊCH BẢN KIỂM THỬ ĐỒNG THỜI & BẢO MẬT (CONCURRENCY)

---

### MODULE 3.1: HAI NGƯỜI CÙNG TRANH CHẤP MỘT GHẾ (RACE CONDITION SEAT HOLD)

* **Thiết lập môi trường kiểm thử:**
  * Mở Cửa sổ 1 (Trình duyệt thường): Đăng nhập `customer1@cinema.com`.
  * Mở Cửa sổ 2 (Trình duyệt ẩn danh Incognito - phím tắt `Ctrl + Shift + N`): Đăng nhập `customer2@cinema.com`.
  * Cả hai cửa sổ cùng mở vào sơ đồ ghế của **cùng một suất chiếu**.
* **Các bước thực hiện:**
  1. Tại Cửa sổ 1, Khách A bấm chọn ghế `B5` và bấm **"Reserve Seats & Checkout"**.
  2. Quan sát Cửa sổ 2 của Khách B: Trong vòng tối đa 8 giây (cơ chế Polling tự động), ghế `B5` trên màn hình của Khách B tự động đổi sang màu xám có icon người giữ (`HELD`).
  3. Thử nghiệm tranh chấp tích tắc: Cả 2 cùng bấm ghế `B6` và cùng bấm nút Reserve trong cùng một thời điểm.
* **Kỳ vọng:** Chỉ có duy nhất một khách hàng giữ ghế thành công (trả về HTTP 200). Người còn lại lập tức nhận thông báo từ chối: `Seat B6 has already been held or booked by another customer (Mã 1502)`, ghế bị hủy chọn an toàn, tuyệt đối không bao giờ bị bán trùng cho 2 người.

---

### MODULE 3.2: TRANH CHẤP ÁP DỤNG VOUCHER CÒN 1 LƯỢT DÙNG CUỐI CÙNG

* **Thiết lập:** Một voucher chỉ còn đúng `usageLimit - usedCount = 1` lượt sử dụng.
* **Các bước thực hiện:** Cả Khách A và Khách B cùng áp mã này vào 2 đơn hàng và cùng bấm thanh toán cùng một thời điểm.
* **Kỳ vọng:** Nhờ cơ chế khóa bi quan `SELECT FOR UPDATE` tại Backend, chỉ có 1 người áp mã thành công. Người thứ hai nhận thông báo: `Voucher usage limit exceeded (Mã 1705)`.

---

### MODULE 3.3: CHỐNG TẤN CÔNG DÒ ID ĐƠN HÀNG (ANTI-IDOR)

* **Thiết lập:** Khách A có đơn hàng với mã ID là `101`. Khách B đăng nhập vào tài khoản của mình.
* **Các bước thực hiện:** Khách B cố tình gõ URL thanh toán hoặc gọi API của đơn hàng 101: `http://localhost:5173/payment/101` hoặc `/api/v1/bookings/101`.
* **Kỳ vọng:** Hệ thống từ chối và trả về lỗi `Booking not found (404)` hoặc chuyển hướng an toàn, ngăn chặn việc người dùng dò quét thông tin vé của khách hàng khác.

---

## 🏁 BẢNG TỔNG KẾT TIÊU CHUẨN NGHIỆM THU QA

| Nhóm chức năng | Số kịch bản | Trạng thái đạt chuẩn |
|---|---|---|
| **1. Xác thực & Brute-Force** | 4 Cases | Chặn sau 5 lần sai, mật khẩu mã hóa an toàn |
| **2. Chọn ghế & Luật ghế lẻ/đôi** | 4 Cases | Chặn 100% việc bỏ trống 1 ghế lẻ, bắt buộc chọn đủ cặp đôi |
| **3. Giữ ghế 10 phút & Đơn chờ** | 2 Cases | Đồng hồ 10:00 đếm ngược chuẩn, chặn tối đa 2 đơn chờ |
| **4. Voucher & Đơn 0 đồng** | 3 Cases | Đơn 0đ xác nhận ngay không qua ngân hàng, khóa chống lost update |
| **5. Thanh toán & Hủy vé** | 3 Cases | Hủy vé trước 60p nhả ghế lập tức, chặn hủy cận giờ |
| **6. Quyền Quản trị Admin** | 8 Cases | Chặn khách thường vào Admin, chặn kết thúc phim còn suất |
| **7. Quản lý Suất chiếu** | 2 Cases | Khóa đệm dọn phòng 15p, cấm hủy suất chiếu quá khứ |
| **8. Xử lý đồng thời (Concurrency)** | 3 Cases | Ngăn chặn hoàn toàn bán trùng ghế và tranh chấp voucher |
