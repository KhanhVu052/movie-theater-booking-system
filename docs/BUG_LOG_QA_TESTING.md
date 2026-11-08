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
