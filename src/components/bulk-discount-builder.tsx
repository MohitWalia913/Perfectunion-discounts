"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { DashboardShell } from "@/components/dashboard-shell"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import {
  ArrowLeftIcon,
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  DownloadIcon,
  Loader2Icon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import {
  defaultEmptyRow,
  deserializeBulkRows,
  recomputeRowMeta,
  serializeBulkRows,
  validateBulkRow,
  type StoreEntity,
  type ProductCollection,
  type BulkDiscountRow,
} from "@/lib/bulk-discount-io"
import { buildTreezPayloadsFromBulkRows } from "@/lib/bulk-discount-payload"
import { exportActivePercentDiscountsToBulkRows } from "@/lib/bulk-discount-from-treez"
import { ActionTooltip } from "@/components/action-tooltip"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

const TABLE_PAGE_SIZE = 10

interface UploadResult {
  index: number
  success: boolean
  discount: string
  error?: string
  details?: unknown
}

export function BulkDiscountBuilder({
  mode,
  draftId,
}: {
  mode: "create" | "draft"
  draftId?: string
}) {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)
  const [stores, setStores] = React.useState<StoreEntity[]>([])
  const [collections, setCollections] = React.useState<ProductCollection[]>([])
  const [loadingData, setLoadingData] = React.useState(true)
  const [rows, setRows] = React.useState<BulkDiscountRow[]>(() => [defaultEmptyRow()])
  const [storeSearch, setStoreSearch] = React.useState<Record<string, string>>({})
  const [collectionSearch, setCollectionSearch] = React.useState<Record<string, string>>({})
  const [results, setResults] = React.useState<{
    total: number
    successful: number
    failed: number
    results: UploadResult[]
    errors: UploadResult[]
  } | null>(null)

  const [draftTitle, setDraftTitle] = React.useState("Untitled draft")
  const [savingDraft, setSavingDraft] = React.useState(false)
  const [loadingDraft, setLoadingDraft] = React.useState(mode === "draft")
  const [importingLive, setImportingLive] = React.useState(false)
  const [importLiveConfirmOpen, setImportLiveConfirmOpen] = React.useState(false)
  const [publishSelection, setPublishSelection] = React.useState<Set<string>>(() => new Set())
  const [tablePage, setTablePage] = React.useState(1)
  const [globalAutoPublishDate, setGlobalAutoPublishDate] = React.useState("")

  /** Which table popover is open — `${rowId}:${slot}` so pickers close after selection. */
  const [openPopoverKey, setOpenPopoverKey] = React.useState<string | null>(null)

  const popK = (rowId: string, slot: string) => `${rowId}:${slot}`
  const onPopChange = (rowId: string, slot: string) => (nextOpen: boolean) => {
    const k = popK(rowId, slot)
    if (nextOpen) setOpenPopoverKey(k)
    else setOpenPopoverKey((prev) => (prev === k ? null : prev))
  }

  React.useEffect(() => {
    fetchStoresAndCollections()
  }, [])

  React.useEffect(() => {
    if (mode !== "draft" || !draftId) return
    let cancelled = false
    ;(async () => {
      setLoadingDraft(true)
      try {
        const res = await fetch(`/api/discount-drafts/${draftId}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to load draft")
        if (cancelled) return
        const d = data.draft as { title?: string; rows?: unknown }
        if (typeof d.title === "string") setDraftTitle(d.title)
        const loaded = deserializeBulkRows(d.rows)
        setRows(loaded)
        const unpublished = loaded.filter((r) => !r.publishedAt)
        const scheduleDates = [
          ...new Set(
            unpublished
              .map((r) => r.scheduledPublishDate)
              .filter((x): x is string => typeof x === "string" && x.length > 0),
          ),
        ]
        if (scheduleDates.length === 1) setGlobalAutoPublishDate(scheduleDates[0])
        else setGlobalAutoPublishDate("")
      } catch (e) {
        toast.error("Could not load draft", { description: (e as Error).message })
      } finally {
        if (!cancelled) setLoadingDraft(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [mode, draftId])

  const fetchStoresAndCollections = async () => {
    setLoadingData(true)
    try {
      const [storesRes, collectionsRes] = await Promise.all([
        fetch("/api/stores"),
        fetch("/api/collections")
      ])

      if (storesRes.ok) {
        const storesData = await storesRes.json()
        const storesArray = storesData.data || storesData.entities || storesData
        const parsed: StoreEntity[] = Array.isArray(storesArray)
          ? storesArray.map((s: any) => ({
              id: s.id || s.entityId || s.organizationEntityId || String(s),
              name: s.name || s.displayName || s.entityName || s.organizationEntityName || s.id || String(s),
            }))
          : []
        setStores(parsed)
      }

      if (collectionsRes.ok) {
        const collectionsData = await collectionsRes.json()
        const collectionsArray = collectionsData.data || collectionsData.collections || collectionsData
        const parsed: ProductCollection[] = Array.isArray(collectionsArray)
          ? collectionsArray.map((c: any) => ({
              id: c.id || c.collectionId || c.productCollectionId || String(c),
              name: c.name || c.title || c.displayName || c.id || String(c),
            }))
          : []
        setCollections(parsed)
      }
    } catch (e) {
      console.error("Failed to fetch data:", e)
      toast.error("Failed to load stores and collections")
    } finally {
      setLoadingData(false)
    }
  }

  const updateRow = (id: string, updates: Partial<BulkDiscountRow>) => {
    setRows((prevRows) =>
      prevRows.map((row) =>
        row.id === id ? recomputeRowMeta({ ...row, ...updates }) : row,
      ),
    )
  }

  const addRow = () => {
    const nr = defaultEmptyRow()
    setRows((prev) => {
      const next = [...prev, nr]
      setTablePage(Math.max(1, Math.ceil(next.length / TABLE_PAGE_SIZE)))
      return next
    })
    setStoreSearch({ ...storeSearch, [nr.id]: "" })
    setCollectionSearch({ ...collectionSearch, [nr.id]: "" })
  }

  const totalTablePages = Math.max(1, Math.ceil(rows.length / TABLE_PAGE_SIZE))

  React.useEffect(() => {
    setTablePage((p) => Math.min(p, totalTablePages))
  }, [totalTablePages])

  const paginatedRows = React.useMemo(() => {
    const start = (tablePage - 1) * TABLE_PAGE_SIZE
    return rows.slice(start, start + TABLE_PAGE_SIZE)
  }, [rows, tablePage])

  const applyGlobalAutoPublish = () => {
    if (!globalAutoPublishDate) {
      toast.error("Choose an auto-publish date first")
      return
    }
    setRows((prev) =>
      prev.map((row) =>
        row.publishedAt
          ? row
          : recomputeRowMeta({ ...row, scheduledPublishDate: globalAutoPublishDate }),
      ),
    )
    toast.success("Auto-publish date applied to all unpublished rows")
  }

  const clearGlobalAutoPublish = () => {
    setGlobalAutoPublishDate("")
    setRows((prev) =>
      prev.map((row) =>
        row.publishedAt
          ? row
          : recomputeRowMeta({ ...row, scheduledPublishDate: null }),
      ),
    )
    toast.message("Cleared auto-publish for unpublished rows")
  }

  const unpublishedRowCount = React.useMemo(
    () => rows.filter((r) => !r.publishedAt).length,
    [rows],
  )

  const removeRow = (id: string) => {
    if (rows.length === 1) {
      toast.error("You must have at least one row")
      return
    }
    setPublishSelection((prev) => {
      const n = new Set(prev)
      n.delete(id)
      return n
    })
    setRows((prev) => prev.filter((row) => row.id !== id))
  }

  const handleSaveDraft = async () => {
    setSavingDraft(true)
    try {
      const payload = { title: draftTitle.trim() || "Untitled draft", rows: serializeBulkRows(rows) }
      if (mode === "draft" && draftId) {
        const res = await fetch(`/api/discount-drafts/${draftId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Save failed")
        toast.success("Draft saved")
      } else {
        const res = await fetch("/api/discount-drafts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Save failed")
        toast.success("Draft saved")
        const id = data.draft?.id as string | undefined
        if (id) router.push(`/dashboard/discounts/drafts/${id}`)
      }
    } catch (e) {
      toast.error("Save draft failed", { description: (e as Error).message })
    } finally {
      setSavingDraft(false)
    }
  }

  const handlePublishSelected = async () => {
    if (mode !== "draft" || !draftId) return
    const ids = [...publishSelection]
    if (ids.length === 0) {
      toast.error("Select at least one row to publish")
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/discount-drafts/${draftId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rowIds: ids }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Publish failed")
      const published = data.published ?? 0
      if (data.draftRemoved) {
        toast.success(`Published ${published} discount(s). Draft removed — all rows are live.`)
        router.push("/dashboard/discounts/drafts")
        return
      }
      toast.success(`Published ${published} discount(s)`)
      setPublishSelection(new Set())
      const reload = await fetch(`/api/discount-drafts/${draftId}`)
      const d2 = await reload.json()
      if (reload.ok && d2.draft?.rows) setRows(deserializeBulkRows(d2.draft.rows))
    } catch (e) {
      toast.error("Publish failed", { description: (e as Error).message })
    } finally {
      setLoading(false)
    }
  }

  /** POST without rowIds publishes every unpublished row that passes server validation (same as API default). */
  const handlePublishAllUnpublished = async () => {
    if (mode !== "draft" || !draftId) return
    const eligibleCount = rows.filter((r) => !r.publishedAt && validateBulkRow(r).isValid).length
    if (eligibleCount === 0) {
      toast.error("No eligible rows to publish", {
        description: "Unpublished rows must be complete and valid.",
      })
      return
    }
    if (
      !window.confirm(
        `Publish all ${eligibleCount} valid unpublished discount(s) to Treez? Incomplete rows are skipped.`,
      )
    ) {
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/discount-drafts/${draftId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Publish failed")
      const published = data.published ?? 0
      if (data.draftRemoved) {
        toast.success(`Published ${published} discount(s). Draft removed — all rows are live.`)
        router.push("/dashboard/discounts/drafts")
        return
      }
      toast.success(`Published ${published} discount(s)`)
      setPublishSelection(new Set())
      const reload = await fetch(`/api/discount-drafts/${draftId}`)
      const d2 = await reload.json()
      if (reload.ok && d2.draft?.rows) setRows(deserializeBulkRows(d2.draft.rows))
    } catch (e) {
      toast.error("Publish failed", { description: (e as Error).message })
    } finally {
      setLoading(false)
    }
  }

  const handleBulkCreate = async () => {
    const validRows = rows.filter(row => row.isValid)
    
    if (validRows.length === 0) {
      toast.error("Please add at least one valid discount")
      return
    }

    setLoading(true)
    setResults(null)

    try {
      const discounts = buildTreezPayloadsFromBulkRows(validRows)

      console.log("Creating discounts:", discounts.length, "discounts")
      console.log("Payload:", JSON.stringify(discounts, null, 2))

      const res = await fetch("/api/discounts/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(discounts),
      })

      const data = await res.json()
      console.log("Response:", data)

      if (!res.ok) {
        throw new Error(data.error || "Bulk create failed")
      }

      setResults(data)
      
      if (data.failed === 0) {
        toast.success(`Successfully created ${data.successful} out of ${data.total} discounts!`, {
          duration: 3000,
        })
        
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          router.push("/dashboard")
        }, 2000)
      } else {
        toast.warning(`Created ${data.successful} out of ${data.total} discounts. ${data.failed} failed - check details below`)
        
        // Scroll to results to show errors
        setTimeout(() => {
          const resultsElement = document.getElementById('bulk-results')
          if (resultsElement) {
            resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        }, 100)
      }
    } catch (e) {
      toast.error("Bulk create failed", {
        description: (e as Error).message,
      })
    } finally {
      setLoading(false)
    }
  }

  const runImportLivePercentDiscounts = async () => {
    if (loadingData) {
      toast.error("Wait for stores and collections to finish loading.")
      return
    }
    setImportingLive(true)
    try {
      const res = await fetch("/api/discounts")
      const data = await res.json()
      if (!data.ok) throw new Error(typeof data.error === "string" ? data.error : "Failed to load discounts")
      const treezRows: Record<string, unknown>[] = Array.isArray(data.rows) ? data.rows : []
      const mapped = exportActivePercentDiscountsToBulkRows(treezRows, stores, collections)
      if (mapped.length === 0) {
        toast.message("No active percent discounts found", {
          description: "Check the dashboard filters — only isActive=true and method PERCENT are imported.",
        })
        return
      }
      const ss: Record<string, string> = {}
      const cs: Record<string, string> = {}
      for (const r of mapped) {
        ss[r.id] = ""
        cs[r.id] = ""
      }
      setStoreSearch(ss)
      setCollectionSearch(cs)
      setRows(mapped)
      setTablePage(1)
      setResults(null)
      setPublishSelection(new Set())
      toast.success(`Loaded ${mapped.length} discount${mapped.length === 1 ? "" : "s"}`, {
        description: "Review rows, then Save draft or create in Treez.",
      })
    } catch (e) {
      toast.error("Could not import discounts", { description: (e as Error).message })
    } finally {
      setImportingLive(false)
    }
  }

  const handleImportLivePercentDiscounts = async () => {
    setImportLiveConfirmOpen(false)
    await runImportLivePercentDiscounts()
  }

  const validRowsCount = rows.filter((row) => row.isValid).length

  const eligiblePublishIdsAll = React.useMemo(
    () => rows.filter((r) => !r.publishedAt).map((r) => r.id),
    [rows],
  )

  const allUnpublishedSelectedForPublish =
    eligiblePublishIdsAll.length > 0 &&
    eligiblePublishIdsAll.every((id) => publishSelection.has(id))

  const toggleSelectAllUnpublishedForPublish = (select: boolean) => {
    setPublishSelection((prev) => {
      const next = new Set(prev)
      if (select) {
        for (const id of eligiblePublishIdsAll) next.add(id)
      } else {
        for (const id of eligiblePublishIdsAll) next.delete(id)
      }
      return next
    })
  }

  const publishAllEligibleCount = React.useMemo(
    () => rows.filter((r) => !r.publishedAt && validateBulkRow(r).isValid).length,
    [rows],
  )

  const tableRangeStart = rows.length === 0 ? 0 : (tablePage - 1) * TABLE_PAGE_SIZE + 1
  const tableRangeEnd = Math.min(tablePage * TABLE_PAGE_SIZE, rows.length)

  return (
    <DashboardShell
      headerActions={
        <div className="flex items-center gap-1">
          {mode === "draft" ? (
            <ActionTooltip label="Return to the list of saved bulk drafts." side="bottom">
              <Button
                type="button"
                variant="ghost"
                className="gap-2"
                onClick={() => router.push("/dashboard/discounts/drafts")}
                disabled={loading}
              >
                All drafts
              </Button>
            </ActionTooltip>
          ) : null}
          <ActionTooltip label="Go back to the discount dashboard." side="bottom">
            <Button
              type="button"
              onClick={() => router.push("/dashboard")}
              variant="ghost"
              className="gap-2"
              disabled={loading}
            >
              <ArrowLeftIcon className="size-4" />
              Back
            </Button>
          </ActionTooltip>
        </div>
      }
    >
      <div className="flex flex-1 flex-col gap-6 p-4 pt-6 lg:p-8 lg:pt-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between xl:gap-8">
            <div className="min-w-0 flex flex-1 flex-col gap-3">
              <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                {mode === "draft" ? "Draft bulk discounts" : "Import database"}
              </h1>
              {mode === "create" ? (
                <p className="text-sm text-muted-foreground">
                  {`Add multiple discounts at once. ${validRowsCount > 0 ? `${validRowsCount} valid row${validRowsCount > 1 ? "s" : ""} ready to create.` : ""}`}
                </p>
              ) : null}
              <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
                <div className="flex min-w-[200px] max-w-md flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                  <span className="text-xs font-medium text-muted-foreground shrink-0">Draft name</span>
                  <Input
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    className="h-9 text-sm"
                    placeholder="Untitled draft"
                  />
                </div>
                {mode === "draft" ? (
                  <div className="flex flex-wrap items-end gap-2 border-border lg:border-l lg:pl-6">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        Auto-publish
                      </span>
                      <Input
                        type="date"
                        value={globalAutoPublishDate}
                        onChange={(e) => setGlobalAutoPublishDate(e.target.value)}
                        className="h-9 w-[160px] text-sm"
                      />
                    </div>
                    <ActionTooltip label="Set this UTC date on every unpublished row for the daily cron to publish automatically." side="top">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 gap-2"
                        onClick={applyGlobalAutoPublish}
                        disabled={loading || loadingData || !globalAutoPublishDate}
                      >
                        <CalendarIcon className="size-4" />
                        Apply to draft
                      </Button>
                    </ActionTooltip>
                    <ActionTooltip label="Remove scheduled auto-publish from all unpublished rows in this draft." side="top">
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-9 text-muted-foreground"
                        onClick={clearGlobalAutoPublish}
                        disabled={loading || loadingData}
                      >
                        Clear schedule
                      </Button>
                    </ActionTooltip>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2 xl:pt-1">
              <ActionTooltip label="Replace the grid with active percent discounts currently in Treez (with confirmation)." side="top">
                <Button
                  type="button"
                  onClick={() => setImportLiveConfirmOpen(true)}
                  variant="outline"
                  className="h-9 gap-2"
                  disabled={loading || loadingData || importingLive || savingDraft}
                >
                  {importingLive ? (
                    <>
                      <Loader2Icon className="size-4 animate-spin" />
                      Loading…
                    </>
                  ) : (
                    <>
                      <DownloadIcon className="size-4" />
                      Import live %
                    </>
                  )}
                </Button>
              </ActionTooltip>
              <ActionTooltip label="Append a new empty row to the bulk table." side="top">
                <Button
                  onClick={addRow}
                  variant="outline"
                  className="h-9 gap-2"
                  disabled={loading || loadingData}
                >
                  <PlusIcon className="size-4" />
                  Add Row
                </Button>
              </ActionTooltip>
              <ActionTooltip label="Save the current grid and draft name to the server." side="top">
                <Button
                  onClick={() => void handleSaveDraft()}
                  variant="outline"
                  className="h-9 gap-2 border-dashed"
                  disabled={savingDraft || loadingData}
                >
                  {savingDraft ? (
                    <>
                      <Loader2Icon className="size-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>Save draft</>
                  )}
                </Button>
              </ActionTooltip>
              {mode === "draft" && draftId ? (
                <>
                  <ActionTooltip
                    label="Publish every valid unpublished row in this draft (not only selected)."
                    side="top"
                  >
                    <Button
                      type="button"
                      onClick={() => void handlePublishAllUnpublished()}
                      variant="outline"
                      className="h-9 gap-2 border-amber-600/50 text-amber-900 hover:bg-amber-50 dark:text-amber-100 dark:hover:bg-amber-950/40"
                      disabled={loading || loadingData || publishAllEligibleCount === 0}
                    >
                      {loading ? (
                        <Loader2Icon className="size-4 animate-spin" />
                      ) : (
                        <CheckIcon className="size-4" />
                      )}
                      Publish all ({publishAllEligibleCount})
                    </Button>
                  </ActionTooltip>
                  <ActionTooltip label="Create selected rows as live discounts in Treez (valid rows only)." side="top">
                    <Button
                      type="button"
                      onClick={() => void handlePublishSelected()}
                      className="h-9 gap-2 bg-amber-600 text-white hover:bg-amber-600/90"
                      disabled={loading || loadingData || publishSelection.size === 0}
                    >
                      {loading ? (
                        <Loader2Icon className="size-4 animate-spin" />
                      ) : (
                        <CheckIcon className="size-4" />
                      )}
                      Publish selected
                    </Button>
                  </ActionTooltip>
                </>
              ) : null}
              {mode === "create" ? (
                <ActionTooltip label="Create every valid row in Treez as a new service discount." side="top">
                  <Button
                    onClick={() => void handleBulkCreate()}
                    disabled={loading || validRowsCount === 0 || loadingData}
                    className="h-9 gap-2 bg-[#1A1E26] hover:bg-[#1A1E26]/90 text-white"
                  >
                    {loading ? (
                      <>
                        <Loader2Icon className="size-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <CheckIcon className="size-4" />
                        Create {validRowsCount > 0 ? `${validRowsCount} ` : ""}Discount
                        {validRowsCount !== 1 ? "s" : ""}
                      </>
                    )}
                  </Button>
                </ActionTooltip>
              ) : null}
            </div>
          </div>

          {loadingData && (
            <div className="flex items-center justify-center py-8">
              <Loader2Icon className="size-6 animate-spin text-[#1A1E26]" />
              <span className="ml-2 text-sm text-muted-foreground">Loading stores and collections...</span>
            </div>
          )}

          {loadingDraft && mode === "draft" && (
            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
              <Loader2Icon className="mr-2 size-5 animate-spin" />
              Loading draft…
            </div>
          )}

          {!loadingData && !loadingDraft && (
            <div className="rounded-xl border border-border/80 bg-card shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      {mode === "draft" ? (
                        <>
                          <th className="px-2 py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-12">
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <div className="flex items-center justify-center py-0.5">
                                    <Checkbox
                                      checked={allUnpublishedSelectedForPublish}
                                      disabled={eligiblePublishIdsAll.length === 0}
                                      onCheckedChange={(c) =>
                                        toggleSelectAllUnpublishedForPublish(c === true)
                                      }
                                      aria-label="Select all unpublished rows in this draft for publish"
                                    />
                                  </div>
                                }
                              />
                              <TooltipContent side="top" sideOffset={6} className="max-w-xs text-left">
                                Select or clear all unpublished rows in this draft (every page) for publishing to Treez.
                              </TooltipContent>
                            </Tooltip>
                          </th>
                          <th className="px-2 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[100px]">
                            Status
                          </th>
                        </>
                      ) : null}
                      <th className="px-2 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[132px] w-[132px] whitespace-nowrap">
                        Type *
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[200px]">
                        Title
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[100px]">
                        % *
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[140px]">
                        Stores *
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[130px]">
                        Start *
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[130px]">
                        End
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[200px] w-[210px]">
                        Repeat
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[140px]">
                        Collections *
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-12">
                        
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paginatedRows.map((row) => (
                      <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                        {mode === "draft" ? (
                          <>
                            <td className="px-2 py-2 align-middle">
                              <Checkbox
                                checked={publishSelection.has(row.id)}
                                disabled={!!row.publishedAt}
                                onCheckedChange={(c) => {
                                  setPublishSelection((prev) => {
                                    const n = new Set(prev)
                                    if (c === true) n.add(row.id)
                                    else n.delete(row.id)
                                    return n
                                  })
                                }}
                                aria-label="Select for publish"
                              />
                            </td>
                            <td className="px-2 py-2 align-middle text-xs">
                              {row.publishedAt ? (
                                <span className="font-medium text-green-700">Live</span>
                              ) : row.scheduledPublishDate ? (
                                <span className="text-muted-foreground">Queued</span>
                              ) : (
                                <span className="text-muted-foreground">Draft</span>
                              )}
                              {row.publishError ? (
                                <span className="mt-0.5 block truncate text-[10px] text-destructive" title={row.publishError}>
                                  {row.publishError}
                                </span>
                              ) : null}
                            </td>
                          </>
                        ) : null}
                        <td className="px-2 py-2 align-middle whitespace-nowrap w-[132px] min-w-[132px]">
                          <Popover
                            open={openPopoverKey === popK(row.id, "dtype")}
                            onOpenChange={onPopChange(row.id, "dtype")}
                          >
                            <PopoverTrigger className="inline-flex h-8 w-full min-w-0 max-w-full items-center justify-between gap-1 whitespace-nowrap rounded-md border border-input bg-background px-2 py-1 text-left text-xs font-medium leading-none tracking-tight ring-offset-background hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                              <span className="text-left leading-none whitespace-nowrap">
                                {row.discountType === "FUN_FRIDAY" && "Fun Friday"}
                                {row.discountType === "HOTBOX" && "Hotbox"}
                                {row.discountType === "DAILY_SPECIAL" && "Daily Special"}
                                {row.discountType === "CUSTOM" && "Custom"}
                              </span>
                              <ChevronDownIcon className="size-3 shrink-0 opacity-50" />
                            </PopoverTrigger>
                            <PopoverContent className="w-[180px] p-1" align="start">
                              <div className="space-y-1">
                                {(
                                  [
                                    { type: "FUN_FRIDAY" as const, label: "Fun Friday" },
                                    { type: "HOTBOX" as const, label: "Hotbox" },
                                    { type: "DAILY_SPECIAL" as const, label: "Daily Special" },
                                    { type: "CUSTOM" as const, label: "Custom" },
                                  ] as const
                                ).map(({ type, label }) => (
                                  <PopoverClose
                                    key={type}
                                    render={(closeProps) => (
                                      <Button
                                        type="button"
                                        {...closeProps}
                                        variant="ghost"
                                        className={cn(
                                          "h-9 w-full justify-start text-sm",
                                          row.discountType === type && "bg-muted",
                                        )}
                                        onClick={(event) => {
                                          closeProps.onClick?.(event)
                                          updateRow(row.id, { discountType: type })
                                        }}
                                      >
                                        {label}
                                      </Button>
                                    )}
                                  />
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </td>
                        <td className="px-2 py-2">
                          {row.discountType === "CUSTOM" ? (
                            <Input
                              value={row.customTitle}
                              onChange={(e) => updateRow(row.id, { customTitle: e.target.value })}
                              placeholder="Enter custom title..."
                              className="h-8 text-xs"
                            />
                          ) : (
                            <div className="h-8 px-2 py-1.5 rounded-md bg-muted/50 text-xs text-muted-foreground flex items-center truncate">
                              {row.title || "Fill fields..."}
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          <div className="relative">
                            <Input
                              type="number"
                              value={row.amount}
                              onChange={(e) => updateRow(row.id, { amount: e.target.value })}
                              placeholder="20"
                              className="h-8 pr-6 text-xs"
                              min="0"
                              max="100"
                              step="0.01"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                              %
                            </span>
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <Popover>
                            <PopoverTrigger className="inline-flex items-center justify-between w-full h-8 rounded-md border border-input bg-background px-2 py-1.5 text-xs ring-offset-background hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                              {row.selectedStores.length === 0 ? (
                                <span className="text-muted-foreground">Select...</span>
                              ) : (
                                <span className="truncate">
                                  {row.selectedStores.length} store{row.selectedStores.length > 1 ? 's' : ''}
                                </span>
                              )}
                              <ChevronDownIcon className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0" align="start">
                              <div className="p-2 border-b">
                                <Input
                                  placeholder="Search stores..."
                                  value={storeSearch[row.id] || ""}
                                  onChange={(e) => setStoreSearch({ ...storeSearch, [row.id]: e.target.value })}
                                  className="h-8"
                                />
                              </div>
                              <div className="max-h-[250px] overflow-y-auto p-2">
                                {stores.length === 0 ? (
                                  <p className="text-sm text-muted-foreground p-2">No stores available</p>
                                ) : (
                                  <div className="space-y-1">
                                    {stores
                                      .filter(store => 
                                        store.name.toLowerCase().includes((storeSearch[row.id] || "").toLowerCase())
                                      )
                                      .map((store) => {
                                        const isSelected = row.selectedStores.some(s => s.id === store.id)
                                        return (
                                          <label
                                            key={store.id}
                                            className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer"
                                          >
                                            <Checkbox
                                              checked={isSelected}
                                              onCheckedChange={(checked) => {
                                                const newStores = checked
                                                  ? [...row.selectedStores, store]
                                                  : row.selectedStores.filter(s => s.id !== store.id)
                                                updateRow(row.id, { selectedStores: newStores })
                                              }}
                                            />
                                            <span className="text-sm">{store.name}</span>
                                          </label>
                                        )
                                      })}
                                  </div>
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </td>
                        <td className="px-2 py-2">
                          <Popover
                            open={openPopoverKey === popK(row.id, "start")}
                            onOpenChange={onPopChange(row.id, "start")}
                          >
                            <PopoverTrigger className={cn(
                              "inline-flex items-center justify-start w-full h-8 rounded-md border border-input bg-background px-2 py-1.5 text-xs ring-offset-background hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                              !row.startDate && "text-muted-foreground"
                            )}>
                              <CalendarIcon className="mr-1 h-3 w-3" />
                              {row.startDate ? format(row.startDate, "d MMM") : "Pick date"}
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={row.startDate}
                                onSelect={(date) => {
                                  updateRow(row.id, { startDate: date })
                                  setOpenPopoverKey(null)
                                }}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </td>
                        <td className="px-2 py-2">
                          <Popover
                            open={openPopoverKey === popK(row.id, "end")}
                            onOpenChange={onPopChange(row.id, "end")}
                          >
                            <PopoverTrigger className={cn(
                              "inline-flex items-center justify-start w-full h-8 rounded-md border border-input bg-background px-2 py-1.5 text-xs ring-offset-background hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                              !row.endDate && "text-muted-foreground"
                            )}>
                              <CalendarIcon className="mr-1 h-3 w-3" />
                              {row.endDate ? format(row.endDate, "d MMM") : "Pick date"}
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={row.endDate}
                                onSelect={(date) => {
                                  updateRow(row.id, { endDate: date })
                                  setOpenPopoverKey(null)
                                }}
                                disabled={(date) => row.startDate ? date < row.startDate : false}
                              />
                            </PopoverContent>
                          </Popover>
                        </td>
                        <td className="px-2 py-2 align-middle">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <div className="flex shrink-0 items-center gap-0.5">
                              <Button
                                variant={row.repeat ? "default" : "outline"}
                                size="sm"
                                className={cn(
                                  "h-7 px-2 text-xs",
                                  row.repeat && "bg-[#1A1E26] hover:bg-[#1A1E26]/90"
                                )}
                                onClick={() => updateRow(row.id, { repeat: true, repeatType: "DAY" })}
                              >
                                Yes
                              </Button>
                              <Button
                                variant={!row.repeat ? "default" : "outline"}
                                size="sm"
                                className={cn(
                                  "h-7 px-2 text-xs",
                                  !row.repeat && "bg-[#1A1E26] hover:bg-[#1A1E26]/90"
                                )}
                                onClick={() => updateRow(row.id, { repeat: false, repeatType: "DO_NOT" })}
                              >
                                No
                              </Button>
                            </div>
                            {row.repeat ? (
                              <Popover
                                open={openPopoverKey === popK(row.id, "repeat")}
                                onOpenChange={onPopChange(row.id, "repeat")}
                              >
                                <PopoverTrigger
                                  className={cn(
                                    "inline-flex h-7 min-w-0 flex-1 items-center justify-between gap-0.5 rounded-md border border-input bg-background px-1.5 text-xs ring-offset-background hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                  )}
                                >
                                  <span className="min-w-0 truncate">
                                    {row.repeatType === "DAY" && "Daily"}
                                    {row.repeatType === "WEEK" && "Weekly"}
                                    {row.repeatType === "MONTH" && "Monthly"}
                                  </span>
                                  <ChevronDownIcon className="size-3 shrink-0 opacity-50" />
                                </PopoverTrigger>
                                <PopoverContent className="w-[200px] p-1" align="start">
                                  <div className="space-y-1">
                                    {(
                                      [
                                        { repeatType: "DAY" as const, label: "Daily" },
                                        { repeatType: "WEEK" as const, label: "Weekly (same day)" },
                                        { repeatType: "MONTH" as const, label: "Monthly (same day)" },
                                      ] as const
                                    ).map(({ repeatType, label }) => (
                                      <PopoverClose
                                        key={repeatType}
                                        render={(closeProps) => (
                                          <Button
                                            type="button"
                                            {...closeProps}
                                            variant="ghost"
                                            className={cn(
                                              "h-8 w-full justify-start text-xs",
                                              row.repeatType === repeatType && "bg-muted",
                                            )}
                                            onClick={(event) => {
                                              closeProps.onClick?.(event)
                                              updateRow(row.id, { repeatType })
                                            }}
                                          >
                                            {label}
                                          </Button>
                                        )}
                                      />
                                    ))}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <Popover>
                            <PopoverTrigger className="inline-flex items-center justify-between w-full h-8 rounded-md border border-input bg-background px-2 py-1.5 text-xs ring-offset-background hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                              {row.selectedCollections.length === 0 ? (
                                <span className="text-muted-foreground">Select...</span>
                              ) : (
                                <span className="truncate">
                                  {row.selectedCollections.length} coll.
                                </span>
                              )}
                              <ChevronDownIcon className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0" align="start">
                              <div className="p-2 border-b">
                                <Input
                                  placeholder="Search collections..."
                                  value={collectionSearch[row.id] || ""}
                                  onChange={(e) => setCollectionSearch({ ...collectionSearch, [row.id]: e.target.value })}
                                  className="h-8"
                                />
                              </div>
                              <div className="max-h-[250px] overflow-y-auto p-2">
                                {collections.length === 0 ? (
                                  <p className="text-sm text-muted-foreground p-2">No collections available</p>
                                ) : (
                                  <div className="space-y-1">
                                    {collections
                                      .filter(collection => 
                                        collection.name.toLowerCase().includes((collectionSearch[row.id] || "").toLowerCase())
                                      )
                                      .map((collection) => {
                                        const isSelected = row.selectedCollections.some(c => c.id === collection.id)
                                        return (
                                          <label
                                            key={collection.id}
                                            className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer"
                                          >
                                            <Checkbox
                                              checked={isSelected}
                                              onCheckedChange={(checked) => {
                                                const newCollections = checked
                                                  ? [...row.selectedCollections, collection]
                                                  : row.selectedCollections.filter(c => c.id !== collection.id)
                                                updateRow(row.id, { selectedCollections: newCollections })
                                              }}
                                            />
                                            <span className="text-sm truncate">{collection.name}</span>
                                          </label>
                                        )
                                      })}
                                  </div>
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </td>
                        <td className="px-2 py-2">
                          <ActionTooltip label="Remove this row from the grid." side="left">
                            <Button
                              onClick={() => removeRow(row.id)}
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              disabled={loading}
                            >
                              <Trash2Icon className="size-3.5" />
                            </Button>
                          </ActionTooltip>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="border-t border-border bg-muted/30 px-4 py-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-1">
                  <span>
                    {rows.length} row{rows.length !== 1 ? "s" : ""} • {validRowsCount} valid
                    {rows.length > 0 ? (
                      <>
                        {" "}
                        • Showing {tableRangeStart}–{tableRangeEnd}
                      </>
                    ) : null}
                  </span>
                  {mode === "draft" && unpublishedRowCount > 0 ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <ActionTooltip label="Select every unpublished row in this draft (all pages)." side="top">
                        <Button
                          type="button"
                          variant="link"
                          className="h-auto p-0 text-xs font-medium text-foreground"
                          onClick={() => toggleSelectAllUnpublishedForPublish(true)}
                        >
                          Select all unpublished ({unpublishedRowCount})
                        </Button>
                      </ActionTooltip>
                      <span className="text-border">·</span>
                      <ActionTooltip label="Uncheck all rows queued for publish." side="top">
                        <Button
                          type="button"
                          variant="link"
                          className="h-auto p-0 text-xs font-medium text-muted-foreground"
                          onClick={() => setPublishSelection(new Set())}
                          disabled={publishSelection.size === 0}
                        >
                          Clear publish selection
                        </Button>
                      </ActionTooltip>
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {totalTablePages > 1 ? (
                    <div className="mr-1 flex items-center gap-1">
                      <ActionTooltip label="Previous page of rows." side="top">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                          disabled={tablePage <= 1}
                        >
                          Prev
                        </Button>
                      </ActionTooltip>
                      <span className="min-w-[96px] text-center text-xs text-muted-foreground tabular-nums">
                        Page {tablePage} / {totalTablePages}
                      </span>
                      <ActionTooltip label="Next page of rows." side="top">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => setTablePage((p) => Math.min(totalTablePages, p + 1))}
                          disabled={tablePage >= totalTablePages}
                        >
                          Next
                        </Button>
                      </ActionTooltip>
                    </div>
                  ) : null}
                  <ActionTooltip label="Add another row at the end of the draft." side="top">
                    <Button
                      onClick={addRow}
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-2 text-[#1A1E26] hover:text-[#1A1E26] hover:bg-[#1A1E26]/10"
                      disabled={loading}
                    >
                      <PlusIcon className="size-4" />
                      Add Row
                    </Button>
                  </ActionTooltip>
                </div>
              </div>
            </div>
          )}

          {results && (
            <div id="bulk-results" className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Results</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg border border-border bg-muted/20 p-4">
                  <p className="text-xs text-muted-foreground mb-1">Total</p>
                  <p className="text-2xl font-bold">{results.total}</p>
                </div>
                <div className="rounded-lg border border-[#1A1E26] bg-[#1A1E26]/10 p-4">
                  <p className="text-xs text-muted-foreground mb-1">Successful</p>
                  <p className="text-2xl font-bold text-[#1A1E26]">{results.successful}</p>
                </div>
                <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
                  <p className="text-xs text-muted-foreground mb-1">Failed</p>
                  <p className="text-2xl font-bold text-destructive">{results.failed}</p>
                </div>
              </div>

              {results.results.length > 0 && (
                <div className="rounded-xl border border-[#1A1E26]/20 bg-[#1A1E26]/5 p-4">
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <CheckIcon className="size-4 text-[#1A1E26]" />
                    Successfully Created ({results.successful})
                  </h4>
                  <div className="space-y-2">
                    {results.results.map((result) => (
                      <div key={result.index} className="rounded-lg bg-background border border-border p-3 flex items-center gap-2">
                        <CheckIcon className="size-4 text-[#1A1E26]" />
                        <span className="text-sm">{result.discount}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {results.errors.length > 0 && (
                <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <XIcon className="size-4 text-destructive" />
                    Failed to Create ({results.failed})
                  </h4>
                  <div className="space-y-2">
                    {results.errors.map((error) => (
                      <div key={error.index} className="rounded-lg bg-background border border-destructive/40 p-4">
                        <div className="flex items-start gap-2">
                          <XIcon className="size-4 text-destructive mt-0.5 shrink-0" />
                          <div className="flex-1 space-y-2">
                            <p className="text-sm font-semibold">{error.discount}</p>
                            <div className="rounded bg-destructive/10 p-2">
                              <p className="text-xs font-semibold text-destructive mb-1">Error:</p>
                              <p className="text-xs text-destructive">{error.error}</p>
                            </div>
                            {error.details != null ? (
                              <details className="text-xs">
                                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                                  View full error details
                                </summary>
                                <pre className="mt-2 rounded bg-muted p-2 text-xs overflow-x-auto">
                                  {JSON.stringify(error.details, null, 2)}
                                </pre>
                              </details>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
      </div>

      <ConfirmDialog
        open={importLiveConfirmOpen}
        onOpenChange={(open) => {
          if (!open && !importingLive) setImportLiveConfirmOpen(false)
        }}
        title="Replace grid with live discounts?"
        description="Replace all rows in the grid with active percent discounts from Treez? Current rows will be lost unless you saved a draft."
        confirmLabel="Replace rows"
        cancelLabel="Cancel"
        variant="default"
        onConfirm={() => void handleImportLivePercentDiscounts()}
      />
    </DashboardShell>
  )
}
