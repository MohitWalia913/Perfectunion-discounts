"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { DashboardShell } from "@/components/dashboard-shell"
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
  type StoreEntity,
  type ProductCollection,
  type BulkDiscountRow,
} from "@/lib/bulk-discount-io"
import { buildTreezPayloadsFromBulkRows } from "@/lib/bulk-discount-payload"

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
  const [publishSelection, setPublishSelection] = React.useState<Set<string>>(() => new Set())

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
        setRows(deserializeBulkRows(d.rows))
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
    setRows([...rows, nr])
    setStoreSearch({ ...storeSearch, [nr.id]: "" })
    setCollectionSearch({ ...collectionSearch, [nr.id]: "" })
  }

  const removeRow = (id: string) => {
    if (rows.length === 1) {
      toast.error("You must have at least one row")
      return
    }
    setRows(rows.filter(row => row.id !== id))
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
      toast.success(`Published ${data.published ?? 0} discount(s)`)
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

  const validRowsCount = rows.filter(row => row.isValid).length

  return (
    <DashboardShell
      headerActions={
        <div className="flex items-center gap-1">
          {mode === "draft" ? (
            <Button
              type="button"
              variant="ghost"
              className="gap-2"
              onClick={() => router.push("/dashboard/discounts/drafts")}
              disabled={loading}
            >
              All drafts
            </Button>
          ) : null}
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
        </div>
      }
    >
      <div className="flex flex-1 flex-col gap-6 p-4 pt-6 lg:p-8 lg:pt-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex flex-col gap-2">
              <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                {mode === "draft" ? "Draft bulk discounts" : "Bulk Create Discounts"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {mode === "draft"
                  ? "Save your grid, publish selected rows to Treez, or pick an auto-publish date (UTC). Use a daily cron calling /api/cron/publish-bulk-drafts with CRON_SECRET."
                  : `Add multiple discounts at once. ${validRowsCount > 0 ? `${validRowsCount} valid row${validRowsCount > 1 ? "s" : ""} ready to create.` : ""}`}
              </p>
              <div className="flex max-w-md flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                <span className="text-xs font-medium text-muted-foreground shrink-0">Draft name</span>
                <Input
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  className="h-9 text-sm"
                  placeholder="Untitled draft"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={addRow}
                variant="outline"
                className="gap-2"
                disabled={loading || loadingData}
              >
                <PlusIcon className="size-4" />
                Add Row
              </Button>
              <Button
                onClick={() => void handleSaveDraft()}
                variant="outline"
                className="gap-2 border-dashed"
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
              {mode === "draft" && draftId ? (
                <Button
                  type="button"
                  onClick={() => void handlePublishSelected()}
                  className="gap-2 bg-amber-600 text-white hover:bg-amber-600/90"
                  disabled={loading || loadingData || publishSelection.size === 0}
                >
                  {loading ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <CheckIcon className="size-4" />
                  )}
                  Publish selected
                </Button>
              ) : null}
              {mode === "create" ? (
                <Button
                  onClick={() => void handleBulkCreate()}
                  disabled={loading || validRowsCount === 0 || loadingData}
                  className="gap-2 bg-[#1A1E26] hover:bg-[#1A1E26]/90 text-white"
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
                          <th className="px-2 py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-10">
                            Pub
                          </th>
                          <th className="px-2 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[140px]">
                            Auto-publish
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
                    {rows.map((row) => (
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
                            <td className="px-2 py-2 align-middle">
                              <Input
                                type="date"
                                className="h-8 text-xs"
                                disabled={!!row.publishedAt}
                                value={row.scheduledPublishDate ?? ""}
                                onChange={(e) =>
                                  updateRow(row.id, {
                                    scheduledPublishDate: e.target.value ? e.target.value : null,
                                  })
                                }
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
                          <Button
                            onClick={() => removeRow(row.id)}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            disabled={loading}
                          >
                            <Trash2Icon className="size-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="border-t border-border bg-muted/30 px-4 py-3 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {rows.length} row{rows.length !== 1 ? 's' : ''} • {validRowsCount} valid
                </div>
                <Button
                  onClick={addRow}
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-[#1A1E26] hover:text-[#1A1E26] hover:bg-[#1A1E26]/10"
                  disabled={loading}
                >
                  <PlusIcon className="size-4" />
                  Add Row
                </Button>
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
    </DashboardShell>
  )
}
