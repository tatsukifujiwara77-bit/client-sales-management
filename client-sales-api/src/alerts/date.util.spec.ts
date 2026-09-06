import { classifyDueDate, daysBetween, endOfWeekDateString } from './date.util.js';

describe('date.util', () => {
  describe('classifyDueDate', () => {
    it('classifies a past date as overdue', () => {
      expect(classifyDueDate('2026-05-19', '2026-05-20')).toBe('overdue');
    });

    it('classifies today as due_today', () => {
      expect(classifyDueDate('2026-05-20', '2026-05-20')).toBe('due_today');
    });

    it('classifies a date later this week as due_this_week', () => {
      // 2026-05-20 is a Wednesday; Sunday 2026-05-24 is the end of that week
      expect(classifyDueDate('2026-05-22', '2026-05-20')).toBe('due_this_week');
    });

    it('returns null for a date beyond this week', () => {
      expect(classifyDueDate('2026-05-25', '2026-05-20')).toBeNull();
    });

    it('treats the end of the week (Sunday) itself as due_this_week', () => {
      expect(classifyDueDate('2026-05-24', '2026-05-20')).toBe('due_this_week');
    });
  });

  describe('endOfWeekDateString', () => {
    it('resolves to the coming Sunday', () => {
      expect(endOfWeekDateString('2026-05-20')).toBe('2026-05-24');
    });

    it('resolves to itself when today is already Sunday', () => {
      expect(endOfWeekDateString('2026-05-24')).toBe('2026-05-24');
    });
  });

  describe('daysBetween', () => {
    it('computes the number of days between two dates', () => {
      expect(daysBetween('2026-05-01', '2026-05-20')).toBe(19);
    });
  });
});
