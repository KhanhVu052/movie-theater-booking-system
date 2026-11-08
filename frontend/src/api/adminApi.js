import axiosClient from './axiosClient';

export const adminApi = {
  // Realized revenue report (FR-REP-01)
  getRevenueReport: (params = {}) => {
    return axiosClient.get('/payments/reports/revenue', { params });
  },

  // All payment transactions & refund administration
  getAllPayments: (params = {}) => {
    return axiosClient.get('/payments', { params });
  },

  // Confirm manual refund for transactions requiring refund (FR-PAY-02)
  confirmManualRefund: (id, note = null) => {
    return axiosClient.patch(`/payments/${id}/refund`, note ? { note } : {});
  },

  // Movie administration
  createMovie: (data) => {
    return axiosClient.post('/movies', data);
  },

  updateMovie: (id, data) => {
    return axiosClient.put(`/movies/${id}`, data);
  },

  deleteMovie: (id) => {
    return axiosClient.delete(`/movies/${id}`);
  },

  // Voucher administration
  getAllVouchers: () => {
    return axiosClient.get('/vouchers/admin');
  },

  createVoucher: (data) => {
    return axiosClient.post('/vouchers', data);
  },

  toggleVoucherStatus: (id, isActive) => {
    return axiosClient.patch(`/vouchers/${id}/status`, { isActive });
  },

  // Review moderation for Admin (FR-REV-01)
  getAllReviews: (params = {}) => {
    return axiosClient.get('/reviews', { params });
  },

  updateReviewStatus: (id, status) => {
    return axiosClient.patch(`/reviews/${id}/status`, { status });
  },

  // Showtime & Schedule management (FR-SHOW-01)
  getShowtimes: (params = {}) => {
    const queryParams = { ...params };
    if (params.showDate) {
      if (!queryParams.fromTime) {
        queryParams.fromTime = `${params.showDate}T00:00:00`;
      }
      if (!queryParams.toTime) {
        queryParams.toTime = `${params.showDate}T23:59:59`;
      }
      delete queryParams.showDate;
    }
    return axiosClient.get('/showtimes', { params: queryParams });
  },

  createShowtime: (data) => {
    return axiosClient.post('/showtimes', data);
  },

  cancelShowtime: (id) => {
    return axiosClient.post(`/showtimes/${id}/cancel`);
  },

  getCinemas: () => {
    return axiosClient.get('/cinemas');
  },

  getRooms: (cinemaId) => {
    return axiosClient.get('/rooms', { params: { cinemaId } });
  },

  // Genre management (Module 2.2)
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
};
