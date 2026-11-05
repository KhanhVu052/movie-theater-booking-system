import { describe, it, expect, vi, afterEach } from 'vitest';
import { toLocalDateStr, localDateStrFromToday } from '../utils/dates';

describe('Dates Utility', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('toLocalDateStr', () => {
    it('formats a local date as YYYY-MM-DD with zero padding', () => {
      expect(toLocalDateStr(new Date(2026, 0, 5, 10, 30))).toBe('2026-01-05');
      expect(toLocalDateStr(new Date(2026, 10, 25, 23, 59))).toBe('2026-11-25');
    });

    it('uses the local calendar day, not the UTC day (00:30 local stays on the same date)', () => {
      expect(toLocalDateStr(new Date(2026, 5, 15, 0, 30))).toBe('2026-06-15');
    });

    it('keeps late-night local time on the same date', () => {
      expect(toLocalDateStr(new Date(2026, 5, 15, 23, 59, 59))).toBe('2026-06-15');
    });
  });

  describe('localDateStrFromToday', () => {
    it('returns today for offset 0 and handles month rollover', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 0, 31, 0, 30));
      expect(localDateStrFromToday(0)).toBe('2026-01-31');
      expect(localDateStrFromToday(1)).toBe('2026-02-01');
    });

    it('supports negative offsets (e.g. last 30 days for reports)', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 2, 1, 12, 0));
      expect(localDateStrFromToday(-1)).toBe('2026-02-28');
    });
  });
});
