"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { DashboardShell } from "@/components/dashboard-shell"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { ActionTooltip } from "@/components/action-tooltip"
import { Button } from "@/components/ui/button"
import { ArrowLeftIcon, Loader2Icon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"
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
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [draftPendingDelete, setDraftPendingDelete] = React.useState<{
    id: string
    title: string
  } | null>(null)

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

  async function confirmDeleteDraft() {
    if (!draftPendingDelete) return
    const { id } = draftPendingDelete
    setDeletingId(id)
    try {
      const res = await fetch(`/api/discount-drafts/${id}`, { method: "DELETE" })
      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok) throw new Error(data.error || "Failed to delete draft")
      setDrafts((prev) => prev.filter((d) => d.id !== id))
      toast.success("Draft deleted")
      setDraftPendingDelete(null)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <DashboardShell
      headerActions={
        <ActionTooltip label="Return to the discount dashboard." side="bottom">
          <Button
            type="button"
            variant="ghost"
            className="gap-2"
            onClick={() => router.push("/dashboard")}
          >
            <ArrowLeftIcon className="size-4" />
            Back
          </Button>
        </ActionTooltip>
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
          <ActionTooltip label="Open a blank bulk sheet to build new discounts." side="top">
            <Button
              type="button"
              className="gap-2 bg-[#1A1E26] text-white hover:bg-[#1A1E26]/90"
              render={<Link href="/dashboard/discounts/bulk-upload" prefetch />}
            >
              <PlusIcon className="size-4" />
              New bulk sheet
            </Button>
          </ActionTooltip>
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
                  <th className="min-w-[140px] px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Actions
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
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <ActionTooltip label={`Open “${d.title}” in the bulk draft editor.`} side="left">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-1"
                              render={<Link href={`/dashboard/discounts/drafts/${d.id}`} prefetch />}
                              disabled={deletingId === d.id}
                            >
                              <PencilIcon className="size-3.5" />
                              Edit
                            </Button>
                          </ActionTooltip>
                          <ActionTooltip
                            label={`Permanently delete “${d.title}” from the server.`}
                            side="left"
                          >
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-1 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              disabled={deletingId === d.id}
                              onClick={() =>
                                setDraftPendingDelete({ id: d.id, title: d.title })
                              }
                            >
                              {deletingId === d.id ? (
                                <Loader2Icon className="size-3.5 animate-spin" />
                              ) : (
                                <Trash2Icon className="size-3.5" />
                              )}
                              Delete
                            </Button>
                          </ActionTooltip>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={draftPendingDelete !== null}
        onOpenChange={(open) => {
          if (!open && deletingId === null) setDraftPendingDelete(null)
        }}
        title="Delete draft?"
        description={
          draftPendingDelete ? (
            <>
              Delete draft &ldquo;{draftPendingDelete.title}&rdquo;? This removes it from the server and
              cannot be undone.
            </>
          ) : null
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        isWorking={deletingId !== null && draftPendingDelete !== null}
        onConfirm={() => void confirmDeleteDraft()}
      />
    </DashboardShell>
  )
}
