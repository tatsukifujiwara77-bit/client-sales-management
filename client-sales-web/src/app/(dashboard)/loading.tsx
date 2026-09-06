import { Skeleton } from '@/components/ui/skeleton';

/**
 * ページ遷移中に表示されるローディングUI（Next.jsのloading.tsx）。
 *
 * 重要: このファイルは (dashboard)/layout.tsx の `{children}` スロットの中身だけを
 * 置き換える（サイドバー/ヘッダーは常にlayout.tsx側の実物がそのまま表示され続け、
 * この中身はそのmainの内側にそのまま差し込まれる）。そのため、ここにサイドバーや
 * ヘッダーのモックを含めてはいけない（含めると、本物のレイアウトの内側に偽の
 * サイドバーが二重に描画され、崩れて見える）。
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-12 w-full rounded-xl" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  );
}
