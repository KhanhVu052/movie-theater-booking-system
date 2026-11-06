import axiosClient from './axiosClient';

export const bookingApi = {
  // Create a new booking and hold seats for 10 minutes
  createBooking: (data) => {
    return axiosClient.post('/bookings', data);
  },

  // Cancel an unpaid pending booking
  cancelBooking: (id) => {
    return axiosClient.post(`/bookings/${id}/cancel`);
  },

  // Cancel a paid confirmed booking within refund cutoff window
  cancelConfirmedBooking: (id) => {
    return axiosClient.post(`/bookings/${id}/cancel-confirmed`);
  },

  // Fetch booking details by ID
  getBookingById: (id) => {
    return axiosClient.get(`/bookings/${id}`);
  },

  // Fetch paginated bookings of the logged-in user
  getMyBookings: (params = {}) => {
    return axiosClient.get('/bookings/my-bookings', { params });
  },
};
