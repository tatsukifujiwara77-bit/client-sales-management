/**
 * バックエンドのenum値 ⇔ 画面表示（ラベル・色）の対応表。
 * 複数画面で使い回すため共通化している（設計書 5〜7章準拠）。
 */

import {
  Building2,
  MessageCircle,
  Phone,
  Mail,
  Globe,
  MoreHorizontal,
  Flame,
  Clock,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react';

export type ActivityType = 'visit' | 'meeting' | 'call' | 'email' | 'online' | 'other';

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  visit: '訪問',
  meeting: '商談',
  call: '電話',
  email: 'メール',
  online: 'オンライン',
  other: 'その他',
};

/** 活動種別のバッジ色（Tailwindユーティリティクラス。意味のある配色: 訪問=Blue, 商談=Green, 電話=Orange） */
export const ACTIVITY_TYPE_BADGE_CLASSES: Record<ActivityType, string> = {
  visit: 'bg-info/15 text-info',
  meeting: 'bg-success/15 text-success',
  call: 'bg-warning/20 text-warning-foreground',
  email: 'bg-secondary text-secondary-foreground',
  online: 'bg-accent text-accent-foreground',
  other: 'bg-muted text-muted-foreground',
};

/** 活動種別のタイムライン用ドット色（ダッシュボードの活動履歴タイムラインで使用） */
export const ACTIVITY_TYPE_DOT_CLASSES: Record<ActivityType, string> = {
  visit: 'bg-info',
  meeting: 'bg-success',
  call: 'bg-warning',
  email: 'bg-secondary-foreground/50',
  online: 'bg-accent-foreground',
  other: 'bg-muted-foreground',
};

/** 活動種別のアイコン（クライアント詳細・営業活動一覧で共通利用） */
export const ACTIVITY_TYPE_ICONS: Record<ActivityType, LucideIcon> = {
  visit: Building2,
  meeting: MessageCircle,
  call: Phone,
  email: Mail,
  online: Globe,
  other: MoreHorizontal,
};

export type Temperature = 'high' | 'medium' | 'low' | 'unknown';

export const TEMPERATURE_LABELS: Record<Temperature, string> = {
  high: '高',
  medium: '中',
  low: '低',
  unknown: '不明',
};

/** 温度感を表す絵文字（設計書 6章）。クライアント一覧・営業進捗Kanbanで共通利用する。 */
export const TEMPERATURE_EMOJI: Record<Temperature, string> = {
  high: '🔥',
  medium: '🟡',
  low: '🔵',
  unknown: '⚪',
};

/** 温度感を表す丸アイコンの色（Tailwindユーティリティクラス） */
export const TEMPERATURE_DOT_CLASSES: Record<Temperature, string> = {
  high: 'bg-destructive',
  medium: 'bg-warning',
  low: 'bg-info',
  unknown: 'bg-muted-foreground',
};

export type AlertType = 'overdue' | 'due_today' | 'due_this_week' | 'no_visit';

export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  overdue: '次回アクション期限超過',
  due_today: '今日が期限のアクション',
  due_this_week: '今週期限のアクション',
  no_visit: '3ヶ月訪問なしクライアント',
};

/** アラート種別のアイコン背景（淡いグラデーション。期限超過=Red, 今月/今週=Orange/Blue, 訪問なし=Gray） */
export const ALERT_TYPE_ICON_CLASSES: Record<AlertType, string> = {
  overdue: 'bg-gradient-to-br from-destructive/20 to-destructive/8 text-destructive',
  due_today: 'bg-gradient-to-br from-warning/30 to-warning/10 text-warning-foreground',
  due_this_week: 'bg-gradient-to-br from-info/20 to-info/8 text-info',
  no_visit: 'bg-muted text-muted-foreground',
};

/** アラート種別のアイコン（ダッシュボード・クライアント詳細・アラート一覧で共通利用） */
export const ALERT_TYPE_ICONS: Record<AlertType, LucideIcon> = {
  overdue: Flame,
  due_today: Building2,
  due_this_week: Clock,
  no_visit: AlertTriangle,
};

export type UserRole = 'admin' | 'office_manager' | 'sales_rep';

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: '管理者',
  office_manager: '拠点マネージャー',
  sales_rep: '営業担当',
};

export type NotifyBefore = '1_day' | '3_days' | '1_week' | 'none';

export const NOTIFY_BEFORE_LABELS: Record<NotifyBefore, string> = {
  '1_day': '1日前',
  '3_days': '3日前',
  '1_week': '1週間前',
  none: '通知なし',
};

const WEEKDAY_LABELS_JA = ['日', '月', '火', '水', '木', '金', '土'];

/** 'YYYY-MM-DD' -> 'MM/DD(曜)' */
export function formatDateWithWeekday(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00Z`);
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const weekday = WEEKDAY_LABELS_JA[date.getUTCDay()];
  return `${month}/${day}(${weekday})`;
}

/** 'YYYY-MM-DD' -> 'YYYY/MM/DD' */
export function formatDateSlash(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${y}/${m}/${d}`;
}
