"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { DashboardShell } from "@/components/dashboard-shell"
import { Button } from "@/components/ui/button"
import { ArrowLeftIcon, Loader2Icon, PencilIcon, PlusIcon } from "lucide-react"
import { toast } from "sonner"

type DraftListItem = {
  id: string
  title: string
  created_at: string
  updated_at: string
  rowCount?: number
}

export default function DiscountDraftsListPage() {
  const router = useRouter()
  const [loading, setLoading] = React.useState(true)
  const [drafts, setDrafts] = React.useState<DraftListItem[]>([])

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch("/api/discount-drafts")
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to load drafts")
        if (!cancelled) setDrafts(Array.isArray(data.drafts) ? data.drafts : [])
      } catch (e) {
        toast.error((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <DashboardShell
      headerActions={
        <Button
          type="button"
          variant="ghost"
          className="gap-2"
          onClick={() => router.push("/dashboard")}
        >
          <ArrowLeftIcon className="size-4" />
          Back
        </Button>
      }
    >
      <div className="flex flex-1 flex-col gap-6 p-4 pt-6 lg:p-8 lg:pt-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              Saved bulk drafts
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Open a draft to edit the same table as bulk create, publish to Treez, or set one
              auto-publish day for all unpublished rows (cron).
            </p>
          </div>
          <Button
            type="button"
            className="gap-2 bg-[#1A1E26] text-white hover:bg-[#1A1E26]/90"
            render={<Link href="/dashboard/discounts/bulk-upload" prefetch />}
          >
            <PlusIcon className="size-4" />
            New bulk sheet
          </Button>
        </div>

        <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px]">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Rows
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Updated
                  </th>
                  <th className="w-28 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Open
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      <Loader2Icon className="mr-2 inline size-4 animate-spin" />
                      Loading drafts…
                    </td>
                  </tr>
                ) : drafts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      No drafts yet. Use &quot;Save draft&quot; on bulk create.
                    </td>
                  </tr>
                ) : (
                  drafts.map((d) => (
                    <tr key={d.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-sm font-medium text-foreground">{d.title}</td>
                      <td className="px-4 py-3 text-sm tabular-nums text-muted-foreground">
                        {d.rowCount ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-xs tabular-nums text-muted-foreground">
                        {d.updated_at ? new Date(d.updated_at).toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          render={<Link href={`/dashboard/discounts/drafts/${d.id}`} prefetch />}
                        >
                          <PencilIcon className="size-3.5" />
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
