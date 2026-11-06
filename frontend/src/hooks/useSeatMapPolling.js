import { useEffect, useRef, useCallback } from 'react';
import { movieApi } from '../api/movieApi';

export class SeatMapPoller {
  constructor(options = {}) {
    this.showtimeId = options.showtimeId;
    this.intervalMs = options.intervalMs ?? 8000;
    this.enabled = options.enabled ?? true;
    this.onSeatsUpdated = options.onSeatsUpdated;
    this.onSeatUnavailable = options.onSeatUnavailable;
    this.selectedSeatIds = options.selectedSeatIds ?? [];
    this.getSeats = options.getSeats ?? movieApi.getShowtimeSeats;
    this.doc = options.doc ?? (typeof document !== 'undefined' ? document : null);

    this.timerId = null;
    this.isPolling = false;
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
  }

  updateOptions(options = {}) {
    if (options.showtimeId !== undefined) this.showtimeId = options.showtimeId;
    if (options.intervalMs !== undefined) this.intervalMs = options.intervalMs;
    if (options.enabled !== undefined) this.enabled = options.enabled;
    if (options.onSeatsUpdated !== undefined) this.onSeatsUpdated = options.onSeatsUpdated;
    if (options.onSeatUnavailable !== undefined) this.onSeatUnavailable = options.onSeatUnavailable;
    if (options.selectedSeatIds !== undefined) this.selectedSeatIds = options.selectedSeatIds;
  }

  async poll() {
    if (!this.showtimeId || !this.enabled) return;
    if (this.doc && this.doc.hidden) return;
    if (this.isPolling) return;

    this.isPolling = true;
    try {
      const res = await this.getSeats(this.showtimeId);
      const rawSeats = res?.data?.data ?? res?.data;
      if (Array.isArray(rawSeats)) {
        if (this.selectedSeatIds && this.selectedSeatIds.length > 0) {
          const seatMap = new Map(rawSeats.map((s) => [s.id, s]));
          const unavailableSeats = [];

          this.selectedSeatIds.forEach((id) => {
            const seat = seatMap.get(id);
            if (seat && (seat.status !== 'AVAILABLE' || seat.selectable === false)) {
              unavailableSeats.push(seat);
            }
          });

          if (unavailableSeats.length > 0 && typeof this.onSeatUnavailable === 'function') {
            this.onSeatUnavailable(unavailableSeats, rawSeats);
          }
        }

        if (typeof this.onSeatsUpdated === 'function') {
          this.onSeatsUpdated(rawSeats);
        }
      }
    } catch {
      // Keep existing data on network error
    } finally {
      this.isPolling = false;
    }
  }

  startTimer() {
    if (this.timerId || !this.enabled || !this.showtimeId) return;

    this.timerId = setInterval(() => {
      if (!this.doc || !this.doc.hidden) {
        this.poll();
      }
    }, this.intervalMs);
  }

  stopTimer() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  handleVisibilityChange() {
    if (this.doc && this.doc.hidden) {
      this.stopTimer();
    } else {
      this.poll();
      this.startTimer();
    }
  }

  start() {
    if (!this.enabled || !this.showtimeId) return;

    this.startTimer();
    if (this.doc && this.doc.addEventListener) {
      this.doc.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  stop() {
    this.stopTimer();
    if (this.doc && this.doc.removeEventListener) {
      this.doc.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }
}

const DEFAULT_EMPTY_ARRAY = [];

export function useSeatMapPolling(
  showtimeId,
  callbackOrOptions,
  maybeIntervalMs = 8000,
  maybeOptions = {}
) {
  let onSeatsUpdated = null;
  let intervalMs = 8000;
  let enabled = true;
  let selectedSeatIds = DEFAULT_EMPTY_ARRAY;
  let onSeatUnavailable = null;

  if (typeof callbackOrOptions === 'function') {
    onSeatsUpdated = callbackOrOptions;
    if (typeof maybeIntervalMs === 'number') {
      intervalMs = maybeIntervalMs;
      if (maybeOptions && typeof maybeOptions === 'object') {
        enabled = maybeOptions.enabled ?? true;
        selectedSeatIds = maybeOptions.selectedSeatIds ?? DEFAULT_EMPTY_ARRAY;
        onSeatUnavailable = maybeOptions.onSeatUnavailable ?? null;
      }
    } else if (maybeIntervalMs && typeof maybeIntervalMs === 'object') {
      enabled = maybeIntervalMs.enabled ?? true;
      intervalMs = maybeIntervalMs.intervalMs ?? 8000;
      selectedSeatIds = maybeIntervalMs.selectedSeatIds ?? DEFAULT_EMPTY_ARRAY;
      onSeatUnavailable = maybeIntervalMs.onSeatUnavailable ?? null;
    }
  } else if (callbackOrOptions && typeof callbackOrOptions === 'object') {
    onSeatsUpdated = callbackOrOptions.onSeatsUpdated;
    enabled = callbackOrOptions.enabled ?? true;
    intervalMs = callbackOrOptions.intervalMs ?? 8000;
    selectedSeatIds = callbackOrOptions.selectedSeatIds ?? DEFAULT_EMPTY_ARRAY;
    onSeatUnavailable = callbackOrOptions.onSeatUnavailable ?? null;
  }

  const pollerRef = useRef(null);

  useEffect(() => {
    const poller = new SeatMapPoller({
      showtimeId,
      intervalMs,
      enabled,
      onSeatsUpdated,
      onSeatUnavailable,
      selectedSeatIds,
    });
    pollerRef.current = poller;
    poller.start();

    return () => {
      poller.stop();
      pollerRef.current = null;
    };
  }, [showtimeId, intervalMs, enabled, onSeatsUpdated, onSeatUnavailable, selectedSeatIds]);

  const pollSeats = useCallback(() => {
    if (pollerRef.current) {
      return pollerRef.current.poll();
    }
  }, []);

  return { pollSeats };
}

export default useSeatMapPolling;
