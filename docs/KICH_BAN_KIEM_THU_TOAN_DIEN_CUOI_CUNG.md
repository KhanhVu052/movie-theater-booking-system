# BỘ KỊCH BẢN KIỂM THỬ TOÀN DIỆN CUỐI CÙNG (FINAL ACCEPTANCE & QA MASTER HANDBOOK)
## HỆ THỐNG ĐẶT VÉ RẠP CHIẾU PHIM GOTORO CINEMA

> **Phiên bản tài liệu:** Enterprise Release Candidate v7.0 (Bản Nghiệm Thu Cuối Cùng)  
> **Nhánh Git triển khai:** `test/qa-full-fixes-integrated` *(Tích hợp 100% bản vá lỗi & Database Migration V1 -> V8)*  
> **Phạm vi bao phủ:** 100% API Endpoints (cURL mẫu), Toàn bộ Giao diện Khách hàng (Client Portal), Toàn bộ Quản trị viên (Admin Dashboard), Kịch bản Tranh chấp đồng thời (Concurrency) và Bảng tiêu chí Nghiệm thu bàn giao.

---

## 🧭 PHẦN 0: CHUẨN BỊ MÔI TRƯỜNG & TÀI KHOẢN TEST

### 1. Thông tin kết nối & Dịch vụ
* **Giao diện Web Khách hàng & Admin (Frontend):** `http://localhost:5173`
* **Dịch vụ Backend REST API:** `http://localhost:8080` (Base URL: `http://localhost:8080/api/v1`)
* **Hệ cơ sở dữ liệu MySQL 8.0:** `localhost:3306` (Database: `cinema_booking_db`)
* **Bộ nhớ đệm Redis 7.0:** `localhost:6379` (Quản lý Distributed Lock & Giữ ghế 10 phút)

### 2. Danh sách tài khoản kiểm thử mặc định
| Vai trò | Email đăng nhập | Mật khẩu | Mục đích sử dụng |
|---|---|---|---|
| **ADMINISTRATOR** | `admin@cinema.com` | `GoToroAdminSecure2026@Password` | Quản trị toàn quyền: Phim, Thể loại, Lịch chiếu, Voucher, Hoàn tiền, Báo cáo |
| **TESTER (Khách A)** | `tester.master@cinema.com` (hoặc tự tạo) | `Customer@12345` | Đặt vé chính, chọn ghế đôi, áp mã giảm giá, thanh toán, hủy vé |
| **CONCURRENCY (Khách B)** | `tester.rival@cinema.com` (hoặc mở ẩn danh) | `Customer@12345` | Mở ở trình duyệt Ẩn danh (Incognito) để test tranh chấp giữ ghế cùng lúc |

---

# PHẦN 1: MA TRẬN KIỂM THỬ TOÀN BỘ API SERVICE (ENDPOINT-BY-ENDPOINT MATRIX)

*(Bạn có thể mở PowerShell hoặc Git Bash để copy chạy trực tiếp các lệnh cURL bên dưới)*

---

### 1.1 MODULE XÁC THỰC (AUTH API - `/api/v1/auth`)

#### API 1.1.1: Đăng ký tài khoản (POST `/api/v1/auth/register`)
* **Mô tả:** Đăng ký thành viên mới; kiểm soát nghiêm ngặt định dạng Email (RFC TLD) và độ mạnh mật khẩu.
* **Test Case Lỗi (Chặn email sai TLD):**
```bash
curl -i -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Tester Bad","email":"tester@gmail","password":"Password@123"}'
```
* **Kết quả:** `HTTP 400 Bad Request` - Message: *"Email must be a valid email address with a valid domain (e.g. name@example.com)"*.
* **Test Case Thành công:**
```bash
curl -i -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Master Tester","email":"tester.master@cinema.com","password":"Customer@12345"}'
```
* **Kết quả:** `HTTP 201 Created` - Trả về `accessToken`, `refreshToken`, user info.

#### API 1.1.2: Đăng nhập hệ thống (POST `/api/v1/auth/login`)
```bash
curl -i -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@cinema.com","password":"GoToroAdminSecure2026@Password"}'
```
* **Kết quả:** `HTTP 200 OK` - Nhận `accessToken` chứa role `ROLE_ADMIN`.

#### API 1.1.3: Lấy thông tin tài khoản hiện tại (GET `/api/v1/auth/me`)
```bash
curl -i -X GET http://localhost:8080/api/v1/auth/me \
  -H "Authorization: Bearer <TOKEN>"
```
* **Kết quả:** `HTTP 200 OK` - Trả về `id`, `email`, `fullName`, `role`.

---

### 1.2 MODULE DANH MỤC THỂ LOẠI (GENRES API - `/api/v1/genres`)

#### API 1.2.1: Lấy danh sách thể loại khả dụng (GET `/api/v1/genres`)
```bash
curl -i -X GET http://localhost:8080/api/v1/genres
```
* **Kết quả:** `HTTP 200 OK` - Trả về mảng các thể loại kèm trường `id`, `name`, `description`.

#### API 1.2.2: Tạo thể loại mới có Mô tả (POST `/api/v1/genres` - Admin Only)
```bash
curl -i -X POST http://localhost:8080/api/v1/genres \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Cyberpunk Dystopia","description":"Phim khoa học viễn tưởng tương lai thế kỷ 22 với các siêu đô thị ngầm"}'
```
* **Kết quả:** `HTTP 201 Created` - Thể loại lưu thành công kèm trường `description`.

#### API 1.2.3: Cập nhật thể loại (PUT `/api/v1/genres/{id}` - Admin Only)
```bash
curl -i -X PUT http://localhost:8080/api/v1/genres/1 \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Action & Adventure","description":"Phim hành động kịch tính và phiêu lưu mạo hiểm đỉnh cao"}'
```
* **Kết quả:** `HTTP 200 OK` - Dữ liệu cập nhật ngay lập tức.

#### API 1.2.4: Xóa thể loại (DELETE `/api/v1/genres/{id}` - Admin Only)
* **Quy tắc nghiệp vụ:** Nếu thể loại đang gắn với bất kỳ phim nào trong hệ thống, ném mã lỗi `GENRE_IN_USE` (HTTP 400).

---

### 1.3 MODULE PHIM & TRAILER (MOVIES API - `/api/v1/movies`)

#### API 1.3.1: Lấy danh sách phim phân trang & bộ lọc (GET `/api/v1/movies`)
```bash
# Lấy phim đang chiếu, trang 1, 8 phim/trang
curl -i -X GET "http://localhost:8080/api/v1/movies?status=NOW_SHOWING&page=1&size=8"
```
* **Kết quả:** `HTTP 200 OK` - Trả về 8 phần tử phim kèm metadata phân trang (`totalElements`, `totalPages`, `currentPage: 1`).

#### API 1.3.2: Lấy chi tiết phim (GET `/api/v1/movies/{id}`)
```bash
curl -i -X GET http://localhost:8080/api/v1/movies/1
```
* **Kết quả:** `HTTP 200 OK` - Trả về thông tin đạo diễn, diễn viên, thời lượng, trailerUrl, ratings.

#### API 1.3.3: Thêm phim mới & Kiểm tra link Trailer YouTube (POST `/api/v1/movies` - Admin)
* **Test Case Lỗi (Chặn link độc hại/phishing):**
```bash
curl -i -X POST http://localhost:8080/api/v1/movies \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Fake Movie","director":"Unknown","durationMinutes":120,"releaseDate":"2026-12-01","posterUrl":"https://img.com/p.jpg","trailerUrl":"https://phishing.com/trojan.mp4","status":"COMING_SOON","genreIds":[1]}'
```
* **Kết quả:** `HTTP 400 Bad Request` - Message: *"Trailer URL phải là đường dẫn video YouTube hợp lệ"*.
* **Test Case Thành công (Link YouTube chuẩn):**
```bash
curl -i -X POST http://localhost:8080/api/v1/movies \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Cyber Matrix 2026","director":"Lana W.","durationMinutes":145,"releaseDate":"2026-11-20","posterUrl":"https://images.unsplash.com/photo-1536440136628-849c177e76a1","trailerUrl":"https://www.youtube.com/watch?v=dQw4w9WgXcQ","status":"COMING_SOON","genreIds":[1]}'
```
* **Kết quả:** `HTTP 201 Created`.

---

### 1.4 MODULE SUẤT CHIẾU & SƠ ĐỒ GHẾ (SHOWTIMES API - `/api/v1/showtimes`)

#### API 1.4.1: Lấy danh sách suất chiếu theo phim và ngày (GET `/api/v1/showtimes`)
```bash
curl -i -X GET "http://localhost:8080/api/v1/showtimes?movieId=1&bookableOnly=true"
```
* **Kết quả:** `HTTP 200 OK` - Chỉ trả về các suất chiếu còn trong tương lai (> hiện tại).

#### API 1.4.2: Lấy ma trận ghế của suất chiếu (GET `/api/v1/showtimes/{id}/seats`)
```bash
curl -i -X GET http://localhost:8080/api/v1/showtimes/241/seats
```
* **Kết quả phân tích ma trận:**
  - Ghế thường (Standard): `price: 60000`, `seatType: "NORMAL"`.
  - Ghế VIP: `price: 80000`, `seatType: "VIP"`.
  - Ghế đôi (Couple): `price: 80000` (mỗi ghế) hoặc `160000` (cả cặp), `seatType: "COUPLE"`, `pairGroup: 1` (ghép đôi cùng ghế liền kề).
  - Phòng 2-7: Hàng E chỉ có 4 ghế (E1, E2, E3, E4) -> Ghế E5 đã bị xóa hoàn toàn khỏi DB.

#### API 1.4.3: Hủy suất chiếu (POST `/api/v1/showtimes/{id}/cancel` - Admin)
* **Kết quả:** `HTTP 204 No Content` - Hệ thống tự động chuyển trạng thái các đơn đặt vé của suất chiếu sang `CANCELLED` và tạo yêu cầu hoàn tiền tự động.

---

### 1.5 MODULE ĐẶT VÉ & GIỮ GHẾ (BOOKINGS API - `/api/v1/bookings`)

#### API 1.5.1: Tạo đơn đặt vé & Khóa giữ chỗ 10 phút (POST `/api/v1/bookings`)
* **Body:** Chọn 1 ghế thường C5 và 1 cặp ghế đôi J1-J2.
```bash
curl -i -X POST http://localhost:8080/api/v1/bookings \
  -H "Authorization: Bearer <CUSTOMER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"showtimeId":241,"showtimeSeatIds":[193,194],"voucherCode":"SALE2149"}'
```
* **Kết quả:** `HTTP 201 Created` - Message: *"Seats held successfully for 10 minutes"*.
  - Trả về `expiresAt` (đúng 10 phút kể từ lúc gửi request).
  - Ghế trên Redis bị khóa với TTL 600s.
  - Áp mã giảm giá và tính toán số tiền `subtotalAmount`, `discountAmount`, `finalAmount`.

#### API 1.5.2: Khách hàng hủy vé trước giờ chiếu > 60 phút (POST `/api/v1/bookings/{id}/cancel-confirmed`)
```bash
curl -i -X POST http://localhost:8080/api/v1/bookings/100/cancel-confirmed \
  -H "Authorization: Bearer <CUSTOMER_TOKEN>"
```
* **Quy tắc nghiệp vụ:**
  - Nếu `startTime - now() > 60 phút`: Thành công `HTTP 200 OK` - Ghế lập tức chuyển về AVAILABLE, Voucher được hoàn trả, trạng thái chuyển sang `CANCELLED`.
  - Nếu `startTime - now() <= 60 phút`: Ném lỗi `HTTP 400 Bad Request` (*"Cannot cancel booking within 60 minutes of showtime"*).

---

### 1.6 MODULE MÃ GIẢM GIÁ (VOUCHERS API - `/api/v1/vouchers`)

#### API 1.6.1: Lấy danh sách Voucher công khai kèm Quota người dùng (GET `/api/v1/vouchers`)
```bash
curl -i -X GET http://localhost:8080/api/v1/vouchers \
  -H "Authorization: Bearer <CUSTOMER_TOKEN>"
```
* **Payload trả về chi tiết:**
```json
{
  "code": "WELCOME10",
  "discountPercentage": 10,
  "perUserLimit": 1,
  "userUsedCount": 1,
  "remainingUserQuota": 0,
  "minOrderValue": 50000
}
```
* **Ý nghĩa:** Frontend dựa vào `remainingUserQuota === 0` để làm mờ voucher và hiện badge `LIMIT REACHED`.

---

### 1.7 MODULE THANH TOÁN (PAYMENTS API - `/api/v1/payments`)

#### API 1.7.1: Tạo URL thanh toán VNPay Sandbox (POST `/api/v1/payments/vnpay/create`)
```bash
curl -i -X POST http://localhost:8080/api/v1/payments/vnpay/create \
  -H "Authorization: Bearer <CUSTOMER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"bookingId":100}'
```
* **Kết quả:** `HTTP 201 Created` - Trả về URL thanh toán VNPay chứa chữ ký số checksum `vnp_SecureHash`.

#### API 1.7.2: Giả lập thanh toán DevTools (POST `/api/v1/payments/simulate-success`)
*(Sử dụng khi test nội bộ không cần chuyển sang cổng VNPay thật)*
```bash
curl -i -X POST http://localhost:8080/api/v1/payments/simulate-success \
  -H "Authorization: Bearer <CUSTOMER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"bookingId":100}'
```
* **Kết quả:** `HTTP 200 OK` - Đơn hàng chuyển sang `CONFIRMED`, xuất hóa đơn, sinh mã vé.

---

# PHẦN 2: KỊCH BẢN KIỂM THỬ GIAO DIỆN KHÁCH HÀNG (CLIENT E2E WORKFLOW)

Tester thực hiện lần lượt các bước thực tế trên trình duyệt:

---

### 🖥️ BƯỚC 1: ĐĂNG KÝ VÀ XÁC THỰC TÀI KHOẢN
- [ ] **1.1 Kiểm tra validation Email:**
  - Truy cập: `http://localhost:5173/register`.
  - Nhập Full Name: `Nguyen Van Tester`.
  - Nhập Email sai: `tester@gmail` -> Nhấn nút **Sign Up**.
  - **Kỳ vọng:** Báo lỗi viền đỏ: *"Vui lòng nhập địa chỉ email hợp lệ (ví dụ: name@example.com)"*, form không được submit.
- [ ] **1.2 Đăng ký hợp lệ:**
  - Sửa email thành: `tester.vip2026@gmail.com`, mật khẩu: `SecurePass@2026`.
  - Nhấn nút **Sign Up**.
  - **Kỳ vọng:** Thông báo đăng ký thành công, chuyển hướng đến trang Đăng nhập hoặc tự động vào hệ thống.

---

### 🖥️ BƯỚC 2: KHÁM PHÁ TRANG CHỦ & PHÂN TRANG (PAGINATION)
- [ ] **2.1 Kiểm tra thanh Navbar:**
  - Nhìn cụm menu giữa: Chỉ có **`Home`** và **`Movies`** (không còn `My Bookings` thừa).
  - Nhìn góc phải: Có nút **`🎟️ My Tickets`** nổi bật.
- [ ] **2.2 Kiểm tra danh sách phim & phân trang 8 phim:**
  - Cuộn xuống khu vực danh sách phim ở trang chủ.
  - Đếm số lượng thẻ phim: **Chính xác 8 phim/trang**.
  - Bấm nút trang **`2`** ở thanh phân trang dưới cùng -> 8 phim tiếp theo hiển thị mượt mà.
  - Chuyển tab sang **`Coming Soon`** -> Hệ thống tự động nhảy về **Trang 1**.
  - Gõ từ khóa tìm kiếm `"Project"` vào ô Search -> Tự động nhảy về **Trang 1** và lọc đúng phim.

---

### 🖥️ BƯỚC 3: XEM CHI TIẾT PHIM, TRAILER YOUTUBE & BANNER PRE-SALE
- [ ] **3.1 Phim Coming Soon chưa có lịch:**
  - Bấm vào một phim ở tab Coming Soon chưa có suất chiếu (Ví dụ: *Blade Runner 2049*).
  - **Kỳ vọng:** Xuất hiện **Premiere Teaser Banner** màu đen vàng thông báo phim sắp ra mắt.
- [ ] **3.2 Phim Coming Soon mở bán vé trước (Pre-Sale):**
  - Bấm vào phim Coming Soon có suất chiếu tương lai.
  - **Kỳ vọng:** Xuất hiện **Pre-Sale Banner** nổi bật màu tím vàng: *"🎉 VÉ BÁN TRƯỚC (PRE-SALE) ĐÃ MỞ! Nhanh tay đặt chỗ..."*.
- [ ] **3.3 Xem YouTube Trailer:**
  - Bấm nút **`Watch Trailer`** trên banner phim.
  - **Kỳ vọng:** Modal mở ra và video YouTube chính thức phát mượt mà, không bị lỗi đen màn hình hay chặn embed.

---

### 🖥️ BƯỚC 4: SƠ ĐỒ CHỌN GHẾ, GHẾ ĐÔI & CHẶN TOAST GHẾ ĐƠN
- [ ] **4.1 Kiểm tra ghế đôi (Couple Seats):**
  - Chọn 1 suất chiếu có ghế đôi (Phòng 1 hoặc Phòng 2).
  - Bấm vào ghế **J1** (hoặc E1): Cả **J1 và J2** cùng được chọn theo cặp.
  - Giá vé cộng dồn chuẩn xác: **160.000 VNĐ/cặp**.
- [ ] **4.2 Kiểm tra xóa ghế lẻ E5 tại phòng nhỏ:**
  - Vào suất chiếu tại Phòng 2 hoặc Phòng 3 (Ví dụ suất chiếu Michael hoặc Obsession).
  - Nhìn hàng E cuối cùng: **Chỉ có đúng 4 ghế (E1-E2, E3-E4)**, ghế E5 đã biến mất hoàn toàn, sơ đồ cân đối 100%.
- [ ] **4.3 Kiểm tra Legend hiển thị động:**
  - Phòng có ghế đôi: Legend có icon màu hồng `Couple Seat`.
  - Phòng không có ghế đôi: Icon Ghế đôi tự động ẩn đi.
- [ ] **4.4 Kiểm tra cảnh báo ghế đơn lẻ (Orphan Seat):**
  - Tại hàng A, cố tình chọn ghế **A2** bỏ trống ghế **A1**.
  - **Kỳ vọng:** Cảnh báo *"Không thể để trống 1 ghế đơn lẻ bên cạnh..."* và **CHỈ NỔ ĐÚNG 1 TOAST DUY NHẤT** (không bị lặp lại 2 lần).

---

### 🖥️ BƯỚC 5: CHỌN VOUCHER, KHÓA HẠN MỨC & THANH TOÁN
- [ ] **5.1 Chọn ghế đủ điều kiện:**
  - Chọn 2 ghế thường để tổng đơn > 120.000đ. Bấm **Reserve Seats & Checkout**.
  - Đồng hồ đếm ngược **10:00** bắt đầu đếm.
- [ ] **5.2 Áp dụng mã Voucher:**
  - Bấm **Select Voucher**.
  - Kiểm tra voucher đã hết lượt (`perUserLimit = 1` mà tài khoản đã dùng):
    - Thẻ voucher bị làm mờ (`opacity-60`), có badge đỏ **`LIMIT REACHED`**.
    - Dòng chữ: *"Bạn đã dùng hết số lượt áp dụng mã này (Tối đa 1 lần/tài khoản)"*. Nút Apply bị vô hiệu hóa.
  - Chọn voucher còn lượt (`SALE2149` giảm 10%) -> Bấm **Apply** -> Tiền giảm được trừ ngay vào hóa đơn.
- [ ] **5.3 Thanh toán:**
  - Chọn phương thức thanh toán **VNPay (Sandbox Simulation)**.
  - Bấm nút xác nhận thanh toán.
  - **Kỳ vọng:** Màn hình chuyển sang **`🎉 Booking Confirmed! Payment Successful`** kèm mã vé dạng `BK-XXXXXXXXXX`.

---

### 🖥️ BƯỚC 6: XEM VÉ ĐÃ ĐẶT & HỦY VÉ HOÀN TIỀN (> 60 PHÚT)
- [ ] **6.1 Xem vé tại My Tickets:**
  - Bấm nút **`🎟️ My Tickets`** trên thanh Header.
  - Vé vừa mua hiển thị ở đầu danh sách với trạng thái **`CONFIRMED`**, đầy đủ mã QR, tên phim, phòng, ghế và giá tiền.
- [ ] **6.2 Thao tác hủy vé trước 60 phút:**
  - Đối với vé có suất chiếu diễn ra sau hơn 60 phút: Nút **`Cancel Ticket & Refund`** màu đỏ hiển thị rõ ràng.
  - Bấm nút Hủy vé -> Xác nhận trên hộp thoại cảnh báo hoàn tiền 100%.
  - **Kỳ vọng:** Trạng thái vé chuyển sang **`CANCELLED`** (hoặc `REFUNDED`).
  - Mở lại sơ đồ ghế của suất chiếu: Toàn bộ ghế vừa hủy đã trở về màu trắng khả dụng, người khác có thể đặt lại ngay lập tức.

---

# PHẦN 3: KỊCH BẢN KIỂM THỬ ADMIN DASHBOARD TOÀN TẬP

*Đăng nhập bằng tài khoản Quản trị viên:* `admin@cinema.com` / `GoToroAdminSecure2026@Password` -> Vào `/admin`.

---

### 🛠️ MODULE 3.1: QUẢN TRỊ DANH MỤC THỂ LOẠI PHIM (MOVIE GENRES)
- [ ] **3.1.1 Xem danh sách thể loại:**
  - Bấm vào Tab **`Movie Genres`** (biểu tượng chiếc thẻ tag).
  - Bảng hiển thị: ID, Tên thể loại, **Description (Mô tả)**, Trạng thái (Active/Inactive), Nút hành động.
- [ ] **3.1.2 Thêm mới thể loại có mô tả:**
  - Bấm **`+ Add New Genre`**.
  - Nhập Genre Name: `Post-Apocalyptic`.
  - Nhập Description: `Dòng phim thời kỳ hậu tận thế, con người sinh tồn sau thảm họa toàn cầu` (có bộ đếm ký tự `0/500`).
  - Bấm **Save Genre**.
  - **Kỳ vọng:** Thể loại mới xuất hiện ngay trên bảng kèm đầy đủ nội dung mô tả.
- [ ] **3.1.3 Chỉnh sửa thể loại:**
  - Bấm nút **Edit** ở thể loại vừa tạo -> Cả Name và Description đều được nạp lên modal. Sửa nội dung và bấm **Update** -> Cập nhật thành công.

---

### 🛠️ MODULE 3.2: QUẢN LÝ PHIM & YOUTUBE TRAILER URL (MOVIE CATALOG)
- [ ] **3.2.1 Kiểm tra ô nhập Trailer URL:**
  - Vào Tab **`Movie Catalog`**, bấm **`+ Publish Movie`** (hoặc Edit 1 phim).
  - Ngay dưới trường Poster URL có ô input: **`YouTube Trailer URL`**.
- [ ] **3.2.2 Kiểm tra chặn link giả mạo:**
  - Nhập link không hợp lệ: `http://attacker-site.com/video.mp4` -> Bấm Lưu.
  - **Kỳ vọng:** Báo lỗi ngay lập tức: *"Trailer URL phải là đường dẫn video YouTube hợp lệ..."*, form không được submit.
- [ ] **3.2.3 Lưu phim với link YouTube chuẩn:**
  - Nhập link: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`. Điền đủ các thông tin bắt buộc -> Bấm **Publish Movie**.
  - **Kỳ vọng:** Phim được lưu thành công vào catalog.

---

### 🛠️ MODULE 3.3: XẾP LỊCH CHIẾU & HỦY SUẤT CHIẾU (SHOWTIME SCHEDULING)
- [ ] **3.3.1 Xếp lịch chiếu mới:**
  - Bấm **`+ Schedule Showtime`**.
  - Chọn Phim, Chọn Phòng chiếu, Chọn Giờ bắt đầu.
  - (Hệ thống tự động tính giờ kết thúc dựa vào thời lượng phim + 15 phút dọn phòng).
  - Bấm Lưu -> Suất chiếu hiển thị trên lịch.
- [ ] **3.3.2 Chống trùng lịch (Collision Protection):**
  - Cố tình xếp 1 suất chiếu khác trùng khung giờ tại cùng 1 phòng -> Hệ thống báo lỗi xung đột phòng chiếu, từ chối tạo.
- [ ] **3.3.3 Hủy suất chiếu sự cố:**
  - Bấm nút Hủy một suất chiếu đã có khách đặt vé -> Toàn bộ vé liên đới tự động chuyển sang hoàn tiền.

---

### 🛠️ MODULE 3.4: BÁO CÁO DOANH THU & QUẢN LÝ HOÀN TIỀN
- [ ] **3.4.1 Báo cáo doanh thu (Revenue Reports):**
  - Vào Tab **`Revenue Reports`**.
  - Chọn khoảng ngày từ đầu tháng đến hiện tại -> Bấm **Apply Filter**.
  - Hiển thị đầy đủ: Tổng doanh thu thực tế, Số lượng vé bán ra, Doanh thu từng phim và Tỷ lệ lấp đầy rạp chiếu (Occupancy Rate).
- [ ] **3.4.2 Quản lý Hoàn tiền (Payments & Refunds):**
  - Vào Tab **`Payments & Refunds`**.
  - Kiểm tra các đơn hủy vé ở Phần 2 có trạng thái `REFUNDED` kèm đầy đủ Audit Log ngày giờ và mã tham chiếu giao dịch.

---

# PHẦN 4: KỊCH BẢN KIỂM THỬ TRANH CHẤP & CHỊU TẢI (CONCURRENCY)

---

### ⚡ CASE 4.1: TRANH CHẤP 2 KHÁCH HÀNG CÙNG GIỮ 1 GHẾ CÙNG MỘT GIÂY
* **Mục tiêu:** Chứng minh 100% không thể xảy ra lỗi Double-Booking nhờ Redis Distributed Lock và Database Optimistic Lock.
* **Cách thực hiện:**
  - Cửa sổ 1 (Trình duyệt thường): Đăng nhập tài khoản A, mở sơ đồ ghế suất chiếu chiều.
  - Cửa sổ 2 (Trình duyệt ẩn danh): Đăng nhập tài khoản B, mở cùng suất chiếu đó.
  - Cả 2 cùng bấm chọn ghế **B5** (đang trống).
  - Cửa sổ 1: Bấm **Reserve Seats & Checkout** -> **Khách A thành công**, đồng hồ 10 phút đếm ngược.
  - Cửa sổ 2: Bấm **Reserve Seats & Checkout** ngay sau đó.
* **Kết quả mong đợi (PASS):**
  - Khách B nhận thông báo lỗi màu đỏ: *"Ghế B5 đã được người khác giữ chỗ hoặc đã bán. Vui lòng chọn ghế khác!"*.
  - Ghế B5 trên màn hình của Khách B đổi sang màu Đang Giữ/Đã Bán.

---

### ⚡ CASE 4.2: TỰ ĐỘNG GIẢI PHÓNG GHẾ KHI HẾT HẠN 10 PHÚT (HOLD EXPIRATION)
* **Mục tiêu:** Khi khách hàng giữ ghế nhưng không thanh toán quá 10 phút, Scheduler tự động nhả ghế về sơ đồ.
* **Cách thực hiện:**
  - Khách hàng giữ 2 ghế bất kỳ nhưng để yên màn hình thanh toán.
  - Chờ đồng hồ đếm ngược hết 10 phút (hoặc gọi API DevTools simulate-expire).
* **Kết quả mong đợi (PASS):**
  - Màn hình thanh toán báo hết hạn: *"Your reservation has expired"*.
  - Sơ đồ ghế mở lại: 2 ghế đó tự động chuyển về trạng thái Trắng (Available) để khách khác đặt.

---

# PHẦN 5: BẢNG TIÊU CHÍ NGHIỆM THU CUỐI CÙNG (FINAL ACCEPTANCE SIGN-OFF)

| STT | Hạng mục kiểm thử cốt lõi | Trạng thái | Xác nhận của Tester |
|:---:|---|:---:|---|
| **1** | Chặn triệt để Email sai định dạng RFC/TLD (`/register`) | [ ] PASS | |
| **2** | Dọn dẹp thanh Navbar không còn nút `My Bookings` thừa | [ ] PASS | |
| **3** | Phân trang danh sách phim 8 phim/trang, chuyển trang mượt | [ ] PASS | |
| **4** | Phim Coming Soon: Hiện Premiere Teaser hoặc Pre-Sale Banner | [ ] PASS | |
| **5** | Ghế đôi tự ghép cặp J1-J2, giá 160.000đ/cặp, Legend ẩn hiện động | [ ] PASS | |
| **6** | Xóa sạch ghế lẻ E5 tại các phòng 2 đến 7, hàng E chỉ còn 2 cặp | [ ] PASS | |
| **7** | Cảnh báo chừa ghế đơn (Orphan seat) chỉ nổ duy nhất 1 Toast | [ ] PASS | |
| **8** | Voucher hết lượt cá nhân bị làm mờ, hiện badge LIMIT REACHED | [ ] PASS | |
| **9** | Tab Movie Genres: Thêm/Sửa/Xóa thể loại kèm trường Description 500 ký tự | [ ] PASS | |
| **10** | Ô nhập YouTube Trailer URL cho phim: Chặn link độc, embed chuẩn | [ ] PASS | |
| **11** | Giữ ghế 10 phút (Hold timer) và thanh toán Sandbox thành công | [ ] PASS | |
| **12** | Xem vé đã đặt tại `🎟️ My Tickets` hiển thị đầy đủ QR & thông tin | [ ] PASS | |
| **13** | Hủy vé trước 60 phút: Giải phóng ghế tức thì và hoàn lại voucher | [ ] PASS | |
| **14** | Tranh chấp đồng thời 2 người cùng đặt 1 ghế (Chống Double-Booking 100%) | [ ] PASS | |
| **15** | Báo cáo doanh thu & Quản trị hoàn tiền Admin ghi nhận chính xác | [ ] PASS | |

---

### 📝 BIÊN BẢN KÝ DUYỆT BÀN GIAO:
- **Người thực hiện kiểm thử:** __________________________________
- **Ngày hoàn thành kiểm thử:** 08/11/2026
- **Đánh giá tổng thể:**  
  [ ] **ĐẠT TIÊU CHUẨN XUẤT XẮC (READY TO RELEASE TO PRODUCTION)**  
  [ ] **CẦN ĐIỀU CHỈNH BỔ SUNG**
