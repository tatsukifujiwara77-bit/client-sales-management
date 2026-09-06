/** ダッシュボードKPI（今月の営業活動）用の月次期間ユーティリティ。'YYYY-MM-DD' で扱う。 */

export interface DateRange {
  start: string;
  end: string;
}

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function currentMonthRange(referenceDate: Date = new Date()): DateRange {
  const year = referenceDate.getUTCFullYear();
  const month = referenceDate.getUTCMonth();
  return {
    start: toDateString(new Date(Date.UTC(year, month, 1))),
    end: toDateString(new Date(Date.UTC(year, month + 1, 0))),
  };
}

export function previousMonthRange(referenceDate: Date = new Date()): DateRange {
  const year = referenceDate.getUTCFullYear();
  const month = referenceDate.getUTCMonth();
  return {
    start: toDateString(new Date(Date.UTC(year, month - 1, 1))),
    end: toDateString(new Date(Date.UTC(year, month, 0))),
  };
}

/**
 * 前月比の変化率(%)。前月が0件の場合は意味のある割合が出せないため null を返す
 * （フロント側で「新規」等の表示に使う想定）。
 */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) {
    return null;
  }
  return Math.round(((current - previous) / previous) * 100);
}
