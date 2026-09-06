'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Building2, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { NAV_ITEMS } from './nav-items';
import type { MeResponse } from '@/lib/api/types';

interface SidebarProps {
  user: MeResponse;
  alertCount?: number;
}

function initialsFor(fullName: string): string {
  return fullName.trim().slice(0, 1) || '?';
}

function NavList({ alertCount, onNavigate }: { alertCount?: number; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-150',
              isActive
                ? 'bg-gradient-to-r from-[oklch(0.58_0.19_258)] to-[oklch(0.55_0.19_292)] text-white shadow-soft'
                : 'text-sidebar-foreground/70 hover:translate-x-0.5 hover:bg-white/8 hover:text-sidebar-foreground',
            )}
          >
            <Icon className="size-4.5 shrink-0" />
            <span className="flex-1">{item.label}</span>
            {item.href === '/alerts' && alertCount ? (
              <Badge
                variant="destructive"
                className={cn(
                  'h-5 min-w-5 justify-center rounded-full px-1 text-xs',
                  isActive && 'bg-white/25 text-white',
                )}
              >
                {alertCount}
              </Badge>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

function UserCard({ user }: { user: MeResponse }) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2 border-t border-sidebar-border px-3 py-3">
      <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2">
        <Avatar className="size-8">
          <AvatarFallback className="bg-gradient-to-br from-[oklch(0.58_0.19_258)] to-[oklch(0.55_0.19_292)] text-white text-xs">
            {initialsFor(user.fullName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-sidebar-foreground">{user.fullName}</p>
          <p className="truncate text-xs text-sidebar-foreground/60">{user.office?.name ?? '—'}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={handleLogout}
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-sidebar-foreground/60 transition-colors hover:bg-white/8 hover:text-sidebar-foreground"
      >
        <LogOut className="size-3.5" />
        ログアウト
      </button>
    </div>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-3 px-4 py-5">
      <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-[oklch(0.62_0.18_255)] to-[oklch(0.55_0.19_292)] text-white shadow-soft">
        <Building2 className="size-4.5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-sidebar-foreground">GMO CONNECT HR</p>
        <p className="truncate text-[11px] text-sidebar-foreground/60">営業管理システム</p>
      </div>
    </div>
  );
}

/** サイドバー背景の柔らかい装飾光（派手すぎない程度のグラデーション演出） */
function SidebarGlow() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-24 -left-16 size-64 rounded-full bg-[oklch(0.55_0.19_292)]/25 blur-3xl" />
      <div className="absolute top-1/2 -right-20 size-72 rounded-full bg-[oklch(0.58_0.19_258)]/15 blur-3xl" />
    </div>
  );
}

/** デスクトップ用の固定サイドバー（設計書 11.3「PC」レイアウト準拠） */
export function Sidebar({ user, alertCount }: SidebarProps) {
  return (
    <aside className="relative hidden w-64 shrink-0 flex-col overflow-hidden bg-sidebar text-sidebar-foreground md:flex">
      <SidebarGlow />
      <div className="relative z-10 flex h-full flex-col">
        <Logo />
        <NavList alertCount={alertCount} />
        <UserCard user={user} />
      </div>
    </aside>
  );
}

/** スマホ・タブレット用のドロワー式ナビ（Header のハンバーガーから開く） */
export function MobileNav({
  user,
  alertCount,
  open,
  onOpenChange,
}: SidebarProps & { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="relative w-64 overflow-hidden border-none bg-sidebar p-0 text-sidebar-foreground">
        <SheetTitle className="sr-only">メニュー</SheetTitle>
        <SidebarGlow />
        <div className="relative z-10 flex h-full flex-col">
          <Logo />
          <NavList alertCount={alertCount} onNavigate={() => onOpenChange(false)} />
          <UserCard user={user} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
