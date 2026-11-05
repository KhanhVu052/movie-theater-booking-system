import { describe, it, expect } from 'vitest';
import {
  getScreeningPhase,
  filterShowtimes,
  onSearchTextChange,
  onMovieFilterChange,
} from '../utils/showtimeFilters';

describe('Admin Showtime Workflow & Status Segmentation (TC-SHOW-01 to TC-SHOW-05)', () => {
  const referenceTime = new Date('2026-11-05T10:00:00Z');

  const sampleShowtimes = [
    {
      id: 101,
      movieId: 10,
      movieTitle: 'Michael',
      movieStatus: 'NOW_SHOWING',
      roomName: 'Review Room 4798',
      cinemaName: 'Cinema Central Hanoi',
      format: '2D',
      startTime: '2026-11-04T09:30:00Z', // Yesterday
      endTime: '2026-11-04T11:38:00Z',
      status: 'SCHEDULED',
    },
    {
      id: 102,
      movieId: 10,
      movieTitle: 'Michael',
      movieStatus: 'NOW_SHOWING',
      roomName: 'Review Room 6732',
      cinemaName: 'Cinema Central Hanoi',
      format: 'IMAX',
      startTime: '2026-11-04T19:30:00Z',
      endTime: '2026-11-04T21:38:00Z',
      status: 'CANCELLED',
    },
    {
      id: 103,
      movieId: 10,
      movieTitle: 'Michael',
      movieStatus: 'NOW_SHOWING',
      roomName: 'IMAX Hall 2149',
      cinemaName: 'Cinema Central Hanoi',
      format: 'IMAX',
      startTime: '2026-11-05T16:30:00Z', // Future today
      endTime: '2026-11-05T18:38:00Z',
      status: 'SCHEDULED',
    },
    {
      id: 104,
      movieId: 5,
      movieTitle: 'Spider-Man: Brand New Day',
      movieStatus: 'NOW_SHOWING',
      roomName: 'Review Room 4676',
      cinemaName: 'Cinema Central Hanoi',
      format: 'IMAX',
      startTime: '2026-11-05T09:00:00Z', // Currently live
      endTime: '2026-11-05T11:00:00Z',
      status: 'SCHEDULED',
    },
    {
      id: 105,
      movieId: 20,
      movieTitle: 'Runner',
      movieStatus: 'COMING_SOON',
      roomName: 'Review Room 9806',
      cinemaName: 'Cinema Central Hanoi',
      format: '2D',
      startTime: '2026-11-10T13:00:00Z',
      endTime: '2026-11-10T14:37:00Z',
      status: 'SCHEDULED',
    },
  ];

  it('TC-SHOW-01: Correctly classifies screening phase badges (COMPLETED, LIVE NOW, UPCOMING, CANCELLED)', () => {
    // 1. Past showtime on 04/11 should be COMPLETED, not mistaken for live
    expect(getScreeningPhase(sampleShowtimes[0], referenceTime)).toBe('COMPLETED');

    // 2. Cancelled showtime is always CANCELLED
    expect(getScreeningPhase(sampleShowtimes[1], referenceTime)).toBe('CANCELLED');

    // 3. Future showtime later today is UPCOMING
    expect(getScreeningPhase(sampleShowtimes[2], referenceTime)).toBe('UPCOMING');

    // 4. Ongoing showtime (09:00 to 11:00, with current time 10:00) is LIVE NOW
    expect(getScreeningPhase(sampleShowtimes[3], referenceTime)).toBe('LIVE NOW');
  });

  it('TC-SHOW-02: Smart search sync automatically resets movie dropdown to All Movies', () => {
    // User had selected Michael (id 10)
    let currentMovie = '10';

    // User types "Spider" into search
    const syncState = onSearchTextChange('Spider', currentMovie);
    expect(syncState.movieFilter).toBe(''); // Automatically reset to All Movies
    expect(syncState.searchText).toBe('Spider');

    // Filtering with the reset movie filter finds Spider-Man across the entire cinema
    const results = filterShowtimes({
      showtimesList: sampleShowtimes,
      filterTab: 'ALL',
      searchText: syncState.searchText,
      selectedMovieId: syncState.movieFilter,
      currentTime: referenceTime,
    });

    expect(results.length).toBe(1);
    expect(results[0].movieTitle).toBe('Spider-Man: Brand New Day');
  });

  it('TC-SHOW-02: Selecting movie dropdown clears the search input', () => {
    const syncState = onMovieFilterChange('10');
    expect(syncState.movieFilter).toBe('10');
    expect(syncState.searchText).toBe('');
  });

  it('TC-SHOW-04: Upcoming & Live tab only shows active future and live screenings', () => {
    const upcomingList = filterShowtimes({
      showtimesList: sampleShowtimes,
      filterTab: 'UPCOMING',
      searchText: '',
      selectedMovieId: '',
      currentTime: referenceTime,
    });

    // Should include: Michael (future), Spider-Man (live), Runner (future)
    // Should NOT include: Michael 04/11 (past) or Michael (cancelled)
    expect(upcomingList.map((st) => st.id)).toEqual([103, 104, 105]);
  });

  it('TC-SHOW-04: Past Screenings tab contains finished and cancelled showtimes', () => {
    const pastList = filterShowtimes({
      showtimesList: sampleShowtimes,
      filterTab: 'PAST',
      searchText: '',
      selectedMovieId: '',
      currentTime: referenceTime,
    });

    expect(pastList.map((st) => st.id)).toEqual([101, 102]);
  });

  it('TC-SHOW-05: Ended Movies tab returns 0 showtimes and triggers educational empty state', () => {
    const endedList = filterShowtimes({
      showtimesList: sampleShowtimes,
      filterTab: 'ENDED',
      searchText: '',
      selectedMovieId: '',
      currentTime: referenceTime,
    });

    // Zero showtimes because ended movies cannot have schedules
    expect(endedList.length).toBe(0);
  });
});

