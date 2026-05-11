"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { DashboardShell } from "@/components/dashboard-shell"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeftIcon, Loader2Icon, PencilIcon, RocketIcon } from "lucide-react"
import { toast } from "sonner"

type EditDraftListItem = {
  id: string
  title: string
  discount_id: string
  published_at: string | null
  created_at: string
  updated_at: string
}

export default function DiscountEditDraftsListPage() {
  const router = useRouter()
  const [loading, setLoading] = React.useState(true)
  const [publishingId, setPublishingId] = React.useState<string | null>(null)
  const [drafts, setDrafts] = React.useState<EditDraftListItem[]>([])

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/discount-edit-drafts")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load drafts")
      setDrafts(Array.isArray(data.drafts) ? data.drafts : [])
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void load()
  }, [load])

  async function publishDraft(id: string) {
    if (!window.confirm("Publish this draft to Treez now? This updates the live discount.")) return
    setPublishingId(id)
    try {
      const res = await fetch(`/api/discount-edit-drafts/${id}/publish`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Publish failed")
      }
      toast.success("Published to Treez")
      await load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setPublishingId(null)
    }
  }

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
              Draft edits
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Staged changes to existing discounts. Save from the edit drawer, then open a draft here to
              keep editing or publish to Treez when ready. Publishing from this list uses the last saved
              version—open the draft first if you have unsaved changes.
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Discount ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Updated
                  </th>
                  <th className="w-44 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      <Loader2Icon className="mr-2 inline size-4 animate-spin" />
                      Loading drafts…
                    </td>
                  </tr>
                ) : drafts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      No draft edits yet. Open a discount, make changes, and use &quot;Save as draft&quot;.
                    </td>
                  </tr>
                ) : (
                  drafts.map((d) => {
                    const published = Boolean(d.published_at)
                    return (
                      <tr key={d.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 text-sm font-medium text-foreground">{d.title}</td>
                        <td className="max-w-[200px] truncate px-4 py-3 font-mono text-xs text-muted-foreground">
                          {d.discount_id}
                        </td>
                        <td className="px-4 py-3">
                          {published ? (
                            <Badge variant="secondary" className="font-normal">
                              Published
                            </Badge>
                          ) : (
                            <Badge variant="default" className="bg-[#1A1E26] font-normal hover:bg-[#1A1E26]/90">
                              Draft
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs tabular-nums text-muted-foreground">
                          {d.updated_at ? new Date(d.updated_at).toLocaleString() : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-1"
                              disabled={published}
                              render={<Link href={`/dashboard/discounts/edit-drafts/${d.id}`} prefetch />}
                            >
                              <PencilIcon className="size-3.5" />
                              Open
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              className="gap-1 bg-[#1A1E26] text-white hover:bg-[#1A1E26]/90"
                              disabled={published || publishingId === d.id}
                              onClick={() => void publishDraft(d.id)}
                            >
                              {publishingId === d.id ? (
                                <Loader2Icon className="size-3.5 animate-spin" />
                              ) : (
                                <RocketIcon className="size-3.5" />
                              )}
                              Publish
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
