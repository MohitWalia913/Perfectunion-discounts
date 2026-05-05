"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { DashboardShell } from "@/components/dashboard-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeftIcon, CalendarIcon, CheckIcon, ChevronDownIcon, Loader2Icon, PlusIcon, Trash2Icon, XIcon } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface StoreEntity {
  id: string
  name: string
}

interface ProductCollection {
  id: string
  name: string
}

type DiscountType = "FUN_FRIDAY" | "HOTBOX" | "DAILY_SPECIAL" | "CUSTOM"

interface DiscountRow {
  id: string
  discountType: DiscountType
  title: string
  customTitle: string
  amount: string
  selectedStores: StoreEntity[]
  startDate: Date | undefined
  endDate: Date | undefined
  repeat: boolean
  repeatType: "DAY" | "WEEK" | "MONTH" | "DO_NOT"
  selectedCollections: ProductCollection[]
  isValid: boolean
  validationError?: string
}

interface UploadResult {
  index: number
  success: boolean
  discount: string
  error?: string
  details?: any
}

export default function BulkUploadPage() {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)
  const [stores, setStores] = React.useState<StoreEntity[]>([])
  const [collections, setCollections] = React.useState<ProductCollection[]>([])
  const [loadingData, setLoadingData] = React.useState(true)
  const [rows, setRows] = React.useState<DiscountRow[]>([
    { 
      id: crypto.randomUUID(),
      discountType: "FUN_FRIDAY",
      title: "",
      customTitle: "",
      amount: "",
      selectedStores: [],
      startDate: undefined,
      endDate: undefined,
      repeat: false,
      repeatType: "DO_NOT",
      selectedCollections: [],
      isValid: false 
    }
  ])
  const [storeSearch, setStoreSearch] = React.useState<Record<string, string>>({})
  const [collectionSearch, setCollectionSearch] = React.useState<Record<string, string>>({})
  const [results, setResults] = React.useState<{
    total: number
    successful: number
    failed: number
    results: UploadResult[]
    errors: UploadResult[]
  } | null>(null)

  React.useEffect(() => {
    fetchStoresAndCollections()
  }, [])

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

  const generateTitle = (row: DiscountRow): string => {
    if (row.discountType === "CUSTOM") {
      return row.customTitle
    }

    const dateMonth = row.startDate ? format(row.startDate, "d MMM").toUpperCase() : "DATE"
    const percentage = row.amount || "X"
    const firstCollection = row.selectedCollections[0]?.name || "COLLECTION"

    switch (row.discountType) {
      case "FUN_FRIDAY":
        return `FUN FRIDAY ON ${dateMonth} - ${percentage}% OFF`
      case "HOTBOX": {
        const startDateMonth = row.startDate
          ? format(row.startDate, "d MMM").toUpperCase()
          : "DATE"
        const endDateMonth = row.endDate
          ? format(row.endDate, "d MMM").toUpperCase()
          : row.startDate
            ? format(row.startDate, "d MMM").toUpperCase()
            : "DATE"
        return `HOTBOX ON ${startDateMonth} TO ${endDateMonth} END - ${percentage}% OFF`
      }
      case "DAILY_SPECIAL":
        return `${firstCollection} - ${percentage}% OFF`
      default:
        return ""
    }
  }

  const validateRow = (row: DiscountRow): { isValid: boolean; error?: string } => {
    const generatedTitle = generateTitle(row)
    if (!generatedTitle.trim()) {
      return { isValid: false, error: "Title cannot be generated - missing required fields" }
    }
    if (!row.amount.trim() || isNaN(parseFloat(row.amount)) || parseFloat(row.amount) <= 0) {
      return { isValid: false, error: "Valid discount amount is required" }
    }
    if (row.selectedStores.length === 0) {
      return { isValid: false, error: "At least one store is required" }
    }
    if (!row.startDate) {
      return { isValid: false, error: "Start date is required" }
    }
    if (row.selectedCollections.length === 0) {
      return { isValid: false, error: "At least one collection is required" }
    }
    return { isValid: true }
  }

  const updateRow = (id: string, updates: Partial<DiscountRow>) => {
    setRows(prevRows => {
      const newRows = prevRows.map(row => {
        if (row.id === id) {
          const updatedRow = { ...row, ...updates }
          // Auto-generate title
          const generatedTitle = generateTitle(updatedRow)
          updatedRow.title = generatedTitle
          
          const validation = validateRow(updatedRow)
          return { ...updatedRow, isValid: validation.isValid, validationError: validation.error }
        }
        return row
      })
      return newRows
    })
  }

  const addRow = () => {
    const newId = crypto.randomUUID()
    setRows([...rows, { 
      id: newId,
      discountType: "FUN_FRIDAY",
      title: "",
      customTitle: "",
      amount: "",
      selectedStores: [],
      startDate: undefined,
      endDate: undefined,
      repeat: false,
      repeatType: "DO_NOT",
      selectedCollections: [],
      isValid: false 
    }])
    setStoreSearch({ ...storeSearch, [newId]: "" })
    setCollectionSearch({ ...collectionSearch, [newId]: "" })
  }

  const removeRow = (id: string) => {
    if (rows.length === 1) {
      toast.error("You must have at least one row")
      return
    }
    setRows(rows.filter(row => row.id !== id))
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
      const discounts = validRows.map(row => ({
        title: row.title,
        amount: row.amount,
        method: "PERCENT",
        isActive: true,
        isManual: false,
        isCart: false,
        isStackable: false,
        isAdjustment: false,
        requireReason: false,
        requirePin: false,
        requireCoupon: false,
        storeCustomizations: row.selectedStores.map((s) => ({ entityId: s.id })),
        collections: row.selectedCollections.map((c) => ({ productCollectionId: c.id })),
        schedule: {
          startDate: format(row.startDate!, "yyyy-MM-dd"),
          startTime: "00:00:00",
          endDate: row.endDate ? format(row.endDate, "yyyy-MM-dd") : format(row.startDate!, "yyyy-MM-dd"),
          endTime: "23:59:59",
          allDay: true,
          spansMultipleDays: false,
          repeatType: row.repeat ? row.repeatType : "DO_NOT"
        },
        conditions: {
          customerCapEnabled: false,
          customerLimitEnabled: false,
          purchaseMinimumEnabled: false,
          customerEventEnabled: false,
          itemLimitEnabled: false,
          customerLicenseTypeEnabled: false,
          packageAgeEnabled: false,
          fulfillmentTypesEnabled: false
        }
      }))

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
        <Button
          onClick={() => router.push("/dashboard")}
          variant="ghost"
          className="gap-2"
          disabled={loading}
        >
          <ArrowLeftIcon className="size-4" />
          Back
        </Button>
      }
    >
      <div className="flex flex-1 flex-col gap-6 p-4 pt-6 lg:p-8 lg:pt-8">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-2">
              <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                Bulk Create Discounts
              </h1>
              <p className="text-sm text-muted-foreground">
                Add multiple discounts at once. {validRowsCount > 0 && `${validRowsCount} valid row${validRowsCount > 1 ? 's' : ''} ready to create.`}
              </p>
            </div>
            <div className="flex items-center gap-2">
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
                onClick={handleBulkCreate}
                disabled={loading || validRowsCount === 0 || loadingData}
                className="gap-2 bg-[#0C3D22] hover:bg-[#0C3D22]/90 text-white"
              >
                {loading ? (
                  <>
                    <Loader2Icon className="size-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckIcon className="size-4" />
                    Create {validRowsCount > 0 ? `${validRowsCount} ` : ''}Discount{validRowsCount !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          </div>

          {loadingData && (
            <div className="flex items-center justify-center py-8">
              <Loader2Icon className="size-6 animate-spin text-[#0C3D22]" />
              <span className="ml-2 text-sm text-muted-foreground">Loading stores and collections...</span>
            </div>
          )}

          {!loadingData && (
            <div className="rounded-xl border border-border/80 bg-card shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[140px]">
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
                        <td className="px-2 py-2">
                          <Popover>
                            <PopoverTrigger className="inline-flex items-center justify-between w-full h-9 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                              <span>
                                {row.discountType === "FUN_FRIDAY" && "Fun Friday"}
                                {row.discountType === "HOTBOX" && "Hotbox"}
                                {row.discountType === "DAILY_SPECIAL" && "Daily Special"}
                                {row.discountType === "CUSTOM" && "Custom"}
                              </span>
                              <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </PopoverTrigger>
                            <PopoverContent className="w-[180px] p-1" align="start">
                              <div className="space-y-1">
                                <Button
                                  variant="ghost"
                                  className={cn(
                                    "w-full justify-start text-sm h-9",
                                    row.discountType === "FUN_FRIDAY" && "bg-muted"
                                  )}
                                  onClick={() => updateRow(row.id, { discountType: "FUN_FRIDAY" })}
                                >
                                  Fun Friday
                                </Button>
                                <Button
                                  variant="ghost"
                                  className={cn(
                                    "w-full justify-start text-sm h-9",
                                    row.discountType === "HOTBOX" && "bg-muted"
                                  )}
                                  onClick={() => updateRow(row.id, { discountType: "HOTBOX" })}
                                >
                                  Hotbox
                                </Button>
                                <Button
                                  variant="ghost"
                                  className={cn(
                                    "w-full justify-start text-sm h-9",
                                    row.discountType === "DAILY_SPECIAL" && "bg-muted"
                                  )}
                                  onClick={() => updateRow(row.id, { discountType: "DAILY_SPECIAL" })}
                                >
                                  Daily Special
                                </Button>
                                <Button
                                  variant="ghost"
                                  className={cn(
                                    "w-full justify-start text-sm h-9",
                                    row.discountType === "CUSTOM" && "bg-muted"
                                  )}
                                  onClick={() => updateRow(row.id, { discountType: "CUSTOM" })}
                                >
                                  Custom
                                </Button>
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
                          <Popover>
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
                                onSelect={(date) => updateRow(row.id, { startDate: date })}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </td>
                        <td className="px-2 py-2">
                          <Popover>
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
                                onSelect={(date) => updateRow(row.id, { endDate: date })}
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
                                  row.repeat && "bg-[#0C3D22] hover:bg-[#0C3D22]/90"
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
                                  !row.repeat && "bg-[#0C3D22] hover:bg-[#0C3D22]/90"
                                )}
                                onClick={() => updateRow(row.id, { repeat: false, repeatType: "DO_NOT" })}
                              >
                                No
                              </Button>
                            </div>
                            {row.repeat ? (
                              <Popover>
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
                                    <Button
                                      variant="ghost"
                                      className={cn(
                                        "h-8 w-full justify-start text-xs",
                                        row.repeatType === "DAY" && "bg-muted"
                                      )}
                                      onClick={() => updateRow(row.id, { repeatType: "DAY" })}
                                    >
                                      Daily
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      className={cn(
                                        "h-8 w-full justify-start text-xs",
                                        row.repeatType === "WEEK" && "bg-muted"
                                      )}
                                      onClick={() => updateRow(row.id, { repeatType: "WEEK" })}
                                    >
                                      Weekly (same day)
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      className={cn(
                                        "h-8 w-full justify-start text-xs",
                                        row.repeatType === "MONTH" && "bg-muted"
                                      )}
                                      onClick={() => updateRow(row.id, { repeatType: "MONTH" })}
                                    >
                                      Monthly (same day)
                                    </Button>
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
                  className="gap-2 text-[#0C3D22] hover:text-[#0C3D22] hover:bg-[#0C3D22]/10"
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
                <div className="rounded-lg border border-[#0C3D22] bg-[#0C3D22]/10 p-4">
                  <p className="text-xs text-muted-foreground mb-1">Successful</p>
                  <p className="text-2xl font-bold text-[#0C3D22]">{results.successful}</p>
                </div>
                <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
                  <p className="text-xs text-muted-foreground mb-1">Failed</p>
                  <p className="text-2xl font-bold text-destructive">{results.failed}</p>
                </div>
              </div>

              {results.results.length > 0 && (
                <div className="rounded-xl border border-[#0C3D22]/20 bg-[#0C3D22]/5 p-4">
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <CheckIcon className="size-4 text-[#0C3D22]" />
                    Successfully Created ({results.successful})
                  </h4>
                  <div className="space-y-2">
                    {results.results.map((result) => (
                      <div key={result.index} className="rounded-lg bg-background border border-border p-3 flex items-center gap-2">
                        <CheckIcon className="size-4 text-[#0C3D22]" />
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
                            {error.details && (
                              <details className="text-xs">
                                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                                  View full error details
                                </summary>
                                <pre className="mt-2 rounded bg-muted p-2 text-xs overflow-x-auto">
                                  {JSON.stringify(error.details, null, 2)}
                                </pre>
                              </details>
                            )}
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
