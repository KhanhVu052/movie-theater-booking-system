# BỘ KỊCH BẢN KIỂM THỬ TRỰC TIẾP TRÊN GIAO DIỆN WEB (100% WEB UI TEST HANDBOOK)
## HỆ THỐNG ĐẶT VÉ RẠP CHIẾU PHIM GOTORO CINEMA

> **[Language: Vietnamese / Tiếng Việt]** — *Comprehensive manual test scenario handbook for local QA verification.*  
> **Mục đích:** Tài liệu hướng dẫn Tester thao tác trực tiếp 100% trên trình duyệt Web (`http://localhost:5173`), kiểm thử bằng mắt và click chuột từ đầu đến cuối mọi tính năng, mọi bản vá lỗi và mọi ngóc ngách của hệ thống.  
> **Phiên bản:** Final Release Acceptance Checklist v8.0  

---

## 🧭 PHẦN 0: ĐỊA CHỈ TRUY CẬP & TÀI KHOẢN ĐĂNG NHẬP

### 1. Đường dẫn truy cập trên trình duyệt
* **Trang chủ Client:** `http://localhost:5173/`
* **Trang Đăng ký:** `http://localhost:5173/register`
* **Trang Đăng nhập:** `http://localhost:5173/login`
* **Trang Vé của tôi:** `http://localhost:5173/my-bookings`
* **Trang Quản trị Admin:** `http://localhost:5173/admin`

### 2. Thông tin tài khoản có sẵn để test
| Vai trò | Email đăng nhập | Mật khẩu | Mục đích sử dụng |
|---|---|---|---|
| **ADMIN (Quản trị viên)** | Configured via `BOOTSTRAP_ADMIN_EMAIL` in `.env` | Configured via `BOOTSTRAP_ADMIN_PASSWORD` in `.env` | Test toàn bộ chức năng trong Admin Dashboard |
| **KHÁCH HÀNG 1** | `khanh.2149@cinema.com` (hoặc tự đăng ký mới) | `Customer@12345` | Đặt vé, chọn ghế đôi, áp voucher, thanh toán, hủy vé |
| **KHÁCH HÀNG 2 (Ẩn danh)** | Tự đăng ký email mới | `Customer@12345` | Mở ở Tab Ẩn danh (Ctrl + Shift + N) để test tranh chấp ghế |

---

# PHẦN 1: KIỂM THỬ GIAO DIỆN KHÁCH HÀNG (CLIENT PORTAL TỪ ĐẦU ĐẾN CUỐI)

---

### 🟢 GIAI ĐOẠN 1: ĐĂNG KÝ TÀI KHOẢN & TEST CHẶN EMAIL SAI
*Mục tiêu: Kiểm tra xem hệ thống có chặn đúng các email sai định dạng (thiếu đuôi miền `.com`, `.vn`, `@`...) ngay trên form đăng ký hay không.*

- [ ] **Bước 1.1:** Mở trình duyệt, truy cập vào `http://localhost:5173/register` (hoặc bấm nút **Sign Up** ở góc trên cùng bên phải trang chủ).
- [ ] **Bước 1.2 (Test case sai định dạng):**
  - Ô Full Name: Nhập `Nguyen Van Test`.
  - Ô Password: Nhập `SecurePass@2026`.
  - Ô Email: Nhập thử `tester@gmail` (cố tình thiếu chữ `.com`).
  - Bấm nút **`Sign Up`**.
  - **👉 Quan sát màn hình:** Form bị chặn lại, ngay dưới ô Email xuất hiện dòng thông báo lỗi viền đỏ:  
    *`"Vui lòng nhập địa chỉ email hợp lệ (ví dụ: name@example.com)"`*.
  - Thử đổi email thành `tester@` hoặc `tester.com` (thiếu `@`) -> Vẫn bị chặn báo lỗi tương tự.
- [ ] **Bước 1.3 (Test case đăng ký thành công):**
  - Sửa lại ô Email thành email chuẩn: `tester.vip2026@gmail.com`.
  - Bấm nút **`Sign Up`**.
  - **👉 Quan sát màn hình:** Xuất hiện Toast xanh lá báo đăng ký thành công, hệ thống tự động đưa bạn về trang Đăng nhập hoặc Trang chủ.

---

### 🟢 GIAI ĐOẠN 2: THANH MENU NAVBAR & DANH SÁCH PHIM TRANG CHỦ
*Mục tiêu: Đảm bảo giao diện đã được dọn dẹp sạch sẽ, không còn nút "My Bookings" thừa ở giữa và danh sách phim chia trang chuẩn 8 phim/trang.*

- [ ] **Bước 2.1: Quan sát thanh Header / Navbar:**
  - Nhìn vào cụm menu chính giữa thanh Header: **Chỉ có 2 mục duy nhất là `Home` và `Movies`**.
  - Nút `My Bookings` nằm chen chúc ở giữa trước đây đã bị xóa bỏ hoàn toàn.
  - Nhìn sang góc trên cùng bên phải: Xuất hiện nút bấm màu vàng nổi bật: **`🎟️ My Tickets`** (dẫn đến trang vé cá nhân).
  - Thu nhỏ cửa sổ trình duyệt (kích thước điện thoại) -> Bấm mở menu 3 dấu gạch: Mục xem vé hiển thị tên đồng bộ là **`My Tickets`**.
- [ ] **Bước 2.2: Kiểm tra phân trang danh sách phim (Pagination):**
  - Cuộn chuột xuống mục danh sách phim ở trang chủ.
  - Đếm số lượng thẻ phim đang hiển thị: **Đúng chuẩn 8 phim trên một trang** (không bị hiển thị tràn lan hàng chục phim làm dài trang).
  - Nhìn xuống dưới cùng danh sách phim: Có thanh điều hướng phân trang gồm các nút `Previous`, `1`, `2`, `3`, ..., `Next`. Nút `Trang 1` đang được tô màu vàng cam nổi bật.
  - Bấm vào số **`2`** (hoặc nút `Next`):
    - Danh sách chuyển sang hiển thị 8 bộ phim tiếp theo rất mượt mà.
- [ ] **Bước 2.3: Kiểm tra tự động Reset về Trang 1:**
  - Trong lúc đang ở Trang 2, bấm chuyển tab sang **`Coming Soon`** (Phim sắp chiếu):
    - Hệ thống tự động đặt lại số trang về **Trang 1**.
  - Chuyển lại tab **`Now Showing`**, gõ chữ `"Avengers"` vào ô tìm kiếm (Search):
    - Hệ thống tự động lọc phim và tự động nhảy về **Trang 1**.

---

### 🟢 GIAI ĐOẠN 3: XEM CHI TIẾT PHIM, TRAILER YOUTUBE & BANNER PRE-SALE
*Mục tiêu: Trải nghiệm banner cho phim chưa chiếu và popup xem trailer YouTube.*

- [ ] **Bước 3.1: Kiểm tra phim Coming Soon chưa có lịch chiếu:**
  - Tại tab `Coming Soon`, bấm vào phim *Blade Runner 2049* (hoặc *A Silent Voice*).
  - Cuộn xuống khu vực suất chiếu:
  - **👉 Quan sát màn hình:** Hiển thị **Premiere Teaser Banner** màu đen viền vàng với biểu tượng đồng hồ cát và thông báo:  
    *"Phim sắp công chiếu! Thông tin suất chiếu chính thức sẽ được mở bán sớm. Hãy theo dõi để không bỏ lỡ!"*.
- [ ] **Bước 3.2: Kiểm tra phim Coming Soon có mở bán vé trước (Pre-Sale):**
  - Bấm vào phim Coming Soon đã được Admin mở suất chiếu tương lai.
  - **👉 Quan sát màn hình:** Hiển thị **Pre-Sale Banner** nổi bật màu vàng tím với icon pháo hoa:  
    *"🎉 VÉ BÁN TRƯỚC (PRE-SALE) ĐÃ MỞ! Nhanh tay đặt chỗ để trở thành những khán giả đầu tiên thưởng thức bộ phim."*  
    Đồng thời hiển thị đầy đủ các tab ngày chiếu tương lai để khách chọn.
- [ ] **Bước 3.3: Xem Trailer YouTube:**
  - Nhìn lên banner đầu trang chi tiết phim, bấm nút **`Watch Trailer`** (có biểu tượng Play).
  - **👉 Quan sát màn hình:** Một Modal Popup mở ra ở giữa màn hình và video YouTube phát trực tiếp mượt mà, có đầy đủ nút tạm dừng, tăng giảm âm lượng và phóng to toàn màn hình. Bấm nút dấu **X** để đóng modal.

---

### 🟢 GIAI ĐOẠN 4: SƠ ĐỒ CHỌN GHẾ, GHẾ ĐÔI & TEST TOAST GHẾ ĐƠN
*Mục tiêu: Kiểm tra sơ đồ ghế đôi J1-J2, giá 160.000đ, xóa ghế lẻ E5 và Toast cảnh báo chỉ nổ 1 lần.*

- [ ] **Bước 4.1: Chọn suất chiếu để vào sơ đồ ghế:**
  - Từ trang chủ hoặc trang chi tiết phim (Ví dụ phim *Obsession* hoặc *Michael*), chọn ngày hôm nay và bấm vào một khung giờ chiếu (Ví dụ: `13:00` tại Phòng 1 hoặc Phòng 2).
  - Giao diện chuyển đến màn hình chọn ghế (`/booking/seat-selection/:id`).
- [ ] **Bước 4.2: Kiểm tra sơ đồ Ghế Đôi (Couple Seats):**
  - Nhìn xuống hàng ghế cuối cùng (Hàng J hoặc Hàng E có các ghế màu hồng/tím).
  - Click chuột vào ghế đôi **J1**:
    - **👉 Quan sát:** Cả 2 ghế **J1 và J2** cùng sáng lên đồng thời (hệ thống tự chọn cả cặp).
    - Nhìn xuống tổng tiền tạm tính ở góc dưới: Giá vé hiển thị chuẩn xác là **160.000 VNĐ** (80.000đ x 2 ghế).
  - Click chuột lần nữa vào ghế **J1**: Cả 2 ghế **J1 và J2** cùng được hủy chọn đồng thời.
- [ ] **Bước 4.3: Kiểm tra đã xóa sổ ghế lẻ E5 tại các phòng nhỏ (Phòng 2 đến 7):**
  - Chọn 1 suất chiếu diễn ra tại Phòng 2 hoặc Phòng 3 (Ví dụ suất chiếu phim *Batman* hoặc *Michael* tại Cinema 1 - Screen 2).
  - Nhìn vào hàng ghế cuối cùng (Hàng E):
    - Đếm số lượng ghế ở hàng E: **Chỉ có đúng 4 ghế (E1, E2, E3, E4)** ghép thành 2 cặp đôi đối xứng.
    - Ghế **E5 đơn độc lẻ loi trước đây đã bị xóa hoàn toàn khỏi hệ thống**. Sơ đồ phòng chiếu nhìn cực kỳ vuông vắn, rộng rãi và cân xứng.
- [ ] **Bước 4.4: Kiểm tra Chú thích (Legend) ẩn hiện thông minh:**
  - Ở phòng chiếu có ghế đôi: Khu vực Chú thích dưới màn hình có hiển thị biểu tượng màu hồng **`Couple Seat (Ghế đôi)`**.
  - Vào một phòng chiếu không có ghế đôi: Biểu tượng `Couple Seat` tự động ẩn đi, không gây hiểu nhầm cho người xem.
- [ ] **Bước 4.5: Kiểm tra cảnh báo ghế trống đơn lẻ (Orphan Seat Toast):**
  - Tại hàng A (A1, A2, A3, A4...): Cố tình bỏ trống ghế **A1**, click chuột chọn ghế **A2**.
  - **👉 Quan sát màn hình:**
    - Xuất hiện thông báo cảnh báo: *"Không thể để trống 1 ghế đơn lẻ bên cạnh ghế bạn đã chọn"*.
    - **Đếm số lượng Toast:** **CHỈ CÓ ĐÚNG 1 TOAST NỔ RA DUY NHẤT** ở góc màn hình (không còn bị nhân đôi 2 popup đè lên nhau như bản cũ).

---

### 🟢 GIAI ĐOẠN 5: ÁP DỤNG VOUCHER & THANH TOÁN GIỮ CHỖ 10 PHÚT
*Mục tiêu: Kiểm tra Voucher bị làm mờ khi hết lượt dùng cá nhân và luồng thanh toán.*

- [ ] **Bước 5.1: Chọn ghế hợp lệ:**
  - Chọn 1 cặp ghế đôi (J1-J2 giá 160.000đ) hoặc chọn 2 ghế thường để tổng đơn > 100.000đ.
  - Bấm nút **`Reserve Seats & Checkout`**.
- [ ] **Bước 5.2: Kiểm tra Modal Voucher:**
  - Bấm vào nút **`Select Voucher`** (hoặc Chọn mã giảm giá).
  - Modal danh sách Voucher hiện lên:
    - **Kiểm tra Voucher hết lượt:** Tìm mã `WELCOME10` (mã có giới hạn 1 lần/user mà bạn đã từng dùng):
      - Thẻ voucher bị làm mờ hẳn đi (`opacity-60`), có viền xám đậm.
      - Xuất hiện Badge cảnh báo màu đỏ/cam: **`LIMIT REACHED`** hoặc **`Đã đạt giới hạn (1/1)`**.
      - Dòng thông báo màu đỏ: *"Bạn đã dùng hết số lượt áp dụng mã này (Tối đa 1 lần/tài khoản)"*.
      - Nút **Apply** bị khóa mờ, không thể bấm.
    - **Kiểm tra Voucher khả dụng:** Chọn mã `SALE2149` (giảm 10%) hoặc `VIPMEGA` -> Bấm nút **`Apply`**.
    - **👉 Quan sát:** Mã được áp thành công, số tiền chiết khấu được trừ ngay vào tổng hóa đơn.
- [ ] **Bước 5.3: Màn hình Thanh toán & Đồng hồ đếm ngược:**
  - Giao diện chuyển sang trang thanh toán (`/payment/:bookingId`).
  - **👉 Quan sát:** Đồng hồ đếm ngược màu vàng **`10:00`** (Hold Timer) bắt đầu chạy lùi từng giây `09:59`, `09:58`...
  - Chọn phương thức thanh toán: **VNPay (Sandbox Simulation)**.
  - Bấm nút xác nhận thanh toán.
  - **👉 Quan sát:** Màn hình chuyển sang trang thông báo thành công rực rỡ:  
    **`🎉 Booking Confirmed! Payment Successful`** kèm theo Mã vé đặt chỗ dạng `BK-XXXXXXXXXX`.

---

### 🟢 GIAI ĐOẠN 6: TRANG "MY TICKETS" & HỦY VÉ HOÀN TIỀN (> 60 PHÚT)
*Mục tiêu: Xem vé điện tử có mã QR và kiểm tra chính sách hủy vé tự động hoàn tiền.*

- [ ] **Bước 6.1: Xem vé tại My Tickets:**
  - Bấm vào nút **`🎟️ My Tickets`** trên góc phải thanh Header.
  - Vé bạn vừa mua hiển thị ngay trên cùng danh sách:
    - Trạng thái vé hiển thị màu xanh lá: **`CONFIRMED`**.
    - Có hiển thị **Mã QR vé điện tử** rõ nét.
    - Hiển thị đầy đủ Tên phim, Ngày giờ chiếu, Phòng chiếu, Số ghế đã chọn và Tổng số tiền đã thanh toán.
- [ ] **Bước 6.2: Thực hiện Hủy vé trước giờ chiếu (> 60 phút):**
  - Tìm vé có suất chiếu diễn ra sau hơn 60 phút nữa (suất chiếu buổi chiều hoặc ngày mai).
  - Quan sát thấy nút màu đỏ: **`Cancel Ticket & Refund`**.
  - Bấm vào nút **`Cancel Ticket & Refund`**.
  - Một hộp thoại xác nhận hiện ra thông báo chính sách hoàn tiền 100%. Bấm **Xác nhận Hủy**.
  - **👉 Quan sát kết quả:**
    - Trạng thái vé lập tức đổi sang màu xám/đỏ: **`CANCELLED`** (hoặc `REFUNDED`).
    - Mở lại sơ đồ ghế của suất chiếu đó: Các ghế bạn vừa hủy đã ngay lập tức trở lại màu trắng (Available), sẵn sàng cho người khác đặt.
    - Mã voucher bạn đã dùng cũng được tự động hoàn lại lượt dùng cho tài khoản của bạn.

---

# PHẦN 2: KIỂM THỬ GIAO DIỆN QUẢN TRỊ VIÊN (ADMIN DASHBOARD)

*Thao tác: Đăng xuất tài khoản khách hàng -> Đăng nhập bằng tài khoản Quản trị viên:*  
* **Email:** Giá trị cấu hình trong biến môi trường `BOOTSTRAP_ADMIN_EMAIL` (mặc định: `admin@cinema.com`)  
* **Mật khẩu:** Giá trị cấu hình trong biến môi trường `BOOTSTRAP_ADMIN_PASSWORD` trong file `.env`  
* **Đường dẫn:** `http://localhost:5173/admin`

---

### 🛠️ GIAI ĐOẠN 7: QUẢN LÝ DANH MỤC THỂ LOẠI PHIM (MOVIE GENRES)
*Mục tiêu: Kiểm tra Tab thể loại phim mới, tạo thể loại có ô Mô tả (Description) tối đa 500 ký tự.*

- [ ] **Bước 7.1: Mở Tab Movie Genres:**
  - Trên thanh Tab của Admin Dashboard, bấm vào Tab mới: **`Movie Genres`** (biểu tượng thẻ tag).
  - Bảng danh sách thể loại hiển thị gồm các cột: `ID`, `Genre Name`, **`Description (Mô tả)`**, `Status`, `Actions`.
- [ ] **Bước 7.2: Thêm mới thể loại kèm Mô tả:**
  - Bấm vào nút màu vàng **`+ Add New Genre`**.
  - Modal mở ra:
    - Ô **Genre Name**: Nhập `Cyberpunk Sci-Fi`.
    - Ô **Description**: Xuất hiện trường nhập mô tả dạng ô văn bản nhiều dòng (`<textarea>`) kèm bộ đếm ký tự `0/500`.
    - Nhập nội dung mô tả: `Thể loại khoa học viễn tưởng công nghệ cao trong thế giới tương lai suy tàn`.
    - Thử gõ vượt quá 500 ký tự -> Ô nhập tự động khống chế đúng 500 ký tự.
    - Bấm nút **`Save Genre`**.
  - **👉 Quan sát:** Modal đóng lại, dòng thể loại `Cyberpunk Sci-Fi` xuất hiện ngay lập tức trong bảng kèm đúng đoạn mô tả vừa nhập.
- [ ] **Bước 7.3: Chỉnh sửa thể loại:**
  - Bấm nút **`Edit`** ở dòng thể loại vừa tạo.
  - Cả Tên thể loại và Mô tả cũ đều được điền sẵn vào modal.
  - Thêm chữ `& AI World` vào cuối mô tả -> Bấm **Update Genre** -> Bảng cập nhật tức thì.
- [ ] **Bước 7.4: Xóa thể loại:**
  - Bấm nút **`Delete`** ở thể loại vừa tạo -> Xác nhận modal -> Thể loại bị xóa gọn gàng khỏi bảng.

---

### 🛠️ GIAI ĐOẠN 8: QUẢN LÝ PHIM & Ô NHẬP YOUTUBE TRAILER URL
*Mục tiêu: Kiểm tra ô nhập link YouTube Trailer khi tạo phim và khả năng chặn link độc hại.*

- [ ] **Bước 8.1: Mở Modal tạo phim:**
  - Vào Tab **`Movie Catalog`**, bấm nút màu vàng **`+ Publish Movie`** (hoặc bấm `Edit` một phim bất kỳ).
  - Quan sát form nhập liệu:
  - Ngay dưới ô **Poster URL**, xuất hiện ô nhập mới: **`YouTube Trailer URL`** với chữ mờ hướng dẫn: `https://www.youtube.com/watch?v=...`.
- [ ] **Bước 8.2: Thử nhập link sai / link giả mạo độc hại:**
  - Nhập vào ô Trailer URL: `https://phishing-site.com/fake-video.mp4` hoặc `https://facebook.com/video`.
  - Bấm nút **Publish Movie**:
  - **👉 Quan sát:** Hệ thống chặn lại ngay lập tức và báo lỗi:  
    *`"Trailer URL phải là đường dẫn video YouTube hợp lệ (ví dụ: https://www.youtube.com/watch?v=...)"`*.  
    Dữ liệu không được phép lưu.
- [ ] **Bước 8.3: Nhập link YouTube chuẩn:**
  - Sửa lại link thành link YouTube chuẩn: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`.
  - Điền đầy đủ các thông tin khác (Tên phim, Đạo diễn, Thời lượng...) -> Bấm **Publish Movie**.
  - **👉 Quan sát:** Phim lưu thành công. Mở trang chi tiết phim đó ngoài giao diện khách hàng, bấm **Watch Trailer** là video YouTube phát được ngay.

---

### 🛠️ GIAI ĐOẠN 9: XẾP LỊCH CHIẾU & BÁO CÁO DOANH THU
- [ ] **Bước 9.1: Xếp lịch chiếu (Showtime Scheduling):**
  - Vào Tab **`Showtime Scheduling`**, bấm **`+ Schedule Showtime`**.
  - Chọn Phim, Chọn Phòng chiếu, Chọn Giờ chiếu -> Bấm Lưu.
  - Thử xếp 1 suất chiếu khác trùng khung giờ tại cùng 1 phòng -> Hệ thống báo lỗi xung đột phòng chiếu, từ chối tạo.
- [ ] **Bước 9.2: Xem Báo cáo Doanh thu (Revenue Reports):**
  - Vào Tab **`Revenue Reports`**.
  - Chọn khoảng ngày từ đầu tháng đến hôm nay -> Bấm nút **Apply Filter**.
  - **👉 Quan sát:**
    - Thẻ tổng doanh thu hiển thị số tiền vé đã bán thực tế.
    - Biểu đồ thống kê doanh thu theo từng phim.
    - Tỷ lệ lấp đầy rạp chiếu (Occupancy Rate) được tính toán chính xác.

---

# PHẦN 3: KIỂM THỬ TRANH CHẤP ĐỒNG THỜI (CONCURRENCY TRÊN TRÌNH DUYỆT)

*Mục tiêu: Chứng minh trực quan bằng 2 cửa sổ trình duyệt rằng 2 người không bao giờ mua trùng 1 ghế.*

- [ ] **Bước 10.1: Mở 2 cửa sổ song song:**
  - **Cửa sổ 1 (Trình duyệt bình thường):** Đang đăng nhập tài khoản Khách hàng A.
  - **Cửa sổ 2 (Mở Tab Ẩn danh - `Ctrl + Shift + N`):** Vào `http://localhost:5173`, đăng nhập tài khoản Khách hàng B.
- [ ] **Bước 10.2: Cùng vào sơ đồ ghế của cùng 1 suất chiếu:**
  - Cả 2 cửa sổ cùng mở sơ đồ ghế của Suất chiếu chiều (Ví dụ suất chiếu 13:00 Phòng 1).
  - Cả 2 cửa sổ cùng nhìn thấy ghế **D5** đang có màu trắng (trống).
- [ ] **Bước 10.3: Thao tác tranh chấp ghế D5:**
  - **Trên Cửa sổ 1 (Khách A):** Click chọn ghế **D5** -> Bấm nút **`Reserve Seats & Checkout`**.
    - Khách A thành công vào màn hình thanh toán, đồng hồ đếm ngược 10:00 bắt đầu chạy.
  - **Trên Cửa sổ 2 (Khách B):** Click chọn ghế **D5** -> Bấm nút **`Reserve Seats & Checkout`**.
- [ ] **👉 Quan sát kết quả trên Cửa sổ 2 (Khách B):**
  - Khách B nhận ngay thông báo lỗi viền đỏ:  
    *`"Ghế D5 đã được người khác giữ chỗ hoặc đã bán. Vui lòng chọn ghế khác!"`*.
  - Ghế D5 trên màn hình của Khách B tự động đổi màu sang trạng thái Đã Giữ / Đã Bán.
  - **Kết luận:** Hệ thống khóa ghế tức thì, chống 100% tình trạng mua đè (Double-Booking).

---

# 📋 PHẦN 4: BẢNG TIÊU CHÍ ĐÁNH DẤU NGHIỆM THU (TEST CHECKLIST)

Sau khi hoàn thành các bước trên giao diện web, Tester đánh dấu `[x]` vào từng mục bên dưới:

| STT | Chức năng kiểm thử trên Web | Kết quả thực tế | Đánh giá |
|:---:|---|:---:|:---:|
| **1** | Chặn nhập email sai đuôi TLD khi đăng ký (`/register`) | Đã kiểm tra trực tiếp | [ ] PASS |
| **2** | Navbar dọn dẹp: Bỏ `My Bookings` ở giữa, có nút `🎟️ My Tickets` | Đã kiểm tra trực tiếp | [ ] PASS |
| **3** | Phân trang trang chủ đúng 8 phim/trang, chuyển trang mượt, tự reset | Đã kiểm tra trực tiếp | [ ] PASS |
| **4** | Phim Coming Soon: Hiện Premiere Teaser hoặc Pre-Sale Banner mở bán | Đã kiểm tra trực tiếp | [ ] PASS |
| **5** | Ghế đôi tự động chọn cả cặp J1-J2, cộng đúng 160.000đ/cặp | Đã kiểm tra trực tiếp | [ ] PASS |
| **6** | Xóa sạch ghế lẻ E5 tại phòng 2-7, hàng E chỉ còn 2 cặp cân đối | Đã kiểm tra trực tiếp | [ ] PASS |
| **7** | Legend Ghế đôi tự động ẩn/hiện tùy theo phòng có ghế đôi hay không | Đã kiểm tra trực tiếp | [ ] PASS |
| **8** | Chừa ghế trống đơn lẻ (Orphan seat) chỉ nổ duy nhất 1 Toast cảnh báo | Đã kiểm tra trực tiếp | [ ] PASS |
| **9** | Voucher hết lượt dùng cá nhân bị làm mờ, hiện badge `LIMIT REACHED` | Đã kiểm tra trực tiếp | [ ] PASS |
| **10** | Tab Movie Genres trên Admin: Thêm/Sửa/Xóa thể loại có ô Description 500 ký tự | Đã kiểm tra trực tiếp | [ ] PASS |
| **11** | Ô nhập YouTube Trailer URL: Chặn link giả mạo, modal phát video YouTube chuẩn | Đã kiểm tra trực tiếp | [ ] PASS |
| **12** | Luồng giữ ghế 10:00 và thanh toán Sandbox thành công có mã vé | Đã kiểm tra trực tiếp | [ ] PASS |
| **13** | Trang `🎟️ My Tickets` hiển thị vé CONFIRMED và mã QR | Đã kiểm tra trực tiếp | [ ] PASS |
| **14** | Hủy vé trước 60 phút: Giải phóng ghế tức thì và hoàn lại lượt voucher | Đã kiểm tra trực tiếp | [ ] PASS |
| **15** | Tranh chấp 2 cửa sổ cùng giữ 1 ghế: Ngăn chặn 100% Double-Booking | Đã kiểm tra trực tiếp | [ ] PASS |

---

### ✍️ KÝ DUYỆT BÀN GIAO DỰ ÁN:
- **Tester thực hiện:** __________________________________
- **Ngày kiểm thử:** 08/11/2026
- **Kết luận nghiệm thu:**  
  [ ] **ĐẠT TIÊU CHUẨN XUẤT SẮC - SẴN SÀNG MERGE VÀO MAIN & BÀN GIAO DỰ ÁN**  
  [ ] **CẦN ĐIỀU CHỈNH THÊM**
