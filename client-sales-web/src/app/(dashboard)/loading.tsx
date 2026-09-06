import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <div className="flex h-svh bg-background">
      <div className="hidden w-64 shrink-0 bg-sidebar md:block" />
      <div className="flex flex-1 flex-col">
        <div className="flex h-16 shrink-0 items-center border-b border-border bg-card px-6">
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="flex-1 space-y-4 p-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
