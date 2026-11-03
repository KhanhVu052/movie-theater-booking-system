import { describe, it, expect } from 'vitest';
import {
  toggleSeatSelection,
  calculateHoldTimeRemaining,
  MAX_SEATS_PER_BOOKING,
} from '../utils/bookingUtils';

describe('Seat Selection & 10-Minute Hold Engine (FR-BOOK-01, FR-BOOK-02)', () => {
  it('allows selecting seats up to the maximum limit of 8 seats', () => {
    let selected = [];

    for (let i = 1; i <= MAX_SEATS_PER_BOOKING; i++) {
      const outcome = toggleSeatSelection(selected, i);
      expect(outcome.success).toBe(true);
      selected = outcome.selectedSeatIds;
    }

    expect(selected.length).toBe(8);

    // Attempting to select 9th seat must fail
    const ninthSeat = toggleSeatSelection(selected, 9);
    expect(ninthSeat.success).toBe(false);
    expect(ninthSeat.error).toContain('up to 8 seats');
    expect(ninthSeat.selectedSeatIds.length).toBe(8);
  });

  it('allows unselecting already selected seats', () => {
    const initial = [1, 2, 3];
    const outcome = toggleSeatSelection(initial, 2);

    expect(outcome.success).toBe(true);
    expect(outcome.selectedSeatIds).toEqual([1, 3]);
  });

  describe('10-Minute Hold Timer Logic (FR-BOOK-02)', () => {
    it('accurately calculates remaining minutes and seconds', () => {
      const now = 1700000000000;
      // Expires 9 minutes and 30 seconds from now (570 seconds)
      const expiresAt = new Date(now + 570 * 1000).toISOString();

      const timer = calculateHoldTimeRemaining(expiresAt, now);
      expect(timer.isExpired).toBe(false);
      expect(timer.secondsRemaining).toBe(570);
      expect(timer.formatted).toBe('09:30');
    });

    it('flags reservation as expired when timestamp has passed', () => {
      const now = 1700000000000;
      // Expired 10 seconds ago
      const expiresAt = new Date(now - 10 * 1000).toISOString();

      const timer = calculateHoldTimeRemaining(expiresAt, now);
      expect(timer.isExpired).toBe(true);
      expect(timer.secondsRemaining).toBe(0);
      expect(timer.formatted).toBe('00:00');
    });
  });
});
