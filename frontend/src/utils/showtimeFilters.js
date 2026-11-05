/**
 * Showtime Filtering and Lifecycle Status Utilities
 * Shared between AdminDashboard operations console and Vitest test suite.
 */

/**
 * Determine the real-time screening phase badge for a showtime:
 * - CANCELLED: Showtime was cancelled by cinema operator
 * - COMPLETED: Screening window has passed
 * - LIVE NOW: Showtime is currently in progress
 * - UPCOMING: Future scheduled screening
 */
export function getScreeningPhase(showtime, currentTime = new Date()) {
  if (showtime.status === 'CANCELLED') {
    return 'CANCELLED';
  }
  const endTime = new Date(showtime.endTime);
  const startTime = new Date(showtime.startTime);

  if (endTime < currentTime) {
    return 'COMPLETED';
  }
  if (startTime <= currentTime && endTime >= currentTime) {
    return 'LIVE NOW';
  }
  return 'UPCOMING';
}

/**
 * Filter showtimes list by tab segmentation, selected movie, and query search text.
 */
export function filterShowtimes({
  showtimesList = [],
  filterTab = 'ALL',
  searchText = '',
  selectedMovieId = '',
  movieMap = new Map(),
  currentTime = new Date(),
}) {
  return showtimesList.filter((st) => {
    // 1. Movie filter if explicitly selected
    if (selectedMovieId && String(st.movieId) !== String(selectedMovieId)) {
      return false;
    }

    // 2. Segmentation tab filter
    const now = currentTime;
    if (filterTab === 'UPCOMING') {
      if (st.status === 'CANCELLED' || new Date(st.endTime) < now) return false;
    } else if (filterTab === 'PAST') {
      if (st.status !== 'CANCELLED' && new Date(st.endTime) >= now) return false;
    } else if (filterTab === 'NOW_SHOWING') {
      const status = st.movieStatus || movieMap.get(st.movieId)?.status;
      if (status !== 'NOW_SHOWING') return false;
    } else if (filterTab === 'COMING_SOON') {
      const status = st.movieStatus || movieMap.get(st.movieId)?.status;
      if (status !== 'COMING_SOON') return false;
    } else if (filterTab === 'ENDED') {
      const status = st.movieStatus || movieMap.get(st.movieId)?.status;
      if (status !== 'ENDED') return false;
    }

    // 3. Search text
    if (!searchText || !searchText.trim()) return true;
    const q = searchText.toLowerCase().trim();
    return (
      (st.movieTitle && st.movieTitle.toLowerCase().includes(q)) ||
      (st.roomName && st.roomName.toLowerCase().includes(q)) ||
      (st.cinemaName && st.cinemaName.toLowerCase().includes(q)) ||
      (st.format && st.format.toLowerCase().includes(q))
    );
  });
}

/**
 * Smart Bi-directional Filter Synchronization:
 * When user enters a query in search box, clear single-movie filter to search globally.
 */
export function onSearchTextChange(newSearchText, currentMovieFilter) {
  let updatedMovieFilter = currentMovieFilter;
  if (newSearchText && newSearchText.trim() && currentMovieFilter) {
    updatedMovieFilter = '';
  }
  return {
    searchText: newSearchText,
    movieFilter: updatedMovieFilter,
  };
}

/**
 * Selecting a specific movie dropdown resets the query search text.
 */
export function onMovieFilterChange(newMovieFilter) {
  return {
    movieFilter: newMovieFilter,
    searchText: '',
  };
}

