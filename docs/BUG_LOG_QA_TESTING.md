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
| `TRACK-CASE-1.3.2-CUTOFF-PENDING` | Module 1.3 (Showtime Cutoff 15m) | Tạm hoãn kiểm thử: Chưa có suất chiếu trong khung giờ cận < 15 phút | Info (QA Status) | ⏳ CHƯA TEST (Sẽ test sau) |
| `TRACK-CASE-1.4.4-COUPLE-PENDING` | Module 1.4 (Couple Seat Rules) | Tạm hoãn kiểm thử: Luật ghế đôi chưa test được do hàng E đang bị mờ (Lỗi #4) | Info (QA Status) | ⏳ CHƯA TEST (Sẽ test sau) |

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
> **Trạng thái:** **CHƯA TEST (PENDING TEST) - Sẽ kiểm thử sau khi sửa Lỗi #4**  
> **Lý do:** Tester chưa kiểm thử được hành vi chọn ghế đôi (chọn 1 ghế tự chọn cả cặp, giá nhân đôi) do toàn bộ hàng ghế E (COUPLE) trong Database đang bị gán `pair_group = NULL` và bị hệ thống khóa mờ (Lỗi `BUG-SEAT-ROW-E-COUPLE-NULL-04`).





