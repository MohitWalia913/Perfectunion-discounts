"use client"

import * as React from "react"
import { DashboardShell } from "@/components/dashboard-shell"
import { DiscountManagerClient } from "@/components/discount-manager-client"
import { DiscountManagerSkeleton } from "@/components/discount-manager-skeleton"
import { Button } from "@/components/ui/button"
import {
  DISCOUNT_CACHE_TTL_MS,
  isDiscountCacheStale,
  readDiscountCache,
  writeDiscountCache,
} from "@/lib/discount-cache"
import { cn } from "@/lib/utils"
import { RefreshCwIcon } from "lucide-react"
import { toast } from "sonner"

function formatUpdatedLabel(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return "just now"
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} min ago`
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)} hr ago`
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

async function fetchDiscountRows(): Promise<
  | { ok: true; rows: Record<string, unknown>[] }
  | { ok: false; error: string; status?: number }
> {
  const res = await fetch("/api/discounts", { cache: "no-store" })
  const data = await res.json()
  if (!data.ok) {
    return {
      ok: false,
      error: typeof data.error === "string" ? data.error : "Failed to load discounts",
      status: data.status,
    }
  }
  return { ok: true, rows: Array.isArray(data.rows) ? data.rows : [] }
}

export function DiscountDashboardView() {
  const [rows, setRows] = React.useState<Record<string, unknown>[]>([])
  const [error, setError] = React.useState<string | null>(null)
  const [status, setStatus] = React.useState<number | undefined>()
  const [showSkeleton, setShowSkeleton] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [lastFetchedAt, setLastFetchedAt] = React.useState<number | null>(null)
  const mounted = React.useRef(false)
  const rowsRef = React.useRef(rows)
  rowsRef.current = rows

  const runFetch = React.useCallback(async (manual: boolean) => {
    if (manual) setRefreshing(true)
    try {
      const result = await fetchDiscountRows()
      if (!result.ok) {
        setShowSkeleton(false)
        const hasRows = rowsRef.current.length > 0
        if (hasRows) {
          toast.error("Could not refresh discounts", { description: result.error })
          return
        }
        setError(result.error)
        setStatus(result.status)
        if (manual) {
          toast.error("Could not refresh discounts", { description: result.error })
        }
        return
      }
      setRows(result.rows)
      writeDiscountCache(result.rows)
      const now = Date.now()
      setLastFetchedAt(now)
      setError(null)
      setStatus(undefined)
      setShowSkeleton(false)
      if (manual) toast.success("Discounts updated")
    } catch (e) {
      const msg = (e as Error).message || "Network error"
      setShowSkeleton(false)
      const hasRows = rowsRef.current.length > 0
      if (hasRows) {
        toast.error("Could not refresh discounts", { description: msg })
        return
      }
      setError(msg)
      if (manual) toast.error("Could not refresh discounts", { description: msg })
    } finally {
      if (manual) setRefreshing(false)
    }
  }, [])

  React.useLayoutEffect(() => {
    const cached = readDiscountCache()
    if (cached?.rows && !isDiscountCacheStale(cached.fetchedAt)) {
      setRows(cached.rows)
      setLastFetchedAt(cached.fetchedAt)
      setShowSkeleton(false)
      setError(null)
      return
    }
    if (cached?.rows && isDiscountCacheStale(cached.fetchedAt)) {
      setRows(cached.rows)
      setLastFetchedAt(cached.fetchedAt)
      setShowSkeleton(false)
      void runFetch(false)
      return
    }
    setShowSkeleton(true)
    void runFetch(false)
  }, [runFetch])

  React.useEffect(() => {
    mounted.current = true
    const interval = window.setInterval(() => {
      if (!mounted.current || document.visibilityState !== "visible") return
      const c = readDiscountCache()
      if (c && isDiscountCacheStale(c.fetchedAt)) {
        void runFetch(false)
      }
    }, 5 * 60 * 1000)

    const onVisible = () => {
      if (document.visibilityState !== "visible") return
      const c = readDiscountCache()
      if (c && isDiscountCacheStale(c.fetchedAt)) {
        void runFetch(false)
      }
    }
    document.addEventListener("visibilitychange", onVisible)

    return () => {
      mounted.current = false
      window.clearInterval(interval)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [runFetch])

  const subtitle =
    lastFetchedAt !== null && !showSkeleton ? (
      <p className="mt-2 text-xs text-muted-foreground">
        {rows.length} discount{rows.length === 1 ? "" : "s"} · Last updated {formatUpdatedLabel(lastFetchedAt)}
        {Date.now() - lastFetchedAt < DISCOUNT_CACHE_TTL_MS ? (
          <span className="text-muted-foreground/85"> · Refreshes automatically after 24h, or tap Refresh anytime</span>
        ) : (
          <span className="text-amber-700/90 dark:text-amber-500/90"> · Cache expired — refreshing in background when online</span>
        )}
      </p>
    ) : null

  const refreshControl = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="gap-2 border-[#0C3D22]/30 text-[#0C3D22] hover:bg-[#0C3D22]/10"
      disabled={refreshing || showSkeleton}
      onClick={() => void runFetch(true)}
    >
      <RefreshCwIcon className={cn("size-4", refreshing && "animate-spin")} aria-hidden />
      Refresh
    </Button>
  )

  return (
    <DashboardShell headerActions={refreshControl}>
      <div className="flex flex-1 flex-col gap-6 p-4 pt-6 lg:p-8 lg:pt-8">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              Discount manager
            </h1>
            {!error && !showSkeleton ? subtitle : null}
          </div>
        </div>

        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-destructive/40 bg-destructive/5 px-5 py-4 text-sm text-destructive"
          >
            <p className="font-semibold">Could not load discounts{status ? ` (${status})` : ""}</p>
            <p className="mt-2 font-mono text-xs leading-relaxed opacity-90">{error}</p>
            <p className="mt-3 text-xs text-muted-foreground">
              Confirm <code className="rounded bg-muted px-1 py-0.5">TREEZ_CERT_ID</code>,{" "}
              <code className="rounded bg-muted px-1 py-0.5">TREEZ_ORG_ID</code>, and private key in{" "}
              <code className="rounded bg-muted px-1 py-0.5">.env.local</code>. Your certificate must allow the org-level
              discount service endpoint.
            </p>
            <Button type="button" size="sm" variant="outline" className="mt-4 gap-2" onClick={() => void runFetch(true)}>
              <RefreshCwIcon className="size-4" />
              Try again
            </Button>
          </div>
        ) : showSkeleton ? (
          <DiscountManagerSkeleton />
        ) : (
          <DiscountManagerClient rows={rows} />
        )}
      </div>
    </DashboardShell>
  )
}
