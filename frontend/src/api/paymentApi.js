import axiosClient from './axiosClient';

export const paymentApi = {
  // Create VNPay payment URL for a pending booking
  createVnPayUrl: (data) => {
    return axiosClient.post('/payments/vnpay/create', data);
  },

  // Instant test payment simulation (for automated & reliable manual testing)
  simulateSuccess: (data) => {
    return axiosClient.post('/payments/simulate-success', data);
  },

  // Query VNPay return verification outcome
  handleVnPayReturn: (params) => {
    return axiosClient.get('/payments/vnpay-return', { params });
  },

  // Fetch payment history/attempts for a specific booking
  getPaymentsByBooking: (bookingId) => {
    return axiosClient.get(`/payments/booking/${bookingId}`);
  },
};
