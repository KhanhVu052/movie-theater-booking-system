import axiosClient from './axiosClient';

export const movieApi = {
  // Fetch all movies with optional pagination, status, genre, and search filters
  getAllMovies: (params = {}) => {
    return axiosClient.get('/movies', {
      params: {
        page: 1,
        size: 100,
        ...params,
      },
    });
  },

  // Fetch movie details by ID
  getMovieById: (id) => {
    return axiosClient.get(`/movies/${id}`);
  },

  // Fetch all cinema locations
  getAllCinemas: () => {
    return axiosClient.get('/cinemas');
  },

  // Fetch cinema details by ID
  getCinemaById: (id) => {
    return axiosClient.get(`/cinemas/${id}`);
  },

  // Fetch all movie genres
  getAllGenres: () => {
    return axiosClient.get('/genres');
  },

  // Fetch all promotional vouchers
  getAllVouchers: () => {
    return axiosClient.get('/vouchers');
  },

  // Alias for active vouchers
  getActiveVouchers: () => {
    return axiosClient.get('/vouchers');
  },

  // Lookup voucher by code
  getVoucherByCode: (code) => {
    return axiosClient.get(`/vouchers/code/${encodeURIComponent(code)}`);
  },

  // Fetch showtimes with automatic date-to-ISO range conversion
  getShowtimes: (params = {}) => {
    const queryParams = {
      page: 1,
      size: 100,
      status: 'SCHEDULED',
      ...params,
    };

    // If showDate (YYYY-MM-DD) is provided, convert to fromTime and toTime ISO strings
    if (params.showDate) {
      if (!params.fromTime) {
        queryParams.fromTime = `${params.showDate}T00:00:00`;
      }
      if (!params.toTime) {
        queryParams.toTime = `${params.showDate}T23:59:59`;
      }
      delete queryParams.showDate;
    }

    // cinemaId is filtered on client side using cinemaId on each ShowtimeResponse
    delete queryParams.cinemaId;

    return axiosClient.get('/showtimes', { params: queryParams });
  },

  // Fetch showtimes by movie and date
  getShowtimesByMovie: (movieId, date, params = {}) => {
    return movieApi.getShowtimes({ movieId, showDate: date, ...params });
  },

  // Fetch showtime detail by ID
  getShowtimeById: (id) => {
    return axiosClient.get(`/showtimes/${id}`);
  },

  // Fetch seat layout and real-time seat availability
  getShowtimeSeats: (id) => {
    return axiosClient.get(`/showtimes/${id}/seats`);
  },

  // Fetch movie reviews and rating summary
  getMovieReviews: (movieId, params = {}) => {
    return axiosClient.get(`/reviews/movie/${movieId}`, { params });
  },
};
