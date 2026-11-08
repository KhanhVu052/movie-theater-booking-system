# NHẬT KÝ THEO DÕI VÀ BÁO CÁO LỖI KIỂM THỬ (QA BUG LOG)
> **Dự án:** GoToro Cinema Management System  
> **Phiên bản:** QA Testing Phase - 08/11/2026  
> **Người thực hiện:** QA Tester & Antigravity Pair Programming  
> **Môi trường:** Local Dev (`http://localhost:5173` | `http://localhost:8080`)

---

## 📋 BẢNG TỔNG HỢP DANH SÁCH LỖI (BUG TRACKING SUMMARY)

| Mã lỗi (Bug ID) | Module | Tên lỗi & Hiện tượng | Mức độ | Trạng thái |
|---|---|---|---|---|
| `BUG-AUTH-EMAIL-FORMAT-VALIDATION-01` | Module 1.1 (Auth & Register) | Đăng ký thành công với email không chuẩn domain (`abc@xyz`) do thiếu regex TLD | Medium (Validation Gap) | 🟡 PENDING (Chờ sửa) |
| `FEAT-UX-COMING-SOON-PRE-SALE-02` | Module 1.2 (Movie Detail & Catalog) | Giao diện phim Sắp chiếu (`COMING_SOON`): Cần ẩn thanh 7 ngày rỗng và Cơ chế xử lý vé đặt trước (`Pre-Sale`) | Medium (UX Optimization) | 🟡 PENDING (Chờ sửa) |
| `BUG-SEAT-TOAST-DUPLICATE-03` | Module 1.4 (Seat Selection) | Thông báo cảnh báo luật ghế lẻ bị lặp đúp 2 lần (Duplicate Toast) khi chọn 1 ghế | Low (UI Polish) | 🟡 PENDING (Chờ sửa) |
| `BUG-SEAT-ROW-E-COUPLE-NULL-04` | Module 1.4 (Couple Seat Matrix) | Toàn bộ hàng ghế E (COUPLE) bị mờ/khóa do cột pair_group trong DB bị NULL | High (Data & Logic Incomplete) | 🟡 PENDING (Chờ sửa) |
| `BUG-SEAT-COUPLE-PRICE-DOUBLE-MULTIPLICATION-05` | Module 1.4 (Seat Selection & Pricing) | Giá ghế đôi (COUPLE) bị nhân đôi 2 lần: Giá gốc 80k thì cặp phải là 160k, nhưng hệ thống tính thành 320.000đ/cặp | High (Pricing Calculation Bug) | 🟡 PENDING (Chờ sửa) |
| `FEAT-UX-NAVBAR-DUPLICATE-MY-BOOKINGS-06` | Client Navigation (`Navbar.jsx`) | Trùng lặp liên kết điều hướng: Cả "My Bookings" và "My Tickets" đều trỏ về `/my-bookings` -> Xóa "My Bookings" | Low (UI Redundancy) | 🟡 PENDING (Chờ sửa) |
| `FEAT-ADMIN-GENRE-MANAGEMENT-UI-07` | Admin Portal (`AdminDashboard.jsx`) | Thiếu giao diện Quản lý Thể loại (Genre Management UI Tab) trên Admin Dashboard (Backend đã có 100% API) | Medium (Missing Admin Feature) | 🟡 PENDING (Chờ bổ sung) |
| `BUG-ADMIN-MOVIE-MODAL-MISSING-TRAILER-INPUT-08` | Admin Portal (`AdminDashboard.jsx`) | Modal Thêm/Sửa phim thiếu ô nhập Trailer URL -> Phim tạo mới không có trailer, chặn kiểm thử Case 2.3.1, 2.3.2 | High (Missing Input Field) | 🟡 PENDING (Chờ sửa) |
| `TRACK-CASE-1.3.2-CUTOFF-PENDING` | Module 1.3 (Showtime Cutoff 15m) | Tạm hoãn kiểm thử: Chưa có suất chiếu trong khung giờ cận < 15 phút | Info (QA Status) | ⏳ CHƯA TEST (Sẽ test sau) |
| `TRACK-CASE-1.4.4-COUPLE-PENDING` | Module 1.4 (Couple Seat Rules) | Tạm hoãn kiểm thử: Luật ghế đôi chưa test được do hàng E đang bị mờ (Lỗi #4) | Info (QA Status) | ⏳ CHƯA TEST (Sẽ test sau) |
| `TRACK-CASE-2.4.1-ROOM-SEAT-PENDING` | Module 2.4 (Room Seat Matrix) | Tạm hoãn kiểm thử: Cấu hình ghế phòng đang bị lỗi (phụ thuộc Lỗi #4 & Lỗi #5) | Info (QA Status) | ⏳ CHƯA TEST (Sẽ test sau) |
| `NOTE-CASE-2.4.2-ROOM-DEACTIVATE` | Module 2.4 (Deactivate Room Rule) | Đã ghi nhận: Logic tương đồng Case 2.3.3 (chặn tắt khi còn lịch), hiện FE chưa có nút tắt phòng | Info (QA Feedback) | ℹ️ ĐÃ GHI NHẬN |

---

# CHI TIẾT CÁC LỖI ĐƯỢC GHI NHẬN

---

### 🐛 LỖI #1: EMAIL THIẾU TÊN MIỀN HỢP LỆ VẪN ĐĂNG KÝ THÀNH CÔNG (`abc@xyz`)

> **Mã lỗi:** `BUG-AUTH-EMAIL-FORMAT-VALIDATION-01`  
> **Module bị ảnh hưởng:** Module 1.1 (Case 1.1.2 / 1.1.3: Kiểm tra định dạng Email khi Đăng ký - `Register.jsx` & `RegisterRequest.java`)  
> **Mức độ:** Medium (Lỗ hổng dữ liệu đầu vào / Data Validation Gap)  
> **Trạng thái:** Chờ xử lý (`PENDING`) - **Chưa can thiệp mã nguồn theo yêu cầu của User**

---

#### 1. MÔ TẢ HIỆN TƯỢNG (SYMPTOMS)
* **Vị trí xảy ra:** Màn hình Đăng ký tài khoản (`http://localhost:5173/register`).
* **Các bước tái hiện:**
  1. Truy cập trang đăng ký `/register`.
  2. Nhập Full Name: `Nguyen Van Test`.
  3. Nhập Email: **`abc@xyz`** *(chỉ có ký tự `@` và tên miền giả định, hoàn toàn không có phần mở rộng tên miền cấp cao - Top-Level Domain như `.com`, `.vn`, `.org`, `.edu`)*.
  4. Nhập Phone: `0912345678`.
  5. Nhập Password: `Customer@12345`.
  6. Bấm nút **"Create Account"**.
* **Kết quả thực tế:**
  * Cả Frontend và Backend đều không chặn.
  * Hệ thống báo đăng ký thành công, tạo mới một User trong cơ sở dữ liệu với email `abc@xyz` và tự động điều hướng sang trang Đăng nhập `/login`.
* **Kỳ vọng chuẩn:**
  * Email phải có định dạng đầy đủ bao gồm phần mở rộng tên miền hợp lệ (ví dụ: `abc@xyz.com` hoặc `abc@xyz.vn`).
  * Khi nhập `abc@xyz`, hệ thống phải chặn lại và hiển thị thông báo lỗi:  
    `Email must be a valid email address with a domain extension (e.g. name@domain.com)`.

---

#### 2. NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE)

##### A. Phía Frontend (`frontend/src/pages/Register.jsx` - Dòng 293–300):
```jsx
<input
  id="email"
  type="email"
  name="email"
  required
  value={formData.email}
  onChange={handleChange}
  className="w-full bg-[#140f0a] border border-[#3d3020] rounded-lg px-4 py-2.5 text-sm text-[#f5ece0] focus:outline-none focus:border-[#e0b354] focus:ring-1 focus:ring-[#e0b354]/30 transition-all"
/>
```
* **Lỗi thiết kế form:** Thẻ input chỉ khai báo `type="email"`.
* Theo đặc tả HTML5 chuẩn, trình duyệt (Chrome/Edge/Firefox) kiểm tra `type="email"` bằng biểu thức chính quy cơ bản: chỉ cần có `@` và có ký tự phía sau (coi `xyz` là một local hostname trong mạng nội bộ) là coi như hợp lệ.
* Form chưa có thuộc tính `pattern` để bắt buộc có dấu chấm và đuôi miền (`.com`, `.vn`,...).

##### B. Phía Backend (`backend/src/main/java/com/example/cinema/auth/dto/request/RegisterRequest.java` - Dòng 10–13):
```java
@NotBlank(message = "Email must not be blank")
@Email(message = "Invalid email format")
@Size(max = 150, message = "Email must not exceed 150 characters")
String email,
```
* **Lỗi validation:** Annotation `@Email` mặc định của thư viện Jakarta Validation / Hibernate Validator tuân thủ chuẩn RFC 822 / RFC 5322. Chuẩn này cho phép email dạng `user@localhost` hoặc `user@internal_host` (không bắt buộc dấu chấm ở domain).
* Vì không có tham số `regexp` chỉ định rõ cấu trúc tên miền, chuỗi `abc@xyz` vượt qua toàn bộ các bộ lọc của Spring Boot `@Valid`.

---

#### 3. GIẢI PHÁP ĐỀ XUẤT (SOLUTIONS TO FIX)

Khi được phép can thiệp mã nguồn, sẽ tiến hành vá đồng thời ở cả 2 phía:

##### Bước 1: Vá Backend (Chốt chặn bảo mật chính)
Cập nhật `RegisterRequest.java`: Bổ sung `@Pattern` chuẩn RFC mở rộng cho địa chỉ email Internet:
```java
@NotBlank(message = "Email must not be blank")
@Email(message = "Invalid email format")
@Pattern(
    regexp = "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$",
    message = "Email must be a valid email address with a domain extension (e.g. user@domain.com)"
)
@Size(max = 150, message = "Email must not exceed 150 characters")
String email,
```

##### Bước 2: Vá Frontend (Phản hồi tức thì cho người dùng)
Cập nhật thẻ input email trong `frontend/src/pages/Register.jsx`:
```jsx
<input
  id="email"
  type="email"
  name="email"
  required
  pattern="^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
  title="Please enter a valid email address with domain extension (e.g., name@domain.com)"
  value={formData.email}
  onChange={handleChange}
  ...
/>
```

---

### 💡 VẤN ĐỀ #2: TỐI ƯU GIAO DIỆN PHIM SẮP CHIẾU (`COMING_SOON`) & CƠ CHẾ VÉ ĐẶT TRƯỚC (`PRE-SALE`)

> **Mã theo dõi:** `FEAT-UX-COMING-SOON-PRE-SALE-02`  
> **Module bị ảnh hưởng:** Module 1.2 (Case 1.2.1: Xem chi tiết phim & Lịch chiếu - `MovieDetail.jsx`)  
> **Mức độ:** Cải thiện trải nghiệm người dùng & Nghiệp vụ rạp (UX Optimization & Business Logic Alignment)  
> **Trạng thái:** Chờ xử lý (`PENDING`) - **Chưa can thiệp mã nguồn theo yêu cầu của User**

---

#### 1. MÔ TẢ VẤN ĐỀ & PHÂN TÍCH THỰC TRẠNG (SYMPTOMS & UX GAP)
* **Thực trạng quan sát:**
  * Người dùng vào mục **`Coming Soon`** (Phim sắp chiếu) ở trang chủ và bấm vào một bộ phim (ví dụ: *Avatar Aang* hoặc *Toy Story 5*).
  * Tại trang chi tiết phim (`/movies/:id`), hệ thống vẫn vẽ ra toàn bộ khu vực chọn lịch chiếu gồm:
    1. Thanh chọn **7 ngày trong tuần** (`Today`, `Tomorrow`, `Mon`, `Tue`...).
    2. Bộ lọc rạp chiếu (`All Cinema Locations`).
  * Khi người dùng click thử vào bất kỳ ngày nào trong 7 ngày, màn hình đều hiển thị thông báo:  
    `No showtimes scheduled for this date. Please pick another date above or select a different cinema location.`
* **Tác động tiêu cực đến trải nghiệm (UX Pain Points):**
  * **Gây hiểu lầm cho khách hàng:** Người dùng tưởng rằng phim này đang mở bán vé nhưng hệ thống bị lỗi dữ liệu nên không load được suất chiếu.
  * **Thực tế nghiệp vụ:** Phim `COMING_SOON` là phim **chưa đến ngày khởi chiếu chính thức** (`releaseDate`). Nếu rạp chưa mở bán vé sớm (Pre-Sale), việc hiển thị 7 ngày rỗng là không cần thiết và tạo cảm giác trống trải, thiếu hoàn thiện.

---

#### 2. GIẢI PHÁP ĐỀ XUẤT CHO 2 NHÓM PHIM `COMING_SOON` (OPTIMIZATION DESIGN)

Hệ thống sẽ tự động phân loại và xử lý theo 2 trường hợp cụ thể:

##### 🟢 TRƯỜNG HỢP 1: Phim `COMING_SOON` thông thường (Chưa có lịch chiếu / Chưa mở bán)
* **Điều kiện nhận diện:** `movie.status === 'COMING_SOON' && showtimes.length === 0`.
* **Cách xử lý giao diện (User Request):**
  1. **Ẩn hoàn toàn thanh chọn 7 ngày** và dropdown chọn rạp (không hiển thị các tab ngày bị rỗng).
  2. **Thay thế bằng một khung thông tin công chiếu nổi bật (Premiere Teaser Banner):**
     * 🎬 **Biểu tượng:** Icon lịch chiếu / Đồng hồ đếm ngược.
     * **Tiêu đề nổi bật:** `🎬 KHỞI CHIẾU CHÍNH THỨC: [DD/MM/YYYY]` (hiển thị rõ ngày phát hành từ trường `movie.releaseDate`).
     * **Thông điệp hướng dẫn:**  
       *"Bộ phim hiện chưa mở bán vé. Lịch chiếu và đặt chỗ sẽ được mở bán chính thức trước ngày công chiếu từ 3 - 5 ngày."*
     * **Nút hành động nhanh (CTA):**
       * Nút **`▶ Xem Official Trailer`** (kích hoạt mở modal video YouTube).
       * Nút **`🔔 Nhận thông báo khi mở bán vé`** (Remind Me).

---

##### 🔥 TRƯỜNG HỢP 2: Phim `COMING_SOON` nhưng CÓ MỞ BÁN VÉ SỚM (Pre-Sale / Advance Ticket Sales)
* **Khái niệm:** Phim chưa tới ngày ra mắt, nhưng rạp đã mở bán vé trước cho các suất chiếu đặc biệt (ví dụ: Suất chiếu sớm *Sneak Show* hoặc vé công chiếu ngày đầu tiên).
* **Điều kiện nhận diện:** `movie.status === 'COMING_SOON' && showtimes.length > 0`.

#### ⭐ 3 GỢI Ý TỐI ƯU ĐẶC BIỆT DÀNH CHO PHIM BÁN VÉ ĐẶT TRƯỚC (PRE-SALE):

1. **Gợi ý 1: Gắn Huy hiệu nổi bật (Pre-Sale Badge trên Poster & Header)**
   * Trên Poster tại Trang chủ và Trang chi tiết: Gắn huy hiệu màu cam/đỏ rực rỡ:  
     `🔥 VÉ ĐẶT TRƯỚC (PRE-SALE)` hoặc `⭐ SUẤT CHIẾU SỚM (SNEAK SHOW)`.
   * Khách hàng lướt qua là biết ngay phim này **ĐÃ CÓ THỂ MUA VÉ ĐƯỢC NGAY** dù chưa tới ngày công chiếu.

2. **Gợi ý 2: Thanh lọc ngày động thông minh (Dynamic Pre-Sale Date Filter - Loại bỏ 100% ngày rỗng)**
   * **Tuyệt đối không hiện 7 ngày cố định** (vì các ngày đầu tuần sẽ bị trống, chỉ có ngày cuối tuần mới có vé).
   * Thanh chọn ngày sẽ **tự động chỉ hiển thị đúng các ngày thực tế CÓ SUẤT CHIẾU BÁN TRƯỚC**!
   * *Ví dụ thực tế:* Phim công chiếu vào thứ Bảy (14/11) và Chủ Nhật (15/11). Thanh ngày sẽ chỉ hiện đúng 2 tab:  
     `[Thứ Bảy, 14/11]` và `[Chủ Nhật, 15/11]`.
   * 👉 **Ưu điểm vượt trội:** Người dùng bấm vào bất kỳ tab ngày nào cũng **100% có suất chiếu để đặt chỗ**, triệt tiêu hoàn toàn trải nghiệm bấm vào ngày bị rỗng!

3. **Gợi ý 3: Khung kêu gọi hành động đặt chỗ sớm (CTA Pre-Sale Banner)**
   * Đặt ngay phía trên danh sách suất chiếu:  
     `🎟️ MỞ BÁN VÉ SỚM: Hãy là những khán giả đầu tiên thưởng thức siêu phẩm! Đặt vé ngay các suất chiếu dưới đây để giữ vị trí ghế VIP tốt nhất trước ngày công chiếu.`


---

#### 3. LOGIC XỬ LÝ TRONG CODE (KHI ĐƯỢC PHÉP TRIỂN KHAI)
Tại `frontend/src/pages/MovieDetail.jsx`:
```jsx
const isComingSoon = movie.status === 'COMING_SOON';
const hasPreSaleShowtimes = showtimes && showtimes.length > 0;

if (isComingSoon && !hasPreSaleShowtimes) {
  // Render Premiere Teaser Banner (Ẩn thanh 7 ngày, hiển thị ngày khởi chiếu rõ ràng)
  return <ComingSoonTeaserCard movie={movie} onWatchTrailer={() => setTrailerOpen(true)} />;
}

if (isComingSoon && hasPreSaleShowtimes) {
  // Render Pre-Sale Flow: Chỉ hiển thị các tab ngày có suất chiếu bán trước
  return <PreSaleShowtimeSection movie={movie} showtimes={showtimes} />;
}

// Mặc định (NOW_SHOWING): Render thanh 7 ngày như hiện tại
```

---

### 🐛 LỖI #3: THÔNG BÁO CẢNH BÁO GHẾ LẺ BỊ NHÂN ĐÔI (DUPLICATE TOAST) KHI CHỌN 1 GHẾ

> **Mã lỗi:** `BUG-SEAT-TOAST-DUPLICATE-03`  
> **Module bị ảnh hưởng:** Module 1.4 (Case 1.4.2: Sơ đồ ghế & Cảnh báo luật ghế lẻ - `SeatSelection.jsx`)  
> **Mức độ:** Low (Lỗi hiển thị giao diện / UI Glitch in React StrictMode)  
> **Trạng thái:** Chờ xử lý (`PENDING`) - **Chưa can thiệp mã nguồn theo yêu cầu của User**

---

#### 1. MÔ TẢ HIỆN TƯỢNG (SYMPTOMS)
* **Vị trí xảy ra:** Màn hình chọn ghế (`/booking/seat-selection/:showtimeId`).
* **Các bước tái hiện:**
  1. Vào màn hình chọn ghế của một suất chiếu bất kỳ (ví dụ: phim *Obsession*, phòng *IMAX Hall 2149*).
  2. Bấm chọn một ghế đơn lẻ tạo ra vi phạm luật ghế lẻ (ví dụ: bấm chọn ghế `D7`, bỏ trống ghế `D8` ở cuối hàng).
* **Hiện tượng quan sát được:**
  * Ở góc dưới cùng bên phải màn hình, đồng thời xuất hiện **2 thông báo toast màu nâu/cam xếp chồng lên nhau**:
    1. `⚠️ Cannot leave a single empty seat (orphan seat). Please select adjacent seats.`
    2. `⚠️ Cannot leave a single empty seat (orphan seat). Please select adjacent seats.`
  * Cả 2 toast đều có nút đóng `✕` và hiển thị đúp cùng một nội dung tại cùng một tích tắc.

---

#### 2. NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE)

##### A. Vi phạm quy tắc hàm thuần khiết (Side-Effect in State Updater):
Trong file [`frontend/src/pages/SeatSelection.jsx`](file:///d:/movie-theater-booking-system/frontend/src/pages/SeatSelection.jsx) (Dòng 267–274):
```javascript
setSelectedSeatIds((prev) => {
  let nextSelected;
  ...
  // ❌ LỖI: Gọi hàm gây tác dụng phụ (Side-Effect) bên trong hàm cập nhật State
  if (causesOrphanSeat(seats, nextSelected)) {
    const warningMsg = 'Cannot leave a single empty seat (orphan seat). Please select adjacent seats.';
    setSelectionNotice(warningMsg);
    showToast(warningMsg, 'warning'); // <- Gây ra gọi 2 lần
  }

  return nextSelected;
});
```

##### B. Cơ chế kích hoạt kép của `<React.StrictMode>`:
* Trong môi trường phát triển (Development Mode), React bọc ứng dụng trong `<React.StrictMode>`.
* React StrictMode sẽ **cố tình thực thi hàm updater `(prev) => { ... }` 2 lần liên tiếp** nhằm mục đích giúp lập trình viên phát hiện các hàm có chứa Side-Effect (tác vụ không thuần khiết).
* Vì `showToast(...)` và `setSelectionNotice(...)` bị đặt nằm bên trong `setSelectedSeatIds((prev) => ...)`, hàm `showToast` bị gọi 2 lần chỉ trong 1 lần click chuột, tạo ra 2 bản ghi toast trùng lặp trong Context State.

---

#### 3. GIẢI PHÁP ĐỀ XUẤT (SOLUTIONS TO FIX)

Khi được phép can thiệp code:
1. **Tách việc tính toán ghế mới và việc bắn Toast ra khỏi hàm State Updater:**
   * Tính toán trước mảng `nextSelected` bên ngoài `setSelectedSeatIds`.
   * Kiểm tra điều kiện `causesOrphanSeat(seats, nextSelected)` ở phạm vi hàm xử lý sự kiện `handleSeatClick`.
   * Chỉ gọi `showToast` đúng **1 lần duy nhất** trước hoặc sau khi cập nhật state:
   ```javascript
   const handleSeatClick = (seat) => {
     // 1. Tính toán nextSelected trước
     const nextSelected = calculateNextSelectedSeats(selectedSeatIds, seat, partner);
     
     // 2. Cập nhật state thuần khiết
     setSelectedSeatIds(nextSelected);

     // 3. Bắn Toast bên ngoài updater (đảm bảo chỉ gọi đúng 1 lần)
     if (causesOrphanSeat(seats, nextSelected)) {
       const warningMsg = 'Cannot leave a single empty seat (orphan seat). Please select adjacent seats.';
       setSelectionNotice(warningMsg);
       showToast(warningMsg, 'warning');
     }
   };
   ```
2. **Bổ sung cơ chế Deduplication trong `ToastContext.jsx`:**
   * Trong `ToastContext.jsx`, có thể thêm cơ chế debounce / deduplicate: Nếu một toast có cùng `message` được gọi trong vòng 300ms thì tự động bỏ qua để tránh mọi trường hợp bắn trùng lặp từ React render.

---

### 🐛 LỖI #4: HÀNG GHẾ ĐÔI (COUPLE) BỊ MỜ TỐI / KHÓA CHẶN ĐẶT VÉ DO `pair_group` BỊ GÁN `NULL`

> **Mã lỗi:** `BUG-SEAT-ROW-E-COUPLE-NULL-04`  
> **Module bị ảnh hưởng:** Module 1.4 (Case 1.4.1 & Case 1.4.4: Sơ đồ ghế & Quy tắc Ghế đôi - `SeatSelection.jsx`, `ShowtimeMapper.java`, `V2__seed_movies_data.sql`)  
> **Mức độ:** High (Dữ liệu Seed & Tính năng Ghế đôi chưa hoàn thiện)  
> **Trạng thái:** Chờ xử lý (`PENDING`) - **Chưa can thiệp mã nguồn theo yêu cầu của User**

---

#### 1. MÔ TẢ HIỆN TƯỢNG (SYMPTOMS)
* **Vị trí xảy ra:** Màn hình sơ đồ chọn ghế (`/booking/seat-selection/:showtimeId`) ở tất cả các suất chiếu và phòng chiếu.
* **Hiện tượng quan sát được:**
  * Toàn bộ hàng ghế E (từ E1 đến E5 ở các phòng nhỏ, hoặc E1 đến E8 ở phòng IMAX) đều hiển thị ở trạng thái mờ tối (opacity 30%), có gạch ngang gạch chéo (`line-through`).
  * Con trỏ chuột chuyển thành hình cấm chọn (`cursor-not-allowed`), tooltip hiển thị: `Maintenance / Inactive`.
  * Ở thanh chú thích (Legend) đáy màn hình vẫn hiển thị giá: `Couple (320,000 VND/pair)` hoặc `Couple (520,000 VND/pair)`, nhưng khách hàng hoàn toàn không thể chọn bất kỳ ghế đôi nào để đặt vé.

---

#### 2. NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE)

##### A. Dữ liệu trong Database (`cinema_booking_db` -> bảng `seats`):
Khi truy vấn trực tiếp bảng `seats`:
```sql
SELECT id, room_id, row_name, seat_number, type, pair_group, is_active 
FROM seats 
WHERE row_name = 'E';
```
* **Kết quả:**
  * Tất cả các ghế hàng E đều có `type = 'COUPLE'` và `is_active = 1`.
  * **NHƯNG cột `pair_group` bị bỏ quên và mang giá trị `NULL`!**
  * Đặc biệt ở các phòng Review Room (Room 2 đến 7), hàng E chỉ có **5 ghế** (`E1` đến `E5`). Số 5 là số lẻ, không thể chia đều thành các cặp 2 ghế được.

##### B. Cơ chế bảo vệ D-07 trong Backend & Frontend:
* **Tại Backend ([`ShowtimeMapper.java:81–84`](file:///d:/movie-theater-booking-system/backend/src/main/java/com/example/cinema/showtime/mapper/ShowtimeMapper.java#L81-L84)):**
  ```java
  // Quyết định D-07: Nếu là ghế COUPLE mà pairGroup bị null hoặc <= 0 => Đánh dấu là ghế đôi không có cặp
  boolean isCoupleWithoutPair = showtimeSeat.getSeat() != null
          && showtimeSeat.getSeat().getType() == SeatType.COUPLE
          && (showtimeSeat.getSeat().getPairGroup() == null || showtimeSeat.getSeat().getPairGroup() <= 0);

  // Khi isCoupleWithoutPair == true => Backend trả về selectable = false
  boolean selectable = isSeatActive && effectiveStatus == ShowtimeSeatStatus.AVAILABLE && !isCoupleWithoutPair;
  ```
* **Tại Frontend ([`SeatSelection.jsx:570`](file:///d:/movie-theater-booking-system/frontend/src/pages/SeatSelection.jsx#L570)):**
  * Nhận được `selectable = false` -> Frontend gán style: `cursor-not-allowed opacity-30 line-through`.
  * Đồng thời, hệ thống chưa có cơ chế ẩn đi cả hàng ghế nếu phòng đó không có ghế nào active, dẫn tới việc vẽ nguyên hàng E mờ xám gạch ngang.

---

#### 3. HƯỚNG DẪN CHI TIẾT CÁC BƯỚC ĐỂ SỬA (STEP-BY-STEP FIX INSTRUCTIONS)

Khi User ra lệnh sửa code, sẽ thực hiện đồng thời 3 bước sau:

##### Bước 1: Cập nhật Database & File Seed (`V2__seed_movies_data.sql`)
1. **Đối với Phòng chiếu IMAX Hall 2149 (Room ID 1, có 8 ghế hàng E):**
   * Ghép 2 ghế liền kề thành 1 cặp đôi:
     * Ghế `E1, E2` -> `pair_group = 1`
     * Ghế `E3, E4` -> `pair_group = 2`
     * Ghế `E5, E6` -> `pair_group = 3`
     * Ghế `E7, E8` -> `pair_group = 4`
   * Câu lệnh SQL sửa nhanh:
     ```sql
     UPDATE seats SET pair_group = 1 WHERE room_id = 1 AND row_name = 'E' AND seat_number IN (1, 2);
     UPDATE seats SET pair_group = 2 WHERE room_id = 1 AND row_name = 'E' AND seat_number IN (3, 4);
     UPDATE seats SET pair_group = 3 WHERE room_id = 1 AND row_name = 'E' AND seat_number IN (5, 6);
     UPDATE seats SET pair_group = 4 WHERE room_id = 1 AND row_name = 'E' AND seat_number IN (7, 8);
     ```

2. **Đối với các phòng nhỏ Review Room (Room ID 2 đến 7, đang có 5 ghế lẻ hàng E):**
   * Ghép `E1, E2` thành Cặp 1 (`pair_group = 1`), `E3, E4` thành Cặp 2 (`pair_group = 2`).
   * Riêng ghế `E5` (ghế lẻ), chuyển loại ghế thành `VIP` hoặc `NORMAL` (hoặc chèn thêm ghế `E6` để đủ 3 cặp đôi).
   * Câu lệnh SQL sửa nhanh:
     ```sql
     UPDATE seats SET pair_group = 1 WHERE room_id IN (2,3,4,5,6,7) AND row_name = 'E' AND seat_number IN (1, 2);
     UPDATE seats SET pair_group = 2 WHERE room_id IN (2,3,4,5,6,7) AND row_name = 'E' AND seat_number IN (3, 4);
     UPDATE seats SET type = 'VIP', pair_group = NULL WHERE room_id IN (2,3,4,5,6,7) AND row_name = 'E' AND seat_number = 5;
     ```

##### Bước 2: Tối ưu hiển thị Sơ đồ ghế trên Frontend (`SeatSelection.jsx`)
* Nếu một phòng chiếu thực sự **không có ghế nào hoạt động ở hàng E** (hoặc hàng ghế bị tắt):
  * **Ẩn hoàn toàn hàng E** khỏi sơ đồ, không vẽ ra hàng ghế mờ xám.
  * Trên thanh Chú thích (Legend) ở đáy màn hình: Nếu suất chiếu của phòng đó không chứa bất kỳ ghế `COUPLE` nào, **tự động ẩn mục `Couple (...)`**, đảm bảo tính nhất quán giữa chú thích và sơ đồ thực tế.

---

### 🐛 LỖI #5: GIÁ GHẾ ĐÔI COUPLE BỊ NHÂN ĐÔI 2 LẦN (HIỂN THỊ VÀ TÍNH TIỀN THÀNH 320.000Đ/CẶP THAY VÌ 160.000Đ/CẶP Ở PHÒNG 80K)

> **Mã lỗi:** `BUG-SEAT-COUPLE-PRICE-DOUBLE-MULTIPLICATION-05`  
> **Module bị ảnh hưởng:** Module 1.4 (Seat Selection & Dynamic Pricing - `V2__seed_movies_data.sql`, `priceTags.js`, `SeatSelection.jsx`)  
> **Mức độ:** High (Lỗi tính toán giá vé và doanh thu / Pricing Calculation Bug)  
> **Trạng thái:** Chờ xử lý (`PENDING`) - **Chưa can thiệp mã nguồn theo yêu cầu của User**

---

#### 1. MÔ TẢ HIỆN TƯỢNG (SYMPTOMS)
* **Vị trí xảy ra:** Màn hình Chọn ghế (`/booking/seats/:showtimeId`) tại thanh Chú thích loại ghế (Legend) và phần tính Tổng tiền (Booking Summary).
* **Các bước tái hiện:**
  1. Vào phim bất kỳ ở phòng chiếu 2D thường (ví dụ Room 2, có giá cơ sở `base_price = 80.000 VND`).
  2. Quan sát thanh Chú thích (Legend) dưới sơ đồ ghế:
     * Regular: `80,000 VND`
     * VIP: `100,000 VND` (+20k VIP)
     * **Couple: `320,000 VND/pair`** *(Bất thường: Lẽ ra 1 cặp đôi gồm 2 ghế thì giá là $80.000 \times 2 = 160.000\text{ VND}$, nhưng lại hiển thị vọt lên $320.000\text{ VND/pair}$!)*
  3. Ở phòng chiếu IMAX (Room 1, giá cơ sở `base_price = 130.000 VND`):
     * Regular: `130,000 VND`
     * VIP: `150,000 VND`
     * **Couple: `520,000 VND/pair`** *(Lẽ ra $130.000 \times 2 = 260.000\text{ VND}$, nhưng lại hiển thị $520.000\text{ VND/pair}$ gấp đôi tiếp!)*
* **Kết quả thực tế:**
  * Giá cặp ghế đôi bị nhân đôi 2 lần (thành 4 lần giá cơ sở).
* **Kỳ vọng chuẩn nghiệp vụ:**
  * Với phòng có giá vé chuẩn 80.000đ: Một cặp ghế đôi (2 chỗ ngồi) phải có giá trọn gói là **160.000đ/cặp** (80.000đ x 2) hoặc nếu có phụ thu ghế đôi (theo `coupleSurcharge` 10k/ghế) thì tối đa là **180.000đ/cặp** (90.000đ x 2).
  * Chú thích phải hiển thị: `Couple (160,000 VND/pair)`.
  * Khi chọn cặp ghế đôi, tổng tiền vé cho 2 ghế phải là 160.000đ, không phải 320.000đ.

---

#### 2. NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE)
Hiện tượng này xảy ra do **sự xung đột cách hiểu và nhân đôi 2 lần giữa SQL Seed Script và Frontend Javascript**:

1. **Lần nhân đôi thứ nhất (Tại Database Seed - `V2__seed_movies_data.sql` dòng 12968):**
   ```sql
   INSERT IGNORE INTO showtime_seats (showtime_id, seat_id, price, status, held_by_booking_id, updated_at)
   SELECT 
       st.id, s.id, 
       CASE 
           WHEN s.type = 'VIP' THEN st.base_price + 20000 
           WHEN s.type = 'COUPLE' THEN st.base_price * 2 
           ELSE st.base_price 
       END, 
       'AVAILABLE', NULL, CURRENT_TIMESTAMP 
   FROM showtimes st JOIN seats s ON s.room_id = st.room_id;
   ```
   * Tác giả script seed nghĩ rằng "ghế couple bán theo cặp nên giá là `base_price * 2 = 160.000đ`".
   * Nhưng trong DB, mỗi bản ghi của bảng `showtime_seats` lại là **1 ghế vật lý đơn lẻ** (ghế `E1` là 1 record, `E2` là 1 record).
   * Dẫn đến: Ghế `E1` được gán giá = `160.000đ`, và ghế `E2` cũng được gán giá = `160.000đ`!
   * Khi khách đặt cặp E1 + E2, hệ thống cộng tổng `160k + 160k = 320.000đ`!

2. **Lần nhân đôi thứ hai (Tại Frontend Utility - `frontend/src/utils/priceTags.js` dòng 45-46):**
   ```javascript
   const couplePerSeat = showtime?.seatTypePrices?.COUPLE ?? coupleSeat?.price ?? normal;
   const couplePair = couplePerSeat * 2;
   ```
   * Frontend lấy `coupleSeat?.price` từ API (đang mang giá trị `160.000đ` từ DB ở trên).
   * Frontend coi `couplePerSeat` là giá của 1 ghế đơn lẻ (`160.000đ`), rồi lấy `couplePair = couplePerSeat * 2` để vẽ chuỗi `"Couple (320,000 VND/pair)"`!
   * **Kết quả:** $80.000 \times 2 \times 2 = 320.000\text{ VND}$!

---

#### 3. GIẢI PHÁP KHẮC PHỤC KỸ THUẬT (PROPOSED FIX)

##### Bước 1: Chuẩn hóa lại giá ghế COUPLE trong Database Seed & Bảng `showtime_seats`
* Mỗi ghế thuộc cặp COUPLE phải lưu giá của **1 chỗ ngồi đơn lẻ** (bằng giá cơ sở `base_price`, hoặc `base_price + coupleSurcharge`):
  ```sql
  -- Sửa lại logic trong migration hoặc cập nhật DB hiện tại:
  UPDATE showtime_seats ss
  JOIN seats s ON ss.seat_id = s.id
  JOIN showtimes st ON ss.showtime_id = st.id
  SET ss.price = st.base_price
  WHERE s.type = 'COUPLE';
  ```
  *(Khi đó, E1 = 80.000đ, E2 = 80.000đ).*

##### Bước 2: Đảm bảo tính toán hiển thị Legend trên Frontend
* Trong `priceTags.js`:
  * `couplePerSeat` = `80.000đ`
  * `couplePair` = `couplePerSeat * 2` = `160.000đ` $\rightarrow$ Legend hiển thị chuẩn: `Couple (160,000 VND/pair)`.
* Khi người dùng chọn cặp ghế đôi (gồm 2 ID ghế E1 và E2):
  * `subtotal` = $80.000đ + 80.000đ = 160.000đ$ $\rightarrow$ Chính xác 100%!

---

### 💡 CẢI TIẾN UX #6: XÓA LIÊN KẾT TRÙNG LẶP "MY BOOKINGS" TRÊN THANH MENU ĐIỀU HƯỚNG CLIENT (CHỈ GIỮ LẠI NÚT "MY TICKETS")

> **Mã cải tiến/lỗi:** `FEAT-UX-NAVBAR-DUPLICATE-MY-BOOKINGS-06`  
> **Module bị ảnh hưởng:** Client Header Navigation (`frontend/src/components/Navbar.jsx`)  
> **Mức độ:** Low (Tối ưu trải nghiệm giao diện / UI Redundancy)  
> **Trạng thái:** Chờ xử lý (`PENDING`) - **Chưa can thiệp mã nguồn theo yêu cầu của User**

---

#### 1. MÔ TẢ HIỆN TƯỢNG (SYMPTOMS)
* **Vị trí xảy ra:** Thanh điều hướng chính (Navbar) ở đầu trang client.
* **Các bước tái hiện:**
  1. Đăng nhập tài khoản khách hàng hoặc admin.
  2. Quan sát thanh menu Header:
     * Ở cụm liên kết chính giữa (Desktop Nav Links): Xuất hiện thêm mục text link **`My Bookings`** (bên cạnh Movies, Showtimes, Vouchers).
     * Ở cụm thao tác tài khoản bên phải (User Action Cluster): Xuất hiện nút bấm màu nâu sang trọng có biểu tượng vé **`🎟️ My Tickets`**.
  3. Bấm vào cả 2 mục trên: Cả 2 đều chuyển hướng đến cùng một trang giao diện danh sách vé và lịch sử đặt chỗ (`/my-bookings`).
* **Kết quả thực tế:**
  * Giao diện bị trùng lặp liên kết đến cùng một chức năng, chiếm không gian trên thanh menu ngang và gây bối rối cho người dùng ("My Bookings" và "My Tickets" có gì khác nhau?).
* **Kỳ vọng chuẩn theo yêu cầu của Tester:**
  * **Xóa bỏ hoàn toàn** liên kết `My Bookings` ở cụm menu điều hướng chính giữa (`Navbar.jsx` dòng 158-165).
  * **Giữ nguyên và đồng nhất** việc truy cập lịch sử vé thông qua nút bấm **`🎟️ My Tickets`** ở cụm bên phải (hoặc trong menu mobile).

---

#### 2. NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE)
* Trong `Navbar.jsx`:
  * Đoạn code dòng 158–165 kiểm tra điều kiện `{token && <Link to="/my-bookings">My Bookings</Link>}` chèn thêm 1 liên kết vào thanh menu chung.
  * Đồng thời, cụm bên phải (dòng 284–290) cũng đã có sẵn nút riêng biệt:
    ```jsx
    <Link to="/my-bookings" className="..."><Ticket className="..." /><span>My Tickets</span></Link>
    ```
  * Cả hai cùng điều hướng về Route `/my-bookings` do `MyBookings.jsx` phục vụ.

---

#### 3. GIẢI PHÁP TRIỂN KHAI KHI SỬA CODE (PROPOSED FIX)
1. **Trong `frontend/src/components/Navbar.jsx`:**
   * Xóa bỏ khối `{token && (<Link to="/my-bookings">My Bookings</Link>)}` tại dòng 158–165.
   * Tại mobile drawer menu (dòng 403), tinh chỉnh nhãn `My Bookings & Tickets` thành `My Tickets` để đồng nhất ngôn ngữ thiết kế toàn hệ thống.

---

### 🧩 TÍNH NĂNG CHỜ BỔ SUNG #7: GIAO DIỆN QUẢN LÝ THỂ LOẠI (GENRE MANAGEMENT UI TAB) TRÊN ADMIN DASHBOARD

> **Mã tính năng/yêu cầu:** `FEAT-ADMIN-GENRE-MANAGEMENT-UI-07`  
> **Module bị ảnh hưởng:** Quản trị viên (Admin Portal - `frontend/src/pages/AdminDashboard.jsx`, `frontend/src/api/genreApi.js`)  
> **Mức độ:** Medium (Thiếu giao diện Frontend cho nghiệp vụ Backend đã hoàn thiện / Missing Admin Feature UI)  
> **Trạng thái:** Chờ xử lý (`PENDING`) - **Chưa can thiệp mã nguồn theo yêu cầu của User**

---

#### 1. MÔ TẢ HIỆN TƯỢNG (SYMPTOMS)
* **Vị trí xảy ra:** Màn hình Quản trị viên `Admin Operations Console` (`http://localhost:5173/admin`).
* **Các bước tái hiện:**
  1. Đăng nhập Admin với tài khoản `admin@cinema.com` / `admin123`.
  2. Bấm vào nút `🛡️ Admin Console` trên thanh Header để vào trang quản trị.
  3. Quan sát thanh chọn Tab chức năng của Admin:
     * Hiện tại chỉ có 6 tabs:
       1. 📊 *Revenue Reports*
       2. 📅 *Showtime Scheduling*
       3. 💳 *Payments & Refunds*
       4. 🎬 *Movie Catalog*
       5. 🎟️ *Promotional Vouchers*
       6. ⭐ *Review Moderation*
     * **Hoàn toàn không có tab Thể loại (Genre Management)** để Admin có thể xem danh sách, thêm thể loại mới, đổi tên hoặc xóa thể loại trực tiếp trên màn hình.
* **Kết quả thực tế:**
  * Tester phải dùng lệnh cURL hoặc Postman/Swagger để kiểm tra nghiệp vụ Quản lý Thể loại (Mục 2.2 trong Kịch bản kiểm thử).
* **Kỳ vọng chuẩn theo yêu cầu của Tester:**
  * Bổ sung thêm tab thứ 7: **`🏷️ Genres` (Quản lý Thể loại)** vào thanh điều hướng Admin Dashboard.
  * Cho phép Admin thực hiện đầy đủ các thao tác Thêm, Sửa, Xóa thể loại ngay trên giao diện web.

---

#### 2. NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE)
* **Phía Backend (`GenreController.java` & `GenreService.java`):**
  * Đã được lập trình hoàn thiện 100% với đầy đủ các RESTful APIs chuẩn:
    * `GET /api/v1/genres` (Lấy danh sách thể loại đang hoạt động)
    * `GET /api/v1/genres/{id}` (Lấy chi tiết thể loại)
    * `POST /api/v1/genres` (Tạo mới thể loại, tự động khôi phục nếu tên trùng với bản ghi đã soft-deleted)
    * `PUT /api/v1/genres/{id}` (Đổi tên thể loại, kiểm tra chống trùng tên)
    * `DELETE /api/v1/genres/{id}` (Xóa mềm `isActive = false`, có kiểm tra ràng buộc chống xóa nếu thể loại đang được gán cho phim qua mã lỗi `1205: GENRE_IN_USE`)
* **Phía Frontend (`AdminDashboard.jsx`):**
  * Chưa khai báo State `genres` và hàm `fetchGenres()`.
  * Chưa có file API client `genreApi.js`.
  * Chưa có nút chuyển tab `GENRES` và khối giao diện bảng danh sách / modal nhập liệu thể loại.

---

#### 3. GIẢI PHÁP TRIỂN KHAI KHI SỬA CODE (PROPOSED IMPLEMENTATION)

##### Bước 1: Tạo file API Service Frontend (`frontend/src/api/genreApi.js`)
```javascript
import axiosClient from './axiosClient';

export const genreApi = {
  getAll: () => axiosClient.get('/genres'),
  getById: (id) => axiosClient.get(`/genres/${id}`),
  create: (data) => axiosClient.post('/genres', data),
  update: (id, data) => axiosClient.put(`/genres/${id}`, data),
  delete: (id) => axiosClient.delete(`/genres/${id}`),
};
```

##### Bước 2: Bổ sung Tab `GENRES` vào `AdminDashboard.jsx`
* Thêm nút Tab:
  ```jsx
  <button onClick={() => setActiveTab('GENRES')} className={...}>
    <Tag className="w-3.5 h-3.5" />
    <span>Movie Genres</span>
  </button>
  ```
* Thiết kế bảng danh sách Thể loại:
  * Cột: ID, Tên thể loại (Genre Name), Trạng thái (Active/Inactive), Thao tác (Chỉnh sửa tên, Xóa).
  * Nút CTA: **"+ Add New Genre"** mở Modal nhập tên thể loại.
  * Xử lý lỗi thông minh: Khi xóa thể loại đang có phim, bắt mã lỗi `1205` từ Backend và hiển thị Toast đỏ: *"Cannot delete genre because it is currently linked to one or more movies."*
  * Hỗ trợ sửa tên thể loại (`Edit Modal`) với kiểm tra trùng lặp.

---

### 🐛 LỖI #8: MODAL THÊM PHIM MỚI TRÊN ADMIN DASHBOARD THIẾU Ô NHẬP TRAILER URL (DẪN ĐẾN PHIM TẠO XONG KHÔNG CÓ NÚT XEM TRAILER TRÊN CLIENT)

> **Mã lỗi:** `BUG-ADMIN-MOVIE-MODAL-MISSING-TRAILER-INPUT-08`  
> **Module bị ảnh hưởng:** Quản lý phim Admin (`AdminDashboard.jsx` dòng 1830–1950) & Chi tiết phim Client (`MovieDetail.jsx` dòng 286, 379)  
> **Mức độ:** High (Thiếu trường dữ liệu đầu vào / Gãy chuỗi tính năng Trailer & Chặn kiểm thử Case 2.3.1, 2.3.2)  
> **Trạng thái:** Chờ xử lý (`PENDING`) - **Chưa can thiệp mã nguồn theo yêu cầu của User**

---

#### 1. MÔ TẢ HIỆN TƯỢNG (SYMPTOMS)
* **Vị trí xảy ra:** Modal *"Publish New Title to Catalog"* trong Tab `Movie Catalog` của trang Quản trị viên (`http://localhost:5173/admin`).
* **Các bước tái hiện:**
  1. Đăng nhập Admin, vào tab **`Movie Catalog`**.
  2. Bấm nút **`+ Publish Movie`** để mở modal thêm phim mới.
  3. Quan sát các ô nhập liệu trong modal:
     * Có: *Title, Director, Duration (mins), Age Rating, Status, Poster Image URL, Synopsis*.
     * **Hoàn toàn KHÔNG CÓ ô nhập `Trailer URL`**!
  4. Vì không có ô nhập Trailer URL, tester muốn kiểm thử Case 2.3.2 (chặn link độc hại XSS/Phishing) đã nhập đường dẫn `https://malicious-website.com/phishing` vào ô **Poster Image URL** (như trong ảnh chụp).
  5. Bấm **"Publish Title"** -> Phim được tạo thành công với `trailerUrl = ""` (chuỗi rỗng).
  6. Ra trang chủ Client (`http://localhost:5173`), click vào poster bộ phim vừa tạo (ví dụ *Avatar 3: Fire and Ash*):
     * Giao diện nhảy vào thẳng trang chi tiết phim kèm bảng chọn lịch chiếu.
     * **Hoàn toàn KHÔNG CÓ nút "Watch Official Trailer"** và không có icon Play trên poster!
* **Kết quả thực tế:**
  * Tester không thể thực hiện kiểm thử Case 2.3.1 (Tạo phim với Trailer YouTube hợp lệ) và Case 2.3.2 (Chặn URL Trailer độc hại).
  * Bộ phim tạo mới bị mất tính năng xem Trailer trên trang Client.
* **Kỳ vọng chuẩn:**
  * Modal thêm phim và sửa phim trong `AdminDashboard.jsx` phải có ô nhập **`Trailer URL`** (placeholder: `https://www.youtube.com/watch?v=...` hoặc `https://youtu.be/...`).
  * Có validation phía Frontend và Backend kiểm tra định dạng URL YouTube hợp lệ, chặn đứng các link giả mạo / độc hại (XSS).
  * Sau khi tạo phim có Trailer hợp lệ, trên trang Client `/movie/:id` phải hiển thị nút **"Watch Official Trailer"** và nút Play để mở Modal phát video YouTube an toàn qua iframe sandbox.

---

#### 2. NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE)
1. **Trong `AdminDashboard.jsx`:**
   * Tại dòng 103–116, State `newMovie` **đã được định nghĩa sẵn** trường `trailerUrl: ''`:
     ```javascript
     const [newMovie, setNewMovie] = useState({
       title: '', description: '', director: '', durationMinutes: 120,
       releaseDate: toLocalDateStr(), ageRating: 'P', originalLanguage: 'English',
       posterUrl: '', trailerUrl: '', status: 'NOW_SHOWING', genreIds: [1], actorIds: [],
     });
     ```
   * Tuy nhiên, trong phần JSX render Modal (dòng 1830–1950), lập trình viên đã **bỏ sót không vẽ thẻ `<input>`** cho `trailerUrl`!
   * Kết quả là `newMovie.trailerUrl` luôn gửi chuỗi rỗng `""` lên Backend khi gọi `adminApi.createMovie(newMovie)`.

2. **Trong `MovieDetail.jsx`:**
   * Giao diện Client bọc nút xem trailer trong điều kiện kiểm tra `{movie.trailerUrl && (...)}`:
     ```jsx
     {movie.trailerUrl && (
       <button onClick={() => setTrailerOpen(true)}>Watch Official Trailer</button>
     )}
     ```
   * Do `trailerUrl` bị rỗng, cả nút Play trên poster và nút Watch Official Trailer đều bị ẩn, làm người dùng tưởng rằng giao diện nhảy thẳng vào trang đặt vé mà không có tính năng trailer.

---

#### 3. GIẢI PHÁP TRIỂN KHAI KHI SỬA CODE (PROPOSED FIX)
1. **Trong `AdminDashboard.jsx` (Cả Add Modal và Edit Modal):**
   * Bổ sung trường nhập liệu `Trailer URL` ngay dưới trường `Poster Image URL`:
     ```jsx
     <div>
       <label className="block text-[#ab9a84] mb-1 font-semibold">YouTube Trailer URL</label>
       <input
         type="url"
         value={newMovie.trailerUrl}
         onChange={(e) => setNewMovie({ ...newMovie, trailerUrl: e.target.value })}
         placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
         className="w-full bg-[#120d09] border border-[#3d3020] rounded-lg p-2.5 text-[#f5ece0]"
       />
     </div>
     ```
   * Bổ sung validation kiểm tra URL YouTube trước khi submit.

---

### ⏳ MỤC THEO DÕI KIỂM THỬ: CASE 1.3.2 (CHẶN ĐẶT VÉ CẬN GIỜ CUTOFF 15 PHÚT)

> **Mã theo dõi:** `TRACK-CASE-1.3.2-CUTOFF-PENDING`  
> **Trạng thái:** **CHƯA TEST (PENDING TEST) - Sẽ kiểm thử sau**  
> **Lý do:** Tại thời điểm test, trong Database chưa có suất chiếu nào đang rơi vào khoảng cách `[Hiện tại, Hiện tại + 15 phút]` để kích hoạt luật Cutoff.

#### 💡 Cách tạo dữ liệu test nhanh khi bạn muốn kiểm thử Case 1.3.2:
Chạy lệnh SQL sau vào Docker container để tạo 1 suất chiếu bắt đầu sau 8 phút nữa (nằm trong phạm vi < 15 phút):
```sql
docker exec cinema_mysql mysql -u root -proot cinema_booking_db -e "INSERT INTO showtimes (movie_id, room_id, start_time, end_time, base_price, status) VALUES (1, 1, DATE_ADD(NOW(), INTERVAL 8 MINUTE), DATE_ADD(NOW(), INTERVAL 128 MINUTE), 100000, 'SCHEDULED');"
```
Khi đó suất chiếu này sẽ rơi vào trạng thái cận giờ chiếu, bạn có thể kiểm tra xem hệ thống có làm mờ nút hoặc chặn đặt vé đúng chuẩn Case 1.3.2 hay không.

---

### ⏳ MỤC THEO DÕI KIỂM THỬ: CASE 1.4.3 & 1.4.4 (KIỂM TRA LUẬT GHẾ ĐÔI COUPLE)

> **Mã theo dõi:** `TRACK-CASE-1.4.4-COUPLE-PENDING`  
> **Trạng thái:** **CHƯA TEST (PENDING TEST) - Sẽ kiểm thử sau khi sửa Lỗi #4 & #5**  
> **Lý do:** Tester chưa kiểm thử được hành vi chọn ghế đôi (chọn 1 ghế tự chọn cả cặp, giá nhân đôi) do toàn bộ hàng ghế E (COUPLE) trong Database đang bị gán `pair_group = NULL` (Lỗi `BUG-SEAT-ROW-E-COUPLE-NULL-04`) và giá ghế đôi đang bị nhân đôi 2 lần (Lỗi `BUG-SEAT-COUPLE-PRICE-DOUBLE-MULTIPLICATION-05`).

---

### ⏳ MỤC THEO DÕI KIỂM THỬ: CASE 2.4.1 (CẤU HÌNH GHẾ ĐÔI & ĐỊNH GIÁ GHẾ TRONG PHÒNG CHIẾU)

> **Mã theo dõi:** `TRACK-CASE-2.4.1-ROOM-SEAT-PENDING`  
> **Trạng thái:** **CHƯA TEST (ĐANG BỊ LỖI - PENDING TEST)**  
> **Lý do:** Tester ghi nhận cấu hình ghế phòng chiếu đang bị lỗi do chịu ảnh hưởng trực tiếp từ 2 lỗi cốt lõi đã phát hiện:
> 1. `BUG-SEAT-ROW-E-COUPLE-NULL-04`: Toàn bộ ghế đôi hàng E trong DB có `pair_group = NULL` và phòng nhỏ có số lẻ ghế (5 ghế).
> 2. `BUG-SEAT-COUPLE-PRICE-DOUBLE-MULTIPLICATION-05`: Giá ghế đôi bị nhân đôi 2 lần từ 80k thành 320k/cặp.  
> 👉 Case này sẽ được kiểm thử và nghiệm thu lại ngay sau khi hoàn thành sửa chữa 2 lỗi dữ liệu trên.

---

### ℹ️ GHI NHẬN ĐỐI CHIẾU: CASE 2.4.2 (CHẶN VÔ HIỆU HÓA PHÒNG CHIẾU CÒN SUẤT CHIẾU TƯƠNG LAI)

> **Mã ghi nhận:** `NOTE-CASE-2.4.2-ROOM-DEACTIVATE`  
> **Phản hồi từ Tester:** Case 2.4.2 có logic xử lý tương đồng với Case 2.3.3.  
> **Phân tích kỹ thuật & nghiệp vụ:**
> * **Điểm tương đồng:** Cả Case 2.3.3 và Case 2.4.2 cùng tuân thủ nguyên tắc an toàn dữ liệu: *Không bao giờ cho phép vô hiệu hóa một thực thể (Phim hoặc Phòng) khi thực thể đó vẫn còn gắn với ít nhất một suất chiếu ở trạng thái `SCHEDULED` trong tương lai*.
> * **Điểm khác biệt giữa 2 Case:**
>   * **Case 2.3.3 (Đối tượng Phim):** Đã có sẵn nút bấm màu đỏ **`Discontinue`** trong tab `Movie Catalog` trên giao diện Admin để tester click kiểm tra trực tiếp (Bị chặn với mã `1207 / 1206: MOVIE_HAS_FUTURE_SHOWTIMES`).
>   * **Case 2.4.2 (Đối tượng Phòng chiếu):** Backend đã có API chuẩn `PATCH /api/v1/rooms/{id}/status` kiểm tra điều kiện `existsByRoomIdAndStatusAndStartTimeAfter` và ném mã lỗi `1403: ROOM_HAS_FUTURE_SHOWTIMES`. Tuy nhiên, trên Frontend hiện tại Admin chưa có màn hình Quản lý Phòng riêng (Room Management UI) để hiển thị nút bật/tắt trạng thái phòng. Do đó, tester không có nút trên giao diện để click test trực quan như Case 2.3.3.






