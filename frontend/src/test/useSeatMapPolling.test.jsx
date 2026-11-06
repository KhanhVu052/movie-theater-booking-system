import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SeatMapPoller } from '../hooks/useSeatMapPolling';

describe('SeatMapPoller / useSeatMapPolling (G4-04)', () => {
  let mockDoc;
  let listeners;

  beforeEach(() => {
    vi.useFakeTimers();
    listeners = {};
    mockDoc = {
      hidden: false,
      addEventListener: vi.fn((event, handler) => {
        listeners[event] = handler;
      }),
      removeEventListener: vi.fn((event) => {
        delete listeners[event];
      }),
      dispatch: (event) => {
        if (listeners[event]) listeners[event]();
      },
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('periodically polls showtime seats every 8000ms', async () => {
    const mockGetSeats = vi.fn().mockResolvedValue({
      data: {
        data: [
          { id: 1, rowName: 'A', seatNumber: 1, status: 'AVAILABLE', selectable: true },
          { id: 2, rowName: 'A', seatNumber: 2, status: 'AVAILABLE', selectable: true },
        ],
      },
    });
    const onSeatsUpdated = vi.fn();

    const poller = new SeatMapPoller({
      showtimeId: 99,
      intervalMs: 8000,
      enabled: true,
      onSeatsUpdated,
      getSeats: mockGetSeats,
      doc: mockDoc,
    });

    poller.start();

    // Before timer advances -> no polling yet
    expect(mockGetSeats).not.toHaveBeenCalled();

    // Advance 8000ms -> 1st poll
    await vi.advanceTimersByTimeAsync(8000);
    expect(mockGetSeats).toHaveBeenCalledTimes(1);
    expect(mockGetSeats).toHaveBeenCalledWith(99);
    expect(onSeatsUpdated).toHaveBeenCalledTimes(1);

    // Advance another 8000ms -> 2nd poll
    await vi.advanceTimersByTimeAsync(8000);
    expect(mockGetSeats).toHaveBeenCalledTimes(2);

    poller.stop();
  });

  it('pauses polling when document is hidden and triggers immediately when visible', async () => {
    const mockGetSeats = vi.fn().mockResolvedValue({
      data: { data: [] },
    });

    const poller = new SeatMapPoller({
      showtimeId: 99,
      intervalMs: 8000,
      enabled: true,
      getSeats: mockGetSeats,
      doc: mockDoc,
    });

    poller.start();

    // Tab switched away: hidden = true
    mockDoc.hidden = true;
    mockDoc.dispatch('visibilitychange');

    // Advance 16000ms -> should NOT poll while hidden
    await vi.advanceTimersByTimeAsync(16000);
    expect(mockGetSeats).not.toHaveBeenCalled();

    // Tab returned: hidden = false
    mockDoc.hidden = false;
    mockDoc.dispatch('visibilitychange');

    // Immediate poll triggered upon returning
    expect(mockGetSeats).toHaveBeenCalledTimes(1);

    poller.stop();
  });

  it('notifies and identifies unavailable seats when selected seat status changes', async () => {
    const mockGetSeats = vi.fn().mockResolvedValue({
      data: {
        data: [
          { id: 10, rowName: 'B', seatNumber: 1, status: 'HELD', selectable: false },
          { id: 11, rowName: 'B', seatNumber: 2, status: 'AVAILABLE', selectable: true },
        ],
      },
    });
    const onSeatUnavailable = vi.fn();
    const onSeatsUpdated = vi.fn();

    const poller = new SeatMapPoller({
      showtimeId: 99,
      intervalMs: 8000,
      enabled: true,
      selectedSeatIds: [10, 11],
      onSeatUnavailable,
      onSeatsUpdated,
      getSeats: mockGetSeats,
      doc: mockDoc,
    });

    poller.start();
    await vi.advanceTimersByTimeAsync(8000);

    expect(onSeatUnavailable).toHaveBeenCalledTimes(1);
    const [unavailableList] = onSeatUnavailable.mock.calls[0];
    expect(unavailableList.map((s) => s.id)).toEqual([10]);
    expect(onSeatsUpdated).toHaveBeenCalledTimes(1);

    poller.stop();
  });

  it('properly cleans up timer and event listeners on stop', () => {
    const poller = new SeatMapPoller({
      showtimeId: 99,
      intervalMs: 8000,
      enabled: true,
      doc: mockDoc,
    });

    poller.start();
    expect(mockDoc.addEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));

    poller.stop();
    expect(mockDoc.removeEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    expect(poller.timerId).toBeNull();
  });
});
