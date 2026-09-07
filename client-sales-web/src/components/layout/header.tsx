'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AlertTriangle, Bell, CalendarClock, Clock, LogOut, Menu, Search, UserCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { findNavItemForPath } from './nav-items';
import { MobileNav } from './sidebar';
import type { AlertCounts, MeResponse } from '@/lib/api/types';

interface HeaderProps {
  user: MeResponse;
  alertCount?: number;
  alertCounts?: AlertCounts;
  /** 承認待ちユーザー数。管理者以外にはundefined(通知メニューにも出さない)。 */
  pendingUsersCount?: number;
}

function initialsFor(fullName: string): string {
  return fullName.trim().slice(0, 1) || '?';
}

function NotificationRow({
  icon: Icon,
  label,
  count,
  href,
}: {
  icon: typeof Bell;
  label: string;
  count: number;
  href: string;
}) {
  return (
    <DropdownMenuItem render={<Link href={href} />} className="justify-between">
      <span className="flex items-center gap-1.5">
        <Icon className="size-4 text-muted-foreground" />
        {label}
      </span>
      <Badge variant="destructive" className="h-5 min-w-5 justify-center rounded-full px-1.5">
        {count}
      </Badge>
    </DropdownMenuItem>
  );
}

export function Header({ user, alertCount, alertCounts, pendingUsersCount }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const notificationTotal = (alertCount ?? 0) + (pendingUsersCount ?? 0);

  const title = findNavItemForPath(pathname)?.label ?? 'クライアント営業管理';

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border/70 bg-card/95 px-4 backdrop-blur-sm md:px-6">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileNavOpen(true)}
          aria-label="メニューを開く"
        >
          <Menu className="size-5" />
        </Button>

        <h1 className="hidden shrink-0 text-lg font-semibold text-foreground md:block">{title}</h1>

        <div className="relative ml-auto hidden max-w-sm flex-1 md:block">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="クライアント名、担当者名で検索"
            className="h-9 rounded-full border-transparent bg-muted/70 pl-9.5 shadow-none focus-visible:border-ring focus-visible:bg-background"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon" className="relative ml-auto rounded-full md:ml-0" />}
            aria-label="通知"
          >
            <Bell className="size-5" />
            {notificationTotal ? (
              <Badge
                variant="destructive"
                className="absolute -top-0.5 -right-0.5 h-4.5 min-w-4.5 justify-center rounded-full px-1 text-[10px]"
              >
                {notificationTotal}
              </Badge>
            ) : null}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="font-normal text-muted-foreground">通知</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notificationTotal === 0 ? (
              <p className="px-1.5 py-3 text-center text-sm text-muted-foreground">新しい通知はありません</p>
            ) : (
              <>
                {alertCounts?.overdue ? (
                  <NotificationRow
                    icon={AlertTriangle}
                    label="次回アクション期限超過"
                    count={alertCounts.overdue}
                    href="/alerts?alertType=overdue"
                  />
                ) : null}
                {alertCounts?.dueToday ? (
                  <NotificationRow
                    icon={Clock}
                    label="今日が期限のアクション"
                    count={alertCounts.dueToday}
                    href="/alerts?alertType=due_today"
                  />
                ) : null}
                {alertCounts?.dueThisWeek ? (
                  <NotificationRow
                    icon={CalendarClock}
                    label="今週期限のアクション"
                    count={alertCounts.dueThisWeek}
                    href="/alerts?alertType=due_this_week"
                  />
                ) : null}
                {alertCounts?.noVisit ? (
                  <NotificationRow
                    icon={AlertTriangle}
                    label="3ヶ月訪問なしクライアント"
                    count={alertCounts.noVisit}
                    href="/alerts?alertType=no_visit"
                  />
                ) : null}
                {pendingUsersCount ? (
                  <NotificationRow
                    icon={UserCheck}
                    label="承認待ちユーザー"
                    count={pendingUsersCount}
                    href="/settings"
                  />
                ) : null}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-3 rounded-full px-2 py-1 transition-colors hover:bg-accent">
            <Avatar className="size-8">
              <AvatarFallback className="bg-gradient-to-br from-[oklch(0.62_0.18_255)] to-[oklch(0.55_0.19_292)] text-white text-xs">
                {initialsFor(user.fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="hidden min-w-0 text-left sm:block">
              <p className="truncate text-sm leading-tight font-medium">{user.fullName}</p>
              <p className="truncate text-xs leading-tight text-muted-foreground">{user.office?.name ?? '—'}</p>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium">{user.fullName}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="size-4" />
              ログアウト
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <MobileNav user={user} alertCount={alertCount} open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
    </>
  );
}
