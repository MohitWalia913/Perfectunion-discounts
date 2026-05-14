"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { DiscountDashboardEditSheet } from "@/components/discount-dashboard-edit-sheet"
import { ActionTooltip } from "@/components/action-tooltip"
import {
  getDiscountActive,
  getDiscountAmount,
  getDiscountMethod,
  getDiscountRowId,
  getDiscountTitle,
  getDiscountUpdatedMonthKeyForStoreFilter,
  getScheduleEndDateISO,
  getScheduleRepeatType,
  getScheduleStartDateISO,
  normalizeMethodTab,
  type DiscountRow,
} from "@/lib/discount-fields"
import type { CollectionEntityDraft, StoreEntityDraft } from "@/lib/discount-edit-helpers"
import { collectAllStoreNames, getProductCollectionDisplayLines, getStoreNamesFromRow } from "@/lib/discount-format"
import { cn } from "@/lib/utils"
import { SearchIcon, Trash2Icon, Edit2Icon, ChevronDownIcon } from "lucide-react"
import { toast } from "sonner"

const PAGE_SIZE = 12

/** Temporarily hidden — set to `true` to show the month filter again. */
const SHOW_LAST_UPDATED_MONTH_FILTER = false

function StoresCollectionsCell({ row }: { row: DiscountRow }) {
  const stores = getStoreNamesFromRow(row)
  const cols = getProductCollectionDisplayLines(row)
  const ns = stores.length
  const nc = cols.length
  const label =
    ns === 0 && nc === 0
      ? "n/a"
      : `${ns} ${ns === 1 ? "store" : "stores"}, ${nc} ${nc === 1 ? "collection" : "collections"}`

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 max-w-[min(100%,14rem)] justify-between gap-1 px-2 text-left text-xs font-normal"
                />
              }
            >
              <span className="truncate">{label}</span>
              <ChevronDownIcon className="size-3 shrink-0 opacity-50" />
            </PopoverTrigger>
          }
        />
        <TooltipContent side="top" align="start" sideOffset={6} className="max-w-xs text-left">
          View stores and product collections assigned to this discount in Treez.
        </TooltipContent>
      </Tooltip>
      <PopoverContent className="w-[min(100vw-2rem,340px)] p-0" align="start">
        <div className="max-h-72 overflow-y-auto p-3 text-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Stores</p>
          {stores.length === 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">None assigned</p>
          ) : (
            <ul className="mt-1 space-y-1 text-xs text-foreground">
              {stores.map((name) => (
                <li key={name} className="leading-snug">
                  {name}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Collections
          </p>
          {cols.length === 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">None assigned</p>
          ) : (
            <ul className="mt-1 space-y-1 text-xs text-foreground">
              {cols.map((name) => (
                <li key={name} className="leading-snug">
                  {name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function ScheduleDatesCell({ row }: { row: DiscountRow }) {
  const start = getScheduleStartDateISO(row)
  const end = getScheduleEndDateISO(row)
  return (
    <div className="space-y-1 text-xs leading-snug">
      <div>
        <span className="text-muted-foreground">Start date: </span>
        <span className="tabular-nums text-foreground">{start ?? "n/a"}</span>
      </div>
      <div>
        <span className="text-muted-foreground">End date: </span>
        <span className="tabular-nums text-foreground">{end ?? "n/a"}</span>
      </div>
    </div>
  )
}

function rowMatchesStatus(row: DiscountRow, includeActive: boolean, includeInactive: boolean): boolean {
  if (!includeActive && !includeInactive) return true
  const a = getDiscountActive(row)
  if (a === null) return includeActive || includeInactive
  if (a) return includeActive
  return includeInactive
}

function rowMatchesStore(row: DiscountRow, selected: Set<string>, allStores: string[]): boolean {
  if (allStores.length === 0) return true
  const allSelected =
    selected.size === allStores.length && allStores.every((s) => selected.has(s))
  if (allSelected) return true
  const names = collectAllStoreNames([row]).filter((n) =>
    (row.storeCustomizations as unknown[] | undefined)?.some(
      (e) =>
        e &&
        typeof e === "object" &&
        String((e as { entityName?: string }).entityName) === n,
    ),
  )
  const rowStores = new Set<string>()
  const sc = row.storeCustomizations
  if (Array.isArray(sc)) {
    for (const e of sc) {
      if (e && typeof e === "object" && typeof (e as { entityName?: string }).entityName === "string") {
        rowStores.add(String((e as { entityName: string }).entityName).trim())
      }
    }
  }
  if (rowStores.size === 0) return true
  for (const n of rowStores) {
    if (selected.has(n)) return true
  }
  return false
}

type ScheduleScopeFilter =
  | "all"
  | "has_start"
  | "has_end"
  | "start_and_end"
  | "no_repeat"
  | "repeat_day"
  | "repeat_week"
  | "repeat_month"

function rowMatchesUpdatedMonth(
  row: DiscountRow,
  monthKeyYYYYMM: string | null,
  selectedStores: Set<string>,
  allStores: string[],
): boolean {
  if (!monthKeyYYYYMM) return true
  return getDiscountUpdatedMonthKeyForStoreFilter(row, selectedStores, allStores) === monthKeyYYYYMM
}

function formatUpdatedMonthLabel(yyyyMm: string): string {
  const d = new Date(`${yyyyMm}-01T12:00:00`)
  if (Number.isNaN(d.getTime())) return yyyyMm
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" })
}

function rowMatchesScheduleScope(row: DiscountRow, f: ScheduleScopeFilter): boolean {
  const start = getScheduleStartDateISO(row)
  const end = getScheduleEndDateISO(row)
  const rt = getScheduleRepeatType(row)
  switch (f) {
    case "all":
      return true
    case "has_start":
      return start != null
    case "has_end":
      return end != null
    case "start_and_end":
      return start != null && end != null
    case "no_repeat":
      return rt === null || rt === "DO_NOT"
    case "repeat_day":
      return rt === "DAY"
    case "repeat_week":
      return rt === "WEEK"
    case "repeat_month":
      return rt === "MONTH"
    default:
      return true
  }
}

const SCHEDULE_FILTER_LABELS: Record<ScheduleScopeFilter, string> = {
  all: "All schedules",
  has_start: "Has start date",
  has_end: "Has end date",
  start_and_end: "Start & end dates",
  no_repeat: "Does not repeat",
  repeat_day: "Repeats daily",
  repeat_week: "Repeats weekly",
  repeat_month: "Repeats monthly",
}

function DiscountFilterPopover({
  tooltip,
  buttonClassName,
  disabled,
  triggerInner,
  popover,
}: {
  tooltip: string
  buttonClassName: string
  disabled?: boolean
  triggerInner: React.ReactNode
  popover: React.ReactNode
}) {
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  className={buttonClassName}
                  disabled={disabled}
                />
              }
            >
              {triggerInner}
            </PopoverTrigger>
          }
        />
        <TooltipContent side="top" align="center" sideOffset={6} className="max-w-xs text-left">
          {tooltip}
        </TooltipContent>
      </Tooltip>
      {popover}
    </Popover>
  )
}

export function DiscountManagerClient({
  rows: rowsProp,
  managerReadOnly = false,
  managerStoreAllowlist = null,
}: {
  rows: DiscountRow[]
  managerReadOnly?: boolean
  managerStoreAllowlist?: string[] | null
}) {
  const rows = React.useMemo(() => {
    if (!managerStoreAllowlist?.length) return rowsProp
    const allow = new Set(managerStoreAllowlist)
    return rowsProp.filter((r) => {
      const names = getStoreNamesFromRow(r)
      if (!names.length) return false
      return names.some((n) => allow.has(n))
    })
  }, [rowsProp, managerStoreAllowlist])

  const [page, setPage] = React.useState(1)

  const [includeActive, setIncludeActive] = React.useState(true)
  const [includeInactive, setIncludeInactive] = React.useState(false)

  const percentRows = React.useMemo(
    () => rows.filter((r) => normalizeMethodTab(getDiscountMethod(r)) === "PERCENT"),
    [rows],
  )

  const [storeEntities, setStoreEntities] = React.useState<StoreEntityDraft[]>([])
  const [storesLoading, setStoresLoading] = React.useState(false)
  const [storeSearchQuery, setStoreSearchQuery] = React.useState("")
  const allStores = React.useMemo(() => {
    if (managerStoreAllowlist?.length) {
      return [...managerStoreAllowlist].sort((a, b) => a.localeCompare(b))
    }
    if (storeEntities.length > 0) {
      const names = [...new Set(storeEntities.map((s) => s.name.trim()).filter(Boolean))]
      return names.sort((a, b) => a.localeCompare(b))
    }
    return collectAllStoreNames(percentRows)
  }, [managerStoreAllowlist, storeEntities, percentRows])
  const [selectedStores, setSelectedStores] = React.useState<Set<string>>(() => new Set())

  const [catalogCollections, setCatalogCollections] = React.useState<CollectionEntityDraft[]>([])
  const [collectionsLoading, setCollectionsLoading] = React.useState(false)

  // New states for bulk delete and search
  const [selectedDiscounts, setSelectedDiscounts] = React.useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = React.useState("")

  const [scheduleScope, setScheduleScope] = React.useState<ScheduleScopeFilter>("all")
  /** `YYYY-MM` from last-updated timestamp, or null = any month */
  const [updatedMonthKey, setUpdatedMonthKey] = React.useState<string | null>(null)

  const [editSheetOpen, setEditSheetOpen] = React.useState(false)
  const [sheetRow, setSheetRow] = React.useState<DiscountRow | null>(null)
  const [sheetSaving, setSheetSaving] = React.useState(false)

  const fetchStores = React.useCallback(async () => {
    setStoresLoading(true)
    try {
      const res = await fetch("/api/stores")
      if (res.ok) {
        const data = await res.json()
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
                let id = String(
                  s.id ?? s.entityId ?? s.organizationEntityId ?? s.entity_id ?? "",
                ).trim()
                if (!id && name) id = name
                return { id, name }
              })
              .filter((s) => s.name.length > 0)
          : []
        setStoreEntities(parsed)
      }
    } catch (e) {
      console.error("Failed to fetch stores:", e)
    } finally {
      setStoresLoading(false)
    }
  }, [])

  const fetchCollections = React.useCallback(async () => {
    setCollectionsLoading(true)
    try {
      const res = await fetch("/api/collections")
      if (!res.ok) return
      const data = await res.json()
      const raw = data.data || data.collections || data
      const arr = Array.isArray(raw) ? raw : []
      const parsed: CollectionEntityDraft[] = arr
        .map((c: Record<string, unknown>) => ({
          id: String(c.id ?? c.collectionId ?? c.productCollectionId ?? "").trim(),
          name: String(c.name ?? c.title ?? c.displayName ?? c.id ?? "").trim(),
        }))
        .filter((c) => c.id && c.name)
      setCatalogCollections(parsed)
    } catch (e) {
      console.error("Failed to fetch collections:", e)
    } finally {
      setCollectionsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void fetchStores()
    void fetchCollections()
  }, [fetchStores, fetchCollections])

  React.useEffect(() => {
    setSelectedStores(new Set(allStores))
  }, [allStores])

  const updatedMonthOptions = React.useMemo(() => {
    const keys = new Set<string>()
    for (const r of percentRows) {
      const k = getDiscountUpdatedMonthKeyForStoreFilter(r, selectedStores, allStores)
      if (k) keys.add(k)
    }
    return [...keys].sort((a, b) => b.localeCompare(a))
  }, [percentRows, selectedStores, allStores])

  React.useEffect(() => {
    if (!updatedMonthKey) return
    if (!updatedMonthOptions.includes(updatedMonthKey)) setUpdatedMonthKey(null)
  }, [updatedMonthKey, updatedMonthOptions])

  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<{ id: string; title: string } | null>(null)
  const [deleting, setDeleting] = React.useState(false)
  const [deleteError, setDeleteError] = React.useState<string | null>(null)

  const baseFiltered = React.useMemo(() => {
    let filtered = percentRows.filter(
      (r) =>
        rowMatchesStatus(r, includeActive, includeInactive) &&
        rowMatchesStore(r, selectedStores, allStores) &&
        rowMatchesScheduleScope(r, scheduleScope) &&
        rowMatchesUpdatedMonth(r, updatedMonthKey, selectedStores, allStores),
    )
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((r) => {
        const title = getDiscountTitle(r)
        const amount = getDiscountAmount(r)
        const method = getDiscountMethod(r)
        return (
          title?.toLowerCase().includes(query) ||
          amount?.toString().toLowerCase().includes(query) ||
          method?.toLowerCase().includes(query)
        )
      })
    }
    
    return filtered
  }, [
    percentRows,
    includeActive,
    includeInactive,
    selectedStores,
    allStores,
    searchQuery,
    scheduleScope,
    updatedMonthKey,
  ])

  const filtered = baseFiltered

  React.useEffect(() => {
    setPage(1)
  }, [
    baseFiltered.length,
    searchQuery,
    includeActive,
    includeInactive,
    selectedStores,
    scheduleScope,
    updatedMonthKey,
  ])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageClamped = Math.min(page, totalPages)
  const pageRows = filtered.slice((pageClamped - 1) * PAGE_SIZE, pageClamped * PAGE_SIZE)

  React.useEffect(() => {
    if (page !== pageClamped) setPage(pageClamped)
  }, [page, pageClamped])

  const statusBadgeCount =
    includeActive && includeInactive
      ? 0
      : [includeActive, includeInactive].filter(Boolean).length === 0
        ? 0
        : 1

  const storeNarrowed =
    allStores.length > 0 &&
    (selectedStores.size !== allStores.length || !allStores.every((s) => selectedStores.has(s)))
  const storeBadgeCount = storeNarrowed ? selectedStores.size : 0

  const toggleStore = (name: string, checked: boolean) => {
    setSelectedStores((prev) => {
      const next = new Set(prev)
      if (checked) next.add(name)
      else next.delete(name)
      return next
    })
  }

  const selectAllStores = () => setSelectedStores(new Set(allStores))
  const clearAllStores = () => setSelectedStores(new Set())

  const filteredStores = React.useMemo(() => {
    if (!storeSearchQuery.trim()) return allStores
    const query = storeSearchQuery.toLowerCase()
    return allStores.filter((store) => store.toLowerCase().includes(query))
  }, [allStores, storeSearchQuery])

  const activePercentCount = React.useMemo(
    () => percentRows.filter((r) => getDiscountActive(r) === true).length,
    [percentRows],
  )
  const inactivePercentCount = React.useMemo(
    () => percentRows.filter((r) => getDiscountActive(r) === false).length,
    [percentRows],
  )

  const statusScopeLabel =
    includeActive && includeInactive
      ? "Active & inactive"
      : includeActive
        ? "Active only"
        : includeInactive
          ? "Inactive only"
          : "No status"

  const handleDeleteClick = (row: DiscountRow) => {
    const id = getDiscountRowId(row)
    const title = getDiscountTitle(row)
    
    if (!id) {
      console.error("Cannot delete discount: No ID found in row", row)
      setDeleteError("Cannot delete: Discount ID not found")
      return
    }
    
    setDeleteTarget({ id, title })
    setDeleteModalOpen(true)
    setDeleteError(null)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return

    setDeleting(true)
    setDeleteError(null)

    try {
      console.log("Deleting discount with ID:", deleteTarget.id)
      
      const res = await fetch(`/api/discounts/${deleteTarget.id}`, {
        method: "DELETE",
      })

      const data = await res.json()

      if (!res.ok) {
        console.error("Delete failed:", data)
        throw new Error(data.error || data.details?.errorMsgs?.[0] || "Failed to delete discount")
      }

      toast.success("Discount deleted successfully!", {
        description: `"${deleteTarget.title}" has been removed.`,
        duration: 3000,
      })

      setDeleteModalOpen(false)
      
      // Wait a moment for toast to show before reload
      setTimeout(() => {
        window.location.reload()
      }, 500)
    } catch (e) {
      setDeleteError((e as Error).message)
      toast.error("Failed to delete discount", {
        description: (e as Error).message,
        duration: 5000,
      })
    } finally {
      setDeleting(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedDiscounts.size === 0) {
      toast.error("No discounts selected")
      return
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedDiscounts.size} discount${selectedDiscounts.size > 1 ? 's' : ''}?`
    )
    
    if (!confirmed) return

    setDeleting(true)

    try {
      const discountIds = Array.from(selectedDiscounts)
      
      const res = await fetch("/api/discounts/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ discountIds }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete discounts")
      }

      if (data.successful > 0) {
        toast.success(`Successfully deleted ${data.successful} discount${data.successful > 1 ? 's' : ''}!`, {
          duration: 3000,
        })
      }

      if (data.failed > 0) {
        toast.error(`Failed to delete ${data.failed} discount${data.failed > 1 ? 's' : ''}`, {
          description: data.errors?.[0]?.error || "Some discounts could not be deleted",
          duration: 5000,
        })
      }

      setSelectedDiscounts(new Set())
      
      // Wait a moment for toast to show before reload
      setTimeout(() => {
        window.location.reload()
      }, 500)
    } catch (e) {
      toast.error("Failed to delete discounts", {
        description: (e as Error).message,
        duration: 5000,
      })
    } finally {
      setDeleting(false)
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(
        pageRows
          .map((r) => getDiscountRowId(r))
          .filter((id): id is string => id !== null)
      )
      setSelectedDiscounts(allIds)
    } else {
      setSelectedDiscounts(new Set())
    }
  }

  const handleSelectDiscount = (id: string, checked: boolean) => {
    const newSet = new Set(selectedDiscounts)
    if (checked) {
      newSet.add(id)
    } else {
      newSet.delete(id)
    }
    setSelectedDiscounts(newSet)
  }

  const openEditSheet = (row: DiscountRow) => {
    setSheetRow(row)
    setEditSheetOpen(true)
  }

  const handleBulkEditSelected = () => {
    if (selectedDiscounts.size === 0) {
      toast.error("No discounts selected")
      return
    }
    const firstId = Array.from(selectedDiscounts)[0]
    const row = rows.find((r) => getDiscountRowId(r) === firstId)
    if (!row) {
      toast.error("Could not load that discount")
      return
    }
    if (selectedDiscounts.size > 1) {
      toast.message("Editing the first selected row — save, then select another.", {
        description: "Bulk editor opens one discount at a time.",
        duration: 5000,
      })
    }
    openEditSheet(row)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="min-w-0 space-y-1">
            <h2 className="text-base font-semibold tracking-tight text-foreground">Percent discounts</h2>
            <p className="text-xs text-muted-foreground">
              {managerReadOnly
                ? "View only for your assigned store locations. Editing, drafts, and bulk tools are disabled."
                : "Defaults to active offers. Include inactive to see archived. Only percent-type discounts are listed."}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {!managerReadOnly && selectedDiscounts.size > 0 && (
              <ActionTooltip label="Open the edit panel for the first selected discount. After saving, select another row to continue." side="bottom">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkEditSelected}
                  disabled={sheetSaving}
                  className="gap-2"
                >
                  <Edit2Icon className="h-4 w-4" />
                  Edit {selectedDiscounts.size} selected
                </Button>
              </ActionTooltip>
            )}
          </div>
        </div>

        <div className="relative mt-4">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search discounts by title, amount, or type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-lg border border-border/80 bg-muted/30 pl-9 pr-3 text-sm shadow-sm transition-colors focus-visible:border-[#1A1E26]/50 focus-visible:ring-2 focus-visible:ring-[#1A1E26]/20"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
              <DiscountFilterPopover
                tooltip="Filter by Treez active or inactive. Inactive includes archived percent discounts."
                buttonClassName="h-9 gap-2 rounded-full border-border/80 px-3 font-normal shadow-none"
                triggerInner={
                  <>
                    {statusBadgeCount > 0 ? (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-md bg-foreground px-1 text-[10px] font-semibold text-background">
                        {statusBadgeCount}
                      </span>
                    ) : null}
                    Status
                    <ChevronDownIcon className="size-4 opacity-60" />
                  </>
                }
                popover={
                  <PopoverContent align="start" className="z-[100] w-72 bg-popover p-0 shadow-lg">
                    <div className="border-b border-border/60 bg-muted/30 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground">Filter by Status</p>
                      <p className="text-xs text-muted-foreground">Active only by default. Check inactive to include archived percent discounts.</p>
                    </div>
                    <div className="bg-popover p-3">
                      <div className="flex flex-col gap-3">
                        <label className="flex cursor-pointer items-center gap-3 rounded-md border border-border/60 bg-background px-3 py-2.5 transition-colors hover:bg-muted/50">
                          <Checkbox
                            checked={includeActive}
                            onCheckedChange={(v) => setIncludeActive(v === true)}
                          />
                          <div className="flex flex-1 items-center justify-between">
                            <span className="text-sm font-medium">Active</span>
                            <Badge variant="default" className="h-5 text-[10px]">
                              {activePercentCount}
                            </Badge>
                          </div>
                        </label>
                        <label className="flex cursor-pointer items-center gap-3 rounded-md border border-border/60 bg-background px-3 py-2.5 transition-colors hover:bg-muted/50">
                          <Checkbox
                            checked={includeInactive}
                            onCheckedChange={(v) => setIncludeInactive(v === true)}
                          />
                          <div className="flex flex-1 items-center justify-between">
                            <span className="text-sm font-medium">Inactive</span>
                            <Badge variant="secondary" className="h-5 text-[10px]">
                              {inactivePercentCount}
                            </Badge>
                          </div>
                        </label>
                      </div>
                      <Separator className="my-3" />
                      <Button type="button" variant="outline" size="sm" className="h-8 w-full text-xs font-medium" onClick={() => {
                        setIncludeActive(true)
                        setIncludeInactive(false)
                      }}>
                        Reset to active only
                      </Button>
                    </div>
                  </PopoverContent>
                }
              />

              {allStores.length > 0 ? (
                <DiscountFilterPopover
                  tooltip="Only show discounts that apply to at least one of the store names you select."
                  buttonClassName="h-9 gap-2 rounded-full border-border/80 px-3 font-normal shadow-none"
                  disabled={storesLoading}
                  triggerInner={
                    <>
                      {storesLoading ? (
                        <span className="text-xs">Loading...</span>
                      ) : storeBadgeCount > 0 ? (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-md bg-foreground px-1 text-[10px] font-semibold text-background">
                          {storeBadgeCount}
                        </span>
                      ) : null}
                      Store
                      <ChevronDownIcon className="size-4 opacity-60" />
                    </>
                  }
                  popover={
                    <PopoverContent align="start" className="z-[100] w-80 bg-popover p-0 shadow-lg">
                      <div className="border-b border-border/60 bg-muted/30 p-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground">Filter by Location</p>
                        <p className="mb-3 text-xs text-muted-foreground">
                          {storesLoading 
                            ? "Loading stores from your organization..." 
                            : `Select store locations to filter (${allStores.length} total)`
                          }
                        </p>
                        <div className="mb-3 relative">
                          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder="Search stores..."
                            value={storeSearchQuery}
                            onChange={(e) => setStoreSearchQuery(e.target.value)}
                            className="h-8 pl-9 text-sm bg-background"
                            disabled={storesLoading}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button type="button" variant="secondary" size="sm" className="h-7 text-xs font-medium" onClick={selectAllStores} disabled={storesLoading}>
                            Select All
                          </Button>
                          <Button type="button" variant="outline" size="sm" className="h-7 text-xs font-medium" onClick={clearAllStores} disabled={storesLoading}>
                            Clear All
                          </Button>
                        </div>
                      </div>
                      <ScrollArea className="max-h-64">
                        <div className="flex flex-col p-2 bg-popover">
                          {storesLoading ? (
                            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                              <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                              Loading stores...
                            </div>
                          ) : filteredStores.length === 0 ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                              {storeSearchQuery ? `No stores match "${storeSearchQuery}"` : "No stores found"}
                            </div>
                          ) : (
                            filteredStores.map((name) => (
                              <label
                                key={name}
                                className="relative z-10 flex cursor-pointer items-center gap-3 rounded-md bg-popover px-3 py-2.5 transition-colors hover:bg-muted/80"
                              >
                                <Checkbox
                                  checked={selectedStores.has(name)}
                                  onCheckedChange={(v) => toggleStore(name, v === true)}
                                />
                                <span className="text-sm font-medium leading-tight text-foreground">{name}</span>
                              </label>
                            ))
                          )}
                        </div>
                      </ScrollArea>
                      {storeSearchQuery && filteredStores.length > 0 && (
                        <div className="border-t border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                          Showing {filteredStores.length} of {allStores.length} stores
                        </div>
                      )}
                    </PopoverContent>
                  }
                />
              ) : null}

              <DiscountFilterPopover
                tooltip="Narrow rows by schedule: start/end dates present, or repeat type (daily / weekly / monthly) from Treez."
                buttonClassName="h-9 gap-2 rounded-full border-border/80 px-3 font-normal shadow-none"
                triggerInner={
                  <>
                    {scheduleScope !== "all" ? (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-md bg-foreground px-1 text-[10px] font-semibold text-background">
                        1
                      </span>
                    ) : null}
                    Schedule
                    <ChevronDownIcon className="size-4 opacity-60" />
                  </>
                }
                popover={
                  <PopoverContent align="start" className="z-[100] w-80 bg-popover p-0 shadow-lg">
                    <div className="border-b border-border/60 bg-muted/30 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground">
                        Filter by schedule
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Narrow by start/end dates on the discount schedule or by repeat type (Treez repeatType).
                      </p>
                    </div>
                    <div className="flex flex-col gap-px bg-popover p-2">
                      {(Object.keys(SCHEDULE_FILTER_LABELS) as ScheduleScopeFilter[]).map((key) => (
                        <Button
                          key={key}
                          type="button"
                          variant={scheduleScope === key ? "secondary" : "ghost"}
                          className="h-9 w-full justify-start text-sm font-normal"
                          onClick={() => setScheduleScope(key)}
                        >
                          {SCHEDULE_FILTER_LABELS[key]}
                        </Button>
                      ))}
                    </div>
                  </PopoverContent>
                }
              />

              {SHOW_LAST_UPDATED_MONTH_FILTER && updatedMonthOptions.length > 0 ? (
                <DiscountFilterPopover
                  tooltip="Filter to discounts last updated in a chosen month (uses discount updatedAt or per-store customization timestamps)."
                  buttonClassName="h-9 gap-2 rounded-full border-border/80 px-3 font-normal shadow-none"
                  triggerInner={
                    <>
                      {updatedMonthKey ? (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-md bg-foreground px-1 text-[10px] font-semibold text-background">
                          1
                        </span>
                      ) : null}
                      Last updated
                      <ChevronDownIcon className="size-4 opacity-60" />
                    </>
                  }
                  popover={
                    <PopoverContent align="start" className="z-[100] w-80 bg-popover p-0 shadow-lg">
                      <div className="border-b border-border/60 bg-muted/30 p-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground">
                          Filter by last updated (month)
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">All stores:</span> discount-level{" "}
                          <span className="font-medium text-foreground">updatedAt</span>.{" "}
                          <span className="font-medium text-foreground">Specific stores:</span> latest{" "}
                          <span className="font-medium text-foreground">storeCustomizations[].updatedAt</span> among
                          selected locations (local month).
                        </p>
                      </div>
                      <div className="flex flex-col gap-px bg-popover p-2">
                        <Button
                          type="button"
                          variant={updatedMonthKey === null ? "secondary" : "ghost"}
                          className="h-9 w-full justify-start text-sm font-normal"
                          onClick={() => setUpdatedMonthKey(null)}
                        >
                          All months
                        </Button>
                        {updatedMonthOptions.map((key) => (
                          <Button
                            key={key}
                            type="button"
                            variant={updatedMonthKey === key ? "secondary" : "ghost"}
                            className="h-9 w-full justify-start text-sm font-normal"
                            onClick={() => setUpdatedMonthKey(key)}
                          >
                            {formatUpdatedMonthLabel(key)}
                          </Button>
                        ))}
                      </div>
                    </PopoverContent>
                  }
                />
              ) : null}
            </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold tabular-nums",
              "border-[#1A1E26]/30 bg-[#1A1E26]/10 text-[#1A1E26]",
            )}
          >
            {filtered.length} matching
          </span>
          <span className="inline-flex items-center rounded-full border border-border/70 bg-muted/40 px-3 py-1 text-xs font-medium tabular-nums text-muted-foreground">
            {percentRows.length} percent
          </span>
          <span className="inline-flex items-center rounded-full border border-border/70 bg-background px-3 py-1 text-xs font-medium text-foreground">
            {statusScopeLabel}
          </span>
          {storeNarrowed ? (
            <span className="inline-flex items-center rounded-full border border-border/70 bg-background px-3 py-1 text-xs font-medium text-foreground tabular-nums">
              {selectedStores.size} stores
            </span>
          ) : null}
          {scheduleScope !== "all" ? (
            <span className="inline-flex max-w-[min(100%,20rem)] items-center rounded-full border border-border/70 bg-background px-3 py-1 text-xs font-medium text-foreground">
              {SCHEDULE_FILTER_LABELS[scheduleScope]}
            </span>
          ) : null}
          {SHOW_LAST_UPDATED_MONTH_FILTER && updatedMonthKey ? (
            <span className="inline-flex max-w-[min(100%,20rem)] items-center rounded-full border border-border/70 bg-background px-3 py-1 text-xs font-medium text-foreground">
              Updated {formatUpdatedMonthLabel(updatedMonthKey)}
            </span>
          ) : null}
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                {!managerReadOnly ? (
                  <th className="px-2 py-2 text-left align-middle">
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <span className="inline-flex cursor-default items-center p-0.5">
                            <Checkbox
                              checked={
                                pageRows.length > 0 &&
                                pageRows.every((r) => {
                                  const rid = getDiscountRowId(r)
                                  return rid && selectedDiscounts.has(rid)
                                })
                              }
                              onCheckedChange={handleSelectAll}
                              aria-label="Select all on this page"
                              className="border-input"
                            />
                          </span>
                        }
                      />
                      <TooltipContent side="top" align="start" sideOffset={6} className="max-w-xs text-left">
                        Select or clear every discount on this page for bulk edit.
                      </TooltipContent>
                    </Tooltip>
                  </th>
                ) : null}
                <th className="min-w-[28%] py-2 pl-4 pr-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Title
                </th>
                <th className="w-[110px] px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Amount
                </th>
                <th className="min-w-[24%] px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Stores / Collections
                </th>
                <th className="min-w-[18%] px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Start / End
                </th>
                {!managerReadOnly ? (
                  <th className="w-24 px-2 py-2 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Edit
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pageRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={managerReadOnly ? 4 : 6}
                    className="px-4 py-12 text-center text-sm text-muted-foreground"
                  >
                    No discounts for this filter.
                  </td>
                </tr>
              ) : (
                pageRows.map((row) => {
                  const id = getDiscountRowId(row) || JSON.stringify(row).slice(0, 40)
                  const title = getDiscountTitle(row)
                  const amount = getDiscountAmount(row)

                  return (
                    <tr key={id} className="transition-colors hover:bg-muted/30">
                      {!managerReadOnly ? (
                        <td className="px-2 py-2 align-middle">
                          <Checkbox
                            checked={selectedDiscounts.has(id)}
                            onCheckedChange={(checked) =>
                              handleSelectDiscount(id, checked === true)
                            }
                            aria-label={`Select discount ${title}`}
                            className="border-input"
                          />
                        </td>
                      ) : null}
                      <td className="py-2 pl-4 pr-2 align-middle">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {title}
                        </span>
                      </td>
                      <td className="px-2 py-2 align-middle">
                        <span className="inline-flex rounded-md border border-transparent bg-muted/50 px-2 py-1 font-mono text-xs tabular-nums text-foreground">
                          {amount !== undefined && amount !== null && amount !== "" && amount !== "—"
                            ? `${amount}%`
                            : "—"}
                        </span>
                      </td>
                      <td className="px-2 py-2 align-middle">
                        <StoresCollectionsCell row={row} />
                      </td>
                      <td className="px-2 py-2 align-middle">
                        <ScheduleDatesCell row={row} />
                      </td>
                      {!managerReadOnly ? (
                        <td className="px-2 py-2 align-middle">
                          <div className="flex items-center justify-center gap-1">
                            <ActionTooltip label="Edit this discount in Treez from the side panel." side="left">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="size-8 hover:bg-muted/80 hover:text-primary"
                                disabled={sheetSaving}
                                onClick={() => openEditSheet(row)}
                              >
                                <Edit2Icon className="size-3.5" />
                              </Button>
                            </ActionTooltip>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col items-stretch justify-between gap-3 border-t border-border/60 pt-2 sm:flex-row sm:items-center">
        <p className="text-xs text-muted-foreground">
          Page <span className="font-medium text-foreground">{pageClamped}</span> of{" "}
          <span className="font-medium text-foreground">{totalPages}</span>
          <span className="mx-2 text-border">·</span>
          {PAGE_SIZE} per page
        </p>
        <div className="flex items-center justify-end gap-2">
          <ActionTooltip label="Go to the previous page of results." side="top">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pageClamped <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
          </ActionTooltip>
          <ActionTooltip label="Go to the next page of results." side="top">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pageClamped >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </ActionTooltip>
        </div>
      </div>

      {managerReadOnly ? null : (
        <DiscountDashboardEditSheet
          open={editSheetOpen}
          onOpenChange={setEditSheetOpen}
          row={sheetRow}
          catalogStores={storeEntities}
          catalogCollections={catalogCollections}
          catalogsLoading={storesLoading || collectionsLoading}
          saving={sheetSaving}
          onSavingChange={setSheetSaving}
          onRequestDelete={
            sheetRow
              ? () => {
                  handleDeleteClick(sheetRow)
                  setEditSheetOpen(false)
                }
              : undefined
          }
        />
      )}

      {managerReadOnly ? null : (
        <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/15">
                <Trash2Icon className="size-4 text-destructive" />
              </div>
              Delete Discount
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              Are you sure you want to delete this discount? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteTarget && (
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Discount Title
              </p>
              <p className="text-sm font-medium text-foreground">{deleteTarget.title}</p>
              <p className="text-xs text-muted-foreground mt-1">ID: {deleteTarget.id}</p>
            </div>
          )}
          {deleteError && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {deleteError}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteModalOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="gap-2"
            >
              {deleting ? (
                <>
                  <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2Icon className="size-4" />
                  Delete Discount
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      )}
    </div>
  )
}
