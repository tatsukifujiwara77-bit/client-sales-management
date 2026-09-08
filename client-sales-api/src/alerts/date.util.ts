/**
 * アラート判定用の日付ユーティリティ。
 * すべて 'YYYY-MM-DD' 形式の文字列（DBのdate型と同じ形）で扱う。
 * 文字列比較で日付の前後判定ができるため、Dateオブジェクトへの変換は
 * 「今日」「週末」の算出時のみ行う。
 */

export type DueDateBucket = 'overdue' | 'due_today' | 'due_this_week';

/**
 * 「今日」の日付文字列(JST基準)を返す。
 *
 * 以前は new Date().toISOString().slice(0, 10) でUTC基準の日付を使っていたが、
 * サーバーはUTCで動作しているため、JSTで日付が変わってからUTCが追いつくまでの
 * 毎日00:00〜09:00(JST)の間、「今日」が実際より1日古く判定されてしまっていた
 * (例: 期限日が前日で未対応の次回アクションが、本来「次回アクション期限超過」に
 * なるべきところ「今日が期限のアクション」のままになる)。このアプリの利用者は
 * 全員日本国内のため、JST基準で「今日」を求める。
 */
export function todayDateString(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(new Date());
}

/** 今週の終わり(日曜日)を 'YYYY-MM-DD' で返す */
export function endOfWeekDateString(todayStr: string): string {
  const today = new Date(`${todayStr}T00:00:00Z`);
  const dayOfWeek = today.getUTCDay(); // 0=日曜 .. 6=土曜
  const daysUntilSunday = (7 - dayOfWeek) % 7;
  const end = new Date(today);
  end.setUTCDate(end.getUTCDate() + daysUntilSunday);
  return end.toISOString().slice(0, 10);
}

/**
 * 次回アクションの対応予定日を、設計書 7.2 の表示区分に分類する。
 * どの区分にも該当しない（来週以降）場合は null。
 */
export function classifyDueDate(dueDate: string, todayStr: string = todayDateString()): DueDateBucket | null {
  if (dueDate < todayStr) return 'overdue';
  if (dueDate === todayStr) return 'due_today';
  const endOfWeek = endOfWeekDateString(todayStr);
  if (dueDate <= endOfWeek) return 'due_this_week';
  return null;
}

/** fromDateStr から toDateStr までの日数（toDateStrの方が後なら正の値） */
export function daysBetween(fromDateStr: string, toDateStr: string): number {
  const from = new Date(`${fromDateStr}T00:00:00Z`).getTime();
  const to = new Date(`${toDateStr}T00:00:00Z`).getTime();
  return Math.round((to - from) / (24 * 60 * 60 * 1000));
}
