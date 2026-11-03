import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatHour,
  formatDate,
  formatDateTime,
} from '../utils/formatters';

describe('Formatters Utility', () => {
  describe('formatCurrency', () => {
    it('formats numbers with thousand commas and VND suffix', () => {
      expect(formatCurrency(80000)).toBe('80,000 VND');
      expect(formatCurrency(1250000)).toBe('1,250,000 VND');
    });

    it('handles zero correctly', () => {
      expect(formatCurrency(0)).toBe('0 VND');
    });

    it('gracefully handles null and undefined', () => {
      expect(formatCurrency(null)).toBe('0 VND');
      expect(formatCurrency(undefined)).toBe('0 VND');
      expect(formatCurrency('abc')).toBe('0 VND');
    });
  });

  describe('formatHour', () => {
    it('formats ISO string to 24h HH:mm', () => {
      const iso = '2026-11-20T19:30:00';
      const result = formatHour(iso);
      expect(result).toBe('19:30');
    });

    it('returns empty string for null or invalid inputs', () => {
      expect(formatHour(null)).toBe('');
      expect(formatHour('')).toBe('');
      expect(formatHour('invalid-date')).toBe('');
    });
  });

  describe('formatDate', () => {
    it('formats ISO string into readable weekday and date', () => {
      const iso = '2026-11-20T19:30:00';
      const result = formatDate(iso);
      expect(result).toContain('Nov');
      expect(result).toContain('20');
      expect(result).toContain('2026');
    });

    it('returns empty string on empty input', () => {
      expect(formatDate(null)).toBe('');
      expect(formatDate('')).toBe('');
    });
  });

  describe('formatDateTime', () => {
    it('formats date and time together', () => {
      const iso = '2026-11-20T19:30:00';
      const result = formatDateTime(iso);
      expect(result).toContain('Nov');
      expect(result).toContain('19:30');
    });
  });
});
