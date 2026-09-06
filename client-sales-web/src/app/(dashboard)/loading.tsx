import { Skeleton } from '@/components/ui/skeleton';

/**
 * ページ遷移中に表示されるローディングUI（Next.jsのloading.tsx）。
 * 以前は無地の紺色の四角だけだったため、実際のサイドバー/ヘッダーの形に近い
 * スケルトンにして、遷移が「壊れて見える」ことがないようにしている。
 */
export default function DashboardLoading() {
  return (
    <div className="flex h-svh overflow-hidden bg-background">
      <aside className="hidden w-64 shrink-0 flex-col bg-sidebar p-3 md:flex">
        <div className="flex items-center gap-2.5 px-1 py-4">
          <div className="size-9 shrink-0 animate-pulse rounded-xl bg-white/10" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="h-3 w-28 animate-pulse rounded bg-white/10" />
            <div className="h-2.5 w-20 animate-pulse rounded bg-white/10" />
          </div>
        </div>
        <div className="mt-2 flex flex-1 flex-col gap-1.5">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-9 animate-pulse rounded-xl bg-white/8" />
          ))}
        </div>
        <div className="border-t border-white/10 pt-3">
          <div className="flex items-center gap-2.5 rounded-xl bg-white/5 px-2.5 py-2">
            <div className="size-8 shrink-0 animate-pulse rounded-full bg-white/10" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="h-3 w-20 animate-pulse rounded bg-white/10" />
              <div className="h-2.5 w-14 animate-pulse rounded bg-white/10" />
            </div>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex h-16 shrink-0 items-center gap-4 border-b border-border/70 bg-card px-4 md:px-6">
          <Skeleton className="h-5 w-28 shrink-0" />
          <Skeleton className="ml-auto hidden h-9 max-w-sm flex-1 rounded-full md:block" />
          <Skeleton className="size-8 shrink-0 rounded-full" />
        </div>
        <div className="flex-1 space-y-4 overflow-hidden p-4 md:p-6">
          <Skeleton className="h-36 rounded-2xl" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Skeleton className="h-56 rounded-2xl" />
            <Skeleton className="h-56 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
