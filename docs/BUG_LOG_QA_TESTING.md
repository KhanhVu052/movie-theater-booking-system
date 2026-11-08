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
* **Gợi ý tối ưu giao diện (UX Recommendations):**
  1. **Gắn huy hiệu nổi bật (Pre-Sale Badge):**
     * Trên Poster tại Trang chủ và Trang chi tiết: Gắn badge màu cam/đỏ rực rỡ:  
       `🔥 VÉ ĐẶT TRƯỚC (PRE-SALE)` hoặc `⭐ SUẤT CHIẾU SỚM`.
  2. **Thanh lọc ngày động (Dynamic Pre-Sale Date Filter - Thay vì cố định 7 ngày):**
     * Thanh chọn ngày **chỉ hiển thị đúng các ngày thực tế CÓ SUẤT CHIẾU MỞ BÁN**, tự động loại bỏ các ngày không có lịch.
     * *Ví dụ:* Phim công chiếu vào thứ Bảy (14/11) và Chủ Nhật (15/11). Thanh ngày sẽ chỉ hiện 2 nút:  
       `[Thứ Bảy - 14/11]` và `[Chủ Nhật - 15/11]`.
     * 👉 **Lợi ích:** Người dùng bấm vào ngày nào cũng **100% có suất chiếu để đặt vé**, triệt tiêu hoàn toàn cảm giác bấm vào ngày bị rỗng.
  3. **Banner thông báo đặt chỗ sớm:**
     * Đặt ở đầu phần lịch chiếu:  
       `🎟️ MỞ BÁN VÉ SỚM: Hãy là những khán giả đầu tiên thưởng thức siêu phẩm! Đặt vé ngay các suất chiếu dưới đây để giữ vị trí ghế VIP tốt nhất.`

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


