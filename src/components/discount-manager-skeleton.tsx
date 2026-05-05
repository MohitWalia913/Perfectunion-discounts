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
        <div className="flex items-center gap-3 bg-[#0C3D22] px-3 py-3">
          <Skeleton className="h-4 w-4 shrink-0 rounded bg-white/25" />
          <Skeleton className="h-3 flex-1 max-w-[28%] rounded bg-white/25" />
          <Skeleton className="h-3 w-[10%] rounded bg-white/25" />
          <Skeleton className="h-3 flex-1 max-w-[22%] rounded bg-white/25 hidden sm:block" />
          <Skeleton className="h-3 flex-1 max-w-[18%] rounded bg-white/25 hidden md:block" />
          <Skeleton className="h-3 w-12 rounded bg-white/25 shrink-0" />
        </div>
        <div className="divide-y divide-border p-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-3 first:pt-1">
              <Skeleton className="h-4 w-4 shrink-0 rounded" />
              <Skeleton className="h-4 flex-1 max-w-[32%]" />
              <Skeleton className="h-4 w-14 shrink-0" />
              <Skeleton className="h-4 flex-1 max-w-[26%] hidden sm:block" />
              <Skeleton className="h-4 flex-1 max-w-[18%] hidden md:block" />
              <Skeleton className="h-8 w-16 shrink-0 rounded-md" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center gap-2 py-2">
        <Skeleton className="h-9 w-24 rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>
    </div>
  )
}
