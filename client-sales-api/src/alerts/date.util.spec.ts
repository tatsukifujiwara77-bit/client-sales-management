import { classifyDueDate, daysBetween, endOfWeekDateString, todayDateString } from './date.util.js';

describe('date.util', () => {
  describe('todayDateString', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns the JST calendar date, not the (one-day-behind) UTC date, in the early-morning JST window', () => {
      // 2026-09-07T20:00:00Z = 2026-09-08 05:00 JST。
      // 以前の実装(UTC基準)だとここで '2026-09-07' を返してしまい、
      // 期限日が前日の未対応アクションが「今日が期限」のまま(本来は期限超過)になっていた。
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-09-07T20:00:00.000Z'));

      expect(todayDateString()).toBe('2026-09-08');
    });

    it('still matches the UTC date once both timezones have rolled over to the same day', () => {
      // 2026-09-08T10:00:00Z = 2026-09-08 19:00 JST(両者ともすでに9/8)
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-09-08T10:00:00.000Z'));

      expect(todayDateString()).toBe('2026-09-08');
    });
  });

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
