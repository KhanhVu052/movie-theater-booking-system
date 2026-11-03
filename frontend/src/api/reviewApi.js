import axiosClient from './axiosClient';

export const reviewApi = {
  // Create a new review for a movie
  createReview: (data) => {
    return axiosClient.post('/reviews', data);
  },

  // Update existing review
  updateReview: (id, data) => {
    return axiosClient.put(`/reviews/${id}`, data);
  },

  // Get reviews and average rating for a movie
  getMovieReviews: (movieId, params = {}) => {
    return axiosClient.get(`/reviews/movie/${movieId}`, { params });
  },
};
