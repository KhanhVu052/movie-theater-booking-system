import axiosClient from './axiosClient';

export const movieApi = {
  // Lấy toàn bộ danh sách phim (kèm phân trang, lọc theo trạng thái, thể loại, tìm kiếm)
  getAllMovies: (params = {}) => {
    return axiosClient.get('/movies', {
      params: {
        page: 1,
        size: 100,
        ...params,
      },
    });
  },

  // Lấy chi tiết 1 bộ phim theo ID
  getMovieById: (id) => {
    return axiosClient.get(`/movies/${id}`);
  },

  // Lấy danh sách tất cả cụm rạp
  getAllCinemas: () => {
    return axiosClient.get('/cinemas');
  },

  // Lấy chi tiết cụm rạp theo ID
  getCinemaById: (id) => {
    return axiosClient.get(`/cinemas/${id}`);
  },

  // Lấy danh sách tất cả thể loại phim
  getAllGenres: () => {
    return axiosClient.get('/genres');
  },

  // Lấy danh sách mã giảm giá / khuyến mãi
  getAllVouchers: () => {
    return axiosClient.get('/vouchers');
  },

  // Alias lấy khuyến mãi đang hoạt động
  getActiveVouchers: () => {
    return axiosClient.get('/vouchers');
  },

  // Kiểm tra mã voucher cụ thể
  getVoucherByCode: (code) => {
    return axiosClient.get(`/vouchers/code/${encodeURIComponent(code)}`);
  },

  // Lấy danh sách suất chiếu (hỗ trợ lọc theo movieId, roomId, showDate, fromTime, toTime, status)
  getShowtimes: (params = {}) => {
    const queryParams = {
      page: 1,
      size: 100,
      status: 'SCHEDULED',
      ...params,
    };

    // Nếu truyền showDate (YYYY-MM-DD), tự động ánh xạ sang fromTime và toTime ISO
    if (params.showDate) {
      if (!params.fromTime) {
        queryParams.fromTime = `${params.showDate}T00:00:00`;
      }
      if (!params.toTime) {
        queryParams.toTime = `${params.showDate}T23:59:59`;
      }
      delete queryParams.showDate;
    }

    // cinemaId được lọc phía client dựa theo cinemaId có sẵn trên từng ShowtimeResponse
    delete queryParams.cinemaId;

    return axiosClient.get('/showtimes', { params: queryParams });
  },

  // Lấy suất chiếu theo phim và ngày chiếu
  getShowtimesByMovie: (movieId, date) => {
    return movieApi.getShowtimes({ movieId, showDate: date });
  },

  // Lấy chi tiết 1 suất chiếu
  getShowtimeById: (id) => {
    return axiosClient.get(`/showtimes/${id}`);
  },

  // Lấy sơ đồ ghế và trạng thái đặt ghế của 1 suất chiếu
  getShowtimeSeats: (id) => {
    return axiosClient.get(`/showtimes/${id}/seats`);
  },

  // Lấy tóm tắt đánh giá và danh sách review của bộ phim
  getMovieReviews: (movieId, params = {}) => {
    return axiosClient.get(`/reviews/movie/${movieId}`, { params });
  },
};
