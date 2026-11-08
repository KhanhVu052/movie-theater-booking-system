# BỘ KỊCH BẢN KIỂM THỬ TOÀN DIỆN HỆ THỐNG GOTORO CINEMA
## (TẬP TRUNG KIỂM THỬ 10 BẢN VÁ LỖI & TOÀN BỘ LUỒNG HỆ THỐNG TỪ ĐẦU ĐẾN CUỐI)

> **Nhánh Git kiểm thử:** `test/qa-full-fixes-integrated` *(Đã tích hợp toàn bộ 10 bản vá lỗi)*  
> **Phiên bản:** QA Master Test Handbook v5.0  
> **Mục tiêu:** Cung cấp tài liệu kiểm thử chi tiết từng bước (Step-by-step) để Tester mở trực tiếp trên VS Code, tích chọn từng checkbox `[ ]` và xác nhận hệ thống vận hành 100% chuẩn xác trước khi bàn giao.

---

## 🧭 PHẦN 0: CHUẨN BỊ MÔI TRƯỜNG & TÀI KHOẢN TEST

### 1. Trạng thái dịch vụ cần đảm bảo
Trước khi bắt đầu, đảm bảo các dịch vụ đang chạy:
- **Backend API:** `http://localhost:8080` (Spring Boot + Flyway V7)
- **Frontend App:** `http://localhost:5173` (Vite + React)
- **Database & Cache:** MySQL 8.0 (`localhost:3306`) & Redis 7 (`localhost:6379`)

### 2. Danh sách tài khoản thử nghiệm
| Tài khoản | Email | Mật khẩu | Mục đích sử dụng |
|---|---|---|---|
| **Admin** | `admin@cinema.com` | `GoToroAdminSecure2026@Password` | Test Admin Dashboard, Quản lý Thể loại, Nhập Trailer, Xem doanh thu |
| **Tester Khách hàng** | Bạn có thể tự đăng ký email mới (VD: `tester.qc@gmail.com`) hoặc dùng `khanh.2149@cinema.com` | `Customer@12345` | Đặt vé, chọn ghế đôi, áp voucher, hủy vé |
| **Khách cạnh tranh (Tab ẩn danh)** | Tự đăng ký email thứ 2 | `Customer@12345` | Test tranh chấp giữ ghế cùng lúc (Concurrency) |

---

# PHẦN 1: KIỂM THỬ ĐỘC LẬP 10 VẤN ĐỀ VỪA ĐƯỢC VÁ LỖI

---

### 🧪 TEST CASE 01: KIỂM TRA VALIDATION ĐỊA CHỈ EMAIL KHI ĐĂNG KÝ (BUG 01)
* **Mục tiêu:** Đảm bảo hệ thống chặn các email không đúng định dạng RFC (thiếu đuôi miền `.com`, `.vn`, `@`, v.v.) cả ở Frontend lẫn Backend.
* **Đường dẫn:** `http://localhost:5173/register`
* **Các bước thực hiện:**
  - [ ] **Bước 1:** Mở trang Đăng ký tài khoản (`/register`).
  - [ ] **Bước 2 (Kiểm tra lỗi):** Nhập Full Name: `Test Email`, Mật khẩu: `Pass@123456`, nhưng tại ô Email nhập các giá trị sai:
    - Nhập: `tester@gmail` (thiếu `.com`) -> Bấm nút **Sign Up**.
    - Nhập: `tester@` -> Bấm nút **Sign Up**.
    - Nhập: `tester.com` (thiếu `@`) -> Bấm nút **Sign Up**.
  - [ ] **Kết quả mong đợi (PASS):**
    - Giao diện hiển thị thông báo lỗi màu đỏ ngay dưới ô Email:  
      *`"Vui lòng nhập địa chỉ email hợp lệ (ví dụ: name@example.com)"`*.
    - Form bị chặn, KHÔNG gửi request rác lên server.
  - [ ] **Bước 3 (Kiểm tra thành công):** Sửa lại email thành email chuẩn: `tester.fullflow@gmail.com` -> Bấm **Sign Up**.
  - [ ] **Kết quả mong đợi (PASS):** Đăng ký thành công, hệ thống chuyển hướng vào trang đăng nhập hoặc tự động đăng nhập.

---

### 🧪 TEST CASE 02: DỌN DẸP NAVBAR KHÔNG CÒN TRÙNG LẶP "MY BOOKINGS" (BUG 06)
* **Mục tiêu:** Thanh điều hướng chính giữa chỉ giữ lại `Home` và `Movies`; mục xem vé cá nhân tập trung ở nút `🎟️ My Tickets` góc trên bên phải.
* **Đường dẫn:** `http://localhost:5173/`
* **Các bước thực hiện:**
  - [ ] **Bước 1:** Quan sát thanh Header/Navbar ở chế độ màn hình máy tính (Desktop):
    - Cụm menu chính giữa chỉ hiển thị: **`Home`** và **`Movies`**.
    - KHÔNG còn xuất hiện nút `My Bookings` nằm lẫn ở giữa menu.
  - [ ] **Bước 2:** Đăng nhập tài khoản khách hàng (`tester.fullflow@gmail.com`). Quan sát góc trên bên phải:
    - Xuất hiện nút bấm rõ ràng: **`🎟️ My Tickets`** (dẫn đến `/my-bookings`).
  - [ ] **Bước 3:** Thu nhỏ cửa sổ trình duyệt về kích thước điện thoại (hoặc bật F12 Mobile View):
    - Mở menu hamburger (3 dấu gạch).
    - Mục xem vé được đặt tên đồng bộ là: **`My Tickets`** (thay vì tên dài dòng cũ).
  - [ ] **Kết quả mong đợi (PASS):** UI tinh gọn, không trùng lặp chức năng xem vé ở 2 nơi.

---

### 🧪 TEST CASE 03: PHÂN TRANG DANH SÁCH PHIM TẠI TRANG CHỦ (BUG 09)
* **Mục tiêu:** Khắc phục tình trạng quá tải hiển thị phim; trang chủ chia trang chuẩn 8 phim/trang, có thanh chuyển trang và tự reset khi đổi tab.
* **Đường dẫn:** `http://localhost:5173/`
* **Các bước thực hiện:**
  - [ ] **Bước 1:** Vào Trang chủ, cuộn xuống phần danh sách phim (Now Showing / Coming Soon).
  - [ ] **Bước 2:** Đếm số lượng thẻ phim đang hiển thị trên 1 trang:
    - Số lượng phim hiển thị tối đa là **8 phim**.
  - [ ] **Bước 3:** Quan sát thanh phân trang (Pagination) ở dưới cùng danh sách phim:
    - Có các nút điều hướng: `Previous`, `1`, `2`, `3`, ..., `Next`.
    - Nút trang hiện tại (`Trang 1`) có màu nổi bật (Highlight vàng/cam).
  - [ ] **Bước 4:** Bấm nút **`2`** (hoặc `Next`):
    - Danh sách chuyển sang hiển thị 8 bộ phim tiếp theo.
    - Không bị giật lag hay reload lại cả trang.
  - [ ] **Bước 5:** Trong lúc đang ở Trang 2, bấm chuyển tab sang **`Coming Soon`** (hoặc gõ từ khóa vào ô Search "Avengers"):
    - Hệ thống tự động đặt lại (reset) số trang về **Trang 1**.
  - [ ] **Kết quả mong đợi (PASS):** Danh sách phim gọn gàng, chuyển trang mượt mà, phân trang phản hồi chuẩn xác.

---

### 🧪 TEST CASE 04: TRẢI NGHIỆM PHIM COMING SOON & SUẤT CHIẾU PRE-SALE (FEAT 02)
* **Mục tiêu:** Hiển thị đúng thông báo cho phim chưa công chiếu: Nếu chưa có suất chiếu thì hiện "Premiere Teaser Banner"; nếu đã mở suất chiếu tương lai thì hiện "Pre-Sale Banner" kèm lịch chiếu.
* **Đường dẫn:** `http://localhost:5173/movies/49` (hoặc click vào bất kỳ phim Coming Soon nào từ trang chủ).
* **Các bước thực hiện:**
  - [ ] **Trường hợp A (Phim chưa có suất chiếu):**
    - Chọn 1 phim ở tab `Coming Soon` chưa được Admin xếp lịch chiếu (Ví dụ: *A Silent Voice* hoặc *Blade Runner 2049*).
    - Cuộn xuống khu vực suất chiếu:
    - **Kết quả:** Hiển thị **Premiere Teaser Banner** với biểu tượng đồng hồ cát và dòng chữ thông báo:  
      *"Phim sắp công chiếu! Thông tin suất chiếu chính thức sẽ được mở bán sớm. Hãy theo dõi để không bỏ lỡ!"*
  - [ ] **Trường hợp B (Phim Coming Soon có mở bán vé trước - Pre-Sale):**
    - Đăng nhập Admin (`/admin`), vào tab `Showtime Scheduling`, tạo 1 suất chiếu cho 1 phim Coming Soon vào ngày tương lai (ví dụ 3 ngày sau).
    - Quay lại trang chi tiết phim đó trên giao diện Client:
    - **Kết quả:** Hiển thị **Pre-Sale Banner** nổi bật màu vàng tím với icon pháo hoa:  
      *"🎉 VÉ BÁN TRƯỚC (PRE-SALE) ĐÃ MỞ! Nhanh tay đặt chỗ để trở thành những khán giả đầu tiên thưởng thức bộ phim."*  
      Đồng thời danh sách các ngày chiếu tương lai được hiển thị chính xác để khách chọn.
  - [ ] **Kết quả mong đợi (PASS):** Phân biệt rõ ràng giữa phim chưa có lịch và phim mở bán sớm vé Pre-Sale.

---

### 🧪 TEST CASE 05: SƠ ĐỒ GHẾ ĐÔI (COUPLE SEATS) - GHÉP CẶP J1-J2 & GIÁ 160.000 VNĐ (FIX 04 & 05)
* **Mục tiêu:** Kiểm tra migration V7 đã ghép đúng cặp ghế đôi (J1-J2, J3-J4,...), giá bán chuẩn 160.000đ/cặp và Legend chỉ xuất hiện khi phòng có ghế đôi.
* **Đường dẫn:** Chọn 1 suất chiếu tại Phòng 1 hoặc Phòng 2 (Ví dụ: `http://localhost:5173/booking/seat-selection/241`)
* **Các bước thực hiện:**
  - [ ] **Bước 1:** Vào màn hình chọn ghế của suất chiếu có ghế đôi (hàng cuối E hoặc J).
  - [ ] **Bước 2 (Kiểm tra chọn theo cặp):**
    - Click chuột vào ghế đôi **J1**:
    - **Kết quả:** Cả 2 ghế **J1 và J2** cùng sáng lên đồng thời (được chọn cả cặp).
    - Click tiếp vào ghế đôi **J3**: Cả **J3 và J4** cùng sáng lên.
  - [ ] **Bước 3 (Kiểm tra bỏ chọn):**
    - Click lại vào ghế **J1**: Cả 2 ghế **J1 và J2** cùng được hủy chọn đồng thời.
  - [ ] **Bước 4 (Kiểm tra giá vé):**
    - Chọn 1 cặp ghế đôi bất kỳ (Ví dụ J1-J2).
    - Nhìn xuống bảng tổng tiền ở góc dưới:
    - **Kết quả:** Tổng giá vé hiển thị chuẩn xác là **160.000 VNĐ** (hoặc đúng 80.000đ x 2 ghế).
  - [ ] **Bước 5 (Kiểm tra Legend Ghế đôi):**
    - Ở phòng có ghế đôi: Khu vực Chú thích (Legend) dưới màn hình có icon màu hồng: **`Couple Seat (Ghế đôi)`**.
    - Vào 1 suất chiếu ở phòng KHÔNG có ghế đôi: Icon Ghế đôi tự động biến mất, không gây khó hiểu cho khách hàng.
  - [ ] **Kết quả mong đợi (PASS):** Ghế đôi luôn đi liền theo cặp, giá tính chuẩn xác 160.000đ, UI chú thích hiển thị động.

---

### 🧪 TEST CASE 06: KIỂM TRA TOAST THÔNG BÁO GHẾ ĐƠN ĐỘC LẬP - CHỈ NỔ 1 TOAST (BUG 03)
* **Mục tiêu:** Khi người dùng chọn ghế vi phạm quy tắc chừa 1 ghế trống đơn độc (Orphan Seat), hệ thống chỉ bật đúng 1 thông báo Toast duy nhất.
* **Đường dẫn:** Màn hình chọn ghế (`/booking/seat-selection/:id`)
* **Các bước thực hiện:**
  - [ ] **Bước 1:** Tại một hàng ghế thường (ví dụ hàng A hoặc B gồm A1, A2, A3, A4...).
  - [ ] **Bước 2:** Bỏ trống ghế **A1**, click chọn ghế **A2**.
  - [ ] **Kết quả:** Hệ thống phát hiện ghế A1 bị bỏ lại đơn lẻ và hiện Toast cảnh báo:  
    *"Không thể để trống 1 ghế đơn lẻ bên cạnh ghế bạn đã chọn"* (hoặc thông báo tương tự).
  - [ ] **Bước 3 (Quan sát số lượng Toast):**
    - Đếm số lượng Toast nổi lên ở góc màn hình: **CHỈ CÓ ĐÚNG 1 TOAST DUY NHẤT**.
    - Không còn hiện tượng bị nhân đôi (2 Toast đè lên nhau) như phiên bản cũ.
  - [ ] **Kết quả mong đợi (PASS):** Cảnh báo hoạt động chuẩn xác, không bị spam nhiều thông báo.

---

### 🧪 TEST CASE 07: VOUCHER GIỚI HẠN SỐ LẦN DÙNG/USER - LÀM MỜ & KHÓA NÚT (FEAT 10)
* **Mục tiêu:** Voucher đã đạt tối đa số lượt dùng của tài khoản (`perUserLimit`) sẽ bị làm mờ, gắn badge `LIMIT REACHED` và không cho áp dụng tiếp.
* **Đường dẫn:** Màn hình chọn ghế (`/booking/seat-selection/:id`) -> Bấm nút **Select Voucher**
* **Các bước thực hiện:**
  - [ ] **Bước 1:** Chọn 2 ghế thường để tổng đơn > 120.000đ.
  - [ ] **Bước 2:** Bấm nút **`Select Voucher`** (hoặc Chọn mã giảm giá) để mở Modal danh sách Voucher.
  - [ ] **Bước 3 (Kiểm tra voucher khả dụng):**
    - Các voucher còn lượt dùng (như `VIPMEGA`, `SALE2149`, `GOLD50K`) hiển thị sáng rõ, có nút **Apply**.
  - [ ] **Bước 4 (Kiểm tra voucher đã hết lượt cá nhân):**
    - Tìm voucher đã chạm hạn mức per-user (Ví dụ mã `WELCOME10` có giới hạn 1 lần/user mà tài khoản đã dùng):
    - Thẻ voucher bị làm mờ (dimmed, `opacity-60`), có viền xám đậm.
    - Hiển thị Badge cảnh báo màu đỏ/cam: **`LIMIT REACHED`** hoặc **`Đã đạt giới hạn (1/1)`**.
    - Hiển thị dòng mô tả cảnh báo: *"Bạn đã dùng hết số lượt áp dụng mã này (Tối đa 1 lần/tài khoản)"*.
    - Nút **Apply** bị vô hiệu hóa (disabled), không thể bấm.
  - [ ] **Kết quả mong đợi (PASS):** Ngăn chặn người dùng spam voucher vượt quá số lần quy định ngay từ giao diện.

---

### 🧪 TEST CASE 08: QUẢN TRỊ DANH MỤC THỂ LOẠI PHIM (MOVIE GENRES) TRÊN ADMIN DASHBOARD (FEAT 07)
* **Mục tiêu:** Admin có thể xem, thêm mới, sửa và xóa danh mục thể loại phim dễ dàng trên giao diện quản trị.
* **Đường dẫn:** `http://localhost:5173/admin` (Đăng nhập tài khoản Admin: `admin@cinema.com` / `GoToroAdminSecure2026@Password`)
* **Các bước thực hiện:**
  - [ ] **Bước 1:** Đăng nhập vào trang Admin (`/login` -> `/admin`).
  - [ ] **Bước 2:** Trên thanh Tabs quản trị, quan sát tab mới: **`Movie Genres`** (biểu tượng thẻ tag).
  - [ ] **Bước 3:** Bấm vào tab **`Movie Genres`**:
    - Hiển thị bảng danh sách các thể loại phim gồm các cột: `ID`, `Genre Name`, `Description`, `Movies Linked`, `Actions`.
  - [ ] **Bước 4 (Tạo mới thể loại):**
    - Bấm nút **`+ Add Genre`** (hoặc Add New Genre).
    - Nhập Tên thể loại: `Cyberpunk Sci-Fi`.
    - Nhập Mô tả: `Phim khoa học viễn tưởng tương lai thế kỷ 22`.
    - Bấm **Save / Submit**.
    - **Kết quả:** Thể loại `Cyberpunk Sci-Fi` xuất hiện ngay lập tức trong bảng.
  - [ ] **Bước 5 (Chỉnh sửa thể loại):**
    - Bấm nút **`Edit`** ở dòng thể loại vừa tạo.
    - Sửa tên thành: `Cyberpunk & Dystopia`.
    - Bấm **Update**.
    - **Kết quả:** Bảng cập nhật tên mới chính xác.
  - [ ] **Bước 6 (Xóa thể loại):**
    - Bấm nút **`Delete`** ở thể loại vừa tạo -> Xác nhận modal.
    - **Kết quả:** Thể loại bị xóa khỏi danh sách mà không ảnh hưởng đến hệ thống.
  - [ ] **Kết quả mong đợi (PASS):** Chức năng CRUD thể loại hoạt động 100% trơn tru.

---

### 🧪 TEST CASE 09: THÊM Ô NHẬP YOUTUBE TRAILER CHO PHIM & CHẶN LINK LỪA ĐẢO (BUG 08)
* **Mục tiêu:** Admin có thể nhập link YouTube Trailer khi tạo/sửa phim; hệ thống chặn hoàn toàn các đường link nguy hại, không phải YouTube.
* **Đường dẫn:** `http://localhost:5173/admin` -> Tab **`Movie Catalog`**
* **Các bước thực hiện:**
  - [ ] **Bước 1:** Vào tab `Movie Catalog`, bấm nút **`+ Publish Movie`** (hoặc bấm `Edit` một phim bất kỳ).
  - [ ] **Bước 2:** Quan sát form nhập thông tin phim:
    - Ngay dưới ô **Poster URL**, xuất hiện trường nhập mới: **`YouTube Trailer URL`** với placeholder `https://www.youtube.com/watch?v=...`.
  - [ ] **Bước 3 (Kiểm tra chặn link sai/lừa đảo):**
    - Nhập link không hợp lệ: `https://phishing-site.com/fake-video.mp4` hoặc `https://facebook.com/watch`.
    - Bấm **Publish Movie / Save**:
    - **Kết quả:** Hệ thống báo lỗi ngay lập tức:  
      *`"Trailer URL phải là đường dẫn video YouTube hợp lệ (ví dụ: https://www.youtube.com/watch?v=...)"`*.  
      Form không được gửi đi.
  - [ ] **Bước 4 (Kiểm tra link YouTube chuẩn):**
    - Nhập link chuẩn: `https://www.youtube.com/watch?v=dQw4w9WgXcQ` (hoặc link trailer YouTube bất kỳ).
    - Điền đầy đủ các trường bắt buộc khác và bấm **Publish Movie**.
    - **Kết quả:** Lưu phim thành công.
  - [ ] **Bước 5 (Kiểm tra ngoài Client):**
    - Vào trang chi tiết bộ phim vừa tạo (`/movies/:id`).
    - Bấm nút **`Watch Trailer`**:
    - **Kết quả:** Modal phát video YouTube nhúng (embed) mở ra và phát mượt mà.
  - [ ] **Kết quả mong đợi (PASS):** Bảo vệ an toàn chống lừa đảo, phát trailer YouTube chuẩn mực.

---

# PHẦN 2: KIỂM THỬ LUỒNG NGHIỆP VỤ HOÀN CHỈNH (END-TO-END FLOW)

---

### 🎬 BƯỚC 1: TRẢI NGHIỆM ĐẶT VÉ TRỌN VẸN CỦA KHÁCH HÀNG
* **Mục tiêu:** Thực hiện từ khâu chọn phim, chọn ghế đôi + ghế thường, áp voucher, giữ ghế 10 phút đến thanh toán thành công.

- [ ] **1.1 Chọn suất chiếu:**
  - Từ trang chủ, chọn phim `Obsession` hoặc `Michael`.
  - Chọn ngày chiếu hôm nay và chọn suất chiếu (ví dụ 13:00 hoặc 15:30).
- [ ] **1.2 Chọn ghế & Đếm ngược 10 phút:**
  - Chọn 1 ghế thường (ví dụ: C5 - 60.000đ).
  - Chọn 1 cặp ghế đôi (ví dụ: J1 & J2 - 160.000đ).
  - Tổng tiền tạm tính: `220.000 VNĐ`.
  - Bấm **`Reserve Seats & Checkout`**.
  - Đồng hồ đếm ngược 10:00 (Hold Timer) bắt đầu chạy.
- [ ] **1.3 Áp dụng Voucher:**
  - Bấm **Select Voucher**, chọn mã `SALE2149` (giảm 10%).
  - Số tiền được giảm hiển thị rõ ràng trên hóa đơn thanh toán.
- [ ] **1.4 Thanh toán vé:**
  - Chọn phương thức thanh toán: **VNPay (Sandbox Simulation)**.
  - Bấm nút thanh toán.
  - Màn hình thông báo: **`🎉 Booking Confirmed! Payment Successful`** kèm mã vé (Ví dụ: `BK-XXXXXXXXXX`).
- [ ] **1.5 Xem vé tại My Tickets:**
  - Bấm nút **`🎟️ My Tickets`** trên góc phải Navbar.
  - Danh sách vé hiển thị đơn hàng vừa đặt ở trạng thái **`CONFIRMED`**.
  - Có hiển thị mã QR, thông tin phòng chiếu, hàng ghế và tổng tiền đã trừ voucher.

---

### 🔄 BƯỚC 2: KIỂM THỬ CHÍNH SÁCH HỦY VÉ & GIẢI PHÓNG GHẾ (> 60 PHÚT)
* **Mục tiêu:** Xác nhận khách hàng được quyền hủy vé trước giờ chiếu ít nhất 60 phút và ghế được hoàn trả lại sơ đồ ngay lập tức.

- [ ] **2.1 Kiểm tra điều kiện hủy vé:**
  - Tại trang `My Tickets`, tìm vé có suất chiếu diễn ra sau hơn 60 phút nữa (suất chiếu chiều hoặc ngày mai).
  - Nút **`Cancel Ticket & Refund`** hiển thị màu đỏ cho phép bấm.
  - (Đối với suất chiếu sắp diễn ra trong vòng dưới 60 phút, nút này tự động mờ đi và có tooltip giải thích quy định).
- [ ] **2.2 Thực hiện hủy vé:**
  - Bấm nút **`Cancel Ticket & Refund`**.
  - Hộp thoại cảnh báo xuất hiện xác nhận chính sách hoàn tiền 100%.
  - Bấm **Xác nhận Hủy**.
- [ ] **2.3 Xác thực kết quả:**
  - Trạng thái vé tại `My Tickets` chuyển sang **`CANCELLED`** (hoặc `REFUNDED`).
  - Mở lại sơ đồ ghế của suất chiếu đó: Các ghế vừa hủy (C5, J1, J2) đã chuyển từ màu Đã Bán về màu Trắng/Trống khả dụng.
  - Lượt sử dụng Voucher cũng được hoàn trả lại cho tài khoản.

---

### ⚡ BƯỚC 3: KIỂM THỬ TRANH CHẤP GIỮ GHẾ ĐỒNG THỜI (CONCURRENCY HOLD TEST)
* **Mục tiêu:** Đảm bảo 2 khách hàng cùng đặt 1 ghế tại cùng 1 giây sẽ không bị lỗi ghi đè dữ liệu (Double-Booking).

- [ ] **3.1 Chuẩn bị:**
  - Mở Cửa sổ 1 (Trình duyệt thường): Đăng nhập tài khoản A.
  - Mở Cửa sổ 2 (Trình duyệt Ẩn danh - Incognito): Đăng nhập tài khoản B.
  - Cả 2 cửa sổ cùng vào sơ đồ chọn ghế của cùng 1 suất chiếu.
- [ ] **3.2 Thao tác đồng thời:**
  - Cả 2 tài khoản cùng nhìn thấy ghế **D5** đang còn trống.
  - Cửa sổ A: Bấm chọn **D5** và bấm **Reserve Seats** -> Khách A thành công vào màn hình thanh toán, giữ ghế trong 10 phút.
  - Cửa sổ B: Bấm chọn **D5** và bấm **Reserve Seats**.
- [ ] **3.3 Kết quả mong đợi (PASS):**
  - Cửa sổ B nhận ngay thông báo lỗi màu đỏ:  
    *`"Ghế D5 đã được người khác giữ chỗ hoặc đã bán. Vui lòng chọn ghế khác!"`*.
  - Ghế D5 trên màn hình của B tự động đổi màu sang trạng thái Đang Giữ/Đã Bán.
  - Không có tình trạng 2 khách cùng thanh toán được 1 ghế.

---

### 📊 BƯỚC 4: KIỂM THỬ BÁO CÁO DOANH THU & HOÀN TIỀN ADMIN
* **Mục tiêu:** Kiểm tra giao diện quản trị ghi nhận chính xác doanh thu và kiểm soát hoàn tiền.

- [ ] **4.1 Báo cáo doanh thu (Revenue Reports):**
  - Vào `/admin` -> Tab **`Revenue Reports`**.
  - Chọn khoảng thời gian tháng hiện tại -> Bấm **Apply Filter**.
  - Biểu đồ và thẻ thống kê hiển thị: Tổng doanh thu, Số vé đã bán, Công suất lấp đầy phòng chiếu (Occupancy Rate).
- [ ] **4.2 Quản lý Hoàn tiền (Payments & Refunds):**
  - Vào tab **`Payments & Refunds`**.
  - Đơn vé vừa hủy ở Bước 2 xuất hiện trong danh sách giao dịch hoàn tiền với trạng thái `REFUNDED` / `CANCELLED`.
  - Mọi lịch sử giao dịch đều có Audit Log ghi nhận ngày giờ chi tiết.

---

## 📋 PHẦN 3: BẢNG TỔNG HỢP NGHIỆM THU (ACCEPTANCE CHECKLIST)

Tester đánh dấu `[x]` vào các ô dưới đây khi hoàn thành kiểm thử thực tế:

| STT | Hạng mục kiểm thử | Trạng thái nghiệm thu | Ghi chú của Tester |
|:---:|---|:---:|---|
| **1** | Chặn email sai đuôi TLD khi đăng ký (`/register`) | [ ] PASS / [ ] FAIL | |
| **2** | Navbar dọn dẹp: Bỏ `My Bookings` ở giữa, chuẩn hóa `🎟️ My Tickets` | [ ] PASS / [ ] FAIL | |
| **3** | Trang chủ hiển thị 8 phim/trang, chuyển trang mượt mà, tự reset | [ ] PASS / [ ] FAIL | |
| **4** | Phim Coming Soon: Hiện Premiere Teaser hoặc Pre-Sale Banner chuẩn | [ ] PASS / [ ] FAIL | |
| **5** | Ghế đôi tự ghép cặp J1-J2, tính chuẩn 160.000đ, Legend ẩn hiện động | [ ] PASS / [ ] FAIL | |
| **6** | Lỗi chọn ghế đơn lẻ (Orphan seat) chỉ nổ duy nhất 1 Toast cảnh báo | [ ] PASS / [ ] FAIL | |
| **7** | Voucher hết lượt dùng cá nhân bị làm mờ, hiện badge LIMIT REACHED | [ ] PASS / [ ] FAIL | |
| **8** | Tab Movie Genres trên Admin: Thêm/Sửa/Xóa thể loại phim trơn tru | [ ] PASS / [ ] FAIL | |
| **9** | Ô nhập YouTube Trailer URL cho phim: Chặn link rác, phát video chuẩn | [ ] PASS / [ ] FAIL | |
| **10** | Luồng đặt vé -> Thanh toán -> Xem mã vé QR tại `My Tickets` | [ ] PASS / [ ] FAIL | |
| **11** | Hủy vé trước 60 phút: Giải phóng ghế tức thì & hoàn lại voucher | [ ] PASS / [ ] FAIL | |
| **12** | Tranh chấp ghế đồng thời (Concurrency): Ngăn chặn 100% Double-Booking | [ ] PASS / [ ] FAIL | |

---
> **Người thực hiện kiểm thử:** ________________________  
> **Ngày kiểm thử:** 08/11/2026  
> **Kết luận cuối cùng:** [ ] ĐẠT CHUẨN ĐỂ MERGE VÀO MAIN  /  [ ] CẦN ĐIỀU CHỈNH THÊM
