"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { DashboardShell } from "@/components/dashboard-shell"
import { DiscountDashboardEditSheet } from "@/components/discount-dashboard-edit-sheet"
import { Button } from "@/components/ui/button"
import type { CollectionEntityDraft, StoreEntityDraft } from "@/lib/discount-edit-helpers"
import type { DiscountRow } from "@/lib/discount-fields"
import { ArrowLeftIcon, CheckCircle2Icon, Loader2Icon } from "lucide-react"
import { toast } from "sonner"

type EditDraftRecord = {
  id: string
  title: string
  discount_id: string
  payload: Record<string, unknown>
  published_at: string | null
}

export default function ResumeDiscountEditDraftPage() {
  const params = useParams()
  const router = useRouter()
  const id = typeof params?.id === "string" ? params.id : ""

  const [loading, setLoading] = React.useState(true)
  const [draft, setDraft] = React.useState<EditDraftRecord | null>(null)
  const [storeEntities, setStoreEntities] = React.useState<StoreEntityDraft[]>([])
  const [catalogCollections, setCatalogCollections] = React.useState<CollectionEntityDraft[]>([])
  const [catalogsLoading, setCatalogsLoading] = React.useState(true)
  const [sheetOpen, setSheetOpen] = React.useState(true)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (!id) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/discount-edit-drafts/${id}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Draft not found")
        if (!cancelled) setDraft(data.draft as EditDraftRecord)
      } catch (e) {
        toast.error((e as Error).message)
        if (!cancelled) setDraft(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id])

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      setCatalogsLoading(true)
      try {
        const [storesRes, colRes] = await Promise.all([
          fetch("/api/stores"),
          fetch("/api/collections"),
        ])
        if (storesRes.ok) {
          const data = await storesRes.json()
          let storesData = data.data || data.entities || data
          if (storesData && typeof storesData === "object" && !Array.isArray(storesData)) {
            storesData = storesData.data || storesData.entities || storesData.results || []
          }
          const parsed: StoreEntityDraft[] = Array.isArray(storesData)
            ? storesData
                .map((s: Record<string, unknown>) => {
                  const name = String(
                    s.name ??
                      s.displayName ??
                      s.entityName ??
                      s.organizationEntityName ??
                      s.id ??
                      "",
                  ).trim()
                  let sid = String(
                    s.id ?? s.entityId ?? s.organizationEntityId ?? s.entity_id ?? "",
                  ).trim()
                  if (!sid && name) sid = name
                  return { id: sid, name }
                })
                .filter((s: StoreEntityDraft) => s.name.length > 0)
            : []
          if (!cancelled) setStoreEntities(parsed)
        }
        if (colRes.ok) {
          const data = await colRes.json()
          const raw = data.data || data.collections || data
          const arr = Array.isArray(raw) ? raw : []
          const parsed: CollectionEntityDraft[] = arr
            .map((c: Record<string, unknown>) => ({
              id: String(c.id ?? c.collectionId ?? c.productCollectionId ?? "").trim(),
              name: String(c.name ?? c.title ?? c.displayName ?? c.id ?? "").trim(),
            }))
            .filter((c) => c.id && c.name)
          if (!cancelled) setCatalogCollections(parsed)
        }
      } catch (e) {
        console.error(e)
      } finally {
        if (!cancelled) setCatalogsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const headerBack = (
    <Button
      type="button"
      variant="ghost"
      className="gap-2"
      onClick={() => router.push("/dashboard/discounts/edit-drafts")}
    >
      <ArrowLeftIcon className="size-4" />
      Draft edits
    </Button>
  )

  if (!id) {
    return (
      <DashboardShell headerActions={headerBack}>
        <p className="p-8 text-sm text-muted-foreground">Missing draft id.</p>
      </DashboardShell>
    )
  }

  if (loading) {
    return (
      <DashboardShell headerActions={headerBack}>
        <div className="flex flex-1 items-center justify-center p-12 text-sm text-muted-foreground">
          <Loader2Icon className="mr-2 size-4 animate-spin" />
          Loading draft…
        </div>
      </DashboardShell>
    )
  }

  if (!draft) {
    return (
      <DashboardShell headerActions={headerBack}>
        <div className="p-8 text-sm text-muted-foreground">Draft not found.</div>
      </DashboardShell>
    )
  }

  if (draft.published_at) {
    return (
      <DashboardShell headerActions={headerBack}>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <CheckCircle2Icon className="size-12 text-emerald-600" aria-hidden />
          <div>
            <h1 className="font-heading text-xl font-semibold text-foreground">Published</h1>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              This draft was applied to Treez on{" "}
              <span className="tabular-nums text-foreground">
                {new Date(draft.published_at).toLocaleString()}
              </span>
              .
            </p>
          </div>
          <Button
            type="button"
            className="bg-[#1A1E26] text-white hover:bg-[#1A1E26]/90"
            render={<Link href="/dashboard">View discounts</Link>}
          />
        </div>
      </DashboardShell>
    )
  }

  const row = draft.payload as DiscountRow

  return (
    <DashboardShell headerActions={headerBack}>
      <DiscountDashboardEditSheet
        open={sheetOpen}
        onOpenChange={(next) => {
          setSheetOpen(next)
          if (!next) router.push("/dashboard/discounts/edit-drafts")
        }}
        row={row}
        catalogStores={storeEntities}
        catalogCollections={catalogCollections}
        catalogsLoading={catalogsLoading}
        saving={saving}
        onSavingChange={setSaving}
        resumeEditDraftId={id}
        initialSupabaseDraftTitle={draft.title}
        onDraftPublished={() => router.push("/dashboard/discounts/edit-drafts")}
        onDraftDiscarded={() => router.push("/dashboard/discounts/edit-drafts")}
      />
    </DashboardShell>
  )
}
