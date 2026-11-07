# TÀI LIỆU KỸ THUẬT: BẢN VÁ CHỐT SỔ CUỐI CÙNG (NHÓM 1 & NHÓM 2)

> **Chỉ thị cho AI Coding Assistant:** Tài liệu này là nguồn chân lý duy nhất (Single Source of Truth) cho đợt chốt sổ dự án GoToro Cinema. Hãy áp dụng **chính xác 100%** các đoạn mã nguồn, câu lệnh SQL và cấu hình dưới đây vào codebase. Không tự ý sáng tạo hoặc làm khác thiết kế.

---

## BẢNG THEO DÕI TRẠNG THÁI (CHECKLIST)

| Mã Task | Nhóm | Mức độ | Hạng mục xử lý | Trạng thái |
|---|---|---|---|---|
| **H1** | Nhóm 1 | HIGH | Thêm migration `V6__cleanup_orphan_seed_showtimes.sql` dọn suất chiếu mồ côi do V2 sinh ra | `DONE` |
| **H2** | Nhóm 1 | HIGH | Bỏ hàm `UPPER()` quanh cột `v.code` trong `VoucherRepository` để InnoDB khóa đúng Index `uk_vouchers_code` | `DONE` |
| **L3** | Nhóm 1 | LOW | Sửa `VNPAY_RETURN_URL` trong `.env.example` về trang Frontend và chặn mật khẩu mẫu trong `AdminSeeder` | `DONE` |
| **VER-01** | Nhóm 1 | LOW | Đồng bộ mô tả phiên bản Spring Boot trong `README.md` khớp với `pom.xml` | `DONE` |
| **M1** | Nhóm 2 | MEDIUM | Khóa và lọc `isActive = true` cho `Genre` / `Actor` trong `MovieService`, kích hoạt lại bản ghi soft-delete khi tạo trùng tên | `DONE` |
| **M6** | Nhóm 2 | MEDIUM | Tắt `spring.jpa.open-in-view`, cấu hình HikariCP pool size và bỏ `@Transactional` ở `AuthService.login` | `DONE` |

---

## CHI TIẾT KỸ THUẬT NHÓM 1 (BẮT BUỘC CHO DEMO & CV)

### 1. [H1] Dọn dẹp suất chiếu mồ côi không có phòng/ghế từ Migration V2
- **Nguyên nhân:** `V2__seed_movies_data.sql` tắt kiểm tra khóa ngoại (`SET FOREIGN_KEY_CHECKS = 0`) và chèn các suất chiếu với `room_id` 1–7 khi bảng `rooms` chưa có dữ liệu, tạo ra các suất chiếu mồ côi không có phòng và không có ghế.
- **Quy tắc bất biến:** Tuyệt đối **KHÔNG** sửa nội dung file `V2__seed_movies_data.sql` (để không làm hỏng Flyway checksum).
- **Giải pháp:** Tạo file migration mới tại đường dẫn `backend/src/main/resources/db/migration/V6__cleanup_orphan_seed_showtimes.sql` với nội dung chính xác sau:

```sql
-- V6__cleanup_orphan_seed_showtimes.sql
DELETE ss FROM showtime_seats ss
JOIN showtimes s ON s.id = ss.showtime_id
LEFT JOIN rooms r ON r.id = s.room_id
WHERE r.id IS NULL;

DELETE s FROM showtimes s
LEFT JOIN rooms r ON r.id = s.room_id
WHERE r.id IS NULL
  AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.showtime_id = s.id);
2. [H2] Khắc phục lỗi khóa toàn bảng (Full Table Lock) khi áp mã Voucher
Nguyên nhân: Câu truy vấn WHERE UPPER(v.code) = UPPER(:code) bọc hàm UPPER() quanh cột v.code khiến MySQL không thể sử dụng Unique Index uk_vouchers_code, dẫn tới InnoDB quét clustered index và khóa toàn bộ bảng vouchers. Trong khi đó, dữ liệu code khi lưu đã được .trim().toUpperCase() và collation utf8mb4_unicode_ci vốn không phân biệt hoa/thường.

Giải pháp:

Mở backend/src/main/java/com/example/cinema/voucher/repository/VoucherRepository.java:

Sửa phương thức findByCodeForUpdate bỏ hàm UPPER(), và bổ sung findByCode, existsByCode:

Java
boolean existsByCode(String code);

Optional<Voucher> findByCode(String code);

@Lock(LockModeType.PESSIMISTIC_WRITE)
@QueryHints({@QueryHint(name = "jakarta.persistence.lock.timeout", value = "3000")})
@Query("SELECT v FROM Voucher v WHERE v.code = :code")
Optional<Voucher> findByCodeForUpdate(@Param("code") String code);
Mở backend/src/main/java/com/example/cinema/voucher/service/VoucherService.java:

Tại createVoucher: Chuẩn hóa String normalizedCode = request.code().trim().toUpperCase(); và dùng voucherRepository.existsByCode(normalizedCode).

Tại getVoucherByCode: Chuẩn hóa String normalizedCode = code.trim().toUpperCase(); và dùng voucherRepository.findByCode(normalizedCode).

Tại lockAndReserveVoucher: Chuẩn hóa String normalizedCode = code.trim().toUpperCase(); và truyền normalizedCode vào voucherRepository.findByCodeForUpdate(normalizedCode).

3. [L3] Chuẩn hóa .env.example và chặn mật khẩu mẫu trong AdminSeeder
Nguyên nhân: VNPAY_RETURN_URL trong .env.example đang trỏ vào cổng Backend 8080 (hiển thị JSON thô thay vì giao diện vé điện tử của Frontend tại /payment/vnpay-return), và BOOTSTRAP_ADMIN_PASSWORD đang để mật khẩu mẫu công khai.

Giải pháp:

Mở file .env.example ở thư mục gốc, sửa 2 dòng sau:

Properties
VNPAY_RETURN_URL=http://localhost:5173/payment/vnpay-return
BOOTSTRAP_ADMIN_PASSWORD=
Mở file backend/src/main/java/com/example/cinema/auth/component/AdminSeeder.java:

Ngay sau khi lấy password và kiểm tra khác rỗng, thêm chốt chặn không cho phép khởi tạo Admin bằng mật khẩu ví dụ công khai:

Java
if ("ChangeMeAdminPass123!".equals(password.trim())) {
    log.error("Refusing to create bootstrap admin with the published example password. Please set a custom password.");
    return;
}
4. [VER-01] Đồng bộ phiên bản Spring Boot giữa pom.xml và README.md
Giải pháp: Kiểm tra thẻ <parent> trong backend/pom.xml và cập nhật lại thông tin phiên bản Spring Boot trong README.md cho khớp chính xác, tránh lệch thông tin khi nhà tuyển dụng đối chiếu CV và mã nguồn.

CHI TIẾT KỸ THUẬT NHÓM 2 (TỐI ƯU SOFT-DELETE RACE & HIKARI POOL)
5. [M1] Xử lý triệt để Soft-Delete và Race Condition cho Genre & Actor
Nguyên nhân:

MovieService.resolveGenres và resolveActors đang gọi findAllById (không lọc isActive = true và không đặt khóa đọc PESSIMISTIC_READ), dẫn đến Admin có thể gắn phim vào Genre/Actor đã xóa mềm hoặc xảy ra race condition khi 1 luồng xóa mềm Genre song song với 1 luồng tạo Movie gắn Genre đó.

Khi xóa mềm một Genre/Actor (ví dụ "Horror", isActive = false), nếu Admin tạo lại "Horror" thì bị chặn bởi GENRE_ALREADY_EXISTS và không có cách nào khôi phục lại.

Giải pháp cho Genre (Actor làm tương tự 100%):

Trong backend/src/main/java/com/example/cinema/movie/repository/GenreRepository.java:

Java
@Lock(LockModeType.PESSIMISTIC_READ)
@Query("SELECT g FROM Genre g WHERE g.id IN :ids AND g.isActive = true ORDER BY g.id ASC")
List<Genre> findActiveByIdInForShare(@Param("ids") Collection<Long> ids);

@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("SELECT g FROM Genre g WHERE g.id = :id")
Optional<Genre> findByIdForUpdate(@Param("id") Long id);

Optional<Genre> findByNameIgnoreCase(String name);
Trong backend/src/main/java/com/example/cinema/movie/repository/ActorRepository.java:

Java
@Lock(LockModeType.PESSIMISTIC_READ)
@Query("SELECT a FROM Actor a WHERE a.id IN :ids AND a.isActive = true ORDER BY a.id ASC")
List<Actor> findActiveByIdInForShare(@Param("ids") Collection<Long> ids);

@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("SELECT a FROM Actor a WHERE a.id = :id")
Optional<Actor> findByIdForUpdate(@Param("id") Long id);
Trong backend/src/main/java/com/example/cinema/movie/service/MovieService.java:

Sửa resolveGenres và resolveActors sử dụng findActiveByIdInForShare:

Java
private Set<Genre> resolveGenres(Set<Long> genreIds) {
    if (genreIds == null || genreIds.isEmpty()) {
        return new LinkedHashSet<>();
    }
    List<Genre> found = genreRepository.findActiveByIdInForShare(genreIds);
    if (found.size() != genreIds.size()) {
        throw new AppException(ErrorCode.GENRE_NOT_FOUND);
    }
    return new LinkedHashSet<>(found);
}

private Set<Actor> resolveActors(Set<Long> actorIds) {
    if (actorIds == null || actorIds.isEmpty()) {
        return new LinkedHashSet<>();
    }
    List<Actor> found = actorRepository.findActiveByIdInForShare(actorIds);
    if (found.size() != actorIds.size()) {
        throw new AppException(ErrorCode.ACTOR_NOT_FOUND);
    }
    return new LinkedHashSet<>(found);
}
Trong backend/src/main/java/com/example/cinema/movie/service/GenreService.java:

Sửa createGenre (kích hoạt lại nếu đang isActive = false) và deleteGenre (khóa findByIdForUpdate):

Java
@Transactional
public GenreResponse createGenre(GenreRequest request) {
    String normalizedName = request.name().trim();
    Optional<Genre> existing = genreRepository.findByNameIgnoreCase(normalizedName);
    if (existing.isPresent()) {
        Genre g = existing.get();
        if (Boolean.TRUE.equals(g.getIsActive())) {
            throw new AppException(ErrorCode.GENRE_ALREADY_EXISTS);
        }
        g.setName(normalizedName);
        g.setIsActive(true);
        return genreMapper.toResponse(genreRepository.save(g));
    }
    Genre savedGenre = genreRepository.save(genreMapper.toEntity(request));
    return genreMapper.toResponse(savedGenre);
}

@Transactional
public void deleteGenre(Long id) {
    Genre genre = genreRepository.findByIdForUpdate(id)
            .filter(g -> Boolean.TRUE.equals(g.getIsActive()))
            .orElseThrow(() -> new AppException(ErrorCode.GENRE_NOT_FOUND));

    if (movieRepository.existsByGenresId(id)) {
        throw new AppException(ErrorCode.GENRE_IN_USE);
    }

    genre.setIsActive(false);
    genreRepository.save(genre);
}
Trong backend/src/main/java/com/example/cinema/movie/service/ActorService.java:

Sửa deleteActor dùng actorRepository.findByIdForUpdate(id):

Java
@Transactional
public void deleteActor(Long id) {
    Actor actor = actorRepository.findByIdForUpdate(id)
            .filter(a -> Boolean.TRUE.equals(a.getIsActive()))
            .orElseThrow(() -> new AppException(ErrorCode.ACTOR_NOT_FOUND));

    if (movieRepository.existsByActorsId(id)) {
        throw new AppException(ErrorCode.ACTOR_IN_USE);
    }

    actor.setIsActive(false);
    actorRepository.save(actor);
}
6. [M6] Tắt open-in-view, giải phóng DB Connection khi băm BCrypt lúc Login và cấu hình Hikari Pool
Nguyên nhân:

AuthService.login đang gắn @Transactional(readOnly = true), khiến kết nối DB bị chiếm giữ suốt thời gian hàm BCrypt băm mật khẩu (~100ms), dễ làm cạn Hikari Connection Pool khi có nhiều request đăng nhập cùng lúc.

spring.jpa.open-in-view chưa tắt (mặc định true), làm giữ kết nối DB suốt vòng đời render HTTP response.

Giải pháp:

Mở backend/src/main/java/com/example/cinema/auth/service/AuthService.java:

Xóa bỏ annotation @Transactional(readOnly = true) trên phương thức login(...) (giữ nguyên @Transactional ở register).

Mở backend/src/main/resources/application.yaml và backend/src/test/resources/application-test.yaml:

Bổ sung cấu hình open-in-view: false và thông số HikariCP:

YAML
spring:
  datasource:
    hikari:
      connection-init-sql: SET SESSION innodb_lock_wait_timeout = 5
      connection-timeout: 10000
      maximum-pool-size: 20
      minimum-idle: 5
      max-lifetime: 1500000
  jpa:
    open-in-view: false