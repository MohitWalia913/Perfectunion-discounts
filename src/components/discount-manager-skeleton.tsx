import { Skeleton } from "@/components/ui/skeleton"

export function DiscountManagerSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-3 w-full max-w-md" />
          </div>
          <Skeleton className="h-9 w-28 shrink-0 rounded-md sm:mt-0" />
        </div>
        <Skeleton className="mt-4 h-10 w-full rounded-lg" />
        <div className="mt-4 flex flex-wrap gap-2">
          <Skeleton className="h-9 w-[110px] rounded-full" />
          <Skeleton className="h-9 w-[100px] rounded-full" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2 border-t border-border/60 pt-4">
          <Skeleton className="h-7 w-28 rounded-full" />
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="h-7 w-32 rounded-full" />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
        <div className="overflow-x-auto">
          <div className="min-w-[720px] border-b border-border bg-muted/50 px-2 py-2">
            <div className="flex items-center gap-2">
              <Skeleton className="size-4 shrink-0 rounded" />
              <Skeleton className="h-3 flex-1 max-w-[26%]" />
              <Skeleton className="h-3 w-[100px]" />
              <Skeleton className="h-3 flex-1 max-w-[22%] hidden sm:block" />
              <Skeleton className="h-3 flex-1 max-w-[16%] hidden md:block" />
              <Skeleton className="size-8 shrink-0 rounded-md" />
            </div>
          </div>
          <div className="divide-y divide-border">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-3">
                <Skeleton className="size-4 shrink-0 rounded" />
                <Skeleton className="h-4 flex-1 max-w-[30%]" />
                <Skeleton className="h-4 w-16 shrink-0 rounded-md" />
                <Skeleton className="h-4 flex-1 max-w-[24%] hidden sm:block" />
                <Skeleton className="h-4 flex-1 max-w-[16%] hidden md:block" />
                <Skeleton className="size-8 shrink-0 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-2 py-2">
        <Skeleton className="h-9 w-24 rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>
    </div>
  )
}
