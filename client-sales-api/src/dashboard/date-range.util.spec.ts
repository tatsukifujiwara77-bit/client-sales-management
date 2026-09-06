import { currentMonthRange, percentChange, previousMonthRange } from './date-range.util.js';

describe('date-range.util', () => {
  describe('currentMonthRange / previousMonthRange', () => {
    it('resolves the first and last day of the month', () => {
      const reference = new Date('2026-05-20T00:00:00Z');
      expect(currentMonthRange(reference)).toEqual({ start: '2026-05-01', end: '2026-05-31' });
      expect(previousMonthRange(reference)).toEqual({ start: '2026-04-01', end: '2026-04-30' });
    });

    it('handles the year boundary (January -> previous December)', () => {
      const reference = new Date('2026-01-15T00:00:00Z');
      expect(currentMonthRange(reference)).toEqual({ start: '2026-01-01', end: '2026-01-31' });
      expect(previousMonthRange(reference)).toEqual({ start: '2025-12-01', end: '2025-12-31' });
    });
  });

  describe('percentChange', () => {
    it('computes a rounded percentage change', () => {
      expect(percentChange(12, 10)).toBe(20);
      expect(percentChange(8, 10)).toBe(-20);
    });

    it('returns null when the previous value is 0 (division by zero)', () => {
      expect(percentChange(5, 0)).toBeNull();
      expect(percentChange(0, 0)).toBeNull();
    });
  });
});
