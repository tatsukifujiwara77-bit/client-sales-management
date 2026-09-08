import {
  LayoutDashboard,
  Users,
  GitBranch,
  Activity,
  ClipboardList,
  Bell,
  Map,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** 左サイドバーのナビゲーション（UI参考画像準拠） */
export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
  { href: '/clients', label: 'クライアント', icon: Users },
  { href: '/sales-progress', label: '営業進捗', icon: GitBranch },
  { href: '/activities', label: '営業活動', icon: Activity },
  { href: '/sales-list', label: '営業リスト', icon: ClipboardList },
  { href: '/alerts', label: 'アラート', icon: Bell },
  { href: '/map', label: '地図', icon: Map },
  { href: '/settings', label: '設定', icon: Settings },
];

/** 現在のパスに一致するナビ項目を返す（ヘッダーのページタイトル表示に使う） */
export function findNavItemForPath(pathname: string): NavItem | undefined {
  return NAV_ITEMS.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
}
