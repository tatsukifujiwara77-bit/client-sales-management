'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, LogOut, Menu, Search } from 'lucide-react';
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
import type { MeResponse } from '@/lib/api/types';

interface HeaderProps {
  user: MeResponse;
  alertCount?: number;
}

function initialsFor(fullName: string): string {
  return fullName.trim().slice(0, 1) || '?';
}

export function Header({ user, alertCount }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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

        <Button
          variant="ghost"
          size="icon"
          className="relative ml-auto rounded-full md:ml-0"
          aria-label="通知"
        >
          <Bell className="size-5" />
          {alertCount ? (
            <Badge
              variant="destructive"
              className="absolute -top-0.5 -right-0.5 h-4.5 min-w-4.5 justify-center rounded-full px-1 text-[10px]"
            >
              {alertCount}
            </Badge>
          ) : null}
        </Button>

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
