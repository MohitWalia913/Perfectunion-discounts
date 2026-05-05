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
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  getDiscountActive,
  getDiscountAmount,
  getDiscountCart,
  getDiscountMethod,
  getDiscountRowId,
  getDiscountTitle,
  getDiscountSchedule,
  normalizeMethodTab,
  type DiscountRow,
} from "@/lib/discount-fields"
import { collectAllStoreNames } from "@/lib/discount-format"
import { cn } from "@/lib/utils"
import { SearchIcon, Trash2Icon, Edit2Icon, SaveIcon, XIcon, ChevronDownIcon } from "lucide-react"
import { toast } from "sonner"

const PAGE_SIZE = 12

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

export function DiscountManagerClient({ rows }: { rows: DiscountRow[] }) {
  const [page, setPage] = React.useState(1)

  const [includeActive, setIncludeActive] = React.useState(true)
  const [includeInactive, setIncludeInactive] = React.useState(false)

  const percentRows = React.useMemo(
    () => rows.filter((r) => normalizeMethodTab(getDiscountMethod(r)) === "PERCENT"),
    [rows],
  )

  const [apiStores, setApiStores] = React.useState<string[]>([])
  const [storesLoading, setStoresLoading] = React.useState(false)
  const [storeSearchQuery, setStoreSearchQuery] = React.useState("")
  const allStores = React.useMemo(() => {
    return apiStores.length > 0 ? apiStores : collectAllStoreNames(percentRows)
  }, [apiStores, percentRows])
  const [selectedStores, setSelectedStores] = React.useState<Set<string>>(() => new Set())

  // New states for bulk delete and search
  const [selectedDiscounts, setSelectedDiscounts] = React.useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = React.useState("")

  // Inline editing states
  const [editingRows, setEditingRows] = React.useState<Set<string>>(new Set())
  const [editedValues, setEditedValues] = React.useState<Record<string, { title?: string; amount?: string }>>({})
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    fetchStores()
  }, [])

  const fetchStores = async () => {
    setStoresLoading(true)
    try {
      const res = await fetch("/api/stores")
      if (res.ok) {
        const data = await res.json()
        let storesData = data.data || data.entities || data
        
        if (storesData && typeof storesData === 'object' && !Array.isArray(storesData)) {
          storesData = storesData.data || storesData.entities || storesData.results || []
        }
        
        const storeNames: string[] = Array.isArray(storesData)
          ? storesData.map((s: any) => 
              s.name || s.displayName || s.entityName || s.organizationEntityName || s.id || String(s)
            )
          : []
        setApiStores(storeNames)
      }
    } catch (e) {
      console.error("Failed to fetch stores:", e)
    } finally {
      setStoresLoading(false)
    }
  }

  React.useEffect(() => {
    setSelectedStores(new Set(allStores))
  }, [allStores])

  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<{ id: string; title: string } | null>(null)
  const [deleting, setDeleting] = React.useState(false)
  const [deleteError, setDeleteError] = React.useState<string | null>(null)

  const baseFiltered = React.useMemo(() => {
    let filtered = percentRows.filter(
      (r) =>
        rowMatchesStatus(r, includeActive, includeInactive) &&
        rowMatchesStore(r, selectedStores, allStores),
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
  }, [percentRows, includeActive, includeInactive, selectedStores, allStores, searchQuery])

  const filtered = baseFiltered

  React.useEffect(() => {
    setPage(1)
  }, [baseFiltered.length, searchQuery, includeActive, includeInactive, selectedStores])

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

  const handleEditRow = (id: string, row: DiscountRow) => {
    setEditingRows(new Set([...editingRows, id]))
    setEditedValues({
      ...editedValues,
      [id]: {
        title: getDiscountTitle(row) || "",
        amount: getDiscountAmount(row)?.toString() || "",
      },
    })
  }

  const handleCancelEdit = (id: string) => {
    const newEditingRows = new Set(editingRows)
    newEditingRows.delete(id)
    setEditingRows(newEditingRows)
    const newEditedValues = { ...editedValues }
    delete newEditedValues[id]
    setEditedValues(newEditedValues)
  }

  const handleSaveRow = async (id: string, row: DiscountRow) => {
    const editedData = editedValues[id]
    if (!editedData) return

    setSaving(true)
    try {
      // Send the entire row object, but update title and amount
      // Remove metadata fields that shouldn't be in PUT requests
      const { createdAt, updatedAt, ...cleanRow } = row as any
      
      const updatedDiscount: any = {
        ...cleanRow,
        id,
        title: editedData.title,
        amount: editedData.amount,
      }
      
      // Remove createdAt/updatedAt from nested objects
      if (updatedDiscount.conditions) {
        const { createdAt: condCreated, updatedAt: condUpdated, id: condId, ...cleanCond } = updatedDiscount.conditions
        updatedDiscount.conditions = Object.keys(cleanCond).length > 0 ? cleanCond : null
      }
      
      if (updatedDiscount.schedule) {
        const { createdAt: schedCreated, updatedAt: schedUpdated, id: schedId, ...cleanSched } = updatedDiscount.schedule
        updatedDiscount.schedule = Object.keys(cleanSched).length > 0 ? cleanSched : null
      }
      
      if (updatedDiscount.manualConditions) {
        const { createdAt: manCreated, updatedAt: manUpdated, id: manId, ...cleanMan } = updatedDiscount.manualConditions
        updatedDiscount.manualConditions = Object.keys(cleanMan).length > 0 ? cleanMan : null
      }
      
      // Clean storeCustomizations - only send entityId per API schema
      if (Array.isArray(updatedDiscount.storeCustomizations)) {
        updatedDiscount.storeCustomizations = updatedDiscount.storeCustomizations.map((s: any) => ({
          entityId: s.entityId
        }))
      }
      
      // Clean collections - only send productCollectionId per API schema
      if (Array.isArray(updatedDiscount.collections)) {
        updatedDiscount.collections = updatedDiscount.collections.map((c: any) => ({
          productCollectionId: c.productCollectionId
        }))
      }
      
      // Clean collectionsRequired - only send productCollectionId per API schema
      if (Array.isArray(updatedDiscount.collectionsRequired)) {
        updatedDiscount.collectionsRequired = updatedDiscount.collectionsRequired.map((c: any) => ({
          productCollectionId: c.productCollectionId
        }))
      }
      
      // Clean customerGroups - only send tagId per API schema
      if (Array.isArray(updatedDiscount.customerGroups)) {
        updatedDiscount.customerGroups = updatedDiscount.customerGroups.map((c: any) => ({
          tagId: c.tagId
        }))
      }
      
      // Clean coupons - send only required fields per API schema
      if (Array.isArray(updatedDiscount.coupons)) {
        updatedDiscount.coupons = updatedDiscount.coupons.map((c: any) => {
          const cleaned: any = {}
          if (c.code) cleaned.code = c.code
          if (c.title) cleaned.title = c.title
          if (c.startDate) cleaned.startDate = c.startDate
          if (c.endDate) cleaned.endDate = c.endDate
          if (c.startTime) cleaned.startTime = c.startTime
          if (c.endTime) cleaned.endTime = c.endTime
          return cleaned
        })
      }

      // Remove all null values and empty arrays recursively
      const removeNulls = (obj: any): any => {
        if (obj === null || obj === undefined) return undefined
        if (Array.isArray(obj)) {
          const filtered = obj.map(removeNulls).filter(item => item !== undefined)
          return filtered.length > 0 ? filtered : undefined
        }
        if (typeof obj === 'object') {
          const cleaned: any = {}
          for (const [key, value] of Object.entries(obj)) {
            const cleanedValue = removeNulls(value)
            if (cleanedValue !== undefined && cleanedValue !== null) {
              // Skip empty arrays and empty objects
              if (Array.isArray(cleanedValue) && cleanedValue.length === 0) continue
              if (typeof cleanedValue === 'object' && Object.keys(cleanedValue).length === 0) continue
              cleaned[key] = cleanedValue
            }
          }
          return Object.keys(cleaned).length > 0 ? cleaned : undefined
        }
        return obj
      }

      const cleanedDiscount = removeNulls(updatedDiscount)

      console.log("Saving discount:", { id, title: editedData.title, amount: editedData.amount })
      console.log("Full payload:", cleanedDiscount)

      const res = await fetch("/api/discounts/update", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ discounts: [cleanedDiscount] }),
      })

      const data = await res.json()
      console.log("Update response:", data)

      if (!res.ok) {
        console.error("Update failed:", data)
        throw new Error(data.error || "Failed to update discount")
      }

      if (data.successful > 0) {
        toast.success("Discount updated successfully!")
        handleCancelEdit(id)
        setTimeout(() => window.location.reload(), 500)
      }

      if (data.failed > 0) {
        const errorDetails = data.errors?.[0]?.details 
        const errorMsg = data.errors?.[0]?.error || "Update failed"
        console.error("Update failed - Full response:", data)
        console.error("Update failed - Error details:", errorDetails)
        console.error("Update failed - Error message:", errorMsg)
        
        // Try to parse error details if it's a string
        let displayMsg = errorMsg
        if (errorDetails) {
          try {
            const parsed = typeof errorDetails === 'string' ? JSON.parse(errorDetails) : errorDetails
            displayMsg = parsed.message || parsed.error || errorMsg
          } catch {
            displayMsg = errorDetails.substring(0, 200) // Show first 200 chars
          }
        }
        
        toast.error("Failed to update discount", {
          description: displayMsg,
          duration: 7000,
        })
      }
    } catch (e) {
      console.error("Update exception:", e)
      toast.error("Failed to update discount", {
        description: (e as Error).message,
      })
    } finally {
      setSaving(false)
    }
  }

  const handleBulkEdit = () => {
    if (selectedDiscounts.size === 0) {
      toast.error("No discounts selected")
      return
    }

    const newEditingRows = new Set(editingRows)
    const newEditedValues = { ...editedValues }

    selectedDiscounts.forEach((id) => {
      const row = rows.find((r) => getDiscountRowId(r) === id)
      if (row) {
        newEditingRows.add(id)
        newEditedValues[id] = {
          title: getDiscountTitle(row) || "",
          amount: getDiscountAmount(row)?.toString() || "",
        }
      }
    })

    setEditingRows(newEditingRows)
    setEditedValues(newEditedValues)
    toast.success(`${selectedDiscounts.size} discount${selectedDiscounts.size > 1 ? 's' : ''} now in edit mode`)
  }

  const handleSaveAll = async () => {
    if (editingRows.size === 0) {
      toast.error("No discounts in edit mode")
      return
    }

    const confirmed = window.confirm(
      `Save changes to ${editingRows.size} discount${editingRows.size > 1 ? 's' : ''}?`
    )

    if (!confirmed) return

    setSaving(true)

    try {
      const discountsToUpdate = Array.from(editingRows).map((id) => {
        const row = rows.find((r) => getDiscountRowId(r) === id)
        const editedData = editedValues[id]
        
        if (!row) return null

        // Send the entire row, but update title and amount
        const { createdAt, updatedAt, ...cleanRow } = row as any
        
        const discount: any = {
          ...cleanRow,
          id,
          title: editedData?.title,
          amount: editedData?.amount,
        }
        
        // Remove metadata from nested objects
        if (discount.conditions) {
          const { createdAt: c1, updatedAt: u1, id: i1, ...cleanCond } = discount.conditions
          discount.conditions = Object.keys(cleanCond).length > 0 ? cleanCond : null
        }
        
        if (discount.schedule) {
          const { createdAt: c2, updatedAt: u2, id: i2, ...cleanSched } = discount.schedule
          discount.schedule = Object.keys(cleanSched).length > 0 ? cleanSched : null
        }
        
        if (discount.manualConditions) {
          const { createdAt: c3, updatedAt: u3, id: i3, ...cleanMan } = discount.manualConditions
          discount.manualConditions = Object.keys(cleanMan).length > 0 ? cleanMan : null
        }
        
        // Clean arrays - only send required fields per API schema
        if (Array.isArray(discount.storeCustomizations)) {
          discount.storeCustomizations = discount.storeCustomizations.map((s: any) => ({
            entityId: s.entityId
          }))
        }
        
        if (Array.isArray(discount.collections)) {
          discount.collections = discount.collections.map((c: any) => ({
            productCollectionId: c.productCollectionId
          }))
        }
        
        if (Array.isArray(discount.collectionsRequired)) {
          discount.collectionsRequired = discount.collectionsRequired.map((c: any) => ({
            productCollectionId: c.productCollectionId
          }))
        }
        
        if (Array.isArray(discount.customerGroups)) {
          discount.customerGroups = discount.customerGroups.map((c: any) => ({
            tagId: c.tagId
          }))
        }
        
        if (Array.isArray(discount.coupons)) {
          discount.coupons = discount.coupons.map((c: any) => {
            const cleaned: any = {}
            if (c.code) cleaned.code = c.code
            if (c.title) cleaned.title = c.title
            if (c.startDate) cleaned.startDate = c.startDate
            if (c.endDate) cleaned.endDate = c.endDate
            if (c.startTime) cleaned.startTime = c.startTime
            if (c.endTime) cleaned.endTime = c.endTime
            return cleaned
          })
        }
        
        return discount
      }).filter(Boolean)

      // Remove all null values and empty arrays from each discount
      const removeNulls = (obj: any): any => {
        if (obj === null || obj === undefined) return undefined
        if (Array.isArray(obj)) {
          const filtered = obj.map(removeNulls).filter(item => item !== undefined)
          return filtered.length > 0 ? filtered : undefined
        }
        if (typeof obj === 'object') {
          const cleaned: any = {}
          for (const [key, value] of Object.entries(obj)) {
            const cleanedValue = removeNulls(value)
            if (cleanedValue !== undefined && cleanedValue !== null) {
              // Skip empty arrays and empty objects
              if (Array.isArray(cleanedValue) && cleanedValue.length === 0) continue
              if (typeof cleanedValue === 'object' && Object.keys(cleanedValue).length === 0) continue
              cleaned[key] = cleanedValue
            }
          }
          return Object.keys(cleaned).length > 0 ? cleaned : undefined
        }
        return obj
      }

      const cleanedDiscounts = discountsToUpdate.map(removeNulls).filter(Boolean)

      const res = await fetch("/api/discounts/update", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ discounts: cleanedDiscounts }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to update discounts")
      }

      if (data.successful > 0) {
        toast.success(`Successfully updated ${data.successful} discount${data.successful > 1 ? 's' : ''}!`)
      }

      if (data.failed > 0) {
        toast.error(`Failed to update ${data.failed} discount${data.failed > 1 ? 's' : ''}`, {
          description: data.errors?.[0]?.error || "Some updates failed",
        })
      }

      setEditingRows(new Set())
      setEditedValues({})

      setTimeout(() => window.location.reload(), 500)
    } catch (e) {
      toast.error("Failed to update discounts", {
        description: (e as Error).message,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="min-w-0 space-y-1">
            <h2 className="text-base font-semibold tracking-tight text-foreground">Percent discounts</h2>
            <p className="text-xs text-muted-foreground">
              Defaults to active offers. Include inactive to see archived. Only percent-type discounts are listed.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {selectedDiscounts.size > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkEdit}
                disabled={saving}
                className="gap-2"
              >
                <Edit2Icon className="h-4 w-4" />
                Edit {selectedDiscounts.size} selected
              </Button>
            )}
            {editingRows.size > 0 && (
              <Button
                variant="default"
                size="sm"
                onClick={handleSaveAll}
                disabled={saving}
                className="gap-2 bg-[#1A1E26] hover:bg-[#1A1E26]/90"
              >
                <SaveIcon className="h-4 w-4" />
                Save All ({editingRows.size})
              </Button>
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
              <Popover>
                <PopoverTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 gap-2 rounded-full border-border/80 px-3 font-normal shadow-none"
                    />
                  }
                >
                  {statusBadgeCount > 0 ? (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-md bg-foreground px-1 text-[10px] font-semibold text-background">
                      {statusBadgeCount}
                    </span>
                  ) : null}
                  Status
                  <ChevronDownIcon className="size-4 opacity-60" />
                </PopoverTrigger>
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
              </Popover>

              {allStores.length > 0 ? (
                <Popover>
                  <PopoverTrigger
                    render={
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 gap-2 rounded-full border-border/80 px-3 font-normal shadow-none"
                        disabled={storesLoading}
                      />
                    }
                  >
                    {storesLoading ? (
                      <span className="text-xs">Loading...</span>
                    ) : storeBadgeCount > 0 ? (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-md bg-foreground px-1 text-[10px] font-semibold text-background">
                        {storeBadgeCount}
                      </span>
                    ) : null}
                    Store
                    <ChevronDownIcon className="size-4 opacity-60" />
                  </PopoverTrigger>
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
                </Popover>
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
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
        <ScrollArea className="h-[min(58vh,calc(100vh-16rem)))] w-full">
          <Table className="w-full min-w-0 table-fixed">
            <TableHeader className="sticky top-0 z-10 bg-[#1A1E26] backdrop-blur">
              <TableRow className="hover:bg-transparent border-b-[#1A1E26]">
                <TableHead className="w-10 px-2">
                  <Checkbox
                    checked={
                      pageRows.length > 0 &&
                      pageRows.every((r) => {
                        const id = getDiscountRowId(r)
                        return id && selectedDiscounts.has(id)
                      })
                    }
                    onCheckedChange={handleSelectAll}
                    className="border-white data-[state=checked]:bg-white data-[state=checked]:text-[#1A1E26]"
                  />
                </TableHead>
                <TableHead className="w-[35%] text-xs font-bold uppercase tracking-wide text-white">
                  Title
                </TableHead>
                <TableHead className="w-[12%] text-xs font-bold uppercase tracking-wide text-white">
                  Amount
                </TableHead>
                <TableHead className="w-[25%] text-xs font-bold uppercase tracking-wide text-white">
                  Stores / Collections
                </TableHead>
                <TableHead className="w-[18%] text-xs font-bold uppercase tracking-wide text-white">
                  Schedule
                </TableHead>
                <TableHead className="w-[10%] text-xs font-bold uppercase tracking-wide text-white text-center">
                  Edit
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                    No discounts for this filter.
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((row) => {
                  const id = getDiscountRowId(row) || JSON.stringify(row).slice(0, 40)
                  const title = getDiscountTitle(row)
                  const amount = getDiscountAmount(row)
                  const schedule = getDiscountSchedule(row)
                  const isEditing = editingRows.has(id)
                  const editedData = editedValues[id]

                  // Get store names
                  const storeNames = Array.isArray(row.storeCustomizations)
                    ? row.storeCustomizations.map((s: any) => s.entityName || s.entityId).join(", ")
                    : "—"

                  // Get collection names
                  const collectionNames = Array.isArray(row.collections)
                    ? row.collections.map((c: any) => c.productCollectionName || c.productCollectionId).join(", ")
                    : "—"

                  const storesCollections = [storeNames, collectionNames].filter(s => s !== "—").join(" | ") || "—"

                  return (
                    <TableRow 
                      key={id} 
                      className={`border-border/60 transition-colors ${isEditing ? 'bg-yellow-50/50' : 'hover:bg-muted/30'}`}
                    >
                      <TableCell className="px-2 align-middle">
                        <Checkbox
                          checked={selectedDiscounts.has(id)}
                          onCheckedChange={(checked) =>
                            handleSelectDiscount(id, checked === true)
                          }
                          disabled={isEditing}
                        />
                      </TableCell>
                      <TableCell className="align-middle px-3">
                        {isEditing ? (
                          <Input
                            type="text"
                            value={editedData?.title || ""}
                            onChange={(e) => {
                              setEditedValues({
                                ...editedValues,
                                [id]: {
                                  ...editedData,
                                  title: e.target.value,
                                },
                              })
                            }}
                            className="h-8 text-sm"
                            placeholder="Discount title"
                          />
                        ) : (
                          <span className="text-sm font-medium text-foreground truncate block">
                            {title}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="align-middle px-3">
                        {isEditing ? (
                          <Input
                            type="number"
                            value={editedData?.amount || ""}
                            onChange={(e) => {
                              setEditedValues({
                                ...editedValues,
                                [id]: {
                                  ...editedData,
                                  amount: e.target.value,
                                },
                              })
                            }}
                            className="h-8 text-sm w-24"
                            placeholder="0"
                          />
                        ) : (
                          <Badge variant="secondary" className="font-mono text-[10px]">
                            {amount ? `${amount}%` : "—"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="align-middle px-3">
                        <span className="text-xs text-muted-foreground truncate block">
                          {storesCollections}
                        </span>
                      </TableCell>
                      <TableCell className="align-middle px-3">
                        <span className="text-xs leading-tight text-foreground">{schedule || "—"}</span>
                      </TableCell>
                      <TableCell className="align-middle text-center px-2">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="size-7 text-[#1A1E26] hover:bg-[#1A1E26]/10 hover:text-[#141920]"
                              onClick={() => handleSaveRow(id, row)}
                              disabled={saving}
                            >
                              <SaveIcon className="size-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="size-7 text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={() => handleCancelEdit(id)}
                              disabled={saving}
                            >
                              <XIcon className="size-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="size-8 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                            onClick={() => handleEditRow(id, row)}
                          >
                            <Edit2Icon className="size-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      <div className="flex flex-col items-stretch justify-between gap-3 border-t border-border/60 pt-2 sm:flex-row sm:items-center">
        <p className="text-xs text-muted-foreground">
          Page <span className="font-medium text-foreground">{pageClamped}</span> of{" "}
          <span className="font-medium text-foreground">{totalPages}</span>
          <span className="mx-2 text-border">·</span>
          {PAGE_SIZE} per page
        </p>
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pageClamped <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pageClamped >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      </div>

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
    </div>
  )
}
