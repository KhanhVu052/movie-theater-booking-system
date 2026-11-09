> **WARNING:** This document is archived for historical purposes. It contains outdated architectural claims (e.g., automated refunds, Redis dependencies) that have been deprecated or replaced in the current production codebase. Do not use this as a reference for the current system state.
VẤN ĐỀ 1: Chuẩn hóa Regex Email có kiểm tra Top-Level Domain (BUG-AUTH-EMAIL-FORMAT-VALIDATION-01)1. Nguyên nhân cốt lõi (Root Cause)Backend (RegisterRequest.java dòng 10–13): Annotation @Email mặc định của Jakarta Validation tuân theo đặc tả RFC 5322, cho phép các địa chỉ nội bộ không có dấu chấm miền cấp cao (như abc@xyz hoặc user@localhost) đi qua bộ lọc @Valid.   Frontend (Register.jsx dòng 292–300): Thẻ <input type="email" /> mặc định của trình duyệt chỉ kiểm tra sự tồn tại của ký tự @ và ký tự phía sau mà không bắt buộc phần mở rộng tên miền (.com, .vn, .edu...).   2. Giải pháp tối ưuBổ sung @Pattern kiểm tra cấu trúc Top-Level Domain (TLD tối thiểu 2 ký tự chữ cái) vào RegisterRequest.java.   Bổ sung thuộc tính pattern trên thẻ <input> và kiểm tra regex trong handleSubmit tại Register.jsx.   3. Mã nguồn cụ thể (Code Diff)Backend: backend/src/main/java/com/example/cinema/auth/dto/request/RegisterRequest.java (Dòng 10–14)Java        @NotBlank(message = "Email must not be blank")
        @Email(message = "Invalid email format")
        @Pattern(
                regexp = "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$",
                message = "Email must be a valid email address with a domain extension (e.g. user@domain.com)"
        )
        @Size(max = 150, message = "Email must not exceed 150 characters")
        String email,
Frontend: frontend/src/pages/Register.jsx (Dòng 152–158 & Dòng 292–301)JavaScript  const EMAIL_TLD_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!EMAIL_TLD_REGEX.test(formData.email.trim())) {
      setError('Email must be a valid email address with a domain extension (e.g. name@domain.com)');
      return;
    }
    if (!formData.password || formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
JavaScript                <input
                  id="email"
                  type="email"
                  name="email"
                  required
                  pattern="^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
                  title="Please enter a valid email address with domain extension (e.g., name@domain.com)"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full bg-[#140f0a] border border-[#3d3020] rounded-lg px-4 py-2.5 text-sm text-[#f5ece0] focus:outline-none focus:border-[#e0b354] focus:ring-1 focus:ring-[#e0b354]/30 transition-all"
                />
VẤN ĐỀ 2: Trải nghiệm Lịch chiếu linh hoạt theo trạng thái phim COMING_SOON vs PRE-SALE vs NOW_SHOWING (FEAT-UX-COMING-SOON-PRE-SALE-02)1. Nguyên nhân cốt lõi (Root Cause)Tại frontend/src/pages/MovieDetail.jsx (dòng 76–92 và 427–477), giao diện luôn render cố định thanh 7 ngày liên tiếp (getUpcomingDates()) bất kể trạng thái phim.   Khi khách hàng vào xem một bộ phim COMING_SOON chưa mở bán vé, cả 7 tab ngày đều báo rỗng ("No showtimes scheduled for this date"), gây hiểu lầm là lỗi hệ thống. Nếu phim COMING_SOON có mở bán vé sớm (Pre-Sale) vào một vài ngày nhất định, việc hiển thị các ngày trống cũng làm giảm trải nghiệm đặt vé.   2. Giải pháp tối ưuKhi movie.status === 'COMING_SOON', gọi API lấy toàn bộ các suất chiếu tương lai của phim (movieApi.getShowtimes({ movieId: id, bookableOnly: true, size: 100 })):   Trường hợp 1 (COMING_SOON chưa có suất chiếu nào): Ẩn hoàn toàn thanh chọn 7 ngày và bộ lọc rạp; hiển thị Premiere Teaser Banner thông báo rõ ngày khởi chiếu chính thức (formatReleaseDate(movie.releaseDate)) kèm nút xem Official Trailer.   Trường hợp 2 (COMING_SOON có suất chiếu bán sớm Pre-Sale): Hiển thị huy hiệu 🔥 PRE-SALE / SNEAK SHOW, khung CTA đặt vé sớm, và thanh chọn ngày chỉ hiển thị đúng những ngày thực tế có suất chiếu (Dynamic Pre-Sale Date Filter — loại bỏ 100% tab ngày rỗng).   3. Mã nguồn cụ thể (Code Diff)Frontend: frontend/src/pages/MovieDetail.jsx (Cập nhật logic tại dòng 107–193 & JSX tại dòng 395–520)JavaScript  const [preSaleShowtimes, setPreSaleShowtimes] = useState([]);
  const [loadingPreSale, setLoadingPreSale] = useState(false);

  // Kiểm tra danh sách suất chiếu mở bán sớm (Pre-Sale) nếu phim là COMING_SOON
  useEffect(() => {
    if (!id || !movie || movie.status !== 'COMING_SOON') {
      setPreSaleShowtimes([]);
      return;
    }
    let isMounted = true;
    setLoadingPreSale(true);
    movieApi
      .getShowtimes({ movieId: id, bookableOnly: true, page: 1, size: 100 })
      .then((res) => {
        if (!isMounted) return;
        const raw = res?.data?.data ?? res?.data;
        const list = (
          Array.isArray(raw)
            ? raw
            : Array.isArray(raw?.items)
            ? raw.items
            : Array.isArray(raw?.content)
            ? raw.content
            : []
        ).filter((st) => st.status === 'SCHEDULED');

        setPreSaleShowtimes(list);
        if (list.length > 0 && list[0].startTime) {
          setSelectedDate(list[0].startTime.split('T')[0]);
        }
      })
      .catch(() => {
        if (isMounted) setPreSaleShowtimes([]);
      })
      .finally(() => {
        if (isMounted) setLoadingPreSale(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id, movie]);

  const isComingSoon = movie?.status === 'COMING_SOON';
  const hasPreSaleShowtimes = isComingSoon && preSaleShowtimes.length > 0;

  // Danh sách ngày hiển thị: 7 ngày cố định cho NOW_SHOWING, hoặc chỉ các ngày có suất chiếu cho PRE-SALE
  const activeDateTabs = useMemo(() => {
    if (!isComingSoon) return availableDates;
    const uniqueDates = Array.from(
      new Set(preSaleShowtimes.map((st) => st.startTime?.split('T')[0]).filter(Boolean))
    ).sort();
    return uniqueDates.map((dateStr) => {
      const d = new Date(`${dateStr}T00:00:00`);
      return {
        dateStr,
        label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: d.getDate(),
      };
    });
  }, [isComingSoon, availableDates, preSaleShowtimes]);
Và tại <section id="showtimes-section"> (MovieDetail.jsx dòng 395):   JavaScript          <section id="showtimes-section" className="w-full max-w-7xl mx-auto px-6 lg:px-12 py-12 flex-1">
            {loadingPreSale ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#e6c27a]" />
                <p className="text-xs text-[#ab9a84]">Checking advance ticket availability...</p>
              </div>
            ) : isComingSoon && !hasPreSaleShowtimes ? (
              /* TRƯỜNG HỢP 1: COMING_SOON CHƯA MỞ BÁN -> ẨN THANH 7 NGÀY, HIỆN PREMIERE TEASER BANNER */
              <div className="bg-gradient-to-br from-[#1c140c] via-[#140f0a] to-[#0e0a07] border-2 border-[#5e4727] rounded-2xl p-8 sm:p-12 text-center space-y-4 shadow-2xl">
                <Calendar className="w-12 h-12 text-[#f3cb62] mx-auto" />
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#2b2014] border border-[#e0b354]/50 text-xs font-bold text-[#f3cb62] uppercase tracking-wider">
                  🎬 Official Premiere Schedule
                </div>
                <h2 className="font-body font-extrabold text-2xl sm:text-3xl text-[#f7efe4]">
                  Official Release Date: {formatReleaseDate(movie.releaseDate) || 'Coming Soon'}
                </h2>
                <p className="text-xs sm:text-sm text-[#ab9a84] max-w-xl mx-auto leading-relaxed">
                  Tickets for this title are not on sale yet. Showtimes and advance seat reservations will open 3 to 5 days before the official premiere date.
                </p>
                {movie.trailerUrl && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setTrailerOpen(true)}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-b from-[#f3cb62] to-[#dda938] text-[#1a1209] font-bold text-xs shadow-md cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-[#1a1209]" />
                      <span>Watch Official Trailer</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* TRƯỜNG HỢP 2 (PRE-SALE) & MẶC ĐỊNH (NOW_SHOWING) */
              <>
                {hasPreSaleShowtimes && (
                  <div className="mb-6 p-4 rounded-xl bg-amber-950/40 border border-[#e0b354] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#f3cb62]">
                        🔥 Advance Ticket Sales (Pre-Sale / Sneak Show)
                      </span>
                      <p className="text-xs text-[#d4c3ad] mt-0.5">
                        Be among the first viewers! Only dates with active advance screenings are shown below.
                      </p>
                    </div>
                  </div>
                )}
                {/* Render Header + Cinema Filter + activeDateTabs.map(...) + groupedShowtimes như hiện tại */}
              </>
            )}
          </section>
VẤN ĐỀ 3: Khắc phục lỗi lặp đúp 2 lần Toast cảnh báo ghế lẻ (BUG-SEAT-TOAST-DUPLICATE-03)1. Nguyên nhân cốt lõi (Root Cause)Trong frontend/src/pages/SeatSelection.jsx (dòng 237–274), lời gọi side-effect showToast(warningMsg, 'warning') và setSelectionNotice(warningMsg) đang bị đặt bên trong hàm state updater setSelectedSeatIds((prev) => { ... }).   Khi chạy trong <React.StrictMode>, React gọi hàm updater 2 lần liên tiếp để kiểm tra tính thuần khiết (pure function), khiến showToast bị bắn 2 lần cùng lúc cho 1 lần click chuột.   2. Giải pháp tối ưuĐưa toàn bộ phép tính mảng nextSelected ra ngoài setSelectedSeatIds, cập nhật state setSelectedSeatIds(nextSelected) một cách thuần khiết và chỉ gọi showToast đúng 1 lần trong handleToggleSeat.   Bổ sung thêm cơ chế chống trùng lặp (deduplicate trong 300ms cho cùng một nội dung message) trong ToastContext.jsx để bảo vệ toàn cục.   3. Mã nguồn cụ thể (Code Diff)Frontend: frontend/src/pages/SeatSelection.jsx (Thay thế handleToggleSeat tại dòng 221–275)JavaScript  const handleToggleSeat = (seat) => {
    if (seat.status !== 'AVAILABLE' || seat.selectable === false) return;

    setBookingError('');
    setSelectionNotice('');

    const partner = getCouplePartner(seat, seats);
    const isCouple = seat.seatType === 'COUPLE' || seat.pairGroup != null;

    if (isCouple && !isCouplePairAvailable(seat, seats)) {
      const unavailMsg = 'This couple seat pair is currently unavailable.';
      setSelectionNotice(unavailMsg);
      showToast(unavailMsg, 'warning');
      return;
    }

    let nextSelected;
    if (partner) {
      if (selectedSeatIds.includes(seat.id)) {
        nextSelected = selectedSeatIds.filter((id) => id !== seat.id && id !== partner.id);
      } else {
        if (selectedSeatIds.length + 2 > 8) {
          const maxMsg = 'You can only select up to 8 seats per booking.';
          setSelectionNotice(maxMsg);
          showToast(maxMsg, 'warning');
          return;
        }
        nextSelected = [...selectedSeatIds, seat.id, partner.id];
      }
    } else {
      if (selectedSeatIds.includes(seat.id)) {
        nextSelected = selectedSeatIds.filter((id) => id !== seat.id);
      } else {
        if (selectedSeatIds.length >= 8) {
          const maxMsg = 'You can only select up to 8 seats per booking.';
          setSelectionNotice(maxMsg);
          showToast(maxMsg, 'warning');
          return;
        }
        nextSelected = [...selectedSeatIds, seat.id];
      }
    }

    setSelectedSeatIds(nextSelected);

    if (causesOrphanSeat(seats, nextSelected)) {
      const warningMsg = 'Cannot leave a single empty seat (orphan seat). Please select adjacent seats.';
      setSelectionNotice(warningMsg);
      showToast(warningMsg, 'warning');
    }
  };
VẤN ĐỀ 4 & 5: Đồng bộ pair_group cho hàng ghế đôi E và Sửa triệt để lỗi nhân đôi giá ghế Couple 2 lần (BUG-SEAT-ROW-E-COUPLE-NULL-04 & BUG-SEAT-COUPLE-PRICE-DOUBLE-MULTIPLICATION-05)1. Nguyên nhân cốt lõi (Root Cause)Lỗi #4 (pair_group bị NULL): Các ghế hàng E (type = 'COUPLE') trong bảng seats đang có pair_group = NULL, và các phòng 2–7 có 5 ghế lẻ (E1..E5). Tại ShowtimeMapper.java (dòng 81–84), quy tắc D-07 kiểm tra seat.getType() == SeatType.COUPLE && (pairGroup == null || pairGroup <= 0) và trả về selectable = false, làm toàn bộ hàng E bị gạch ngang và khóa mờ.   Lỗi #5 (Nhân đôi giá 2 lần thành 4x):Lần nhân đôi 1 (Tại V2__seed_movies_data.sql dòng 12968 & data-seed/insert_movies.sql): Câu lệnh SQL viết WHEN s.type = 'COUPLE' THEN st.base_price * 2, gán giá của cả cặp (160.000đ) vào từng ghế đơn lẻ (E1 = 160.000đ, E2 = 160.000đ).   Lần nhân đôi 2 (Tại frontend/src/utils/priceTags.js dòng 45–46): Hàm resolveSeatPrices lấy giá 1 ghế từ API (couplePerSeat = 160.000đ) rồi nhân 2 (couplePair = couplePerSeat * 2) thành 320.000đ/pair (hoặc 520.000đ/pair ở phòng IMAX 130.000đ), và khi chọn 2 ghế E1 + E2 tổng tiền bị tính thành 320.000đ!   2. Giải pháp tối ưuBảo toàn Flyway Checksum: Không chỉnh sửa file V2__seed_movies_data.sql (vì validate-on-migrate: true đang bật). Tạo file migration mới V7__fix_couple_seat_pairs_and_pricing.sql thực hiện:   Gán pair_group chuẩn cho các cặp ghế liền kề hàng E: (E1, E2) -> 1, (E3, E4) -> 2, (E5, E6) -> 3, (E7, E8) -> 4.   Với các phòng nhỏ có số ghế lẻ trên hàng E (ví dụ ghế E5 ở các phòng 5 cột), tự động chuyển ghế lẻ dư ra sang type = 'VIP', pair_group = NULL để không vi phạm luật bắt buộc đi theo cặp.   Cập nhật lại đơn giá showtime_seats.price của các ghế COUPLE đang AVAILABLE về đúng giá 1 chỗ ngồi (st.base_price), để khi ghép 2 ghế (E1 + E2) tổng giá của cặp ghế đôi là 160.000đ/pair (cho phòng base_price = 80.000đ) và 260.000đ/pair (cho phòng IMAX base_price = 130.000đ).   Đồng thời sửa dòng 12968 trong data-seed/insert_movies.sql để các lần chạy script seed thủ công sau này cũng đúng chuẩn.   3. Mã nguồn cụ thể (Code Diff)Database Migration (Tạo mới): backend/src/main/resources/db/migration/V7__fix_couple_seat_pairs_and_pricing.sqlSQL-- 1. Gán pair_group cho các ghế COUPLE theo từng cặp liền kề: (1,2)->1, (3,4)->2, (5,6)->3, (7,8)->4
UPDATE seats
SET pair_group = CEIL(seat_number / 2.0)
WHERE type = 'COUPLE'
  AND seat_number >= 1;

-- 2. Chuyển ghế lẻ cuối hàng (không đủ cặp 2 ghế cùng room_id, row_name, pair_group) sang ghế VIP
UPDATE seats s
LEFT JOIN (
    SELECT room_id, row_name, pair_group, COUNT(*) AS pair_size
    FROM seats
    WHERE type = 'COUPLE' AND pair_group IS NOT NULL
    GROUP BY room_id, row_name, pair_group
) grp ON s.room_id = grp.room_id
     AND s.row_name = grp.row_name
     AND s.pair_group = grp.pair_group
SET s.type = 'VIP',
    s.pair_group = NULL
WHERE s.type = 'COUPLE'
  AND (grp.pair_size IS NULL OR grp.pair_size <> 2);

-- 3. Chuẩn hóa lại đơn giá từng ghế đơn lẻ trong showtime_seats (1 ghế COUPLE = base_price -> 1 cặp 2 ghế = base_price * 2)
UPDATE showtime_seats ss
JOIN seats s ON ss.seat_id = s.id
JOIN showtimes st ON ss.showtime_id = st.id
SET ss.price = CASE
    WHEN s.type = 'VIP' THEN st.base_price + 20000
    WHEN s.type = 'COUPLE' THEN st.base_price
    ELSE st.base_price
END
WHERE ss.status = 'AVAILABLE';
Frontend: frontend/src/pages/SeatSelection.jsx (Dòng 140–157 & Dòng 647–650)Tự động ẩn các hàng hoàn toàn không có ghế active và chỉ hiển thị chú thích Couple ở Legend khi phòng có ghế đôi:JavaScript  const hasCoupleSeats = useMemo(
    () => seats.some((s) => s.seatType === 'COUPLE' || s.pairGroup != null),
    [seats]
  );
JavaScript                {hasCoupleSeats && (
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-t border bg-[#2e131e] border-[#8a2449]" />
                    <span className="text-[#fda4af] font-semibold">
                      Couple ({formatCurrency(seatPrices.COUPLE_PAIR)}/pair)
                    </span>
                  </div>
                )}
VẤN ĐỀ 6: Xóa liên kết trùng lặp "My Bookings" trên thanh điều hướng Navbar (FEAT-UX-NAVBAR-DUPLICATE-MY-BOOKINGS-06)1. Nguyên nhân cốt lõi (Root Cause)Tại frontend/src/components/Navbar.jsx, đường dẫn /my-bookings bị đặt trùng ở 2 vị trí: text link My Bookings ở cụm menu giữa (dòng 158–165) và nút bấm có biểu tượng vé My Tickets ở góc phải (dòng 284–290).   2. Giải pháp tối ưuXóa bỏ link My Bookings tại dòng 158–165 của Navbar.jsx, chỉ giữ lại nút My Tickets ở góc phải và đồng bộ nhãn trên menu Mobile.   3. Mã nguồn cụ thể (Code Diff)Frontend: frontend/src/components/Navbar.jsx (Dòng 151–167 & Dòng 398–404)JavaScript            <button
              type="button"
              onClick={() => scrollToSection('vouchers-section')}
              className="hover:text-[#f3cb62] transition-colors cursor-pointer"
            >
              Vouchers
            </button>
          </nav>
Và tại Mobile Dropdown (Navbar.jsx dòng 398–404):   JavaScript                <Link
                  to="/my-bookings"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-left py-2 text-sm text-[#f3cb62] font-semibold border-b border-[#2e2316]"
                >
                  My Tickets
                </Link>
VẤN ĐỀ 7: Xây dựng giao diện Quản lý Thể loại phim trên Admin Dashboard (FEAT-ADMIN-GENRE-MANAGEMENT-UI-07)1. Nguyên nhân cốt lõi (Root Cause)Backend đã hoàn thiện 100% API tại GenreController.java (GET/POST/PUT/DELETE /api/v1/genres) và GenreService.java (hỗ trợ xóa mềm isActive = false, tự động khôi phục khi tạo lại tên cũ, và chặn xóa với mã 1205: GENRE_IN_USE khi thể loại đang gắn với phim). Tuy nhiên, AdminDashboard.jsx mới chỉ có 6 tabs, chưa có tab UI Quản lý Thể loại.   2. Giải pháp tối ưuBổ sung 4 phương thức gọi API Genre vào frontend/src/api/adminApi.js.   Thêm tab thứ 7 Movie Genres vào AdminDashboard.jsx với đầy đủ tính năng: Danh sách thể loại, Thêm mới, Đổi tên (Modal), Xóa mềm (bắt mã lỗi 1205 để báo Toast khi thể loại đang được sử dụng), và đồng bộ danh sách thể loại này vào cả form Thêm/Sửa phim.   3. Mã nguồn cụ thể (Code Diff)File 1: frontend/src/api/adminApi.js (Thêm vào cuối object adminApi tại dòng 83)JavaScript  // Genre management (Module 2.2)
  getGenres: () => {
    return axiosClient.get('/genres');
  },

  createGenre: (data) => {
    return axiosClient.post('/genres', data);
  },

  updateGenre: (id, data) => {
    return axiosClient.put(`/genres/${id}`, data);
  },

  deleteGenre: (id) => {
    return axiosClient.delete(`/genres/${id}`);
  },
File 2: frontend/src/pages/AdminDashboard.jsx (Thêm state, handlers và Tab UI GENRES)JavaScript  // 7. GENRES STATE
  const [genresList, setGenresList] = useState([]);
  const [loadingGenres, setLoadingGenres] = useState(false);
  const [showGenreModal, setShowGenreModal] = useState(false);
  const [editingGenre, setEditingGenre] = useState(null);
  const [genreNameInput, setGenreNameInput] = useState('');

  const fetchGenres = useCallback(async () => {
    setLoadingGenres(true);
    try {
      const res = await adminApi.getGenres();
      const raw = res?.data?.data ?? res?.data ?? [];
      setGenresList(Array.isArray(raw) ? raw : []);
    } catch {
      showToast('Failed to load movie genres.', 'error');
    } finally {
      setLoadingGenres(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (isAdmin && (activeTab === 'GENRES' || activeTab === 'MOVIES')) {
      fetchGenres();
    }
  }, [isAdmin, activeTab, fetchGenres]);

  const handleSaveGenreSubmit = async (e) => {
    e.preventDefault();
    const name = genreNameInput.trim();
    if (!name) return;
    try {
      if (editingGenre) {
        await adminApi.updateGenre(editingGenre.id, { name });
        showToast(`Genre updated to "${name}".`, 'success');
      } else {
        await adminApi.createGenre({ name });
        showToast(`Genre "${name}" created/restored successfully.`, 'success');
      }
      setShowGenreModal(false);
      setEditingGenre(null);
      setGenreNameInput('');
      fetchGenres();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save genre.', 'error');
    }
  };

  const handleDeleteGenre = async (genre) => {
    const confirmed = await confirm({
      title: 'Delete Movie Genre',
      message: `Are you sure you want to delete genre "${genre.name}"?`,
      confirmText: 'Delete Genre',
      cancelText: 'Cancel',
      isDestructive: true,
    });
    if (!confirmed) return;

    try {
      await adminApi.deleteGenre(genre.id);
      showToast(`Genre "${genre.name}" has been deactivated.`, 'info');
      fetchGenres();
    } catch (err) {
      const code = err.response?.data?.code;
      if (code === 1205) {
        showToast('Cannot delete genre: It is currently associated with active movies (Code 1205).', 'error');
      } else {
        showToast(err.response?.data?.message || 'Failed to delete genre.', 'error');
      }
    }
  };
VẤN ĐỀ 8: Bổ sung ô nhập Trailer URL kèm kiểm tra bảo mật YouTube trên Modal Tạo/Sửa phim (BUG-ADMIN-MOVIE-MODAL-MISSING-TRAILER-INPUT-08)1. Nguyên nhân cốt lõi (Root Cause)Trong AdminDashboard.jsx, state newMovie (dòng 103–116) đã có trường trailerUrl: '', nhưng trong phần JSX của Modal "Publish New Title to Catalog" (dòng 1914–1934) lại bị thiếu thẻ <input> cho trailerUrl.   Phía Backend (MovieRequest.java dòng 36–39), regex hiện tại chỉ kiểm tra ^(https://.*)?$ mà chưa giới hạn tên miền youtube.com / youtu.be, dẫn tới việc URL giả mạo như [https://malicious-website.com/phishing](https://malicious-website.com/phishing) vẫn có thể lưu vào DB.   2. Giải pháp tối ưuBackend (MovieRequest.java): Cập nhật @Pattern của trailerUrl chỉ chấp nhận chuỗi rỗng hoặc link https:// thuộc youtube.com / youtu.be.   Frontend (AdminDashboard.jsx): Thêm ô nhập YouTube Trailer URL ngay dưới ô Poster Image URL (dòng 1923) và dùng hàm getEmbedTrailerUrl từ frontend/src/utils/trailer.js để chặn ngay trên form nếu người dùng nhập URL không phải YouTube hợp lệ.   3. Mã nguồn cụ thể (Code Diff)Backend: backend/src/main/java/com/example/cinema/movie/dto/request/MovieRequest.java (Dòng 36–39)Java        @Size(max = 500, message = "Trailer URL must not exceed 500 characters")
        @Pattern(
                regexp = "^(https://((www\\.|m\\.)?youtube\\.com/(watch\\?v=|embed/|shorts/)|youtu\\.be/)[\\w-]{11}([?&].*)?)?$",
                message = "Trailer URL must be a valid https:// YouTube URL (youtube.com or youtu.be)"
        )
        String trailerUrl,
Frontend: frontend/src/pages/AdminDashboard.jsx (Dòng 480–491 & Dòng 1923)JavaScriptimport { getEmbedTrailerUrl } from '../utils/trailer';
JavaScript  // Create Movie Form Submit
  const handleCreateMovieSubmit = async (e) => {
    e.preventDefault();
    const rawTrailer = (newMovie.trailerUrl || '').trim();
    if (rawTrailer && !getEmbedTrailerUrl(rawTrailer)) {
      showToast(
        'Invalid Trailer URL: Must be a valid HTTPS YouTube URL (e.g. https://www.youtube.com/watch?v=... or https://youtu.be/...)',
        'error'
      );
      return;
    }
    try {
      await adminApi.createMovie({
        ...newMovie,
        trailerUrl: rawTrailer,
      });
      setShowAddMovieModal(false);
      setNotice('Movie published successfully.');
      fetchMovies();
      setTimeout(() => setNotice(''), 3000);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create movie.', 'error');
    }
  };
Và thêm vào trong <form onSubmit={handleCreateMovieSubmit}> ngay dưới khối Poster Image URL (AdminDashboard.jsx dòng 1924):   JavaScript              <div>
                <label className="block text-[#ab9a84] mb-1 font-semibold">
                  YouTube Trailer URL
                </label>
                <input
                  type="url"
                  value={newMovie.trailerUrl}
                  onChange={(e) => setNewMovie({ ...newMovie, trailerUrl: e.target.value })}
                  placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                  className="w-full bg-[#120d09] border border-[#3d3020] rounded-lg p-2.5 text-[#f5ece0]"
                />
              </div>
VẤN ĐỀ 9: Khắc phục lỗi mất phim NOW_SHOWING trên Trang chủ do bão hòa 84 phim ENDED & Bổ sung Phân trang (BUG-CLIENT-HOMEPAGE-MOVIE-PAGINATION-SATURATION-09)1. Nguyên nhân cốt lõi (Root Cause)Trong DB có hơn 1.000 bộ phim (phần lớn là ENDED). Tại frontend/src/pages/Home.jsx (dòng 137), câu lệnh movieApi.getAllMovies({ page: 1, size: 100 }) không truyền status, khiến Backend lấy 100 phim có releaseDate mới nhất (gồm 84 phim ENDED, 10 phim NOW_SHOWING, 6 phim COMING_SOON).   Toàn bộ các phim NOW_SHOWING kinh điển đang có suất chiếu hôm nay (như Avengers: Infinity War, Your Name, Spider-Man: Across the Spider-Verse, Demon Slayer, Joker) có releaseDate cũ hơn nên bị đẩy sang trang 2, 3 của DB và biến mất hoàn toàn khỏi Trang chủ cũng như thanh Quick Booking!   2. Giải pháp tối ưuTruy vấn tách biệt theo status ngay từ Backend API: Tại Home.jsx, gọi song song movieApi.getAllMovies({ status: 'NOW_SHOWING', page: 1, size: 100 }) và movieApi.getAllMovies({ status: 'COMING_SOON', page: 1, size: 100 }). Khi đó câu lệnh SQL WHERE m.status = :status của MovieRepository.searchMovies sẽ trả về đầy đủ 100% phim đang chiếu và sắp chiếu mà không bị bất kỳ phim ENDED nào chiếm chỗ.   Bổ sung thanh Phân trang (Pagination Bar): Hiển thị 8 phim/trang kèm điều hướng số trang (Prev, 1, 2, 3..., Next) ở đáy danh sách phim tại Home.jsx.   3. Mã nguồn cụ thể (Code Diff)Frontend: frontend/src/pages/Home.jsx (Dòng 115, 132–162, 304 & 833)JavaScript  const [currentPage, setCurrentPage] = useState(1);
  const MOVIES_PER_PAGE = 8;

  // 1. Fetch initial Movies (NOW_SHOWING + COMING_SOON), Cinemas, Vouchers from Backend
  useEffect(() => {
    let isMounted = true;

    const fetchInitialData = async () => {
      setLoading(true);
      setError('');
      try {
        const [nowShowingRes, comingSoonRes, cinemasRes, vouchersRes] = await Promise.allSettled([
          movieApi.getAllMovies({ status: 'NOW_SHOWING', page: 1, size: 100 }),
          movieApi.getAllMovies({ status: 'COMING_SOON', page: 1, size: 100 }),
          movieApi.getAllCinemas(),
          movieApi.getActiveVouchers(),
        ]);

        if (!isMounted) return;

        if (nowShowingRes.status === 'fulfilled' || comingSoonRes.status === 'fulfilled') {
          const nowShowingList =
            nowShowingRes.status === 'fulfilled' ? extractPayload(nowShowingRes.value) : [];
          const comingSoonList =
            comingSoonRes.status === 'fulfilled' ? extractPayload(comingSoonRes.value) : [];
          const movieList = [...nowShowingList, ...comingSoonList];
          setMovies(movieList);

          if (paramMovieId) {
            setQuickMovieId(String(paramMovieId));
          } else if (nowShowingList.length > 0) {
            setQuickMovieId(String(nowShowingList[0].id));
          }
        } else {
          setError('Unable to load movie list from server.');
        }
Và bổ sung logic cắt trang + thanh Pagination dưới lưới phim (Home.jsx dòng 304 & 833):   JavaScript  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, selectedGenre, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredMovies.length / MOVIES_PER_PAGE));
  const paginatedMovies = useMemo(() => {
    const start = (currentPage - 1) * MOVIES_PER_PAGE;
    return filteredMovies.slice(start, start + MOVIES_PER_PAGE);
  }, [filteredMovies, currentPage]);
JavaScript              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {paginatedMovies.map((movie) => (
                    /* Giữ nguyên Movie Card JSX */
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-10 pt-4">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="px-3.5 py-2 rounded-lg bg-[#16110b] border border-[#3d2f1d] text-xs font-bold text-[#d4c3ad] hover:border-[#e6c27a] disabled:opacity-40 cursor-pointer"
                    >
                      Previous
                    </button>
                    {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-9 h-9 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          currentPage === pageNum
                            ? 'bg-gradient-to-b from-[#f3cb62] to-[#dda938] border-[#dda938] text-[#1a1209]'
                            : 'bg-[#140f0a] border-[#2e2316] text-[#ab9a84] hover:border-[#5e4727]'
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="px-3.5 py-2 rounded-lg bg-[#16110b] border border-[#3d2f1d] text-xs font-bold text-[#d4c3ad] hover:border-[#e6c27a] disabled:opacity-40 cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
VẤN ĐỀ 10: Làm mờ và khóa Voucher đã chạm giới hạn sử dụng tài khoản perUserLimit (FEAT-UX-VOUCHER-USER-USAGE-DIMMING-10)1. Nguyên nhân cốt lõi (Root Cause)VoucherController.getPublicVouchers() (GET /api/v1/vouchers) và getVoucherByCode() (GET /api/v1/vouchers/code/{code}) hiện tại chưa đối chiếu với người dùng đang đăng nhập (Authentication), và VoucherResponse chưa trả về số lượt mà tài khoản hiện tại đã dùng.   Do đó, trên SeatSelection.jsx (dòng 967), điều kiện isEligible chỉ kiểm tra subtotal >= minOrder && subtotal > 0, khiến các voucher mà khách đã dùng hết hạn mức cá nhân (perUserLimit) vẫn hiện sáng nút Apply và chỉ bị chặn ở bước cuối khi bấm Checkout.   2. Giải pháp tối ưuBackend (VoucherResponse.java, VoucherMapper.java, VoucherService.java, VoucherController.java):Bổ sung 2 trường Integer userUsedCount và Integer remainingUserQuota vào VoucherResponse.   Khi gọi GET /api/v1/vouchers hoặc GET /api/v1/vouchers/code/{code}, nếu người dùng đã đăng nhập (Authentication != null), VoucherService đếm số lượt active (RESERVED, USED) của user qua voucherRedemptionRepository.countActiveRedemptionsByUser(...) và tính remainingUserQuota = Math.max(0, perUserLimit - userUsedCount).   Riêng tại getVoucherByCode, nếu userUsedCount >= voucher.getPerUserLimit(), ném ngay AppException(ErrorCode.VOUCHER_USER_LIMIT_EXCEEDED) để chặn tức thì khi khách nhập mã bằng tay vào ô input.   Frontend (SeatSelection.jsx):Kiểm tra const isUserLimitReached = voucher.remainingUserQuota != null && voucher.remainingUserQuota <= 0;.   Nếu isUserLimitReached === true: làm mờ thẻ voucher (opacity-50), hiện badge Limit Reached, vô hiệu hóa nút Apply và hiển thị dòng giải thích số lượt đã dùng (${voucher.userUsedCount}/${voucher.perUserLimit} used).   3. Mã nguồn cụ thể (Code Diff)File 1: backend/src/main/java/com/example/cinema/voucher/dto/response/VoucherResponse.java (Dòng 9–26)Java@Builder
public record VoucherResponse(
        Long id,
        String code,
        DiscountType discountType,
        Long discountValue,
        Long maxDiscountAmount,
        Long minOrderValue,
        Integer usageLimit,
        Integer reservedCount,
        Integer usedCount,
        Integer remainingQuota,
        Integer perUserLimit,
        Integer userUsedCount,
        Integer remainingUserQuota,
        LocalDateTime startAt,
        LocalDateTime endAt,
        Boolean isActive,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
File 2: backend/src/main/java/com/example/cinema/voucher/mapper/VoucherMapper.java (Dòng 28–48)Java    public VoucherResponse toResponse(Voucher voucher) {
        return toResponse(voucher, 0);
    }

    public VoucherResponse toResponse(Voucher voucher, int userUsedCount) {
        int remaining = Math.max(0, voucher.getUsageLimit() - (voucher.getReservedCount() + voucher.getUsedCount()));
        int perUser = voucher.getPerUserLimit() != null ? voucher.getPerUserLimit() : 1;
        int remainingUser = Math.max(0, perUser - userUsedCount);
        return VoucherResponse.builder()
                .id(voucher.getId())
                .code(voucher.getCode())
                .discountType(voucher.getDiscountType())
                .discountValue(voucher.getDiscountValue())
                .maxDiscountAmount(voucher.getMaxDiscountAmount())
                .minOrderValue(voucher.getMinOrderValue())
                .usageLimit(voucher.getUsageLimit())
                .reservedCount(voucher.getReservedCount())
                .usedCount(voucher.getUsedCount())
                .remainingQuota(remaining)
                .perUserLimit(voucher.getPerUserLimit())
                .userUsedCount(userUsedCount)
                .remainingUserQuota(remainingUser)
                .startAt(voucher.getStartAt())
                .endAt(voucher.getEndAt())
                .isActive(voucher.getIsActive())
                .createdAt(voucher.getCreatedAt())
                .updatedAt(voucher.getUpdatedAt())
                .build();
    }
File 3: backend/src/main/java/com/example/cinema/voucher/service/VoucherService.java (Inject UserRepository & cập nhật dòng 53–82)Java    VoucherRepository voucherRepository;
    VoucherRedemptionRepository voucherRedemptionRepository;
    com.example.cinema.auth.repository.UserRepository userRepository;
    VoucherMapper voucherMapper;
Java    @Transactional(readOnly = true)
    public List<VoucherResponse> getPublicVouchers(String userEmail) {
        LocalDateTime now = LocalDateTime.now();
        User currentUser = (userEmail != null && !userEmail.isBlank())
                ? userRepository.findByEmail(userEmail).orElse(null)
                : null;

        return voucherRepository.findPublicVouchers(now).stream()
                .map(voucher -> {
                    int usedByUser = (currentUser == null) ? 0 : (int) voucherRedemptionRepository
                            .countActiveRedemptionsByUser(
                                    voucher.getId(),
                                    currentUser.getId(),
                                    List.of(VoucherRedemptionStatus.RESERVED, VoucherRedemptionStatus.USED)
                            );
                    return voucherMapper.toResponse(voucher, usedByUser);
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public List<VoucherResponse> getPublicVouchers() {
        return getPublicVouchers(null);
    }

    @Transactional(readOnly = true)
    public VoucherResponse getVoucherByCode(String code, String userEmail) {
        LocalDateTime now = LocalDateTime.now();
        String normalizedCode = code.trim().toUpperCase();
        Voucher voucher = voucherRepository.findByCode(normalizedCode)
                .filter(x -> Boolean.TRUE.equals(x.getIsActive())
                        && !now.isBefore(x.getStartAt()) && !now.isAfter(x.getEndAt()))
                .orElseThrow(() -> new AppException(ErrorCode.VOUCHER_NOT_FOUND));

        if (voucher.getReservedCount() + voucher.getUsedCount() >= voucher.getUsageLimit()) {
            throw new AppException(ErrorCode.VOUCHER_USAGE_LIMIT_EXCEEDED);
        }

        int usedByUser = 0;
        if (userEmail != null && !userEmail.isBlank()) {
            User currentUser = userRepository.findByEmail(userEmail).orElse(null);
            if (currentUser != null) {
                usedByUser = (int) voucherRedemptionRepository.countActiveRedemptionsByUser(
                        voucher.getId(),
                        currentUser.getId(),
                        List.of(VoucherRedemptionStatus.RESERVED, VoucherRedemptionStatus.USED)
                );
                if (usedByUser >= voucher.getPerUserLimit()) {
                    throw new AppException(ErrorCode.VOUCHER_USER_LIMIT_EXCEEDED);
                }
            }
        }
        return voucherMapper.toResponse(voucher, usedByUser);
    }

    @Transactional(readOnly = true)
    public VoucherResponse getVoucherByCode(String code) {
        return getVoucherByCode(code, null);
    }
File 4: backend/src/main/java/com/example/cinema/voucher/controller/VoucherController.java (Dòng 33–47)Java    @GetMapping
    public ResponseEntity<ApiResponse<List<VoucherResponse>>> getPublicVouchers(
            org.springframework.security.core.Authentication authentication
    ) {
        String userEmail = (authentication != null) ? authentication.getName() : null;
        return ResponseEntity.ok(ApiResponse.success(voucherService.getPublicVouchers(userEmail)));
    }

    @GetMapping("/code/{code}")
    public ResponseEntity<ApiResponse<VoucherResponse>> getVoucherByCode(
            @PathVariable String code,
            org.springframework.security.core.Authentication authentication
    ) {
        String userEmail = (authentication != null) ? authentication.getName() : null;
        return ResponseEntity.ok(ApiResponse.success(voucherService.getVoucherByCode(code, userEmail)));
    }
File 5: frontend/src/pages/SeatSelection.jsx (Dòng 965–1070)JavaScript                availableVouchers.map((voucher) => {
                  const minOrder = voucher.minOrderValue || 0;
                  const isUserLimitReached =
                    voucher.remainingUserQuota !== undefined &&
                    voucher.remainingUserQuota !== null &&
                    voucher.remainingUserQuota <= 0;
                  const isEligible = subtotal >= minOrder && subtotal > 0 && !isUserLimitReached;
                  const isApplied = appliedVoucher?.code === voucher.code;
                  const shortage = minOrder - subtotal;
Và tại phần hiển thị trạng thái nút bấm / thông báo trong modal chọn voucher (SeatSelection.jsx dòng 1045–1070):   JavaScript                          ) : isUserLimitReached ? (
                            <button
                              type="button"
                              disabled
                              className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs font-bold text-zinc-500 cursor-not-allowed"
                            >
                              Limit Reached
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled
                              className="px-3 py-1.5 rounded-lg bg-[#1a140d] border border-[#2e2316] text-xs font-semibold text-[#5a4836] cursor-not-allowed"
                            >
                              Locked
                            </button>
                          )}
JavaScript                      {isUserLimitReached ? (
                        <div className="mt-2.5 pt-2 border-t border-[#1f160e] text-[11px] text-red-400/80 flex items-center gap-1.5">
                          <Lock className="w-3 h-3 shrink-0" />
                          <span>
                            You have reached the usage limit for this voucher ({voucher.userUsedCount}/{voucher.perUserLimit} used).
                          </span>
                        </div>
                      ) : !isEligible ? (
                        <div className="mt-2.5 pt-2 border-t border-[#1f160e] text-[11px] text-amber-500/70 flex items-center gap-1.5">
                          <Info className="w-3 h-3 shrink-0" />
                          <span>
                            {subtotal === 0
                              ? 'Select seats in the auditorium to unlock this voucher.'
                              : `Add ${formatCurrency(shortage)} more to your ticket selection to qualify.`}
                          </span>
                        </div>
                      ) : null}
   ĐẢM BẢO TƯƠNG THÍCH NGƯỢC & HƯỚNG DẪN LỆNH VERIFYAn toàn Concurrency & Locking:Toàn bộ 10 thay đổi trên chỉ mở rộng tầng DTO Validation, Migration dữ liệu V7, các phương thức đọc Read-Only (getPublicVouchers, getVoucherByCode) và giao diện React.   Các luồng khóa giao dịch trọng yếu (BookingService.createBooking, VoucherService.lockAndReserveVoucher, PaymentService.processVnPayIpn, DeadlockRetryExecutor) và tất cả các method overload cũ (getPublicVouchers(), getVoucherByCode(String code), toResponse(Voucher)) đều được giữ nguyên tương thích ngược 100%, đảm bảo không làm gãy bất kỳ bài Integration Test nào.   Lệnh Verify Hệ thống (Backend & Frontend):Kiểm tra biên dịch & chạy bộ Test Backend:PowerShellcd backend
.\mvnw.cmd clean test-compile
.\mvnw.cmd test
Kiểm tra ESLint, Unit Tests (Vitest) & Build Production Frontend:PowerShellcd ..\frontend
npm run lint
npm test -- --run
npm run build


---

## VẤN ĐỀ 11: Tối ưu sơ đồ ghế Couple thực tế (Xóa ghế lẻ E5)
- **Vấn đề:** Các phòng chiếu nhỏ (Room 2 đến 7) có 5 cột, dẫn đến hàng E kẹp 2 ghế Couple và 1 ghế VIP (E5) trông mất thẩm mỹ.
- **Giải pháp:** Ghế Couple thực tế to hơn ghế thường. Cần xóa hoàn toàn ghế E5 ở hàng cuối của các phòng này để hàng E chỉ còn đúng 4 ghế (2 cặp Couple).
- **Mã nguồn thực thi (Tạo file `backend/src/main/resources/db/migration/V8__optimize_couple_seats_and_genre_desc.sql`):**
```sql
-- 1. Xóa các bản ghi showtime_seats liên đới của ghế E5
DELETE ss FROM showtime_seats ss
JOIN seats s ON ss.seat_id = s.id
WHERE s.room_id BETWEEN 2 AND 7 AND s.row_name = 'E' AND s.seat_number = 5;

-- 2. Xóa ghế vật lý E5 khỏi bảng seats
DELETE FROM seats
WHERE room_id BETWEEN 2 AND 7 AND row_name = 'E' AND seat_number = 5;
```

---

## VẤN ĐỀ 12: Bổ sung trường Description cho Genre
- **Vấn đề:** Thể loại phim chưa có mô tả. Bảng genres trong DB thiếu cột description.
- **Giải pháp:** Thêm cột vào DB, cập nhật Entity, DTO và Frontend.
- **Mã nguồn thực thi:**

Thêm vào file `V8__optimize_couple_seats_and_genre_desc.sql` vừa tạo ở trên:
```sql
-- 3. Thêm cột description cho bảng genres
ALTER TABLE genres ADD COLUMN description VARCHAR(500) NULL;
```

- **Cập nhật Backend (`Genre.java`, `GenreRequest.java`, `GenreResponse.java`, `GenreMapper.java`, `GenreService.java`):**
  - Thêm thuộc tính `String description;` độ dài max 500 ký tự.
  - Ánh xạ dữ liệu ở Mapper và hàm `updateGenre`, `createGenre`.

- **Cập nhật `AdminDashboard.jsx`:**
  - Thêm trường `description` vào state (ví dụ `genreDescInput`), bổ sung thẻ `<textarea>` vào modal Thêm/Sửa Thể loại và hiển thị mô tả ra bảng danh sách (nếu có).
